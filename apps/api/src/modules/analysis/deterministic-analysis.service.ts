import { prisma } from "../../config/prisma";

import { AdapterRegistry } from "./adapter.registry";
import type { ToolAdapterResult } from "./tool-adapter.types";

export class DeterministicAnalysisService {
  static async run(
    analysisRunId: string,
    workspace: string,
    adapterNames?: string[],
    signal?: AbortSignal,
  ): Promise<ToolAdapterResult[]> {
    const adapters = (adapterNames ?? AdapterRegistry.all().map((adapter) => adapter.name))
      .map((name) => AdapterRegistry.get(name))
      .filter((adapter): adapter is NonNullable<typeof adapter> => Boolean(adapter));
    const results: ToolAdapterResult[] = [];

    for (const adapter of adapters) {
      const result = await adapter.run(workspace, signal);
      results.push(result);
      const checkStatus = result.checkStatus ?? (result.status === "skipped"
        ? "SKIPPED"
        : result.status === "failed"
          ? "FAILED"
          : result.evidence.some((item) => item.status === "failed") ? "FINDINGS" : "PASSED");
      const checkMetadata = `AEGIS_CHECK_META ${JSON.stringify({ checkStatus, projectsScanned: result.projectsScanned ?? 0, reason: result.skippedReason ?? result.failureReason ?? null })}`;

      await prisma.toolExecution.create({
        data: {
          analysisRunId,
          command: result.tool,
          args: result.execution?.args ?? [],
          // Persist the user-facing outcome, not just the container process exit.
          // A tool may exit nonzero because it found issues (FINDINGS), or may
          // skip without starting a process; both differ from a tool failure.
          status: checkStatus,
          exitCode: result.execution?.exitCode,
          stdout: result.execution?.stdout ?? "",
          stderr: [result.failureReason ?? result.skippedReason, result.execution?.stderr, checkMetadata].filter(Boolean).join("\n"),
          durationMs: result.execution?.durationMs ?? 0,
          evidence: result.evidence,
        },
      });
    }

    return results;
  }
}
