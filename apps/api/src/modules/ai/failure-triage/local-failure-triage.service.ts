import crypto from "node:crypto";

import {
  failureTriageInputSchema,
  failureTriageOutputSchema,
  type FailureGroup,
  type FailureInput,
  type FailureTriageInput,
  type FailureTriageOutput,
} from "./failure-triage.types";

/**
 * LocalFailureTriageService provides zero-cost root cause analysis
 * using deterministic pattern matching instead of LLM calls.
 *
 * Activated via AGENT_MODE=local. Produces deterministic results
 * with no external API calls.
 */
export class LocalFailureTriageService {
  async triage(
    input: FailureTriageInput,
  ): Promise<FailureTriageOutput & { failureGroups: FailureGroup[] }> {
    const validatedInput = failureTriageInputSchema.parse(input);
    const failureGroups = this.groupFailures(validatedInput.failures);

    const groups = failureGroups.map((group) => {
      const classification = this.classifyGroup(group);
      return {
        groupId: group.groupId,
        classification: classification.type,
        reasoning: classification.rootCause,
      };
    });

    const output: FailureTriageOutput = {
      contractVersion: "1.0",
      groups,
    };

    // Validate against schema
    failureTriageOutputSchema.parse(output);

    return { ...output, failureGroups };
  }

  /**
   * Correlate failures with recent commits
   */
  async correlateWithCommits(
    repositoryId: string,
    failures: FailureInput[],
  ): Promise<Array<{ failureId: string; commits: string[]; likelyCause: string }>> {
    const results: Array<{ failureId: string; commits: string[]; likelyCause: string }> = [];

    for (const failure of failures) {
      const commits = await this.getRelevantCommits(repositoryId);
      const likelyCause = this.inferCauseFromCommits(failure, commits);
      results.push({
        failureId: failure.id,
        commits: commits.map((c) => c.hash ?? c.message ?? ""),
        likelyCause,
      });
    }

    return results;
  }

