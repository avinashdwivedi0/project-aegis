import fs from "fs/promises";
import path from "path";

import { prisma } from "../../../config/prisma";

import {
  testReportSchema,
  type TestReport,
} from "./test-report.types";

type StoredTest = {
  title: string;
  status: "passed" | "failed" | "skipped" | "timedOut";
  durationMs: number;
};

type StoredRun = {
  runId: string;
  repositoryId?: string;
  createdAt: string;
  status: TestReport["runHistory"][number]["status"];
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  tests: StoredTest[];
};

export class TestReportService {
  constructor(
    private readonly resultsRoot = path.resolve(
      process.cwd(),
      "results",
      "playwright",
    ),
  ) {}

  async get(ownerId: string, repositoryId: string): Promise<TestReport> {
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        project: { ownerId },
      },
      select: { id: true },
    });

    if (!repository) {
      throw new Error("Repository not found or access denied.");
    }

    const runs = await this.readRuns(repositoryId);
    const runHistory = runs.map((run) => ({
      runId: run.runId,
      status: run.status,
      total: run.total,
      passed: run.passed,
      failed: run.failed,
      skipped: run.skipped,
      passRate: run.total === 0 ? 0 : run.passed / run.total,
      durationMs: run.durationMs,
      createdAt: this.runCreatedAt(run),
    }));
    const flakyTests = this.buildFlakyTests(runs);
    const slowTests = this.buildSlowTests(runs);
    const latest = runs[runs.length - 1];
    const reasons: string[] = [];

    if (!latest || latest.status !== "passed") {
      reasons.push("The latest test run is not fully passing.");
    }
    if (flakyTests.length > 0) {
      reasons.push("Flaky tests require review.");
    }
    if (slowTests.some((test) => test.averageDurationMs > 30_000)) {
      reasons.push("Some tests exceed the 30 second average duration target.");
    }

    const latestPassRate = runHistory.at(-1)?.passRate ?? 0;
    const score = Math.max(
      0,
      Math.round(
        latestPassRate * 100 -
          flakyTests.length * 5 -
          slowTests.filter((test) => test.averageDurationMs > 30_000).length * 3,
      ),
    );

    return testReportSchema.parse({
      repositoryId,
      runHistory,
      passRateTrend: runHistory.map((run) => ({
        runId: run.runId,
        createdAt: run.createdAt,
        passRate: run.passRate,
      })),
      flakyTests,
      slowTests,
      releaseReadiness: {
        ready: reasons.length === 0 && runs.length > 0,
        score,
        reasons,
      },
    });
  }

  private async readRuns(repositoryId: string): Promise<StoredRun[]> {
    let entries: Array<import("fs").Dirent>;
    try {
      entries = await fs.readdir(this.resultsRoot, {
        withFileTypes: true,
      });
    } catch {
      return [];
    }

    const runs: StoredRun[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = await fs.readFile(
          path.join(this.resultsRoot, entry.name, "run.json"),
          "utf8",
        );
        const run = JSON.parse(raw) as StoredRun;
        if (run.repositoryId === repositoryId) {
          runs.push(run);
        }
      } catch {
        // Ignore incomplete or corrupted run manifests.
      }
    }

    return runs.sort((left, right) =>
      this.runCreatedAt(left).localeCompare(this.runCreatedAt(right)),
    );
  }

  private runCreatedAt(run: StoredRun): string {
    return run.createdAt;
  }

  private buildFlakyTests(runs: StoredRun[]) {
    const tests = new Map<string, { runs: number; failures: number }>();
    for (const run of runs) {
      for (const test of run.tests) {
        const current = tests.get(test.title) ?? { runs: 0, failures: 0 };
        current.runs += 1;
        if (test.status === "failed" || test.status === "timedOut") {
          current.failures += 1;
        }
        tests.set(test.title, current);
      }
    }

    return [...tests.entries()]
      .filter(([, value]) => value.runs >= 2 && value.failures > 0 && value.failures < value.runs)
      .map(([title, value]) => ({
        title,
        runs: value.runs,
        failures: value.failures,
        failureRate: value.failures / value.runs,
      }))
      .sort((left, right) => right.failureRate - left.failureRate);
  }

  private buildSlowTests(runs: StoredRun[]) {
    const tests = new Map<string, { total: number; runs: number }>();
    for (const run of runs) {
      for (const test of run.tests) {
        const current = tests.get(test.title) ?? { total: 0, runs: 0 };
        current.total += test.durationMs;
        current.runs += 1;
        tests.set(test.title, current);
      }
    }

    return [...tests.entries()]
      .map(([title, value]) => ({
        title,
        averageDurationMs: value.total / value.runs,
        runs: value.runs,
      }))
      .sort((left, right) => right.averageDurationMs - left.averageDurationMs)
      .slice(0, 10);
  }
}

export const testReportService = new TestReportService();