import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export type FindingQuery = {
  severity?: string;
  source?: string;
  file?: string;
  status?: string;
};

type StoredEvidence = {
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
      }));
    });

    return findings.filter((finding) =>
      (!query.severity || finding.severity === query.severity) &&
      (!query.source || finding.source === query.source) &&
      (!query.file || finding.filePath?.includes(query.file)) &&
      (!query.status || finding.status === query.status)
    );
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
