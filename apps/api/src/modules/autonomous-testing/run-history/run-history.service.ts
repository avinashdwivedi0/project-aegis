import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../../../config/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";

type RunRecord = Record<string, unknown>;

function asRecord(value: unknown): RunRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RunRecord
    : {};
}

function statusOf(record: RunRecord, execution: RunRecord) {
  const status = String(record.status ?? execution.status ?? "unknown").toLowerCase();
  if (status === "partial") return "partial";
  if (["passed", "completed"].includes(status)) return "passed";
  if (["failed", "timedout", "cancelled"].includes(status)) return "failed";
  return "unknown";
}

export class RunHistoryService {
  private readonly roots = [
    path.resolve(process.cwd(), "results", "autonomous-testing"),
    path.resolve(process.cwd(), "results", "playwright"),
    path.resolve(process.cwd(), "results", "run-modes"),
  ];

  async list(ownerId: string, repositoryId: string) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, project: { ownerId } },
      select: { id: true },
    });
    if (!repository) throw new ApiError(404, "Repository not found or access denied.");

    const records: Array<{ date: number; run: RunRecord; file: string }> = [];
    for (const root of this.roots) {
      let entries: string[];
      try {
        entries = await fs.readdir(root);
      } catch {
        continue;
      }

      for (const entry of entries) {
        const entryPath = path.join(root, entry);
        let candidates = [entryPath];
        try {
          if ((await fs.stat(entryPath)).isDirectory()) {
            candidates = [path.join(entryPath, "run.json")];
          }
        } catch {
          continue;
        }

        for (const file of candidates) {
          try {
            const run = asRecord(JSON.parse(await fs.readFile(file, "utf8")));
            const repo = asRecord(run.repository);
            if (run.repositoryId !== repository.id && repo.id !== repository.id) continue;
            records.push({ date: (await fs.stat(file)).mtimeMs, run, file });
          } catch {
            // Ignore incomplete run folders and unrelated result files.
          }
        }
      }
    }

    const history = new Map<string, { date: number; item: Record<string, unknown> }>();
    for (const { date, run, file } of records) {
      const execution = asRecord(run.execution);
      const generatedTest = asRecord(run.generatedTest);
      const generatedFile = asRecord(run.generatedFile);
      const totals = asRecord(execution.totals);
      const runId = String(run.runId ?? path.basename(file, ".json"));
      const type = String(run.type ?? run.mode ?? (runId.includes("blackbox") ? "black-box" : "run-mode"));
      history.set(runId, { date, item: {
        runId,
        type,
        suite: typeof run.suite === "string" ? run.suite : undefined,
        mode: typeof run.mode === "string" ? run.mode : undefined,
        status: statusOf(run, execution),
        createdAt: typeof run.createdAt === "string" ? run.createdAt : new Date(date).toISOString(),
        total: Number(run.total ?? execution.total ?? totals.selected ?? 0),
        passed: Number(run.passed ?? execution.passed ?? totals.passed ?? 0),
        failed: Number(run.failed ?? execution.failed ?? totals.failed ?? 0),
        generatedSourceAvailable: typeof generatedTest.content === "string"
          || typeof generatedFile.content === "string"
          || (["unit", "integration"].includes(type) && Boolean(run.runId))
          || runId.includes("autonomous-blackbox"),
      } });
    }

    const savedRuns = await prisma.autonomousTestRun.findMany({
      where: { repositoryId: repository.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { runId: true, kind: true, suite: true, mode: true, status: true, result: true, createdAt: true },
    });
    for (const saved of savedRuns) {
      const result = asRecord(saved.result);
      const execution = asRecord(result.execution);
      const totals = asRecord(execution.totals);
      const generatedTest = asRecord(result.generatedTest);
      const generatedFile = asRecord(result.generatedFile);
      history.set(saved.runId, { date: saved.createdAt.getTime(), item: {
        runId: saved.runId,
        type: saved.kind,
        suite: saved.suite ?? undefined,
        mode: saved.mode ?? undefined,
        status: statusOf({ status: saved.status }, execution),
        createdAt: saved.createdAt.toISOString(),
        total: Number(result.total ?? execution.total ?? totals.selected ?? 0),
        passed: Number(result.passed ?? execution.passed ?? totals.passed ?? 0),
        failed: Number(result.failed ?? execution.failed ?? totals.failed ?? 0),
        generatedSourceAvailable: typeof generatedTest.content === "string"
          || typeof generatedFile.content === "string"
          || (["unit", "integration"].includes(saved.kind) && Boolean(saved.runId))
          || saved.kind === "black-box",
      } });
    }

    return [...history.values()]
      .sort((a, b) => b.date - a.date)
      .slice(0, 100)
      .map(({ item }) => item);
  }
}

export const runHistoryService = new RunHistoryService();
