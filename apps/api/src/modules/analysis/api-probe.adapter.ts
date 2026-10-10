import crypto from "node:crypto";
import fg from "fast-glob";

import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

const CONTRACT_FILES = [
  "openapi.json",
  "openapi.yaml",
  "openapi.yml",
  "swagger.json",
  "swagger.yaml",
];
const REQUEST_TIMEOUT_MS = 10_000;

export class ApiProbeAdapter implements ToolAdapter {
  readonly name = "api-probe";
  readonly version = "fetch";

  async canRun(workspace: string) {
    const contracts = await fg(
      CONTRACT_FILES.flatMap((file) => [file, `**/${file}`]),
      {
        cwd: workspace,
        onlyFiles: true,
        ignore: [
          "**/.git/**",
          "**/node_modules/**",
          "**/vendor/**",
          "**/dist/**",
          "**/build/**",
          "**/coverage/**",
          "**/results/**",
          "**/.venv/**",
        ],
        suppressErrors: true,
      },
    );
    return contracts.length > 0;
  }

  async run(
    workspace: string,
    signal?: AbortSignal,
  ): Promise<ToolAdapterResult> {
    if (!(await this.canRun(workspace))) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        command: [],
        evidence: [],
        skippedReason: "No OpenAPI or Swagger contract was found.",
      };
    }

    const target = process.env.AEGIS_API_PROBE_URL;
    if (!target) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        command: [],
        evidence: [],
        skippedReason: "AEGIS_API_PROBE_URL is not configured.",
      };
    }

    const command = ["GET", target];
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const abortHandler = () => controller.abort();
    signal?.addEventListener("abort", abortHandler, { once: true });

    try {
      const response = await fetch(target, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const body = await response.text();
      const evidence: ToolEvidence[] = response.ok
        ? [createCompletionEvidence(
            this.name,
            this.version,
            `API probe completed with HTTP ${response.status}.`,
          )]
        : [{
            id: crypto.randomUUID(),
            tool: this.name,
            toolVersion: this.version,
            status: "failed",
            message: `API returned HTTP ${response.status}.`,
            code: `HTTP_${response.status}`,
          }];

      return {
        tool: this.name,
        toolVersion: this.version,
        status: response.ok ? "completed" : "failed",
        command,
        execution: {
          command: "node",
          args: command,
          status: response.ok ? "COMPLETED" : "FAILED",
          exitCode: response.status,
          stdout: body.slice(0, 1024 * 1024),
          stderr: "",
          durationMs: 0,
        },
        evidence,
      };
    } catch (error) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "failed",
        command,
        evidence: [{
          id: crypto.randomUUID(),
          tool: this.name,
          toolVersion: this.version,
          status: "failed",
          message: error instanceof Error ? error.message : "API probe failed.",
        }],
      };
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortHandler);
    }
  }
}
