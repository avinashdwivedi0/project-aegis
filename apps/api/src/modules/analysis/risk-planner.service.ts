import fs from "fs/promises";
import path from "path";
import crypto from "node:crypto";

import { prisma } from "../../config/prisma";
import { ExplorerService } from "../repositories/explorer.service";

export interface FileChange {
  path: string;
  changeType: "added" | "modified" | "deleted";
  linesAdded: number;
  linesRemoved: number;
}

export interface RiskAssessment {
  filePath: string;
  riskScore: number; // 0-100
  factors: string[];
  recommendedTests: string[];
}

export interface TestPlan {
  runId: string;
  prioritizedTests: PrioritizedTest[];
  totalTests: number;
  estimatedDurationMs: number;
}

export interface PrioritizedTest {
  testId: string;
  title: string;
  filePath: string;
  priority: "critical" | "high" | "medium" | "low";
  riskScore: number;
  reason: string;
}

/**
 * RiskBasedPlanner analyzes code changes and maps them to affected tests,
 * then prioritizes test execution based on risk.
 */
export class RiskBasedPlanner {
  static readonly RISK_FACTORS = {
    criticalPath: 30,      // Core business logic
    securitySensitive: 25, // Auth, payments, PII
    recentFailures: 20,    // Files with recent test failures
    highComplexity: 15,    // High cyclomatic complexity
    noCoverage: 20,        // Files with zero test coverage
    dependencyChange: 10,  // Changed dependencies
  };

  /**
   * Analyze git diff and compute risk scores for affected files
   */
  async assessRisk(
    projectId: string,
    repositoryId: string,
    baseRef: string = "HEAD~1",
    headRef: string = "HEAD",
  ): Promise<RiskAssessment[]> {
    const changes = await this.getGitChanges(repositoryId, baseRef, headRef);
    const repoFiles = await ExplorerService.getRepositoryFiles(repositoryId);
    const fileMap = new Map(repoFiles.map((f) => [f.path, f]));

    // Get recent test failures for this repository
    const recentFailures = await this.getRecentFailures(repositoryId);

    // Get test coverage data
    const coverage = await this.getCoverageData(repositoryId);

    // Get dependency changes
    const depChanges = await this.getDependencyChanges(repositoryId, baseRef, headRef);

    const assessments: RiskAssessment[] = [];

    for (const change of changes) {
      const file = fileMap.get(change.path);
      if (!file) continue;

      let riskScore = 0;
      const factors: string[] = [];

      // Factor: Critical path (business logic keywords in path)
      if (this.isCriticalPath(change.path)) {
        riskScore += RiskBasedPlanner.RISK_FACTORS.criticalPath;
        factors.push("critical-path");
      }

      // Factor: Security sensitive
      if (this.isSecuritySensitive(change.path)) {
        riskScore += RiskBasedPlanner.RISK_FACTORS.securitySensitive;
        factors.push("security-sensitive");
      }

      // Factor: Recent failures
      if (recentFailures.has(change.path)) {
        riskScore += RiskBasedPlanner.RISK_FACTORS.recentFailures;
        factors.push("recent-failures");
      }

      // Factor: High complexity (heuristic: file size + nesting)
      const complexity = this.estimateComplexity(file.content ?? "");
      if (complexity > 50) {
        riskScore += RiskBasedPlanner.RISK_FACTORS.highComplexity;
        factors.push("high-complexity");
      }

      // Factor: No coverage
      if (!coverage.has(change.path)) {
        riskScore += RiskBasedPlanner.RISK_FACTORS.noCoverage;
        factors.push("no-coverage");
      }

      // Factor: Dependency changes
      if (depChanges.some((d) => this.affectsFile(d, change.path))) {
        riskScore += RiskBasedPlanner.RISK_FACTORS.dependencyChange;
        factors.push("dependency-change");
      }

      // Cap at 100
      riskScore = Math.min(100, riskScore);

      // Recommend related test files
      const recommendedTests = this.findRelatedTests(change.path, repoFiles);

      assessments.push({
        filePath: change.path,
        riskScore,
        factors,
        recommendedTests,
      });
    }

    // Sort by risk score descending
    return assessments.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Generate a prioritized test plan from risk assessments
   */
  async createTestPlan(
    projectId: string,
    repositoryId: string,
    assessments: RiskAssessment[],
  ): Promise<TestPlan> {
    const runId = `plan-${crypto.randomUUID()}`;
    const allTests = await this.discoverAllTests(repositoryId);

    const prioritizedTests: PrioritizedTest[] = allTests.map((test) => {
      // Find matching risk assessment
      const assessment = assessments.find((a) =>
        a.recommendedTests.some((rt) => test.filePath.includes(rt) || rt.includes(test.filePath)),
      );

      const riskScore = assessment?.riskScore ?? 0;
      const factors = assessment?.factors ?? [];

      let priority: PrioritizedTest["priority"] = "low";
      if (riskScore >= 70) priority = "critical";
      else if (riskScore >= 50) priority = "high";
      else if (riskScore >= 30) priority = "medium";

      return {
        testId: test.id,
        title: test.title,
        filePath: test.filePath,
        priority,
        riskScore,
        reason: factors.length > 0
          ? `Risk factors: ${factors.join(", ")}`
          : "No specific risk factors identified",
      };
    });

    // Sort by priority then risk score
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    prioritizedTests.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.riskScore - a.riskScore;
    });

