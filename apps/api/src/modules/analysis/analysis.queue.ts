import crypto from "node:crypto";
import { prisma } from "../../config/prisma";

import { AnalysisEventService } from "./analysis-event.service";
import { AnalysisOrchestrator, type AnalysisTool } from "./analysis.orchestrator";
import { AiAnalysisOrchestrator } from "../ai/agents/ai-analysis.orchestrator";
import { AnalysisService } from "./analysis.service";
import { DeterministicAnalysisService } from "./deterministic-analysis.service";

const activeRuns = new Set<string>();
const workerId = crypto.randomUUID();
const LEASE_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;
let poller: NodeJS.Timeout | undefined;

export class AnalysisQueue {
  static start(pollIntervalMs = 1_000) {
    if (poller) {
      return;
    }

    void this.drain().catch((error) => {
      console.error("[AnalysisQueue] polling failed:", error);
    });
    poller = setInterval(() => {
      void this.drain().catch((error) => {
        console.error("[AnalysisQueue] polling failed:", error);
      });
    }, pollIntervalMs);
    poller.unref();
  }

  static stop() {
    if (poller) {
      clearInterval(poller);
      poller = undefined;
    }
  }

  private static async drain() {
    const expiredRuns = await prisma.analysisRun.findMany({
      where: {
        status: "RUNNING",
        leaseExpiresAt: { lt: new Date() },
      },
      select: { id: true },
      take: 10,
    });

    for (const run of expiredRuns) {
      const recovered = await prisma.analysisRun.updateMany({
        where: {
          id: run.id,
          status: "RUNNING",
          leaseExpiresAt: { lt: new Date() },
        },
        data: {
          status: "PENDING",
          leaseOwner: null,
          leaseExpiresAt: null,
          error: null,
        },
      });

      if (recovered.count === 1) {
        await AnalysisEventService.record({
          analysisRunId: run.id,
          type: "RECOVERED",
          message: "Expired worker lease returned the run to the queue.",
        });
      }
    }

    const pendingRuns = await prisma.analysisRun.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 10,
      include: {
        project: { select: { ownerId: true } },
      },
    });

    for (const run of pendingRuns) {
      try {
        await this.enqueue(run.project.ownerId, run.id);
      } catch (error) {
        console.error(
          `[AnalysisQueue] unable to dispatch run ${run.id}:`,
          error,
        );
      }
    }
  }

  static async enqueue(ownerId: string, runId: string) {
    if (activeRuns.has(runId)) {
      return false;
    }

    const claimed = await prisma.analysisRun.updateMany({
      where: {
        id: runId,
        status: "PENDING",
        project: { ownerId },
        OR: [
          { leaseExpiresAt: null },
          { leaseExpiresAt: { lt: new Date() } },
        ],
      },
      data: {
        leaseOwner: workerId,
        leaseExpiresAt: new Date(Date.now() + LEASE_MS),
      },
    });

    if (claimed.count !== 1) {
      return false;
    }

    const run = await prisma.analysisRun.findUnique({
      where: { id: runId },
      include: { repository: true },
    });

    if (!run?.repository.workspacePath) {
      throw new Error("Analysis repository has no workspace.");
    }

    activeRuns.add(runId);
    void this.process(runId, ownerId, run.repository.workspacePath, run.tools)
      .finally(() => activeRuns.delete(runId));
    return true;
  }

  private static async process(
    runId: string,
    ownerId: string,
    workspace: string,
    tools: unknown,
  ) {
    const heartbeat = setInterval(() => {
      void this.renewLease(runId).catch((error) => {
        console.error(
          `[AnalysisQueue] lease renewal failed for run ${runId}:`,
          error,
        );
      });
    }, HEARTBEAT_MS);
    heartbeat.unref();

    try {
      await AnalysisEventService.record({
        analysisRunId: runId,
        type: "DISPATCHED",
        message: "Analysis run dispatched to worker.",
      });

      if (Array.isArray(tools) && (tools.length === 0 || tools.every((tool) => typeof tool === "string"))) {
        await AnalysisService.start(ownerId, runId);
        await DeterministicAnalysisService.run(
          runId,
          workspace,
          tools.length > 0 ? tools as string[] : undefined,
        );
        await AiAnalysisOrchestrator.run(
          runId,
          workspace,
        );
        await AnalysisService.complete(ownerId, runId);
      } else {
        await AnalysisOrchestrator.run(
          ownerId,
          runId,
          workspace,
          tools as AnalysisTool[],
        );
      }
    } catch (error) {
      console.error(
        `[AnalysisQueue] run ${runId} failed:`,
        error,
      );
    } finally {
      clearInterval(heartbeat);
    }
  }

  private static async renewLease(runId: string) {
    await prisma.analysisRun.updateMany({
      where: {
        id: runId,
        leaseOwner: workerId,
        status: "RUNNING",
      },
      data: {
        leaseExpiresAt: new Date(Date.now() + LEASE_MS),
      },
    });
  }
}
