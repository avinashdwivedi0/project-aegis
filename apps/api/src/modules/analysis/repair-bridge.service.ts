import { ApiError } from "../../utils/ApiError";
import { prisma } from "../../config/prisma";
import { RepairBridgeStatus } from "@prisma/client";

import { AuditLogger } from "../../utils/audit-logger";

export interface RepairBridgeResult {
  jobId: string | null;
  created: boolean;
  findingCount: number;
  reason?: string;
}

/**
 * bridgeRunToRepairJob
 *
 * After an analysis run completes, scan its ToolExecution.evidence for findings
 * that have repairRequired === true, then create a RepairJob + Finding rows in the
 * repair domain.  The sourceFindingKey on each new Finding is the same synthetic
 * ID that FindingService.list() produces (${execution.command}:${message}), so the
 * frontend can correlate analysis findings → repair findings without ambiguity.
 *
 * Designed to be idempotent: if a RepairJob already exists for the run, it returns
 * the existing job and does not create duplicates.
 */
export class RepairBridgeService {
  private static mapSeverity(sev: string): string {
    const m = sev?.toUpperCase();
    if (m === "CRITICAL" || m === "HIGH") return m;
    if (m === "MEDIUM" || m === "LOW") return m;
    return "INFO";
  }

  static async bridgeRunToRepairJob(
    ownerId: string,
    analysisRunId: string,
  ): Promise<RepairBridgeResult> {
    // Mark bridge as pending at start
    await prisma.analysisRun.update({
      where: { id: analysisRunId },
      data: { bridgeStatus: "PENDING" as RepairBridgeStatus, bridgeError: null },
    });

    try {
      // --- Idempotency check ---
      const existingJob = await prisma.repairJob.findFirst({
        where: { analysisRunId },
        select: { id: true },
      });
      if (existingJob) {
        await prisma.analysisRun.update({
          where: { id: analysisRunId },
          data: { bridgeStatus: "COMPLETED" as RepairBridgeStatus },
        });
        // Audit: bridge already existed (success)
        await AuditLogger.record(
          ownerId,
          "BRIDGE_CREATE",
          "AnalysisRun",
          analysisRunId,
          { jobId: existingJob.id, alreadyExisted: true },
          true,
        );
        return { jobId: existingJob.id, created: false, findingCount: 0 };
      }

      // --- Load the run + its tool executions ---
      const run = await prisma.analysisRun.findFirst({
        where: { id: analysisRunId, project: { ownerId } },
        select: { id: true, projectId: true, repositoryId: true, ref: true },
      });
      if (!run) {
        throw new ApiError(404, "Analysis run not found or access denied.");
      }

      const executions = await prisma.toolExecution.findMany({
        where: { analysisRunId },
        orderBy: { createdAt: "asc" },
        select: { command: true, evidence: true },
      });

      // --- Build findings, replicating FindingService.list() synthetic key ---
      const rawFindings: Array<{
        sourceFindingKey: string;
        category: string;
        severity: string;
        message: string;
        repairRequired: boolean;
      }> = [];

      for (const execution of executions) {
        const evidence = Array.isArray(execution.evidence)
          ? (execution.evidence as Array<{
              id?: string;
              tool?: string;
              message?: string;
              severity?: string;
              repairRequired?: boolean;
            }>)
          : [];

        for (const item of evidence) {
          const syntheticKey: string =
            item.id ?? `${execution.command}:${item.message ?? "finding"}`;

          rawFindings.push({
            sourceFindingKey: syntheticKey,
            category: item.tool ?? execution.command,
            severity: RepairBridgeService.mapSeverity(item.severity ?? "info"),
            message: item.message ?? "Evidence reported by deterministic tool.",
            repairRequired: item.repairRequired ?? false,
          });
        }
      }

      // --- Keep only findings that the agent flagged as repair-needed ---
      const repairable = rawFindings.filter((f) => f.repairRequired);
      if (repairable.length === 0) {
        await prisma.analysisRun.update({
          where: { id: analysisRunId },
          data: { bridgeStatus: "COMPLETED" as RepairBridgeStatus },
        });
        // Audit: bridge completed with no repairable findings
        await AuditLogger.record(
          ownerId,
          "BRIDGE_CREATE",
          "AnalysisRun",
          analysisRunId,
          { reason: "no_repairable_findings", repairableCount: 0 },
          true,
        );
        return { jobId: null, created: false, findingCount: 0, reason: "no_repairable_findings" };
      }

      // --- Create RepairJob ---
      const job = await prisma.repairJob.create({
        data: {
          analysisRunId: run.id,
          projectId: run.projectId,
          repositoryId: run.repositoryId ?? "",
          ref: run.ref ?? "HEAD",
          status: "COMPLETED",
        },
      });

      // --- Create Finding rows in the repair domain ---
      await prisma.finding.createMany({
        data: repairable.map((f) => ({
          repairJobId: job.id,
          category: f.category,
          severity: f.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
          confidence: 0.8,
          title: f.message,
          description: f.message,
          evidence: [{ id: f.sourceFindingKey }],
          filePath: "repository",
          detectionSource: f.category,
          status: "OPEN",
          sourceFindingKey: f.sourceFindingKey,
          analysisRunId: run.id,
        })),
      });

      // Mark bridge as completed
      await prisma.analysisRun.update({
        where: { id: analysisRunId },
        data: { bridgeStatus: "COMPLETED" as RepairBridgeStatus },
      });

      // Audit: bridge created successfully
      await AuditLogger.record(
        ownerId,
        "BRIDGE_CREATE",
        "AnalysisRun",
        analysisRunId,
        { jobId: job.id, findingCount: repairable.length },
        true,
      );

      return {
        jobId: job.id,
        created: true,
        findingCount: repairable.length,
      };
    } catch (err) {
      // Mark bridge as failed with error message
      const errorMsg = err instanceof Error ? err.message : String(err);
      await prisma.analysisRun.update({
        where: { id: analysisRunId },
        data: {
          bridgeStatus: "FAILED" as RepairBridgeStatus,
          bridgeError: errorMsg.slice(0, 500),
        },
      });

      // Audit: bridge creation failed
      await AuditLogger.record(
        ownerId,
        "BRIDGE_CREATE",
        "AnalysisRun",
        analysisRunId,
        { reason: errorMsg.slice(0, 200), repairableCount: 0 },
        false,
      );

      throw err;
    }
  }
}