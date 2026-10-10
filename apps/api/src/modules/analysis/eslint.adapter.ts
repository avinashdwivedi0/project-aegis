import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fg from "fast-glob";

import { ContainerRunnerService } from "./container-runner.service";
import { projectDiscoveryService, type DiscoveredProject } from "./project-discovery.service";
import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

const SOURCE_GLOB = "**/*.{js,mjs,cjs,jsx,ts,tsx}";
const SOURCE_IGNORE = ["**/.git/**", "**/node_modules/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/.next/**", "**/out/**", "**/coverage/**", "**/.venv/**", "**/venv/**", "**/__pycache__/**"];
const DEFAULT_RULESET = JSON.stringify({
  root: true,
  env: { es2021: true, browser: true, node: true },
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
});
const ESLINT_JS_LAUNCHER = "const path=require('node:path'); const bin=process.env.PATH.split(path.delimiter).find((item)=>item.includes('/_npx/')&&item.endsWith('/node_modules/.bin')); if(!bin) throw new Error('ESLint package was not placed on PATH by npm exec.'); const cli=path.resolve(bin,'..','eslint','bin','eslint.js'); process.argv=[process.argv[0],cli,...process.argv.slice(1)]; require(cli);";

type EslintMessage = { ruleId?: string | null; severity: number; message: string; line?: number; column?: number };
type EslintFileResult = { filePath: string; messages: EslintMessage[] };
type ParsedOutput = { parsed: boolean; evidence: ToolEvidence[]; reason?: string };
type LintProject = DiscoveredProject & { targetFiles: string[] };

export class EslintAdapter implements ToolAdapter {
  readonly name = "eslint";
  readonly version = "8.x/9.x";

  async canRun(workspace: string): Promise<boolean> {
    return (await this.findProjects(workspace)).length > 0;
  }

