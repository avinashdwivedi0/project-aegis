import { RepositoryStatus } from "@prisma/client";
import fs from "fs/promises";

import { prisma } from "../../config/prisma";

import { retrievalService } from "../ai/retrieval/retrieval.service";

import { FileIndexService } from "./file-index.service";
import { FileScannerService } from "./file-scanner.service";
import { GitHubService } from "./github.service";
import { ZipService } from "./zip.service";

export class ImportService {
  static async importFromGitHub(
    repositoryId: string,
    url: string,
    ownerId: string,
  ) {
    const repository =
      await prisma.repository.findFirst({
        where: { id: repositoryId, project: { ownerId } },
      });

    if (!repository) {
      throw new Error(
        "Repository not found."
      );
    }

    await prisma.repository.update({
      where: {
        id: repositoryId,
      },
      data: {
        status:
          RepositoryStatus.INDEXING,
      },
    });

    let workspace: string | undefined;
    try {
      workspace = await GitHubService.cloneRepository(url);
      const tree =
        await FileScannerService.scan(
          workspace
        );

      const indexedFiles =
        await FileIndexService.index(
          repositoryId,
          tree
        );

      await prisma.repository.update({
        where: {
          id: repositoryId,
        },
        data: {
          provider: "GITHUB",
          url,
          workspacePath: workspace,
        },
      });

      const indexingResult =
        await retrievalService.indexRepository(
          repositoryId
        );

      await prisma.repository.update({
        where: {
          id: repositoryId,
        },
        data: {
          status:
            RepositoryStatus.INDEXED,
        },
      });

      return {
        success: true,
        workspace,
        indexedFiles,
        indexingResult,
        message:
          "Repository imported and indexed successfully.",
      };
    } catch (error) {
      await prisma.repository.update({
        where: {
          id: repositoryId,
        },
        data: {
          status:
            RepositoryStatus.FAILED,
          workspacePath: workspace ? null : repository.workspacePath,
        },
      });

      if (workspace) {
        await GitHubService.deleteRepository(workspace);
      }

      throw error;
    }
  }

  static async importFromZip(
    repositoryId: string,
    archivePath: string,
    ownerId: string,
  ) {
    const repository =
      await prisma.repository.findFirst({
        where: { id: repositoryId, project: { ownerId } },
      });

    if (!repository) {
      throw new Error(
        "Repository not found."
      );
    }

    await prisma.repository.update({
      where: {
        id: repositoryId,
      },
      data: {
        status:
          RepositoryStatus.INDEXING,
      },
    });

    let workspace: string | undefined;
    try {
      workspace = await ZipService.extract(archivePath);
      const tree =
        await FileScannerService.scan(
          workspace,
        );

      const indexedFiles =
        await FileIndexService.index(
          repositoryId,
          tree,
        );

      await prisma.repository.update({
        where: {
          id: repositoryId,
        },
        data: {
          provider: "ZIP",
          workspacePath: workspace,
        },
      });

      const indexingResult =
        await retrievalService.indexRepository(
          repositoryId,
        );

      await prisma.repository.update({
        where: {
          id: repositoryId,
        },
        data: {
          status:
            RepositoryStatus.INDEXED,
        },
      });

      return {
        success: true,
        workspace,
        indexedFiles,
        indexingResult,
        message:
          "ZIP repository imported and indexed successfully.",
      };
    } catch (error) {
      await prisma.repository.update({
        where: {
          id: repositoryId,
        },
        data: {
          status:
            RepositoryStatus.FAILED,
          workspacePath: workspace ? null : repository.workspacePath,
        },
      });

      if (workspace) {
        await ZipService.cleanup(workspace);
      }

      throw error;
    } finally {
      await fs.rm(archivePath, {
        force: true,
      });
    }
  }
}
