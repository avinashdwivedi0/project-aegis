import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fg from "fast-glob";

import { ContainerRunnerService } from "./container-runner.service";
import { projectDiscoveryService } from "./project-discovery.service";
import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

const SOURCE_GLOBS = [
  "**/*.{js,mjs,cjs,jsx,ts,tsx,py,go,java,kt,cs,php,rb,rs,swift,c,h,cc,cpp,hpp,scala,sh,bash,yaml,yml,json,env,properties,conf,config,xml,sql}",
];
const IGNORED = ["**/.git/**", "**/node_modules/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/.next/**", "**/out/**", "**/coverage/**", "**/.venv/**", "**/venv/**", "**/__pycache__/**"];
const SECRET_SCAN = [
  "import json, os, pathlib, re",
  "ignored = {'.git', 'node_modules', 'vendor', 'dist', 'build', '.next', 'out', 'coverage', '.venv', 'venv', '__pycache__'}",
  "source_suffixes = {'.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.go', '.java', '.kt', '.cs', '.php', '.rb', '.rs', '.swift', '.c', '.h', '.cc', '.cpp', '.hpp', '.scala', '.sh', '.bash', '.yaml', '.yml', '.json', '.env', '.properties', '.conf', '.config', '.xml', '.sql'}",
  "ignored_files = {'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb', 'poetry.lock', 'Pipfile.lock'}",
  "known = re.compile(r'''\\b(?:AKIA[0-9A-Z]{16}|sk_(?:live|test)_[A-Za-z0-9]{12,})\\b''')",
  "safe = re.compile(r'(?i)(example|placeholder|changeme|your[_-]?|dummy|redacted|\\*{3})')",
  "results = []",
  "files_scanned = 0",
  "for root, directories, names in os.walk('.'):",
  " directories[:] = [name for name in directories if name not in ignored]",
  " for name in names:",
  "  file = pathlib.Path(root) / name",
  "  if name in ignored_files or (file.suffix.lower() not in source_suffixes and not name.startswith('.env')) or '.min.' in name.lower(): continue",
  "  try:",
  "   if file.stat().st_size > 2000000: continue",
  "  except OSError: continue",
  "  try: lines = file.read_text(encoding='utf-8').splitlines()",
  "  except (UnicodeError, OSError): continue",
  "  for number, line in enumerate(lines, 1):",
  "    left, separator, right = line.partition('=')",
  "    if not separator: left, separator, right = line.partition(':')",
  "    labeled = bool(separator) and any(label in left.lower() for label in ('secret', 'token', 'password', 'api_key', 'api-key'))",
  "    quoted_values = [value for delimiter in (chr(34), chr(39)) for index, value in enumerate(right.split(delimiter)) if index % 2 == 1]",
  "    match = next((value for value in quoted_values if len(value) >= 20 and len(set(value)) >= 12 and sum(character.isdigit() for character in value) >= 2 and not safe.search(value)), None) if labeled else None",
  "    known_match = known.search(line)",
  "    if match: results.append({'file': file.as_posix(), 'line': number, 'rule': 'hardcoded-secret-assignment', 'message': 'Possible high-entropy credential assigned to a secret-like variable.'})",
  "    elif known_match: results.append({'file': file.as_posix(), 'line': number, 'rule': 'known-secret-token-format', 'message': 'Possible hardcoded credential matches a known token format.'})",
  "  files_scanned += 1",
  "print(json.dumps({'filesScanned': files_scanned, 'findings': results}))",
].join("\n");

type SemgrepFinding = { check_id?: string; path?: string; start?: { line?: number; col?: number }; extra?: { message?: string; severity?: string } };
type SemgrepReport = { results?: SemgrepFinding[]; errors?: Array<{ message?: string }> };
type SecretReport = { filesScanned?: number; findings?: Array<{ file?: string; line?: number; rule?: string; message?: string }> };

