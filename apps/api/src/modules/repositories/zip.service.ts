import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

export class ZipService {
  private static readonly WORKSPACE_ROOT =
    path.join(
      os.tmpdir(),
      "project-aegis",
    );

  static async createWorkspace(): Promise<string> {
    await fs.mkdir(
      this.WORKSPACE_ROOT,
      {
        recursive: true,
      },
    );

    const workspace =
      path.join(
        this.WORKSPACE_ROOT,
        crypto.randomUUID(),
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