import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

/**
 * Analysis-domain Finding — what FindingService.list() returns.
 * Not the same as the repair-domain Finding (repair.types.ts).
 */
export interface AnalysisFinding {
  id: string;
  source: string;
  status: string;
  severity: string;
  message: string;
  packageName?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  code?: string;
  sourceFindingKey: string; // Same as id — the synthetic key
}

export interface AnalysisFindingWithRepairMeta extends AnalysisFinding {
  repairFindingId?: string; // Repair-domain Finding.id matched via sourceFindingKey
  bridgeStatus?: "PENDING" | "COMPLETED" | "FAILED"; // Status of bridge creation for this run
  bridgeError?: string; // Error message if bridge failed
}

export type FindingQuery = {
  severity?: string;
  source?: string;
  file?: string;
  status?: string;
};

export type StoredEvidence = {
  id?: string;
  tool?: string;
  status?: string;
  message?: string;
  severity?: string;
  packageName?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  code?: string;
  repairRequired?: boolean;
};

export class FindingService {
  private static async ensureOwner(
    ownerId: string,
    runId: string,
  ) {
    const run = await prisma.analysisRun.findFirst({
      where: {
        id: runId,
        project: { ownerId },
      },
      select: { id: true },
    });

    if (!run) {
      throw new ApiError(
        404,
        "Analysis run not found or access denied.",
      );
    }
  }

  static async list(
    ownerId: string,
    runId: string,
    query: FindingQuery = {},
  ) {
    await this.ensureOwner(ownerId, runId);
    return this.listWithRepairMeta(ownerId, runId, query);
  }

  /**
   * Returns analysis-domain findings enriched with repair-domain metadata.
   * For each finding, if a RepairJob exists for this run and a repair
   * Finding has a matching sourceFindingKey, the repair Finding's id is
   * returned as repairFindingId so the frontend can call /repairs
   * endpoints with the correct id.
   */
  static async listWithRepairMeta(
    ownerId: string,
    runId: string,
    query: FindingQuery = {},
  ): Promise<AnalysisFindingWithRepairMeta[]> {
    await this.ensureOwner(ownerId, runId);

    const executions = await prisma.toolExecution.findMany({
      where: { analysisRunId: runId },
      orderBy: { createdAt: "asc" },
      select: { command: true, evidence: true },
    });

    const findings = executions.flatMap((execution) => {
      const evidence = Array.isArray(execution.evidence)
        ? execution.evidence as StoredEvidence[]
        : [];
      return evidence.map((item) => ({
        id: item.id ?? `${execution.command}:${item.message ?? "finding"}`,
        source: item.tool ?? execution.command,
        status: item.status ?? "failed",
        severity: item.severity ?? "info",
        message: item.message ?? "Evidence reported by deterministic tool.",
        packageName: item.packageName,
        filePath: item.filePath,
        lineStart: item.lineStart,
        lineEnd: item.lineEnd,
        code: item.code,
        sourceFindingKey: item.id ?? `${execution.command}:${item.message ?? "finding"}`,
      }));
    });

    const filtered = findings.filter((finding) =>
      (!query.severity || finding.severity === query.severity) &&
      (!query.source || finding.source === query.source) &&
      (!query.file || finding.filePath?.includes(query.file)) &&
      (!query.status || finding.status === query.status)
    );

    // Enrich with repair-domain metadata
    const enriched: AnalysisFindingWithRepairMeta[] = filtered.map((f) => ({ ...f, sourceFindingKey: (f as AnalysisFinding).sourceFindingKey }));

    // Load repair job + bridge status for this run
    const job = await prisma.repairJob.findFirst({
      where: { analysisRunId: runId },
      select: { id: true, findings: { select: { id: true, sourceFindingKey: true } } },
    });
    const bridgeStatusRecord = await prisma.analysisRun.findFirst({
      where: { id: runId },
      select: { bridgeStatus: true, bridgeError: true },
    });

    if (job) {
      const repairMap = new Map(job.findings.map((rf) => [rf.sourceFindingKey, rf.id]));
      for (const f of enriched) {
        const repairId = repairMap.get(f.sourceFindingKey);
        if (repairId) f.repairFindingId = repairId;
      }
    }

    if (bridgeStatusRecord) {
      for (const f of enriched) {
        f.bridgeStatus = bridgeStatusRecord.bridgeStatus;
        f.bridgeError = bridgeStatusRecord.bridgeError ?? undefined;
      }
    }

    return enriched;
  }

  static async score(ownerId: string, runId: string) {
    const findings = await this.list(ownerId, runId);
    const penalties: Record<string, number> = {
      critical: 20,
      high: 10,
      moderate: 5,
      medium: 5,
      low: 2,
      info: 0,
    };
    const deduction = findings.reduce(
      (total, finding) => total + (penalties[finding.severity] ?? 0),
      0,
    );

    return {
      runId,
      score: Math.max(0, 100 - deduction),
      scoringVersion: "phase6-v1",
      findingCount: findings.length,
      evaluatedAt: new Date(),
    };
  }
}
