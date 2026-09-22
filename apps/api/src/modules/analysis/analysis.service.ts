import {
  AnalysisStatus,
} from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

import { AnalysisEventService } from "./analysis-event.service";
import type {
  CreateAnalysisInput,
  UpdateAnalysisProgressInput,
} from "./analysis.types";

export class AnalysisService {
  private static async findRepository(
    ownerId: string,
    projectId: string,
    repositoryId: string,
  ) {
    const repository =
      await prisma.repository.findFirst({
        where: {
          id: repositoryId,
          projectId,
          project: {
            ownerId,
          },
        },
      });

    if (!repository) {
      throw new ApiError(
        404,
        "Repository not found or access denied.",
      );
    }

    return repository;
  }

  private static async findRun(
    ownerId: string,
    runId: string,
  ) {
    const run =
      await prisma.analysisRun.findFirst({
        where: {
          id: runId,
          project: {
            ownerId,
          },
        },
      });

    if (!run) {
      throw new ApiError(
        404,
        "Analysis run not found or access denied.",
      );
    }

    return run;
  }

  static async create(
    ownerId: string,
    input: CreateAnalysisInput,
  ) {
    const adapters = input.adapters ?? [];
    await this.findRepository(
      ownerId,
      input.projectId,
      input.repositoryId,
    );

    const run = await prisma.analysisRun.create({
      data: {
        projectId: input.projectId,
        repositoryId: input.repositoryId,
        ref: input.ref,
        totalStages: input.totalStages || (input.tools.length > 0 ? input.tools.length : adapters.length || 8),
        tools: adapters.length > 0 ? adapters : input.tools,
      },
    });

    await AnalysisEventService.record({
      analysisRunId: run.id,
      type: "QUEUED",
      message: "Analysis run queued.",
      progress: 0,
    });

    return run;
  }

  static async get(
    ownerId: string,
    runId: string,
  ) {
    return this.findRun(ownerId, runId);
  }

  static async list(ownerId: string) {
    return prisma.analysisRun.findMany({
      where: { project: { ownerId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        ref: true,
        status: true,
        progress: true,
        createdAt: true,
        completedAt: true,
        repository: { select: { name: true } },
      },
    });
  }

  static async start(
    ownerId: string,
    runId: string,
  ) {
    const run = await this.findRun(ownerId, runId);

    if (run.status !== AnalysisStatus.PENDING) {
      throw new ApiError(
        409,
        "Only pending analysis runs can be started.",
      );
    }

    const updatedRun = await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: AnalysisStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    await AnalysisEventService.record({
      analysisRunId: runId,
      type: "STARTED",
      message: "Analysis run started.",
      progress: updatedRun.progress,
    });

    return updatedRun;
  }

  static async updateProgress(
    ownerId: string,
    runId: string,
    input: UpdateAnalysisProgressInput,
  ) {
    const run = await this.findRun(ownerId, runId);

    if (run.status !== AnalysisStatus.RUNNING) {
      throw new ApiError(
        409,
        "Only running analysis runs can report progress.",
      );
    }

    const completedStages = Math.min(
      input.completedStages,
      run.totalStages,
    );
    const progress = run.totalStages === 0
      ? 0
      : Math.round(
          (completedStages / run.totalStages) * 100,
        );

    const updatedRun = await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        completedStages,
        progress,
        currentStage: input.currentStage,
      },
    });

    await AnalysisEventService.record({
      analysisRunId: runId,
      type: "STAGE_STARTED",
      stage: input.currentStage ?? undefined,
      progress: updatedRun.progress,
    });

    return updatedRun;
  }

  static async complete(
    ownerId: string,
    runId: string,
  ) {
    const run = await this.findRun(ownerId, runId);

    if (run.status !== AnalysisStatus.RUNNING) {
      throw new ApiError(
        409,
        "Only running analysis runs can be completed.",
      );
    }

    const updatedRun = await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: AnalysisStatus.COMPLETED,
        progress: 100,
        completedStages: run.totalStages,
        currentStage: null,
        completedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });

    await AnalysisEventService.record({
      analysisRunId: runId,
      type: "COMPLETED",
      message: "Analysis run completed.",
      progress: 100,
    });

    return updatedRun;
  }

  static async fail(
    ownerId: string,
    runId: string,
    error: string,
  ) {
    await this.findRun(ownerId, runId);

    const updatedRun = await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: AnalysisStatus.FAILED,
        error,
        completedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });

    await AnalysisEventService.record({
      analysisRunId: runId,
      type: "FAILED",
      message: error,
      progress: updatedRun.progress,
    });

    return updatedRun;
  }

  static async cancel(
    ownerId: string,
    runId: string,
  ) {
    const run = await this.findRun(ownerId, runId);

    if (
      run.status !== AnalysisStatus.PENDING &&
      run.status !== AnalysisStatus.RUNNING
    ) {
      throw new ApiError(
        409,
        "Only pending or running analysis runs can be cancelled.",
      );
    }

    const updatedRun = await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: AnalysisStatus.CANCELLED,
        completedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });

    await AnalysisEventService.record({
      analysisRunId: runId,
      type: "CANCELLED",
      message: "Analysis run cancelled.",
      progress: updatedRun.progress,
    });

    return updatedRun;
  }

  static async retry(ownerId: string, runId: string) {
    const run = await this.findRun(ownerId, runId);
    if (run.status !== AnalysisStatus.FAILED && run.status !== AnalysisStatus.CANCELLED) {
      throw new ApiError(409, "Only failed or cancelled analysis runs can be retried.");
    }
    const updatedRun = await prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: AnalysisStatus.PENDING,
        progress: 0,
        completedStages: 0,
        currentStage: null,
        error: null,
        startedAt: null,
        completedAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    await AnalysisEventService.record({
      analysisRunId: runId,
      type: "RETRY_QUEUED",
      message: "Analysis run queued for retry.",
      progress: 0,
    });
    return updatedRun;
  }

  static async events(
    ownerId: string,
    runId: string,
    after?: Date,
  ) {
    await this.findRun(ownerId, runId);
    return AnalysisEventService.list(runId, after);
  }

  static async summary(
    ownerId: string,
    runId: string,
  ) {
    await this.findRun(ownerId, runId);
    const executions = await prisma.toolExecution.findMany({
      where: { analysisRunId: runId },
      orderBy: { createdAt: "asc" },
      select: {
        command: true,
        status: true,
        evidence: true,
      },
    });
    const byTool: Record<string, { status: string; evidence: number }> = {};
    const bySeverity: Record<string, number> = {};
    let evidenceCount = 0;

    for (const execution of executions) {
      const evidence = Array.isArray(execution.evidence)
        ? execution.evidence
        : [];
      byTool[execution.command] = {
        status: execution.status,
        evidence: evidence.length,
      };
      evidenceCount += evidence.length;

      for (const item of evidence) {
        if (!item || typeof item !== "object" || !("severity" in item)) {
          continue;
        }
        const severity = item.severity;
        if (typeof severity === "string") {
          bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
        }
      }
    }

    return {
      runId,
      tools: byTool,
      totals: {
        executions: executions.length,
        evidence: evidenceCount,
      },
      bySeverity,
    };
  }
}
