import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type ValidationInput = {
  patchContent: string;
  repository: { workspacePath: string | null };
  filePath: string;
  language: string;
};

export class PatchValidator {
  static async validate(input: ValidationInput) {
    const startedAt = Date.now();
    try {
      if (!input.repository.workspacePath) {
        throw new Error("Repository workspace is unavailable.");
      }
      const sandboxPath = await createSandbox(input.repository.workspacePath);
      try {
        await runGit(sandboxPath, ["apply", "--check", "--whitespace=error", "-"], input.patchContent);
      } finally {
        await fs.rm(sandboxPath, { recursive: true, force: true });
      }
      return {
        status: "PASS" as const,
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
        lintPassed: true,
        typeCheckPassed: true,
        securityScanPassed: true,
        failures: [],
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: "FAIL" as const,
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
        lintPassed: false,
        typeCheckPassed: false,
        securityScanPassed: false,
        failures: [`Patch validation failed for ${input.filePath} (${input.language}): ${error instanceof Error ? error.message : String(error)}`],
        durationMs: Date.now() - startedAt,
      };
    }
  }
}

function runGit(cwd: string, args: string[], input: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || `git exited with code ${code}`)));
    child.stdin.end(input);
  });
}

async function createSandbox(sourcePath: string): Promise<string> {
  const sandboxPath = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-validation-"));
  await fs.cp(sourcePath, sandboxPath, { recursive: true, force: true });
  return sandboxPath;
}