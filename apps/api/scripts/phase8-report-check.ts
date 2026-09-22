import assert from "node:assert/strict";
import crypto from "node:crypto";

import { prisma } from "../src/config/prisma";
import { ReportService } from "../src/modules/report/report.service";

const email = `phase8-${crypto.randomUUID()}@example.test`;
let projectId: string | undefined;

try {
  const user = await prisma.user.create({
    data: { name: "Phase 8 Integration", email, passwordHash: "phase8-test-only" },
  });
  const project = await prisma.project.create({
    data: { name: "Phase 8 Fixture", ownerId: user.id },
  });
  projectId = project.id;
  const repository = await prisma.repository.create({
    data: { name: "Report Fixture", projectId: project.id, provider: "LOCAL" },
  });
  const run = await prisma.analysisRun.create({
    data: { projectId: project.id, repositoryId: repository.id, status: "COMPLETED", progress: 100 },
  });
  await prisma.toolExecution.create({
    data: {
      analysisRunId: run.id,
      command: "eslint",
      args: [],
      status: "COMPLETED",
      evidence: [{ id: "report-finding", tool: "eslint", severity: "high", status: "failed", message: "Unsafe fixture", filePath: "src/example.ts" }],
    },
  });

  const report = await ReportService.getAnalysisReport(user.id, run.id);
  assert.equal(report.reportVersion, "phase8-v1");
  assert.equal(report.run.status, "COMPLETED");
  assert.equal(report.repository.name, "Report Fixture");
  assert.equal(report.score.findingCount, 1);
  assert.equal(report.findings[0].filePath, "src/example.ts");
  const markdown = ReportService.toMarkdown(report);
  assert.match(markdown, /^# Project Aegis Analysis Report/m);
  assert.match(markdown, /Report Fixture/);
  assert.match(markdown, /src\/example\.ts/);

  console.log("Phase 8 report check passed.");
} finally {
  if (projectId) await prisma.project.delete({ where: { id: projectId } });
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
}