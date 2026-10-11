import { execFile, spawn } from "node:child_process";
import crypto from "node:crypto";
import fg from "fast-glob";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "node:util";

import type { ToolCommand, ToolRunResult } from "./tool-runner.service";

export type ContainerRunOptions = {
  command: ToolCommand;
  args: string[];
  workspace: string;
  writableMounts?: Array<{
    hostPath: string;
    containerPath: string;
  }>;
  readonlyMounts?: Array<{
    hostPath: string;
    containerPath: string;
  }>;
  environment?: Record<string, string>;
  image?: string;
  memoryLimitMb?: 512 | 2048;
  cpuLimit?: 1 | 2;
  pidsLimit?: 128 | 512;
  timeoutMs?: number;
  maxOutputBytes?: number;
  signal?: AbortSignal;
  containerName?: string;
  networkName?: string;
};

const CONTAINER_COMMANDS: Record<ToolCommand, string> = {
  node: "node",
  npx: "npx",
  npm: "npm",
  pnpm: "pnpm",
  python: "python3",
  semgrep: "semgrep",
};

const DEFAULT_IMAGE = "node:22-alpine";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
const execFileAsync = promisify(execFile);

export type WorkspaceDevServerOptions = {
  workspace: string;
  projectDirectory: string;
  scriptName: string;
  scriptArguments?: string[];
  port: number;
  timeoutMs?: number;
  environment?: Record<string, string>;
  stageDependencies?: boolean;
};

const WORKSPACE_DEV_BOOTSTRAP = String.raw`
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const source = process.cwd();
const project = "/tmp/aegis-service-project";
const excludedDirectories = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "results", ".cache"]);
const excludedFiles = new Set([".npmrc", ".pypirc", ".netrc", ".git-credentials", "credentials.json"]);
const isExcluded = (sourcePath) => {
  const relative = path.relative(source, sourcePath);
  if (!relative) return false;
  return relative.split(path.sep).some((part, index, parts) => excludedDirectories.has(part) || excludedFiles.has(part) || (index === parts.length - 1 && (/^\.env(?:\.|$)/.test(part) || /(?:service-account|private-key)/i.test(part) || /\.(?:pem|key|p12|pfx)$/i.test(part))));
};
const run = (command, args, cwd) => new Promise((resolve) => {
  const child = spawn(command, args, { cwd, stdio: "inherit", env: process.env });
  child.once("error", (error) => { console.error(error); resolve(127); });
  child.once("exit", (code) => resolve(code ?? 1));
});
const main = async () => {
  await fs.cp(source, project, { recursive: true, force: true, filter: (sourcePath) => !isExcluded(sourcePath) });
  let installCommand = "npm";
  let installArgs = ["ci", "--no-audit", "--no-fund"];
  if (await fs.access(path.join(project, "pnpm-lock.yaml")).then(() => true, () => false)) {
    installCommand = "corepack";
    installArgs = ["pnpm", "install", "--frozen-lockfile"];
  } else if (await fs.access(path.join(project, "yarn.lock")).then(() => true, () => false)) {
    installCommand = "corepack";
    installArgs = ["yarn", "install", "--frozen-lockfile"];
  } else if (!(await fs.access(path.join(project, "package-lock.json")).then(() => true, () => false))) {
    installArgs = ["install", "--no-audit", "--no-fund"];
  }
  let installCode = await run(installCommand, installArgs, project);
  if (installCode !== 0 && installCommand === "npm" && installArgs[0] === "ci") {
    console.error("npm ci rejected the disposable project lockfile; retrying npm install against the staged copy only.");
    installCode = await run("npm", ["install", "--no-audit", "--no-fund"], project);
  }
  if (installCode !== 0) process.exit(installCode);
  const script = process.argv[1];
  const scriptArguments = JSON.parse(process.argv[2] || "[]");
  const manifest = JSON.parse(await fs.readFile(path.join(project, "package.json"), "utf8"));
  const scriptSource = String((manifest.scripts || {})[script] || "");
  let serverCommand = "npm";
  let serverArguments = ["run", script, ...scriptArguments];
  if (/\breact-scripts\s+start\b/.test(scriptSource)) {
    serverCommand = "node";
    serverArguments = [path.join(project, "node_modules", "react-scripts", "scripts", "start.js"), ...scriptArguments.filter((argument) => argument !== "--")];
  } else if (/\bvite\b/.test(scriptSource)) {
    serverCommand = "node";
    serverArguments = [path.join(project, "node_modules", "vite", "bin", "vite.js"), ...scriptArguments.filter((argument) => argument !== "--")];
  } else if (/\bnext\s+(?:dev|start)\b/.test(scriptSource)) {
    serverCommand = "node";
    const nextCommand = scriptSource.match(/\bnext\s+(dev|start)\b/)?.[1];
    serverArguments = [path.join(project, "node_modules", "next", "dist", "bin", "next"), ...(nextCommand ? [nextCommand] : []), ...scriptArguments.filter((argument) => argument !== "--")];
  }
  const server = spawn(serverCommand, serverArguments, { cwd: project, stdio: "inherit", env: process.env });
  process.on("SIGTERM", () => server.kill("SIGTERM"));
  process.on("SIGINT", () => server.kill("SIGINT"));
  server.once("error", (error) => { console.error(error); process.exit(127); });
  server.once("exit", (code) => process.exit(code ?? 1));
};
main().catch((error) => { console.error(error); process.exit(1); });
`;

