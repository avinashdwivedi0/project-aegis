import assert from "node:assert/strict";
import crypto from "node:crypto";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { prisma } from "../src/config/prisma";
import { retrievalService } from "../src/modules/ai/retrieval/retrieval.service";
import { ImportService } from "../src/modules/repositories/import.service";

const fixtureRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase2-db-")
);
const email = `phase2-${crypto.randomUUID()}@example.test`;

const createArchive = async (
  archivePath: string,
  reverse: boolean,
) => {
  const entries: Array<[string, string]> = [
    ["src/zeta.ts", "export const zeta = 1;"],
    ["README.md", "# fixture"],
    ["src/alpha.ts", "export const alpha = 1;"],
    ["package.json", "{}"],
  ];
  const archive = new AdmZip();

  for (const [entryPath, content] of reverse ? entries.reverse() : entries) {
    archive.addFile(entryPath, Buffer.from(content));
  }

  archive.writeZip(archivePath);
};

let projectId: string | undefined;
const originalIndexRepository = retrievalService.indexRepository;

try {
  const user = await prisma.user.create({
    data: {
      name: "Phase 2 Integration",
      email,
      passwordHash: "phase2-test-only",
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Phase 2 Integration Fixture",
      ownerId: user.id,
    },
  });
  projectId = project.id;

  const repository = await prisma.repository.create({
    data: {
      name: "ZIP Fixture",
      projectId: project.id,
    },
  });

  retrievalService.indexRepository = async (repositoryId) => ({
    repositoryId,
    indexedFiles: 0,
    indexedChunks: 0,
    storedVectors: 0,
    durationMs: 0,
  });

  const firstArchive = path.join(fixtureRoot, "first.zip");
  const secondArchive = path.join(fixtureRoot, "second.zip");
  await createArchive(firstArchive, false);
  await createArchive(secondArchive, true);

  const firstImport = await ImportService.importFromZip(
    repository.id,
    firstArchive,
  );
  const firstManifest = await prisma.repositoryFile.findMany({
    where: { repositoryId: repository.id },
    orderBy: { path: "asc" },
    select: { path: true, type: true, parentPath: true },
  });

  const secondImport = await ImportService.importFromZip(
    repository.id,
    secondArchive,
  );
  const secondManifest = await prisma.repositoryFile.findMany({
    where: { repositoryId: repository.id },
    orderBy: { path: "asc" },
    select: { path: true, type: true, parentPath: true },
  });

  assert.equal(firstImport.success, true);
  assert.equal(secondImport.success, true);
  assert.deepEqual(firstManifest, secondManifest);

  await Promise.all([
    fs.rm(firstImport.workspace, { recursive: true, force: true }),
    fs.rm(secondImport.workspace, { recursive: true, force: true }),
  ]);
  console.log("Phase 2 database import check passed.");
} finally {
  retrievalService.indexRepository = originalIndexRepository;

  if (projectId) {
    await prisma.project.delete({ where: { id: projectId } });
  }

  await prisma.user.deleteMany({ where: { email } });
  await fs.rm(fixtureRoot, { recursive: true, force: true });
  await prisma.$disconnect();
}
