import fs from "fs/promises";
import path from "path";

const IGNORE_DIRECTORIES = new Set([
  ".git",
  ".github",
  ".next",
  ".turbo",
  ".idea",
  ".vscode",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".cache",
  "__pycache__",
  "vendor",
  "bin",
  "obj",
  "target",
]);

const TEXT_EXTENSIONS = new Set([
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
  ".graphql",
  ".prisma",
]);

const MAX_FILE_SIZE = 1024 * 1024;

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

export class FileScannerService {
  static async scan(
    root: string,
  ): Promise<FileNode[]> {
    return this.scanDirectory(
      root,
      "",
    );
  }

  private static async scanDirectory(
    absolute: string,
    relative: string,
  ): Promise<FileNode[]> {
    const entries =
      await fs.readdir(absolute, {
        withFileTypes: true,
      });

    const result: FileNode[] = [];

    for (const entry of entries) {
      if (
        IGNORE_DIRECTORIES.has(
          entry.name,
        )
      ) {
        continue;
      }

      if (
        entry.name.startsWith(".") &&
        entry.name !== ".env"
      ) {
        continue;
      }

      const absolutePath =
        path.join(
          absolute,
          entry.name,
        );

      const relativePath =
        path.join(
          relative,
          entry.name,
        );

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        result.push({
          name: entry.name,
          path: relativePath,
          type: "directory",
          children:
            await this.scanDirectory(
              absolutePath,
              relativePath,
            ),
        });

        continue;
      }

      const extension =
        path.extname(
          entry.name,
        );

      if (
        !TEXT_EXTENSIONS.has(
          extension,
        )
      ) {
        continue;
      }

      try {
        const stats =
          await fs.stat(
            absolutePath,
          );

        if (
          stats.size >
          MAX_FILE_SIZE
        ) {
          continue;
        }
      } catch {
        continue;
      }

      result.push({
        name: entry.name,
        path: relativePath,
        type: "file",
      });
    }

    return result;
  }
}