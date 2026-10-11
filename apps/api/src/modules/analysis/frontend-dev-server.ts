import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

import { ContainerRunnerService } from "./container-runner.service";

export type FrontendConfig = {
  projectDirectory: string;
  scriptName: string;
  scriptArguments: string[];
  port: number;
  vite: boolean;
};

const IGNORED = ["**/.git/**", "**/node_modules/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**", "**/results/**"];

export async function discoverFrontendConfig(workspace: string, routeFiles: string[] = []): Promise<FrontendConfig | undefined> {
  return (await discoverFrontendConfigs(workspace, routeFiles))[0];
}

export async function discoverFrontendConfigs(workspace: string, routeFiles: string[] = []): Promise<FrontendConfig[]> {
  const manifests = await fg("**/package.json", { cwd: workspace, deep: 4, onlyFiles: true, ignore: IGNORED, suppressErrors: true });
  const candidates: Array<FrontendConfig & { routeCount: number; preferredName: number }> = [];
  for (const manifestPath of manifests) {
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(workspace, manifestPath), "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        scripts?: Record<string, string>;
      };
      const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
      const scripts = manifest.scripts ?? {};
      const isFrontend = Boolean(dependencies.react || dependencies["react-dom"] || dependencies.next || dependencies.vite);
      if (!isFrontend) continue;
      const scriptName = scripts.start ? "start" : scripts.dev ? "dev" : undefined;
      if (!scriptName) continue;
      const script = scripts[scriptName];
      const vite = Boolean(dependencies.vite || /\bvite\b/.test(script));
      const next = Boolean(dependencies.next || /\bnext\b/.test(script));
      const defaultPort = vite ? 5173 : 3000;
      const explicitPort = script.match(/(?:--port(?:=|\s+)|\bPORT=)(\d+)/)?.[1];
      const port = Number(explicitPort ?? defaultPort);
      const scriptArguments = vite
        ? ["--", "--host", "0.0.0.0", "--port", String(port)]
        : next
          ? ["--", "--hostname", "0.0.0.0", "--port", String(port)]
          : [];
      const projectDirectory = path.dirname(manifestPath) === "." ? "." : path.dirname(manifestPath).replaceAll("\\", "/");
      candidates.push({
        projectDirectory,
        scriptName,
        scriptArguments,
        port,
        vite,
        routeCount: routeFiles.filter((file) => file.replaceAll("\\", "/").startsWith(projectDirectory === "." ? "" : `${projectDirectory}/`)).length,
        preferredName: /(^|\/)(frontend|web|client|ui)(\/|$)/i.test(projectDirectory) ? 1 : 0,
      });
    } catch { /* Ignore malformed or unreadable package manifests. */ }
  }
  candidates.sort((left, right) => right.routeCount - left.routeCount || right.preferredName - left.preferredName || left.projectDirectory.localeCompare(right.projectDirectory));
  return candidates.map(({ routeCount: _routeCount, preferredName: _preferredName, ...config }) => config);
}

export function routeBelongsToFrontend(routeFile: string, projectDirectory: string): boolean {
  const normalizedFile = routeFile.replaceAll("\\", "/");
  const normalizedDirectory = projectDirectory.replaceAll("\\", "/");
  return normalizedDirectory === "." || normalizedFile.startsWith(`${normalizedDirectory}/`);
}

export async function startFrontend(workspace: string, config: FrontendConfig) {
  return ContainerRunnerService.startWorkspaceDevServer({
    workspace,
    projectDirectory: config.projectDirectory,
    scriptName: config.scriptName,
    scriptArguments: config.scriptArguments,
    port: config.port,
    timeoutMs: 600_000,
    stageDependencies: true,
    environment: config.vite ? {} : { DANGEROUSLY_DISABLE_HOST_CHECK: "true" },
  });
}
