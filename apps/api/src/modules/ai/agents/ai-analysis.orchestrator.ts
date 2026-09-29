import { prisma } from "../../../config/prisma";
import { aiConfig } from "../../../config/ai.config";

import { AgentExecutorService } from "./agent.executor";
import { GroqAgentProvider } from "./gemini.provider";
import { LocalAgentProvider } from "../providers/local.provider";
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

import { AnalysisEventService } from "../../analysis/analysis-event.service";

const agentModel =
  process.env.GROQ_CHAT_MODEL ?? aiConfig.chatModel;

export class AiAnalysisOrchestrator {
  private static readonly provider =
    process.env.AGENT_MODE === "local"
      ? new LocalAgentProvider()
      : new GroqAgentProvider();

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

    const agentKeys = [
      "codeQuality", "security", "dependency", "test",
      "api", "ui", "performance", "report",
    ];

    // Emit AGENT_STARTED events before running agents
    for (const agentKey of agentKeys) {
      await AnalysisEventService.record({
        analysisRunId,
        type: "AGENT_STARTED",
        agentRole: agentKey,
        message: `${agentKey} agent started`,
        progress: 0,
      });
    }

    // Run agents with Promise.allSettled for failure isolation
    // Each agent is wrapped so its completion/failure event is recorded
    // as soon as THAT agent finishes, not after all have finished.
    const runAgent = async (
      agentKey: string,
      fn: () => Promise<AgentOutput>,
    ): Promise<AgentOutput> => {
      try {
        const output = await fn();
        await AnalysisEventService.record({
          analysisRunId,
          type: "AGENT_COMPLETED",
          agentRole: agentKey,
          message: `${agentKey} agent completed successfully`,
          progress: 100,
        });
        await AiAnalysisOrchestrator.persistOutput(analysisRunId, output);
        return output;
      } catch (reason) {
        await AnalysisEventService.record({
          analysisRunId,
          type: "AGENT_FAILED",
          agentRole: agentKey,
          message: `${agentKey} agent failed: ${reason instanceof Error ? reason.message : "unknown error"}`,
          progress: 0,
        });
        throw reason;
      }
    };

    const outputs = await Promise.allSettled([
      runAgent("codeQuality", () => services.codeQuality.analyze(commonInput)),
      runAgent("security", () => services.security.analyze(commonInput)),
      runAgent("dependency", () => services.dependency.analyze(commonInput)),
      runAgent("test", () => services.test.analyze(commonInput)),
      runAgent("api", () => services.api.analyze(commonInput)),
      runAgent("ui", () => services.ui.analyze(commonInput)),
      runAgent("performance", () => services.performance.analyze(commonInput)),
      runAgent("report", () => services.report.analyze(commonInput)),
    ]);

    // Extract successful outputs
    const fulfilledOutputs: AgentOutput[] = [];
    for (const output of outputs) {
      if (output.status === "fulfilled") {
        fulfilledOutputs.push(output.value);
      }
    }

    return fulfilledOutputs;
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