    return {
      runId,
      prioritizedTests,
      totalTests: prioritizedTests.length,
      estimatedDurationMs: prioritizedTests.length * 5000, // rough estimate
    };
  }

  /**
   * Prune redundant tests (tests that cover the same code paths)
   */
  async pruneRedundantTests(
    repositoryId: string,
    tests: PrioritizedTest[],
  ): Promise<PrioritizedTest[]> {
    const coverage = await this.getCoverageData(repositoryId);
    const testCoverageMap = new Map<string, Set<string>>();

    // Build test -> covered files map
    for (const test of tests) {
      const covered = coverage.get(test.filePath) ?? new Set();
      testCoverageMap.set(test.testId, covered);
    }

    // Find tests with overlapping coverage
    const toRemove = new Set<string>();
    const testIds = Array.from(testCoverageMap.keys());

    for (let i = 0; i < testIds.length; i++) {
      for (let j = i + 1; j < testIds.length; j++) {
        const covI = testCoverageMap.get(testIds[i]) ?? new Set();
        const covJ = testCoverageMap.get(testIds[j]) ?? new Set();

        const overlap = this.jaccardSimilarity(covI, covJ);
        if (overlap > 0.8) {
          // Remove the lower priority test
          const testI = tests.find((t) => t.testId === testIds[i]);
          const testJ = tests.find((t) => t.testId === testIds[j]);
          if (testI && testJ) {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const loser = priorityOrder[testI.priority] > priorityOrder[testJ.priority]
              ? testI.testId : testJ.testId;
            toRemove.add(loser);
          }
        }
      }
    }

    return tests.filter((t) => !toRemove.has(t.testId));
  }

  // Private helper methods

  private async getGitChanges(
    repositoryId: string,
    baseRef: string,
    headRef: string,
  ): Promise<FileChange[]> {
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { workspacePath: true },
    });

    if (!repo?.workspacePath) {
      return [];
    }

    try {
      const { simpleGit } = await import("simple-git");
      const git = simpleGit(repo.workspacePath);
      const diff = await git.diffSummary([baseRef, headRef]);

      return (diff.files as unknown as Array<{ file: string; type: string; insertions: number; deletions: number }>).map((f) => ({
        path: f.file,
        changeType: f.type === "created" ? "added" : f.type === "deleted" ? "deleted" : "modified",
        linesAdded: f.insertions,
        linesRemoved: f.deletions,
      }));
    } catch {
      // Git not available or error
      return [];
    }
  }

  private async getRecentFailures(repositoryId: string): Promise<Set<string>> {
    const failures = await prisma.toolExecution.findMany({
      where: {
        analysisRun: { repositoryId },
        status: "FAILED",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days
      },
      select: { evidence: true },
    });

    const failedFiles = new Set<string>();
    for (const execution of failures) {
      const evidence = Array.isArray(execution.evidence) ? execution.evidence : [];
      for (const item of evidence) {
        if (item && typeof item === "object" && "filePath" in item && typeof item.filePath === "string") {
          failedFiles.add(item.filePath);
        }
      }
    }
    return failedFiles;
  }

  private async getCoverageData(repositoryId: string): Promise<Map<string, Set<string>>> {
    // In a real implementation, this would come from a coverage tool
    // For now, return empty - tests would need to be run with coverage flag
    return new Map();
  }

  private async getDependencyChanges(
    repositoryId: string,
    baseRef: string,
    headRef: string,
  ): Promise<string[]> {
    // Check if package.json or lock files changed
    const changes = await this.getGitChanges(repositoryId, baseRef, headRef);
    return changes
      .filter((c) => c.path.match(/(package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json)$/))
      .map((c) => c.path);
  }

  private affectsFile(depChange: string, filePath: string): boolean {
    // Simplified: if package.json changed, it could affect any file
    return depChange === "package.json";
  }

  private isCriticalPath(filePath: string): boolean {
    const criticalPatterns = [
      /auth|login|password|session|token/i,
      /payment|checkout|billing|stripe|paypal/i,
      /api|route|handler|controller/i,
      /service|manager|provider/i,
      /database|db|repository|model/i,
    ];
    return criticalPatterns.some((p) => p.test(filePath));
  }

  private isSecuritySensitive(filePath: string): boolean {
    const securityPatterns = [
      /auth|login|password|secret|key|token|credential/i,
      /crypto|encrypt|decrypt|hash|sign/i,
      /permission|authorize|role|access/i,
      /middleware|guard|shield/i,
    ];
    return securityPatterns.some((p) => p.test(filePath));
  }

  private estimateComplexity(content: string): number {
    // Rough heuristic: count control flow keywords
    const keywords = [
      "if", "else", "for", "while", "switch", "case", "catch",
      "&&", "||", "?", ":", "try", "throw",
    ];
    let score = 0;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, "g");
      score += (content.match(regex) ?? []).length;
    }
    return score;
  }

  private findRelatedTests(
    filePath: string,
    repoFiles: Array<{ path: string }>,
  ): string[] {
    const baseName = path.basename(filePath, path.extname(filePath));
    const dirName = path.dirname(filePath);

    return repoFiles
      .filter(
        (f) =>
          f.path.includes("test") ||
          f.path.includes("spec") ||
          f.path.includes("__tests__"),
      )
      .filter(
        (f) =>
          f.path.includes(baseName) ||
          f.path.startsWith(`${dirName}/`) ||
          f.path.startsWith(`${dirName}/__tests__/`),
      )
      .map((f) => f.path)
      .slice(0, 10);
  }

  private async discoverAllTests(
    repositoryId: string,
  ): Promise<Array<{ id: string; title: string; filePath: string }>> {
    const repoFiles = await ExplorerService.getRepositoryFiles(repositoryId);
    return repoFiles
      .filter(
        (f) =>
          f.path.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/i) ||
          f.path.includes("/__tests__/"),
      )
      .map((f) => ({
        id: `test-${crypto.randomUUID().slice(0, 8)}`,
        title: f.path,
        filePath: f.path,
      }));
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const union = new Set([...a, ...b]);
    return intersection.size / union.size;
  }
}

export const riskBasedPlanner = new RiskBasedPlanner();