import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { prisma } from "../src/config/prisma";
import { AnalysisService } from "../src/modules/analysis/analysis.service";
import { AnalysisQueue } from "../src/modules/analysis/analysis.queue";

const workspace = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase3-orchestration-")
);
const email = `phase3-${crypto.randomUUID()}@example.test`;
let projectId: string | undefined;

try {
  const user = await prisma.user.create({
    data: {
      name: "Phase 3 Integration",
      email,
      passwordHash: "phase3-test-only",
    },
  });
  const project = await prisma.project.create({
    data: {
      name: "Phase 3 Integration Fixture",
      ownerId: user.id,
    },
  });
  projectId = project.id;
  const repository = await prisma.repository.create({
    data: {
      name: "Runner Fixture",
      projectId: project.id,
      workspacePath: workspace,
    },
  });
  const run = await AnalysisService.create(user.id, {
    projectId: project.id,
    repositoryId: repository.id,
    ref: "HEAD",
    totalStages: 2,
  });

  await prisma.analysisRun.update({
    where: { id: run.id },
    data: {
      tools: [
        {
          command: "node",
          args: ["-e", "process.stdout.write('stage-one')"],
          stage: "first",
        },
        {
          command: "node",
          args: ["-e", "process.stdout.write('stage-two')"],
          stage: "second",
        },
      ],
    },
  });
  assert.equal(await AnalysisQueue.enqueue(user.id, run.id), true);
  assert.equal(await AnalysisQueue.enqueue(user.id, run.id), false);

  let completed = await AnalysisService.get(user.id, run.id);
  for (
    let attempt = 0;
    attempt < 100 &&
    (completed.status === "PENDING" || completed.status === "RUNNING");
    attempt += 1
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    completed = await AnalysisService.get(user.id, run.id);
  }
    const executions = await prisma.toolExecution.findMany({
    where: { analysisRunId: run.id },
    orderBy: { createdAt: "asc" },
  });
    const events = await prisma.analysisEvent.findMany({
      where: { analysisRunId: run.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { type: true },
    });
    const summary = await AnalysisService.summary(user.id, run.id);

  assert.equal(completed.status, "COMPLETED");
  assert.equal(completed.progress, 100);
  assert.equal(executions.length, 2);
  assert.equal(summary.totals.executions, 2);
  assert.equal(summary.totals.evidence, 0);
  assert.deepEqual(
    executions.map((execution) => execution.stdout),
    ["stage-one", "stage-two"],
  );
    assert.deepEqual(
      events.map((event) => event.type),
      ["QUEUED", "DISPATCHED", "STARTED", "STAGE_STARTED", "STAGE_STARTED", "COMPLETED"],
    );

  console.log("Phase 3 orchestration check passed.");
} finally {
  if (projectId) {
    await prisma.project.delete({ where: { id: projectId } });
  }
  await prisma.user.deleteMany({ where: { email } });
  await fs.rm(workspace, { recursive: true, force: true });
  await prisma.$disconnect();
}
