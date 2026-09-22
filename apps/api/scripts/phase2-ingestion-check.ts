import assert from "node:assert/strict";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { FileScannerService } from "../src/modules/repositories/file-scanner.service";
import { ZipService } from "../src/modules/repositories/zip.service";
import { resolveWorkspacePath } from "../src/modules/repositories/workspace-path";

const fixtureRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "aegis-phase2-")
);

const createArchive = async (
  archivePath: string,
  entries: Array<[string, string]>,
) => {
  const archive = new AdmZip();

  for (const [entryPath, content] of entries) {
    archive.addFile(entryPath, Buffer.from(content));
  }

  archive.writeZip(archivePath);
};

try {
  const firstArchive = path.join(fixtureRoot, "first.zip");
  const secondArchive = path.join(fixtureRoot, "second.zip");

  const entries: Array<[string, string]> = [
    ["src/zeta.ts", "export const zeta = 1;"],
    ["README.md", "# fixture"],
    ["src/alpha.ts", "export const alpha = 1;"],
    ["package.json", "{}"],
  ];

  await createArchive(firstArchive, entries);
  await createArchive(secondArchive, [...entries].reverse());

  const firstWorkspace = await ZipService.extract(firstArchive);
  const secondWorkspace = await ZipService.extract(secondArchive);

  try {
    const firstTree = await FileScannerService.scan(firstWorkspace);
    const secondTree = await FileScannerService.scan(secondWorkspace);

    assert.deepEqual(firstTree, secondTree);
    assert.deepEqual(
      firstTree.map((node) => node.path),
      ["package.json", "README.md", "src"],
    );
    assert.deepEqual(
      firstTree.find((node) => node.name === "src")?.children?.map((node) => node.path),
      [path.join("src", "alpha.ts"), path.join("src", "zeta.ts")],
    );
  } finally {
    await Promise.all([
      ZipService.cleanup(firstWorkspace),
      ZipService.cleanup(secondWorkspace),
    ]);
  }

  await assert.rejects(
    async () => resolveWorkspacePath(fixtureRoot, "../escaped.txt"),
    /invalid workspace file path/i,
  );

  console.log("Phase 2 ingestion check passed.");
} finally {
  await fs.rm(fixtureRoot, {
    recursive: true,
    force: true,
  });
}
