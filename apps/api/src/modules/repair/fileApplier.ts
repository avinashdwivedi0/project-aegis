import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type ApplyInput = {
  patchContent: string;
  repository: { workspacePath: string | null };
  filePath: string;
  targetRepo: boolean;
};

export class FileApplier {
  static async apply(input: ApplyInput) {
    if (!input.repository.workspacePath) {
      return { success: false, output: "", error: "Repository workspace is unavailable." };
    }
    try {
      const targetPath = input.targetRepo
        ? input.repository.workspacePath
        : await createSandbox(input.repository.workspacePath);
      try {
        await runGit(targetPath, ["apply", "--whitespace=error", "-"], input.patchContent);
      } finally {
        if (!input.targetRepo) {
          await fs.rm(targetPath, { recursive: true, force: true });
        }
      }
      return {
        success: true,
        output: `Patch applied to ${input.filePath}${input.targetRepo ? " in the project repository" : " in the workspace sandbox"}.`,
        error: null,
      };
    } catch (error) {
      return { success: false, output: "", error: error instanceof Error ? error.message : String(error) };
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
  const sandboxPath = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-application-"));
  await fs.cp(sourcePath, sandboxPath, { recursive: true, force: true });
  return sandboxPath;
}