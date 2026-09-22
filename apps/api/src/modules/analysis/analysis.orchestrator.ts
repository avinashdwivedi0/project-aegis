import { prisma } from "../../config/prisma";

import { AnalysisService } from "./analysis.service";
import {
  ContainerRunnerService,
} from "./container-runner.service";
import type { ToolCommand } from "./tool-runner.service";

export type AnalysisTool = {
  command: ToolCommand;
  args: string[];
  stage: string;
};

export class AnalysisOrchestrator {
  static async run(
    ownerId: string,
    runId: string,
    workspace: string,
    tools: AnalysisTool[],
    signal?: AbortSignal,
  ) {
    const run = await AnalysisService.start(ownerId, runId);
    let currentRun = run;

    try {
      for (let index = 0; index < tools.length; index += 1) {
        const tool = tools[index];
        currentRun = await AnalysisService.updateProgress(
          ownerId,
          runId,
          {
            completedStages: index,
            currentStage: tool.stage,
          },
        );

        const result = await ContainerRunnerService.run({
          command: tool.command,
          args: tool.args,
          workspace,
          signal,
        });

        await prisma.toolExecution.create({
          data: {
            analysisRunId: runId,
            command: tool.command,
            args: tool.args,
            status: result.status,
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
            durationMs: result.durationMs,
          },
        });

        if (result.status === "CANCELLED") {
          return AnalysisService.cancel(ownerId, runId);
        }

        if (result.status !== "COMPLETED") {
          await AnalysisService.fail(
            ownerId,
            runId,
            `${tool.stage} failed with status ${result.status}.`,
          );
          return AnalysisService.get(ownerId, runId);
        }
      }

      return AnalysisService.complete(ownerId, runId);
    } catch (error) {
      await AnalysisService.fail(
        ownerId,
        runId,
        error instanceof Error ? error.message : "Analysis failed.",
      );
      throw error;
    }
  }
}
