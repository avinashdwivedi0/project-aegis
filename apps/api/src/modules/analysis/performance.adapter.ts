import crypto from "node:crypto";

import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

const SAMPLE_COUNT = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_P95_LIMIT_MS = 1_000;

export class PerformanceAdapter implements ToolAdapter {
  readonly name = "performance";
  readonly version = "fetch-latency";

  async canRun(_workspace: string) {
    return Boolean(process.env.AEGIS_PERFORMANCE_URL);
  }

  async run(
    workspace: string,
    signal?: AbortSignal,
  ): Promise<ToolAdapterResult> {
    const target = process.env.AEGIS_PERFORMANCE_URL;
    if (!target) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        command: [],
        evidence: [],
        skippedReason: "AEGIS_PERFORMANCE_URL is not configured.",
      };
    }

    const startedAt = Date.now();
    const samples: number[] = [];
    let failure: string | undefined;

    for (let index = 0; index < SAMPLE_COUNT; index += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );
      const abortHandler = () => controller.abort();
      signal?.addEventListener("abort", abortHandler, { once: true });
      const requestStartedAt = performance.now();

      try {
        const response = await fetch(target, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        samples.push(Math.round(performance.now() - requestStartedAt));
        if (!response.ok) {
          failure = `Performance target returned HTTP ${response.status}.`;
          break;
        }
      } catch (error) {
        failure = error instanceof Error
          ? error.message
          : "Performance request failed.";
        break;
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abortHandler);
      }
    }

    if (failure || samples.length === 0) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "failed",
        command: ["GET", target],
        evidence: [{
          id: crypto.randomUUID(),
          tool: this.name,
          toolVersion: this.version,
          status: "failed",
          message: failure ?? "No performance samples were collected.",
        }],
      };
    }

    const sorted = [...samples].sort((left, right) => left - right);
    const p95 = sorted[Math.min(
      sorted.length - 1,
      Math.ceil(sorted.length * 0.95) - 1,
    )];
    const limit = Number(
      process.env.AEGIS_PERFORMANCE_P95_LIMIT_MS ?? DEFAULT_P95_LIMIT_MS,
    );
    const evidence: ToolEvidence[] = p95 > limit
      ? [{
          id: crypto.randomUUID(),
          tool: this.name,
          toolVersion: this.version,
          status: "failed",
          message: `P95 latency ${p95}ms exceeded ${limit}ms.`,
          severity: "moderate",
          code: "P95_LATENCY",
        }]
      : [createCompletionEvidence(
          this.name,
          this.version,
          `Performance probe collected ${samples.length} successful samples; P95 latency was ${p95}ms.`,
        )];

    return {
      tool: this.name,
      toolVersion: this.version,
      status: "completed",
      command: ["GET", target],
      evidence,
      execution: {
        command: "node",
        args: ["performance-probe", target],
        status: "COMPLETED",
        exitCode: 0,
        stdout: JSON.stringify({
          samples,
          p95,
          durationMs: Date.now() - startedAt,
        }),
        stderr: "",
        durationMs: Date.now() - startedAt,
      },
    };
  }
}
