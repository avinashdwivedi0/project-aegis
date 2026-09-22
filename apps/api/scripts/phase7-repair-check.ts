import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { prisma } from "../src/config/prisma";
import { RepairService } from "../src/modules/repair/repair.service";

const execFileAsync = promisify(execFile);
const email = `phase7-${crypto.randomUUID()}@example.test`;
let projectId: string | undefined;
let workspacePath: string | undefined;

try {
  workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-repair-"));
  await execFileAsync("git", ["init"], { cwd: workspacePath, windowsHide: true });
  const filePath = path.join(workspacePath, "src");
  await fs.mkdir(filePath, { recursive: true });
  await fs.writeFile(path.join(filePath, "example.ts"), "const value = 1;\n", "utf8");
  await execFileAsync("git", ["add", "src/example.ts"], { cwd: workspacePath, windowsHide: true });

  const user = await prisma.user.create({
    data: { name: "Phase 7 Integration", email, passwordHash: "phase7-test-only" },
  });
  const project = await prisma.project.create({
    data: { name: "Phase 7 Fixture", ownerId: user.id },
  });
  projectId = project.id;
  const repository = await prisma.repository.create({
    data: { name: "Repair Fixture", projectId: project.id, workspacePath },
  });
  await prisma.repositoryFile.create({
    data: {
      repositoryId: repository.id,
      name: "example.ts",
      path: "src/example.ts",
      type: "file",
      content: "const value = 1;\n",
    },
  });
  const job = await prisma.repairJob.create({
    data: { projectId: project.id, repositoryId: repository.id },
  });
  const finding = await prisma.finding.create({
    data: {
      repairJobId: job.id,
      category: "code-quality",
      severity: "LOW",
      confidence: 0.95,
      title: "Unused value",
      description: "The value is never used.",
      evidence: [{ type: "file_location", content: "src/example.ts:1", source: "fixture", relevance: 1 }],
      filePath: "src/example.ts",
      startLine: 1,
      endLine: 1,
      detectionSource: "fixture",
      recommendedFix: "const value = 2;",
    },
  });

  const patch = await RepairService.generatePatch(finding.id, user.id);
  assert.equal(patch.lifecycle, "PATCH_GENERATED");
  assert.equal(patch.linesRemoved, 1);
  assert.ok(patch.riskScore >= 0 && patch.riskScore <= 1);

  const validation = await RepairService.validatePatch(patch.patchId, user.id);
  assert.equal(validation.patchLifecycle, "VALIDATED", JSON.stringify(validation));

  const application = await RepairService.applyPatch(patch.patchId, user.id);
  assert.equal(application.success, true);

  const stored = await prisma.patch.findUnique({
    where: { id: patch.patchId },
    include: { validations: true, applications: true },
  });
  assert.equal(stored?.lifecycle, "PATCH_APPLIED_IN_WORKSPACE");
  assert.equal(stored?.validations.length, 1);
  assert.equal(stored?.applications.length, 1);

  console.log("Phase 7 repair check passed.");
} finally {
  if (projectId) await prisma.project.delete({ where: { id: projectId } });
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
  if (workspacePath) await fs.rm(workspacePath, { recursive: true, force: true });
}