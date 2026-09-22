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

      await prisma.toolExecution.create({
        data: {
          analysisRunId,
          command: result.execution?.command ?? result.tool,
          args: result.execution?.args ?? [],
          status: result.execution?.status ?? result.status.toUpperCase(),
          exitCode: result.execution?.exitCode,
          stdout: result.execution?.stdout ?? "",
          stderr: result.execution?.stderr ?? result.skippedReason ?? "",
          durationMs: result.execution?.durationMs ?? 0,
          evidence: result.evidence,
        },
      });
    }

    return results;
  }
}
