import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { simpleGit } from "simple-git";

export class GitHubService {
  private static readonly CLONE_TIMEOUT =
    5 * 60 * 1000;

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

    const git = simpleGit({
      maxConcurrentProcesses: 1,
    });

    try {
      const clonePromise =
        git.raw([
          "-c",
          "core.longpaths=true",
          "-c",
          "core.protectNTFS=false",
          "clone",
          normalizedUrl,
          workspace,
          "--depth",
          "1",
          ...(branch !== "HEAD"
            ? [
                "--branch",
                branch,
              ]
            : []),
        ]);

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

  static async createRepairBranch(
    workspace: string,
    patchId: string,
  ): Promise<string> {
    const branch = `aegis/repair-${patchId}`;
    const git = simpleGit(workspace);
    await git.checkoutLocalBranch(branch);
    return branch;
  }

  static async commitRepairBranch(
    workspace: string,
    filePath: string,
    patchId: string,
  ): Promise<{ branch: string; commit: string }> {
    const git = simpleGit(workspace);
    const branch = (await git.branch()).current;
    await git.add(filePath);
    const commit = await git.commit(`Apply validated repair ${patchId}`);
    return { branch, commit: commit.commit };
  }

  static async createPullRequest(
    repositoryUrl: string,
    branch: string,
    token: string,
    title: string,
    body: string,
  ): Promise<{ number: number; url: string; branch: string }> {
    const normalizedUrl = this.normalizeGitHubUrl(repositoryUrl);
    const match = normalizedUrl.match(
      /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/i,
    );
    if (!match) throw new Error("Only GitHub repository URLs can receive pull requests.");
    if (!/^aegis\/repair-[A-Za-z0-9-]+$/.test(branch)) {
      throw new Error("Pull requests may only be created from Aegis repair branches.");
    }
    if (!token.trim()) throw new Error("A GitHub token is required to create a pull request.");

    const response = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}/pulls`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, head: branch, base: "main" }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitHub pull request creation failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const result = await response.json() as { number: number; html_url: string };
    return { number: result.number, url: result.html_url, branch };
  }
}