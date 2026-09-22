import { spawn } from "node:child_process";
import fs from "fs/promises";
import path from "path";

export type ToolCommand =
  | "node"
  | "npm"
  | "pnpm"
  | "python"
  | "semgrep";

export type ToolRunOptions = {
  command: ToolCommand;
  args: string[];
  workspace: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  signal?: AbortSignal;
};

export type ToolRunResult = {
  command: ToolCommand;
  args: string[];
  status: "COMPLETED" | "FAILED" | "TIMED_OUT" | "CANCELLED";
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
};

const ALLOWED_COMMANDS: Record<ToolCommand, string> = {
  node: process.platform === "win32" ? "node.exe" : "node",
  npm: process.platform === "win32" ? "npm.cmd" : "npm",
  pnpm: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  python: process.platform === "win32" ? "python.exe" : "python3",
  semgrep: process.platform === "win32" ? "semgrep.exe" : "semgrep",
};

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;

export class ToolRunnerService {
  static async run(
    options: ToolRunOptions,
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
    const maxOutputBytes =
      options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    const startedAt = Date.now();
    const executable = ALLOWED_COMMANDS[options.command];

    if (!executable) {
      throw new Error("Tool command is not allowed.");
    }

    const child = spawn(executable, options.args, {
      cwd: workspace,
      shell: false,
      windowsHide: true,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
      },
    });

    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let terminationStatus:
      | Exclude<ToolRunResult["status"], "COMPLETED" | "FAILED">
      | undefined;
    let settled = false;

    const appendOutput = (
      current: string,
      chunk: Buffer,
    ) => {
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
      }
    };

    const timer = setTimeout(
      () => terminate("TIMED_OUT"),
      timeoutMs,
    );

    const abortHandler = () => terminate("CANCELLED");
    options.signal?.addEventListener(
      "abort",
      abortHandler,
      { once: true },
    );

    return new Promise((resolve, reject) => {
      child.once("error", (error) => {
        clearTimeout(timer);
        options.signal?.removeEventListener(
          "abort",
          abortHandler,
        );
        if (!settled) {
          settled = true;
          reject(error);
        }
      });

      child.once("close", (exitCode) => {
        clearTimeout(timer);
        options.signal?.removeEventListener(
          "abort",
          abortHandler,
        );
        settled = true;

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
