import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(process.cwd(), "../..");
const manifestPath = path.join(root, "evaluation", "benchmark", "manifest.json");
const outputPath = path.join(root, "evaluation", "results", "baseline.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
  schemaVersion: string;
  repositories: Array<{ id: string; path: string; version: string; baselineCommands: string[] }>;
};

const results = [];
for (const repository of manifest.repositories) {
  const cwd = path.join(root, repository.path);
  for (const command of repository.baselineCommands) {
    const [executable, ...args] = command.split(" ");
    const startedAt = new Date().toISOString();
    try {
      const result = await execFileAsync(process.platform === "win32" && executable === "pnpm" ? "pnpm.cmd" : executable, args, {
        cwd,
        shell: process.platform === "win32",
        timeout: 120_000,
        maxBuffer: 256 * 1024,
      });
      results.push({ repositoryId: repository.id, version: repository.version, command, startedAt, exitCode: 0, stdout: result.stdout, stderr: result.stderr });
    } catch (error) {
      const failure = error as { code?: number | string; stdout?: string; stderr?: string; message?: string };
      results.push({
        repositoryId: repository.id,
        version: repository.version,
        command,
        startedAt,
        exitCode: typeof failure.code === "number" ? failure.code : 1,
        stdout: failure.stdout ?? "",
        stderr: failure.stderr ?? failure.message ?? "Unknown command failure",
      });
    }
  }
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify({ schemaVersion: "phase9-baseline-v1", generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(`Recorded ${results.length} deterministic baseline commands at ${outputPath}.`);
