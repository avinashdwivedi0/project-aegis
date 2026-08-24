import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { simpleGit } from "simple-git";

export class GitHubService {
  private static readonly WORKSPACE_ROOT =
    path.join(
      os.tmpdir(),
      "project-aegis",
    );

  private static readonly CLONE_TIMEOUT =
    5 * 60 * 1000;

  static normalizeGitHubUrl(
    url: string,
  ): string {
    return url.trim().replace(/\/+$/, "");
  }

  static isValidGitHubUrl(
    url: string,
  ): boolean {
    const normalized =
      this.normalizeGitHubUrl(url);

    return /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/i.test(
      normalized,
    );
  }

  static async cloneRepository(
    url: string,
    branch = "HEAD",
  ): Promise<string> {
    const normalizedUrl =
      this.normalizeGitHubUrl(url);

    if (
      !this.isValidGitHubUrl(normalizedUrl)
    ) {
      throw new Error(
        "Invalid GitHub repository URL.",
      );
    }

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

    const git = simpleGit({
      maxConcurrentProcesses: 1,
    });

    try {
      const clonePromise =
        git.clone(
          normalizedUrl,
          workspace,
          [
            "--depth",
            "1",
            ...(branch !== "HEAD"
              ? [
                  "--branch",
                  branch,
                ]
              : []),
          ],
        );

      await Promise.race([
        clonePromise,
        new Promise(
          (_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Repository clone timed out.",
                  ),
                ),
              this.CLONE_TIMEOUT,
            ),
        ),
      ]);

      return workspace;
    } catch (error) {
      await this.deleteRepository(
        workspace,
      );

      throw error;
    }
  }

  static async deleteRepository(
    directory: string,
  ): Promise<void> {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
  }
}