export class SecurityScanAdapter implements ToolAdapter {
  readonly name = "security-scan";
  readonly version = "semgrep-default-plus-secret-patterns";

  async canRun(workspace: string): Promise<boolean> {
    return (await this.findSourceFiles(workspace)).length > 0;
  }

  async run(workspace: string, signal?: AbortSignal): Promise<ToolAdapterResult> {
    const sourceFiles = await this.findSourceFiles(workspace);
    if (sourceFiles.length === 0) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        checkStatus: "SKIPPED",
        projectsScanned: 0,
        command: [],
        evidence: [],
        skippedReason: "No supported source or configuration files were found for security scanning.",
      };
    }

    const projects = await projectDiscoveryService.discover(workspace);
    const evidence: ToolEvidence[] = [];
    const failures: string[] = [];
    const outputs: string[] = [];
    const semgrepCacheDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-semgrep-cache-"));
    // Semgrep recursively scans nested projects, so one workspace invocation avoids
    // repeated ruleset downloads and duplicate work for overlapping monorepo roots.
    const scanTargets = [{ name: "workspace", target: "/workspace" }];
    const discoveredProjectCount = Math.max(1, projects.length);
    let semgrepExecution;
    let projectsScanned = 0;
    for (const target of scanTargets) {
      const semgrepArgs = ["scan", "--json", "--jobs", "2", "--config", "p/default", "--config", "p/secrets", ...[".git", "node_modules", "vendor", "dist", "build", ".next", "out", "coverage", ".venv", "venv", "__pycache__"].flatMap((item) => ["--exclude", item]), target.target];
      try {
        semgrepExecution = await ContainerRunnerService.run({
          command: "semgrep",
          args: semgrepArgs,
          workspace,
          writableMounts: [{ hostPath: semgrepCacheDirectory, containerPath: "/aegis-semgrep-cache" }],
          image: "semgrep/semgrep:latest",
          environment: {
            HOME: "/tmp",
            XDG_CONFIG_HOME: "/tmp/.config",
            XDG_CACHE_HOME: "/aegis-semgrep-cache",
            SEMGREP_SEND_METRICS: "off",
          },
          memoryLimitMb: 2048,
          cpuLimit: 2,
          pidsLimit: 512,
          timeoutMs: 420_000,
          signal,
        });
        projectsScanned += discoveredProjectCount;
        outputs.push(`[semgrep:${target.name}]\n${semgrepExecution.stdout}`);
        const report = this.parseSemgrep(semgrepExecution.stdout);
        if (!report) failures.push(`[${target.name}] ${semgrepExecution.stderr || `Semgrep returned no parseable JSON report (${semgrepExecution.status}, exit ${semgrepExecution.exitCode}): ${semgrepExecution.stdout.slice(0, 1200) || "no stdout"}`}`);
        else {
          evidence.push(...this.mapSemgrepFindings(report.results ?? [], workspace));
          if ((report.errors ?? []).length > 0) failures.push(...report.errors!.map((item) => `[${target.name}] ${item.message ?? "Semgrep reported a scan error."}`));
          if (semgrepExecution.status !== "COMPLETED" && (report.results ?? []).length === 0) failures.push(`[${target.name}] ${semgrepExecution.stderr || `Semgrep exited with ${semgrepExecution.status}.`}`);
        }
      } catch (error) {
        failures.push(`[${target.name}] ${error instanceof Error ? error.message : String(error)}`);
      }
      if (signal?.aborted) break;
    }
    if (signal?.aborted) failures.push("Security scan was cancelled before completion.");

    try {
      const secretExecution = await ContainerRunnerService.run({
        command: "python",
        args: ["-c", SECRET_SCAN],
        workspace,
        image: "python:3.12-alpine",
        timeoutMs: 120_000,
        signal,
      });
      outputs.push(`[hardcoded-secret-scan]\n${secretExecution.stdout}`);
      const secretReport = JSON.parse(secretExecution.stdout) as SecretReport;
      if (!Array.isArray(secretReport.findings)) throw new Error("Secret scanner returned invalid JSON.");
      evidence.push(...secretReport.findings.flatMap((finding) => finding.file && finding.line ? [{
        id: crypto.randomUUID(),
        tool: "hardcoded-secret-scan",
        toolVersion: "aegis-patterns-1",
        status: "failed" as const,
        severity: "high" as const,
        message: finding.message ?? "Possible hardcoded secret.",
        filePath: finding.file.replaceAll("\\", "/"),
        lineStart: finding.line,
        code: finding.rule ?? "hardcoded-secret",
      }] : []));
      if (secretExecution.status !== "COMPLETED") failures.push(secretExecution.stderr || `Secret scan exited with ${secretExecution.status} (${secretExecution.exitCode}).`);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }

    await fs.rm(semgrepCacheDirectory, { recursive: true, force: true });

    if (evidence.length === 0 && failures.length === 0) {
      evidence.push(createCompletionEvidence(this.name, this.version, "Semgrep p/default, Semgrep p/secrets, and the hardcoded-secret scan completed with no findings."));
    }
    const failureReason = failures.length > 0 ? failures.join("\n") : undefined;
    const failed = Boolean(failureReason);
    const hasFindings = evidence.some((item) => item.filePath && item.lineStart);
    const execution = {
      command: "semgrep" as const,
      args: ["scan", "--json", "--config", "p/default", "--config", "p/secrets", "<discovered project roots>"],
      status: failed ? "FAILED" as const : "COMPLETED" as const,
      exitCode: failed ? 2 : hasFindings ? 1 : 0,
      stdout: outputs.join("\n"),
      stderr: failureReason ?? "",
      durationMs: semgrepExecution?.durationMs ?? 0,
    };
    return {
      tool: this.name,
      toolVersion: this.version,
      status: failed ? "failed" : "completed",
      checkStatus: failed ? "FAILED" : hasFindings ? "FINDINGS" : "PASSED",
      projectsScanned,
      failureReason,
      command: ["semgrep", "scan", "--json", "--config", "p/default", "--config", "p/secrets", ...scanTargets.map(({ target, name }) => target || name)],
      execution,
      evidence,
    };
  }

  private findSourceFiles(workspace: string): Promise<string[]> {
    return fg(SOURCE_GLOBS, { cwd: workspace, onlyFiles: true, dot: true, ignore: IGNORED, suppressErrors: true });
  }

  private parseSemgrep(output: string): SemgrepReport | undefined {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start < 0 || end < start) return undefined;
    try {
      const value = JSON.parse(output.slice(start, end + 1)) as SemgrepReport;
      return Array.isArray(value.results) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  private mapSemgrepFindings(results: SemgrepFinding[], workspace: string): ToolEvidence[] {
    return results.flatMap((result) => {
      if (!result.path || !result.start?.line) return [];
      const normalized = result.path.replaceAll("\\", "/");
      const filePath = normalized.startsWith("/workspace/")
        ? normalized.slice("/workspace/".length)
        : path.isAbsolute(result.path)
          ? path.relative(workspace, result.path).replaceAll("\\", "/")
          : normalized.replace(/^\.\//, "");
      return [{
        id: crypto.randomUUID(),
        tool: this.name,
        toolVersion: this.version,
        status: "failed" as const,
        message: result.extra?.message ?? "Security issue detected.",
        severity: this.normalizeSeverity(result.extra?.severity),
        filePath,
        lineStart: result.start.line,
        columnStart: result.start.col,
        code: result.check_id ?? "semgrep/default",
      }];
    });
  }

  private normalizeSeverity(severity?: string): ToolEvidence["severity"] {
    const normalized = severity?.toLowerCase();
    if (normalized === "error" || normalized === "high") return "high";
    if (normalized === "warning" || normalized === "medium" || normalized === "moderate") return "moderate";
    if (normalized === "critical" || normalized === "low") return normalized;
    return "info";
  }
}