  async run(workspace: string, signal?: AbortSignal): Promise<ToolAdapterResult> {
    const projects = await this.findProjects(workspace);
    if (projects.length === 0) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        checkStatus: "SKIPPED",
        projectsScanned: 0,
        command: [],
        evidence: [],
        skippedReason: "No JavaScript or TypeScript source files were found.",
      };
    }

    let configDirectory: string | undefined;
    const evidence: ToolEvidence[] = [];
    const outputs: string[] = [];
    const errors: string[] = [];
    const executed: string[] = [];
    try {
      if (projects.some((project) => !project.hasEslintConfig)) {
        configDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-eslint-default-"));
        await fs.writeFile(path.join(configDirectory, "default.eslintrc.json"), DEFAULT_RULESET, "utf8");
      }

      for (const project of projects) {
        const target = project.targetFiles.length > 0
          ? project.targetFiles.map((file) => path.posix.join("/workspace", file))
          : [path.posix.join("/workspace", project.relativeRoot === "." ? "" : project.relativeRoot)];
        const flatConfig = project.markers.some((marker) => marker.startsWith("eslint.config."));
        const eslintArgs = [];
        if (!project.hasEslintConfig) eslintArgs.push("--no-eslintrc", "--config", "/aegis-eslint-config/default.eslintrc.json");
        eslintArgs.push(...target, "--format", "json", "--ext", ".js,.jsx,.mjs,.cjs,.ts,.tsx");
        for (const pattern of ["**/node_modules/**", "**/.git/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/.next/**", "**/out/**", "**/coverage/**", "**/.venv/**", "**/venv/**", "**/__pycache__/**"]) {
          eslintArgs.push("--ignore-pattern", pattern);
        }
        const localTool = await this.findLocalEslint(workspace, project);
        const command = localTool ? "node" as const : "npm" as const;
        const args = localTool
          ? [localTool, ...eslintArgs]
          : ["exec", "--yes", `--package=eslint@${flatConfig ? "9.39.1" : "8.57.1"}`, "--", "node", "-e", ESLINT_JS_LAUNCHER, "--", ...eslintArgs];
        try {
          const execution = await ContainerRunnerService.run({
            command,
            args,
            workspace,
            writableMounts: !project.hasEslintConfig && configDirectory
              ? [{ hostPath: configDirectory, containerPath: "/aegis-eslint-config" }]
              : undefined,
            environment: { HOME: "/tmp", npm_config_cache: "/tmp/npm-cache", ESLINT_USE_FLAT_CONFIG: flatConfig ? "true" : "false" },
            signal,
            memoryLimitMb: 2048,
            cpuLimit: 2,
            pidsLimit: 512,
            timeoutMs: 240_000,
          });
          outputs.push(`[${project.relativeRoot}]\n${execution.stdout}`);
          executed.push(project.relativeRoot);
          const parsed = this.parseOutput(execution.stdout, workspace);
          evidence.push(...parsed.evidence);
          if (!parsed.parsed) {
            errors.push(`[${project.relativeRoot}] ${parsed.reason}; ESLint ${execution.status} exit ${execution.exitCode}; ${execution.stderr.slice(0, 600) || "no stderr"}`);
          } else if (execution.status !== "COMPLETED" && parsed.evidence.length === 0) {
            errors.push(`[${project.relativeRoot}] ${execution.stderr || `ESLint exited with ${execution.status}.`}`);
          }
          if (signal?.aborted) break;
        } catch (error) {
          errors.push(`[${project.relativeRoot}] ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (configDirectory) await fs.rm(configDirectory, { recursive: true, force: true });
    }

    const failureReason = errors.length > 0 ? errors.join("\n") : undefined;
    if (evidence.length === 0 && !failureReason) {
      evidence.push(createCompletionEvidence(this.name, this.version, `ESLint completed for ${projects.length} project(s); projects without a config used eslint:recommended.`));
    }
    const hasFindings = evidence.some((item) => item.filePath && item.code !== "ESLINT_SUMMARY");
    const failed = Boolean(failureReason);
    const execution = {
      command: "node" as const,
      args: ["eslint", "<project roots>", "--format", "json"],
      status: failed ? "FAILED" as const : "COMPLETED" as const,
      exitCode: failed ? 2 : hasFindings ? 1 : 0,
      stdout: outputs.join("\n"),
      stderr: failureReason ?? "",
      durationMs: 0,
    };
    return {
      tool: this.name,
      toolVersion: this.version,
      status: failed ? "failed" : "completed",
      checkStatus: failed ? "FAILED" : hasFindings ? "FINDINGS" : "PASSED",
      projectsScanned: executed.length,
      failureReason,
      command: ["npm", "exec", "--package=eslint", "<project roots>", "--format", "json"],
      execution,
      evidence,
    };
  }

  private async findProjects(workspace: string): Promise<LintProject[]> {
    const files = await fg(SOURCE_GLOB, { cwd: workspace, onlyFiles: true, dot: true, ignore: SOURCE_IGNORE, suppressErrors: true });
    if (files.length === 0) return [];
    const discovered = await projectDiscoveryService.discover(workspace);
    const roots = discovered.filter((project) => {
      const hasSource = files.some((file) => project.relativeRoot === "." || file.startsWith(`${project.relativeRoot}/`));
      if (!hasSource) return false;
      if (project.relativeRoot === ".") {
        return files.some((file) => !file.includes("/")) || project.markers.includes("package.json") || project.markers.includes("tsconfig.json");
      }
      return project.markers.includes("package.json") || project.markers.includes("tsconfig.json") || project.hasEslintConfig;
    }).map((project) => ({
      ...project,
      targetFiles: project.relativeRoot === "." && !project.markers.includes("package.json") && !project.markers.includes("tsconfig.json")
        ? files.filter((file) => !file.includes("/"))
        : files.filter((file) => project.relativeRoot === "." || file.startsWith(`${project.relativeRoot}/`)),
    }));
    if (roots.length > 0) return roots;
    return [{ root: workspace, relativeRoot: ".", markers: [], hasEslintConfig: false, targetFiles: [] }];
  }

  private async findLocalEslint(workspace: string, project: DiscoveredProject): Promise<string | undefined> {
    const candidates = [
      path.join(project.root, "node_modules", "eslint", "bin", "eslint.js"),
      path.join(workspace, "node_modules", "eslint", "bin", "eslint.js"),
    ];
    if (project.relativeRoot !== ".") {
      const siblingRoots = await projectDiscoveryService.discover(workspace);
      candidates.push(...siblingRoots.map((root) => path.join(root.root, "node_modules", "eslint", "bin", "eslint.js")));
    }
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return path.relative(workspace, candidate).replaceAll("\\", "/").replace(/^\.\//, "");
      } catch {
        // Fall through to the next project installation or the sandbox npm cache.
      }
    }
    return undefined;
  }

  private parseOutput(output: string, workspace: string): ParsedOutput {
    const start = output.indexOf("[");
    const end = output.lastIndexOf("]");
    if (start < 0 || end < start) return { parsed: false, evidence: [], reason: `ESLint returned no JSON array (output length ${output.length}).` };
    let files: EslintFileResult[];
    try {
      files = JSON.parse(output.slice(start, end + 1)) as EslintFileResult[];
      if (!Array.isArray(files)) return { parsed: false, evidence: [], reason: "ESLint JSON output was not an array." };
    } catch (error) {
      return { parsed: false, evidence: [], reason: `ESLint JSON parsing failed: ${error instanceof Error ? error.message : String(error)} (output length ${output.length}).` };
    }
    return {
      parsed: true,
      evidence: files.flatMap((file) => file.messages.map((message) => ({
        id: crypto.randomUUID(),
        tool: this.name,
        toolVersion: this.version,
        status: message.severity > 0 ? "failed" as const : "completed" as const,
        severity: message.severity === 2 ? "high" as const : "moderate" as const,
        message: message.message,
        filePath: file.filePath.replaceAll("\\", "/").startsWith("/workspace/")
          ? file.filePath.replaceAll("\\", "/").slice("/workspace/".length)
          : path.relative(workspace, file.filePath).replaceAll("\\", "/"),
        lineStart: message.line,
        columnStart: message.column,
        code: message.ruleId ?? "ESLINT_PARSE",
      }))),
    };
  }
}
