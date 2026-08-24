import fs from "fs/promises";
import path from "path";

import { prisma } from "../../config/prisma";

export interface RepositoryTextFile {
  name: string;
  path: string;
  language: string;
  content: string;
}

export class ExplorerService {
  private static readonly MAX_FILE_SIZE =
    1024 * 1024; // 1 MB

  private static readonly IGNORED_DIRECTORIES =
    new Set([
      ".git",
      ".github",
      ".next",
      ".turbo",
      ".vscode",
      ".idea",
      "node_modules",
      "dist",
      "build",
      "coverage",
      ".cache",
      ".pnpm-store",
      "vendor",
      "bin",
      "obj",
      "target",
      "__pycache__",
    ]);

  private static readonly TEXT_EXTENSIONS =
    new Set([
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".json",
      ".md",
      ".mdx",
      ".txt",
      ".css",
      ".scss",
      ".html",
      ".xml",
      ".yml",
      ".yaml",
      ".toml",
      ".env",
      ".java",
      ".kt",
      ".go",
      ".rs",
      ".py",
      ".php",
      ".cs",
      ".cpp",
      ".c",
      ".h",
      ".hpp",
      ".sql",
      ".sh",
      ".bat",
      ".ps1",
      ".dockerfile",
      ".graphql",
      ".prisma",
    ]);

  static async getFileTree(
    repositoryId: string,
  ) {
    return prisma.repositoryFile.findMany({
      where: {
        repositoryId,
      },
      orderBy: {
        path: "asc",
      },
    });
  }

  static async getFileContent(
    repositoryId: string,
    filePath: string,
  ): Promise<RepositoryTextFile> {
    const repository =
      await prisma.repository.findUnique({
        where: {
          id: repositoryId,
        },
      });

    if (!repository) {
      throw new Error(
        "Repository not found.",
      );
    }

    if (!repository.workspacePath) {
      throw new Error(
        "Repository has no workspace.",
      );
    }

    const absolutePath = path.join(
      repository.workspacePath,
      filePath,
    );

    const content =
      await fs.readFile(
        absolutePath,
        "utf8",
      );

    return {
      name: path.basename(filePath),
      path: filePath,
      language: path
        .extname(filePath)
        .slice(1),
      content,
    };
  }

  static async getRepositoryFiles(
    repositoryId: string,
  ): Promise<RepositoryTextFile[]> {
    const repository =
      await prisma.repository.findUnique({
        where: {
          id: repositoryId,
        },
      });

    if (!repository) {
      throw new Error(
        "Repository not found.",
      );
    }

    if (!repository.workspacePath) {
      throw new Error(
        "Repository has no workspace.",
      );
    }

    const files =
      await prisma.repositoryFile.findMany({
        where: {
          repositoryId,
          type: "file",
        },
        orderBy: {
          path: "asc",
        },
      });

    const results: RepositoryTextFile[] =
      [];

    for (const file of files) {
      if (
        this.shouldIgnore(file.path)
      ) {
        continue;
      }

      const absolutePath =
        path.join(
          repository.workspacePath,
          file.path,
        );

      try {
        const stats =
          await fs.stat(
            absolutePath,
          );

        if (
          stats.size >
          this.MAX_FILE_SIZE
        ) {
          continue;
        }

        const content =
          await fs.readFile(
            absolutePath,
            "utf8",
          );

        if (
          !content.trim()
        ) {
          continue;
        }

        results.push({
          name: path.basename(
            file.path,
          ),
          path: file.path,
          language: path
            .extname(
              file.path,
            )
            .slice(1),
          content,
        });
      } catch {
        continue;
      }
    }

    return results;
  }

  private static shouldIgnore(
    filePath: string,
  ): boolean {
    const normalized =
      filePath.replaceAll(
        "\\",
        "/",
      );

    const segments =
      normalized.split("/");

    for (const segment of segments) {
      if (
        this.IGNORED_DIRECTORIES.has(
          segment,
        )
      ) {
        return true;
      }
    }

    const extension =
      path.extname(
        normalized,
      );

    if (
      !this.TEXT_EXTENSIONS.has(
        extension,
      )
    ) {
      return true;
    }

    return false;
  }
}