export function buildContainerArgs(
  options: ContainerRunOptions,
): string[] {
  const workspace = path.resolve(options.workspace);
  const image = options.image ?? DEFAULT_IMAGE;
  const executable = CONTAINER_COMMANDS[options.command];

  if (!executable) {
    throw new Error("Tool command is not allowed.");
  }

  // Use workspace path directly - Docker Desktop handles Windows paths
  let dockerWorkspace = workspace;
  let dockerMountPath = workspace;
  const packageManagerEntrypoint = options.command === "npm" || options.command === "npx"
    ? [`--entrypoint=${executable}`]
    : options.command === "pnpm"
      ? ["--entrypoint=corepack"]
      : [];
  const commandArguments = options.command === "npm" || options.command === "npx"
    ? options.args
    : options.command === "pnpm"
      ? ["pnpm", ...options.args]
      : [executable, ...options.args];
  const environment = options.command === "pnpm"
    ? { HOME: "/tmp", COREPACK_HOME: "/tmp/corepack", ...options.environment }
    : options.environment;

  return [
    "run",
    "--rm",
    "--init",
    ...(options.containerName ? [`--name=${options.containerName}`] : []),
    ...(options.networkName ? [`--network=${options.networkName}`] : []),
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges:true",
    "--user=65532:65532",
    `--pids-limit=${options.pidsLimit ?? 128}`,
    `--memory=${options.memoryLimitMb ?? 512}m`,
    `--cpus=${(options.cpuLimit ?? 1).toFixed(1)}`,
    "--tmpfs=/tmp:rw,noexec,nosuid,size=64m",
    "--mount",
    `type=bind,src=${dockerWorkspace},dst=/workspace,readonly`,
    "--workdir=/workspace",
    ...(options.writableMounts ?? []).flatMap((mount) => [
      "--mount",
      `type=bind,src=${path.resolve(mount.hostPath)},dst=${mount.containerPath}`,
    ]),
    ...(options.readonlyMounts ?? []).flatMap((mount) => [
      "--mount",
      `type=bind,src=${path.resolve(mount.hostPath)},dst=${mount.containerPath},readonly`,
    ]),
    ...(environment
      ? Object.entries(environment).flatMap(([key, value]) => [
          "--env",
          `${key}=${value}`,
        ])
      : []),
    ...packageManagerEntrypoint,
    image,
    ...commandArguments,
  ];
}

export class ContainerRunnerService {
  private static async maskCredentialFiles(workspace: string) {
    const ignored = ["**/.git/objects/**", "**/node_modules/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/.next/**", "**/out/**", "**/coverage/**", "**/.venv/**", "**/venv/**", "**/__pycache__/**"];
    const files = await fg([
      "**/.env", "**/.env.*", "**/.npmrc", "**/.pypirc", "**/.netrc", "**/.git-credentials",
      "**/credentials.json", "**/*service-account*.json", "**/*.pem", "**/*.key", "**/*.p12", "**/*.pfx",
      "**/.git/config", "**/.git/credentials",
    ], { cwd: workspace, onlyFiles: true, dot: true, ignore: ignored, followSymbolicLinks: false, suppressErrors: true });
    const directories = await fg(["**/.aws", "**/.ssh", "**/.azure", "**/.kube"], { cwd: workspace, onlyDirectories: true, dot: true, ignore: ignored, followSymbolicLinks: false, suppressErrors: true });
    if (files.length === 0 && directories.length === 0) return { root: undefined, mounts: [] as Array<{ hostPath: string; containerPath: string }> };
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-credential-mask-"));
    const mounts: Array<{ hostPath: string; containerPath: string }> = [];
    for (const file of files) {
      const placeholder = path.join(root, "files", file);
      await fs.mkdir(path.dirname(placeholder), { recursive: true });
      await fs.writeFile(placeholder, "", "utf8");
      mounts.push({ hostPath: placeholder, containerPath: path.posix.join("/workspace", file.replaceAll("\\", "/")) });
    }
    const emptyDirectory = path.join(root, "empty-directory");
    await fs.mkdir(emptyDirectory, { recursive: true });
    for (const directory of directories) {
      mounts.push({ hostPath: emptyDirectory, containerPath: path.posix.join("/workspace", directory.replaceAll("\\", "/")) });
    }
    return { root, mounts };
  }

