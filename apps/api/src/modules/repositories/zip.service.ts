import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";

import { resolveWorkspacePath } from "./workspace-path";

export class ZipService {
  private static readonly MAX_ENTRIES = 10_000;

  private static readonly MAX_UNCOMPRESSED_BYTES =
    100 * 1024 * 1024;

  private static getWorkspaceRoot(): string {
    if (process.platform === "win32") {
      const drive =
        process.env.SystemDrive ?? "C:";
      return path.join(drive, "aegis");
    }

    return path.join(
      os.tmpdir(),
      "project-aegis",
    );
  }

  static async createWorkspace(): Promise<string> {
    const workspaceRoot =
      this.getWorkspaceRoot();

    await fs.mkdir(
      workspaceRoot,
      {
        recursive: true,
      },
    );

    const workspace =
      path.join(
        workspaceRoot,
        `repo-${crypto.randomBytes(8).toString("hex")}`,
      );

    await fs.mkdir(
      workspace,
      {
        recursive: true,
      },
    );

    return workspace;
  }

  static async cleanup(
    workspace: string,
  ): Promise<void> {
    await fs.rm(workspace, {
      recursive: true,
      force: true,
    });
  }

  static async extract(
    archivePath: string,
  ): Promise<string> {
    const workspace =
      await this.createWorkspace();

    try {
      const archive = new AdmZip(
        archivePath,
      );
      const entries = archive.getEntries();

      if (
        entries.length >
        this.MAX_ENTRIES
      ) {
        throw new Error(
          "ZIP archive contains too many entries.",
        );
      }

      let totalBytes = 0;

      for (const entry of entries) {
        const rawEntryName = entry.entryName
          .replaceAll("\\", "/");

        if (
          rawEntryName.startsWith("/") ||
          /^[A-Za-z]:\//.test(rawEntryName)
        ) {
          throw new Error(
            "ZIP archive contains an absolute path.",
          );
        }

        const entryName = rawEntryName;

        if (
          !entryName ||
          entryName === "." ||
          entryName.split("/").includes("..")
        ) {
          throw new Error(
            "ZIP archive contains an invalid path.",
          );
        }

        const destination =
          resolveWorkspacePath(
            workspace,
            entryName,
          );

        if (entry.isDirectory) {
          await fs.mkdir(destination, {
            recursive: true,
          });
          continue;
        }

        const data = entry.getData();
        totalBytes += data.byteLength;

        if (
          totalBytes >
          this.MAX_UNCOMPRESSED_BYTES
        ) {
          throw new Error(
            "ZIP archive exceeds the uncompressed size limit.",
          );
        }

        await fs.mkdir(
          path.dirname(destination),
          { recursive: true },
        );
        await fs.writeFile(destination, data);
      }

      return workspace;
    } catch (error) {
      await this.cleanup(workspace);
      throw error;
    }
  }

  static async exists(
    workspace: string,
  ): Promise<boolean> {
    try {
      await fs.access(workspace);

      return true;
    } catch {
      return false;
    }
  }

  static async ensureWorkspace(
    workspace: string,
  ): Promise<void> {
    await fs.mkdir(workspace, {
      recursive: true,
    });
  }
}