import assert from "node:assert/strict";
import crypto from "node:crypto";

import { prisma } from "../src/config/prisma";
import { FindingService } from "../src/modules/analysis/finding.service";

const email = `phase6-${crypto.randomUUID()}@example.test`;
let projectId: string | undefined;

try {
  const user = await prisma.user.create({
    data: {
      name: "Phase 6 Integration",
      email,
      passwordHash: "phase6-test-only",
    },
  });
  const project = await prisma.project.create({
    data: {
      name: "Phase 6 Fixture",
      ownerId: user.id,
    },
  });
  projectId = project.id;
  const repository = await prisma.repository.create({
    data: { name: "Findings Fixture", projectId: project.id },
  });
  const run = await prisma.analysisRun.create({
    data: {
      projectId: project.id,
      repositoryId: repository.id,
      status: "COMPLETED",
    },
  });
  await prisma.toolExecution.create({
    data: {
      analysisRunId: run.id,
      command: "semgrep",
      args: [],
      status: "COMPLETED",
      evidence: [
        {
          id: "finding-critical",
          tool: "security-scan",
          status: "failed",
          severity: "critical",
          message: "Unsafe input flow.",
          filePath: "src/api.ts",
          lineStart: 12,
          code: "javascript.lang.security",
        },
        {
          id: "finding-low",
          tool: "eslint",
          status: "failed",
          severity: "low",
          message: "Unused variable.",
          filePath: "src/ui.ts",
          lineStart: 4,
          code: "no-unused-vars",
        },
      ],
    },
  });

  const findings = await FindingService.list(user.id, run.id, {
    source: "security-scan",
  });
  const score = await FindingService.score(user.id, run.id);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "critical");
  assert.equal(findings[0].filePath, "src/api.ts");
  assert.equal(score.score, 78);
  assert.equal(score.scoringVersion, "phase6-v1");
  assert.equal(score.findingCount, 2);

  console.log("Phase 6 findings check passed.");
} finally {
  if (projectId) {
    await prisma.project.delete({ where: { id: projectId } });
  }
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
}