  /**
   * Auto-file bug reports for confirmed regressions
   */
  async generateBugReport(
    failureId: string,
    failure: FailureInput,
    reproductionSteps: string[],
  ): Promise<{
    id: string;
    title: string;
    description: string;
    severity: string;
    stepsToReproduce: string[];
    evidence: Record<string, unknown>;
  }> {
    const severity = this.assessSeverity(failure);

    return {
      id: `BUG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      title: `[Auto] ${failure.message.slice(0, 80)}`,
      description: this.buildBugDescription(failure, reproductionSteps),
      severity,
      stepsToReproduce: reproductionSteps,
      evidence: {
        stackTrace: failure.stackTrace,
        screenshot: failure.screenshot,
        errorType: this.classifyError(failure.message),
      },
    };
  }

  /**
   * Detect flaky tests vs genuine regressions
   */
  async classifyFlakiness(
    failures: FailureInput[],
  ): Promise<Array<{ failureId: string; type: "flaky" | "regression"; confidence: number; reason: string }>> {
    const results: Array<{
      failureId: string;
      type: "flaky" | "regression";
      confidence: number;
      reason: string;
    }> = [];

    for (const failure of failures) {
      const isFlaky = this.detectFlakySignals(failure);

      results.push({
        failureId: failure.id,
        type: isFlaky.flaky ? "flaky" : "regression",
        confidence: isFlaky.confidence,
        reason: isFlaky.reason,
      });
    }

    return results;
  }

  // Private methods

  private groupFailures(failures: FailureInput[]): FailureGroup[] {
    const groups: Array<{
      failures: FailureInput[];
      tokens: Set<string>;
    }> = [];

    for (const failure of failures) {
      const tokens = this.tokens(failure);
      const matchingGroup = groups.find((group) =>
        this.similarity(tokens, group.tokens) >= 0.7,
      );

      if (matchingGroup) {
        matchingGroup.failures.push(failure);
        matchingGroup.tokens = new Set([
          ...matchingGroup.tokens,
          ...tokens,
        ]);
      } else {
        groups.push({ failures: [failure], tokens });
      }
    }

    return groups.map((group, index) => {
      const representative = group.failures[0];
      return {
        groupId: `FAIL-GRP-${String(index + 1).padStart(3, "0")}`,
        failureIds: group.failures.map((f) => f.id),
        representativeFailureId: representative.id,
        duplicateCount: group.failures.length,
        message: representative.message,
        stackTrace: representative.stackTrace,
        screenshot: representative.screenshot,
      };
    });
  }

  private tokens(failure: FailureInput): Set<string> {
    return new Set(
      `${failure.message} ${failure.stackTrace}`
        .toLowerCase()
        .replace(/[^a-z0-9_./:-]+/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3),
    );
  }

  private similarity(left: Set<string>, right: Set<string>): number {
    const intersection = [...left].filter((token) => right.has(token)).length;
    const union = new Set([...left, ...right]).size;
    return union === 0 ? 1 : intersection / union;
  }

  private classifyGroup(group: FailureGroup): {
    rootCause: string;
    action: string;
    type: "real_bug" | "locator_change" | "flaky" | "environment_issue";
  } {
    const messages = group.message.toLowerCase();
    const stackTrace = group.stackTrace ?? "";

    const flakyIndicators = [
      /timed out/i,
      /timeout/i,
      /network error/i,
      /connection reset/i,
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /retry/i,
      /race condition/i,
    ];

    const regressionIndicators = [
      /assertion failed/i,
      /expected.*to.*be/i,
      /cannot read.*undefined/i,
      /null pointer/i,
      /type error/i,
      /module not found/i,
      /no such file/i,
    ];

    const locatorIndicators = [
      /locator/i,
      /selector/i,
      /not found/i,
      /getbyrole/i,
      /getbytext/i,
      /getbylabel/i,
      /getElement/i,
      /querySelector/i,
    ];

    const hasFlakySignal = flakyIndicators.some((r) => r.test(messages) || r.test(stackTrace));
    const hasRegressionSignal = regressionIndicators.some((r) => r.test(messages) || r.test(stackTrace));
    const hasLocatorSignal = locatorIndicators.some((r) => r.test(messages) || r.test(stackTrace));

    if (hasFlakySignal && !hasRegressionSignal) {
      return {
        rootCause: "Flaky test - environment-dependent failure (timeout, network, race condition)",
        action: "Mark as flaky and schedule retry; do not block the pipeline",
        type: "flaky",
      };
    }

    if (hasLocatorSignal) {
      return {
        rootCause: "Locator change - selector no longer matches DOM elements",
        action: "Use self-healing to propose updated locators",
        type: "locator_change",
      };
    }

    if (hasRegressionSignal) {
      return {
        rootCause: "Regression - assertion or logic failure in production code",
        action: "Block the pipeline, auto-file bug report, and bisect commits",
        type: "real_bug",
      };
    }

    return {
      rootCause: "Unknown - requires manual investigation",
      action: "Review failure details and investigate",
      type: "environment_issue",
    };
  }

  private async getRelevantCommits(
    repositoryId: string,
  ): Promise<Array<{ hash: string; message: string; date: Date }>> {
    try {
      const { prisma } = await import("../../../config/prisma");
      const repo = await prisma.repository.findUnique({
        where: { id: repositoryId },
        select: { workspacePath: true },
      });

      if (!repo?.workspacePath) return [];

      const { simpleGit } = await import("simple-git");
      const git = simpleGit(repo.workspacePath);
      const logs = await git.log(["-10"]);

      return logs.all.map((log: { hash: string; message: string; date: string | Date }) => ({
        hash: log.hash,
        message: log.message,
        date: log.date instanceof Date ? log.date : new Date(log.date),
      }));
    } catch {
      return [];
    }
  }

  private inferCauseFromCommits(
    failure: FailureInput,
    commits: Array<{ hash: string; message: string }>,
  ): string {
    const keywords = ["fix", "bug", "error", "change", "update", "refactor"];
    for (const commit of commits) {
      if (keywords.some((kw) => commit.message.toLowerCase().includes(kw))) {
        return `Recent commit ${commit.hash}: ${commit.message.slice(0, 80)}`;
      }
    }
    return "No clear commit correlation found";
  }

  private assessSeverity(failure: FailureInput): string {
    const msg = `${failure.message} ${failure.stackTrace ?? ""}`.toLowerCase();
    if (/critical|fatal|security|auth|permission|leaked|breach/i.test(msg)) {
      return "critical";
    }
    if (/error|exception|assertion|failed/i.test(msg)) {
      return "high";
    }
    return "medium";
  }

  private buildBugDescription(
    failure: FailureInput,
    steps: string[],
  ): string {
    return [
      "## Auto-generated Bug Report",
      "",
      `**Title:** ${failure.message}`,
      "",
      `**Severity:** ${this.assessSeverity(failure)}`,
      "",
      "**Stack Trace:**",
      "```",
      failure.stackTrace ?? "N/A",
      "```",
      "",
      "**Reproduction Steps:**",
      ...steps.map((s, i) => `${i + 1}. ${s}`),
      "",
      "**Evidence:**",
      `- Screenshot available: ${failure.screenshot ? "Yes" : "No"}`,
    ].join("\n");
  }

  private classifyError(message: string): string {
    if (/assertion|expected/i.test(message)) return "AssertionError";
    if (/timeout|timed out/i.test(message)) return "TimeoutError";
    if (/not found|no such file/i.test(message)) return "NotFoundError";
    if (/null|undefined/i.test(message)) return "ReferenceError";
    if (/network|connection/i.test(message)) return "NetworkError";
    return "UnknownError";
  }

  private detectFlakySignals(failure: FailureInput): { flaky: boolean; confidence: number; reason: string } {
    const msg = `${failure.message} ${failure.stackTrace ?? ""}`;
    const flakyPatterns = [
      /timed out/i, /timeout/i, /network error/i, /ECONNREFUSED/i,
      /ETIMEDOUT/i, /retry/i, /race condition/i, /intermittent/i,
    ];

    const flakyCount = flakyPatterns.filter((p) => p.test(msg)).length;
    const confidence = Math.min(1, flakyCount / flakyPatterns.length);

    return {
      flaky: flakyCount >= 2,
      confidence,
      reason: flakyCount >= 2
        ? `Detected ${flakyCount} flaky signals in failure message`
        : "Insufficient flaky signals detected",
    };
  }
}

export const localFailureTriageService = new LocalFailureTriageService();