  static async startWorkspaceDevServer(options: WorkspaceDevServerOptions): Promise<{ url: string; networkName: string; stop: () => Promise<void> }> {
    const workspace = path.resolve(options.workspace);
    const projectDirectory = path.resolve(workspace, options.projectDirectory);
    if (projectDirectory !== workspace && !projectDirectory.startsWith(workspace + path.sep)) {
      throw new Error("Service project directory must stay inside the selected workspace.");
    }
    if (!/^[a-zA-Z0-9:_-]+$/.test(options.scriptName)) throw new Error("Service start script name is invalid.");
    const projectRelative = path.relative(workspace, projectDirectory).split(path.sep).join("/");
    const containerProjectDirectory = projectRelative ? `/workspace/${projectRelative}` : "/workspace";
    const containerName = `aegis-service-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const networkName = `${containerName}-net`;
    const credentialMasks = await this.maskCredentialFiles(workspace);
    const args = [
      "run", "--detach", "--init", `--name=${containerName}`,
      `--network=${networkName}`, "--network-alias=aegis-frontend",
      "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges:true", "--user=65532:65532",
      "--pids-limit=512", "--memory=2048m", "--cpus=2.0", "--tmpfs=/tmp:rw,nosuid,size=1024m",
      "--mount", `type=bind,src=${workspace},dst=/workspace,readonly`,
      ...(credentialMasks.mounts.flatMap((mount) => ["--mount", `type=bind,src=${path.resolve(mount.hostPath)},dst=${mount.containerPath},readonly`])),
      "--workdir", containerProjectDirectory,
      "--env", "HOST=0.0.0.0", "--env", "HOSTNAME=0.0.0.0", "--env", `PORT=${options.port}`,
      "--env", "BROWSER=none", "--env", "GENERATE_SOURCEMAP=false", "--env", "HOME=/tmp", "--env", "npm_config_cache=/tmp/npm-cache", "--env", "npm_config_update_notifier=false",
      "--env", "DANGEROUSLY_DISABLE_HOST_CHECK=true",
      ...Object.entries(options.environment ?? {}).flatMap(([key, value]) => ["--env", `${key}=${value}`]),
      "node:22-alpine",
      ...(options.stageDependencies
        ? ["node", "-e", WORKSPACE_DEV_BOOTSTRAP, options.scriptName, JSON.stringify(options.scriptArguments ?? [])]
        : ["npm", "run", options.scriptName, ...(options.scriptArguments ?? [])]),
    ];
    let started = false;
    let maskCleaned = false;
    const cleanupMasks = async () => {
      if (!maskCleaned && credentialMasks.root) {
        maskCleaned = true;
        await fs.rm(credentialMasks.root, { recursive: true, force: true });
      }
    };
    const stop = async () => {
      if (started) {
        await execFileAsync("docker", ["rm", "--force", containerName], { windowsHide: true, timeout: 10_000 }).catch(() => undefined);
        started = false;
      }
      await execFileAsync("docker", ["network", "rm", networkName], { windowsHide: true, timeout: 10_000 }).catch(() => undefined);
      await cleanupMasks();
    };
    try {
      await execFileAsync("docker", ["network", "create", networkName], { windowsHide: true, timeout: 30_000 });
      await execFileAsync("docker", args, { windowsHide: true, timeout: 60_000 });
      started = true;
      const url = `http://aegis-frontend:${options.port}`;
      const deadline = Date.now() + (options.timeoutMs ?? 90_000);
      let lastError = "No readiness request attempted";
      while (Date.now() < deadline) {
        try {
          await execFileAsync("docker", ["exec", containerName, "node", "-e", `fetch('http://127.0.0.1:${options.port}',{signal:AbortSignal.timeout(2500)}).then(response=>process.exit(response.status>=100?0:1)).catch(()=>process.exit(1))`], { windowsHide: true, timeout: 5_000 });
          return { url, networkName, stop };
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          const running = await execFileAsync("docker", ["inspect", "--format={{.State.Running}}", containerName], { windowsHide: true, timeout: 5_000 }).then((result) => result.stdout.trim() === "true", () => false);
          if (!running) {
            const logs = await execFileAsync("docker", ["logs", "--tail", "80", containerName], { windowsHide: true, timeout: 10_000 }).then((result) => result.stdout + result.stderr).catch(() => "");
            throw new Error(`Service container exited before opening port ${options.port}. ${lastError} ${logs}`.trim());
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      const logs = await execFileAsync("docker", ["logs", "--tail", "80", containerName], { windowsHide: true, timeout: 10_000 }).then((result) => result.stdout + result.stderr).catch(() => "");
      throw new Error(`Service ${options.scriptName} did not open port ${options.port} within ${options.timeoutMs ?? 90_000}ms (${lastError}). ${logs}`.trim());
    } catch (error) {
      await stop();
      throw error;
    }
  }

  static async run(
    options: ContainerRunOptions,
  ): Promise<ToolRunResult> {
    const workspace = path.resolve(options.workspace);
    const stats = await fs.stat(workspace);

    if (!stats.isDirectory()) {
      throw new Error("Tool workspace must be a directory.");
    }

    if (options.signal?.aborted) {
      return {
        command: options.command,
        args: options.args,
        status: "CANCELLED",
        exitCode: null,
        stdout: "",
        stderr: "",
        durationMs: 0,
      };
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    const containerName = `aegis-check-${crypto.randomUUID().replaceAll("-", "")}`;
    const credentialMasks = await this.maskCredentialFiles(workspace);
    const runOptions = { ...options, readonlyMounts: [...options.readonlyMounts ?? [], ...credentialMasks.mounts], containerName };
    const startedAt = Date.now();
    const child = spawn("docker", buildContainerArgs(runOptions), {
      shell: false,
      windowsHide: true,
      env: {
        PATH: process.env.PATH,
        DOCKER_CONFIG: process.env.DOCKER_CONFIG,
      },
    });

    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let terminationStatus:
      | Exclude<ToolRunResult["status"], "COMPLETED" | "FAILED">
      | undefined;
    let settled = false;

    const appendOutput = (current: string, chunk: Buffer) => {
      const remaining = maxOutputBytes - outputBytes;
      if (remaining <= 0) {
        return current;
      }
      const accepted = chunk.subarray(0, remaining);
      outputBytes += accepted.byteLength;
      return current + accepted.toString("utf8");
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });

    const terminate = (
      nextStatus: Exclude<ToolRunResult["status"], "COMPLETED" | "FAILED">,
    ) => {
      if (!settled) {
        terminationStatus = nextStatus;
        child.kill();
        // Killing the Docker CLI does not reliably stop the container on all
        // Docker Desktop versions. Remove this uniquely named container too.
        const cleanup = spawn("docker", ["rm", "--force", containerName], {
          shell: false,
          windowsHide: true,
          env: { PATH: process.env.PATH, DOCKER_CONFIG: process.env.DOCKER_CONFIG },
        });
        cleanup.on("error", () => undefined);
      }
    };

    const timer = setTimeout(() => terminate("TIMED_OUT"), timeoutMs);
    const abortHandler = () => terminate("CANCELLED");
    options.signal?.addEventListener("abort", abortHandler, { once: true });

    return new Promise((resolve, reject) => {
      child.once("error", (error) => {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abortHandler);
        if (!settled) {
          settled = true;
          if (credentialMasks.root) void fs.rm(credentialMasks.root, { recursive: true, force: true });
          reject(error);
        }
      });

      child.once("close", (exitCode) => {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abortHandler);
        settled = true;
        if (credentialMasks.root) void fs.rm(credentialMasks.root, { recursive: true, force: true });
        const status = terminationStatus ??
          (exitCode === 0 ? "COMPLETED" : "FAILED");

        resolve({
          command: options.command,
          args: options.args,
          status,
          exitCode,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
        });
      });
    });
  }
}
