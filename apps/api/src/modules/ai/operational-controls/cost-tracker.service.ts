import { prisma } from "../../../config/prisma";

/**
 * Zero-cost cost tracker - when AGENT_MODE=local, all costs are zero.
 * When using external LLMs, track usage and enforce budgets.
 */
export class CostTrackerService {
  private static readonly COST_PER_1K_TOKENS = {
    // Groq pricing (approximate)
    "openai/gpt-oss-120b": { input: 0.10, output: 0.30 },
    // Other models would be added here
  };

  static async trackUsage(
    analysisRunId: string,
    agentId: string,
    promptTokens: number,
    completionTokens: number,
  ): Promise<void> {
    // Zero-cost: when in local mode, all costs are zero — no DB writes needed
    if (CostTrackerService.isLocalMode()) {
      return;
    }

    const model = process.env.GROQ_CHAT_MODEL ?? "openai/gpt-oss-120b";
    const pricing = this.COST_PER_1K_TOKENS[model as keyof typeof this.COST_PER_1K_TOKENS] ?? {
      input: 0,
      output: 0,
    };

    const inputCost = (promptTokens / 1000) * pricing.input;
    const outputCost = (completionTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    await prisma.costLog.create({
      data: {
        analysisRunId,
        agentId,
        model,
        promptTokens,
        completionTokens,
        totalCost,
        currency: "USD",
      },
    });

    // Check if we've exceeded the budget (if set)
    await this.checkBudget(analysisRunId);
  }

  private static async checkBudget(analysisRunId: string): Promise<void> {
    const run = await prisma.analysisRun.findUnique({
      where: { id: analysisRunId },
      select: { id: true },
    });

    if (!run) return;

    const totalCost = await prisma.costLog.aggregate({
      where: { analysisRunId },
      _sum: { totalCost: true },
    });

    const budgetLimit = parseFloat(process.env.ANALYSIS_BUDGET_USD ?? "0");
    if (budgetLimit > 0 && (totalCost._sum.totalCost ?? 0) > budgetLimit) {
      // Mark run as over budget - in a real system, you might cancel or alert
      await prisma.analysisRun.update({
        where: { id: analysisRunId },
        data: { metadata: { overBudget: true } },
      });
    }
  }

  static async getTotalCost(analysisRunId: string): Promise<number> {
    const result = await prisma.costLog.aggregate({
      where: { analysisRunId },
      _sum: { totalCost: true },
    });
    return result._sum.totalCost ?? 0;
  }

  static async getProjectBudget(projectId: string): Promise<number> {
    const result = await prisma.costLog.aggregate({
      where: {
        analysisRun: { projectId },
      },
      _sum: { totalCost: true },
    });
    return result._sum.totalCost ?? 0;
  }

  /**
   * When in local mode, cost is always zero
   */
  static isLocalMode(): boolean {
    return process.env.AGENT_MODE?.trim() === "local";
  }

  static async getUsageReport(
    projectId: string,
    days: number = 30,
  ): Promise<{
    totalCost: number;
    totalTokens: number;
    runs: number;
    byAgent: Record<string, number>;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const costs = await prisma.costLog.groupBy({
      by: ["agentId"],
      where: {
        analysisRun: {
          projectId,
          createdAt: { gte: since },
        },
      },
      _sum: {
        totalCost: true,
        promptTokens: true,
        completionTokens: true,
      },
      _count: {
        analysisRunId: true,
      },
    });

    const totalCost = costs.reduce((sum: number, c: typeof costs[0]) => sum + (c._sum.totalCost ?? 0), 0);
    const totalTokens = costs.reduce(
      (sum: number, c: typeof costs[0]) => sum + (c._sum.promptTokens ?? 0) + (c._sum.completionTokens ?? 0),
      0,
    );
    const runs = costs.reduce((sum: number, c: typeof costs[0]) => sum + (c._count.analysisRunId ?? 0), 0);
    const byAgent = Object.fromEntries(
      costs.map((c: typeof costs[0]) => [c.agentId, c._sum.totalCost ?? 0]),
    );

    return { totalCost, totalTokens, runs, byAgent };
  }
}

export const costTrackerService = new CostTrackerService();