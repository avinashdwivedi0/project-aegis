import { spawn } from "node:child_process";
import fs from "fs/promises";
import path from "path";

import type { ToolCommand, ToolRunResult } from "./tool-runner.service";

export type ContainerRunOptions = {
  command: ToolCommand;
  args: string[];
  workspace: string;
  image?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  signal?: AbortSignal;
};

const CONTAINER_COMMANDS: Record<ToolCommand, string> = {
  node: "node",
  npm: "npm",
  pnpm: "pnpm",
  python: "python3",
  semgrep: "semgrep",
};

const DEFAULT_IMAGE = "node:22-alpine";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;

export function buildContainerArgs(
  options: ContainerRunOptions,
): string[] {
  const workspace = path.resolve(options.workspace);
  const image = options.image ?? DEFAULT_IMAGE;
  const executable = CONTAINER_COMMANDS[options.command];

  if (!executable) {
    throw new Error("Tool command is not allowed.");
  }

  return [
    "run",
    "--rm",
    "--init",
    "--network=none",
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges:true",
    "--user=65532:65532",
    "--pids-limit=128",
    "--memory=512m",
    "--cpus=1.0",
    "--tmpfs=/tmp:rw,noexec,nosuid,size=64m",
    "--mount",
    `type=bind,src=${workspace},dst=/workspace,readonly`,
    "--workdir=/workspace",
    image,
    executable,
    ...options.args,
  ];
}

export class ContainerRunnerService {
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
    const startedAt = Date.now();
    const child = spawn("docker", buildContainerArgs(options), {
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
          reject(error);
        }
      });

      child.once("close", (exitCode) => {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abortHandler);
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
