import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { FindingService } from "../analysis/finding.service";
import { AnalysisService } from "../analysis/analysis.service";

export class ReportService {
  static async getAnalysisReport(ownerId: string, runId: string) {
    const run = await AnalysisService.get(ownerId, runId);
    const [summary, findings, score] = await Promise.all([
      AnalysisService.summary(ownerId, runId),
      FindingService.list(ownerId, runId),
      FindingService.score(ownerId, runId),
    ]);

    const repository = await prisma.repository.findUnique({
      where: { id: run.repositoryId },
      select: { name: true, provider: true, url: true },
    });
    if (!repository) throw new ApiError(404, "Repository not found.");

    return {
      reportVersion: "phase8-v1",
      generatedAt: new Date(),
      run: {
        id: run.id,
        ref: run.ref,
        status: run.status,
        progress: run.progress,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      },
      repository,
      summary,
      score,
      findings,
    };
  }

  static toMarkdown(report: Awaited<ReturnType<typeof ReportService.getAnalysisReport>>) {
    const lines = [
      "# Project Aegis Analysis Report",
      "",
      `- Report version: ${report.reportVersion}`,
      `- Generated: ${report.generatedAt.toISOString()}`,
      `- Repository: ${escapeMarkdown(report.repository.name)}`,
      `- Reference: ${escapeMarkdown(report.run.ref)}`,
      `- Status: ${report.run.status}`,
      `- Quality score: ${report.score.score}%`,
      `- Findings: ${report.score.findingCount}`,
      "",
      "## Tool Summary",
      "",
      "| Tool | Status | Evidence |",
      "| --- | --- | ---: |",
      ...Object.entries(report.summary.tools).map(([tool, result]) =>
        `| ${escapeMarkdown(tool)} | ${escapeMarkdown(result.status)} | ${result.evidence} |`),
      "",
      "## Findings",
      "",
      ...(report.findings.length === 0
        ? ["No findings were reported."]
        : report.findings.map((finding, index) =>
          `${index + 1}. **${escapeMarkdown(finding.severity)}** ${escapeMarkdown(finding.message)} (${escapeMarkdown(finding.source)})${formatLocation(finding.filePath, finding.lineStart)}`)),
      "",
    ];
    return lines.join("\n");
  }
}

function escapeMarkdown(value: string) {
  return value.replace(/[\\|*_]/g, "\\$&").replaceAll("`", "\\`");
}

function formatLocation(filePath?: string, lineStart?: number) {
  if (!filePath) return "";
  return ` - \`${escapeMarkdown(filePath)}${lineStart ? `:${lineStart}` : ""}\``;
}