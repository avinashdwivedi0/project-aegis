import { prisma } from "../../../config/prisma";
import { aiConfig } from "../../../config/ai.config";

import { AgentExecutorService } from "./agent.executor";
import { GroqAgentProvider } from "./gemini.provider";
import { ProjectAnalyzerService } from "./project-analyzer.service";
import { CodeQualityAgentService } from "./code-quality.service";
import { SecurityAgentService } from "./security.service";
import { DependencyAgentService } from "./dependency.service";
import { TestAgentService } from "./test.service";
import { ApiAgentService } from "./api.service";
import { UiAccessibilityAgentService } from "./ui-accessibility.service";
import { PerformanceAgentService } from "./performance.service";
import { ReportAgentService } from "./report.service";

import type { AgentOutput } from "./agent.types";
import type { ToolEvidence } from "../../analysis/tool-adapter.types";

const agentModel =
  process.env.GROQ_CHAT_MODEL ?? aiConfig.chatModel;

export class AiAnalysisOrchestrator {
  private static readonly provider =
    new GroqAgentProvider();

  private static readonly executor =
    new AgentExecutorService(
      AiAnalysisOrchestrator.provider,
    );

  private static readonly projectAnalyzer =
    new ProjectAnalyzerService();

  static async run(
    analysisRunId: string,
    workspace: string,
  ): Promise<AgentOutput[]> {
    const run = await prisma.analysisRun.findUnique({
      where: { id: analysisRunId },
      select: {
        id: true,
        projectId: true,
        repositoryId: true,
      },
    });

    if (!run) {
      throw new Error("Analysis run not found.");
    }

    const executions = await prisma.toolExecution.findMany({
      where: {
        analysisRunId,
      },
      select: {
        command: true,
        evidence: true,
      },
    });

    const evidence = executions.flatMap((execution) =>
      AiAnalysisOrchestrator.toAgentEvidence(
        execution.command,
        execution.evidence,
      ),
    );
    const projectProfile = await AiAnalysisOrchestrator.projectAnalyzer
      .analyze(workspace);
    const commonInput = {
      runId: run.id,
      projectId: run.projectId,
      repositoryId: run.repositoryId,
      projectProfile:
        projectProfile as unknown as Record<string, unknown>,
      evidence,
      model: agentModel,
    };
    const services = {
      codeQuality: new CodeQualityAgentService(
        AiAnalysisOrchestrator.executor,
      ),
      security: new SecurityAgentService(
        AiAnalysisOrchestrator.executor,
      ),
      dependency: new DependencyAgentService(
        AiAnalysisOrchestrator.executor,
      ),
      test: new TestAgentService(
        AiAnalysisOrchestrator.executor,
      ),
      api: new ApiAgentService(
        AiAnalysisOrchestrator.executor,
      ),
      ui: new UiAccessibilityAgentService(
        AiAnalysisOrchestrator.executor,
      ),
      performance: new PerformanceAgentService(
        AiAnalysisOrchestrator.executor,
      ),
      report: new ReportAgentService(
        AiAnalysisOrchestrator.executor,
      ),
    };

    const outputs = await Promise.all([
      services.codeQuality.analyze(commonInput),
      services.security.analyze(commonInput),
      services.dependency.analyze(commonInput),
      services.test.analyze(commonInput),
      services.api.analyze(commonInput),
      services.ui.analyze(commonInput),
      services.performance.analyze(commonInput),
      services.report.analyze(commonInput),
    ]);

    await Promise.all(
      outputs.map((output) =>
        AiAnalysisOrchestrator.persistOutput(
          analysisRunId,
          output,
        ),
      ),
    );

    return outputs;
  }

  private static toAgentEvidence(
    tool: string,
    rawEvidence: unknown,
  ): ToolEvidence[] {
    if (!Array.isArray(rawEvidence)) {
      return [];
    }

    return rawEvidence.flatMap((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as { id?: unknown }).id !== "string" ||
        typeof (item as { message?: unknown }).message !== "string"
      ) {
        return [];
      }

      const evidence = item as Partial<ToolEvidence>;

      return [{
        id: evidence.id as string,
        tool: evidence.tool ?? tool,
        toolVersion: evidence.toolVersion ?? "unknown",
        status: evidence.status ?? "completed",
        message: evidence.message as string,
        severity: evidence.severity,
        packageName: evidence.packageName,
        filePath: evidence.filePath,
        lineStart: evidence.lineStart,
        columnStart: evidence.columnStart,
        code: evidence.code,
      }];
    });
  }

  private static async persistOutput(
    analysisRunId: string,
    output: AgentOutput,
  ): Promise<void> {
    const evidence = [
      {
        id: `${output.agentId}:summary`,
        tool: `agent:${output.agentId}`,
        status: output.status,
        severity: "info",
        message: output.summary,
      },
      ...output.findings.map((finding) => ({
        id: finding.id,
        tool: `agent:${output.agentId}`,
        status: output.status,
        severity: finding.severity,
        message: `${finding.title}: ${finding.description}`,
        recommendation: finding.recommendation,
        confidence: finding.confidence,
        evidenceIds: finding.evidenceIds,
        filePath: finding.filePath,
        lineStart: finding.lineStart,
        lineEnd: finding.lineEnd,
        repairRequired: finding.repairRequired,
      })),
    ];

    await prisma.toolExecution.create({
      data: {
        analysisRunId,
        command: `agent:${output.agentId}`,
        args: [],
        status: output.status.toUpperCase(),
        stdout: output.summary,
        stderr: output.errorCode ?? output.skippedReason ?? "",
        durationMs: output.durationMs,
        evidence,
      },
    });
  }
}