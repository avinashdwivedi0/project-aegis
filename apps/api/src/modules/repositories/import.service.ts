import { RepositoryStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";

import { retrievalService } from "../ai/retrieval/retrieval.service";

import { FileIndexService } from "./file-index.service";
import { FileScannerService } from "./file-scanner.service";
import { GitHubService } from "./github.service";
import { ZipService } from "./zip.service";

export class ImportService {
  static async importFromGitHub(
    repositoryId: string,
    url: string
  ) {
    const repository =
      await prisma.repository.findUnique({
        where: {
          id: repositoryId,
        },
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

    const workspace =
      await GitHubService.cloneRepository(
        url
      );

    try {
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
        },
      });

      await GitHubService.deleteRepository(
        workspace
      );

      throw error;
    }
  }

  static async importFromZip(
    repositoryId: string
  ) {
    const repository =
      await prisma.repository.findUnique({
        where: {
          id: repositoryId,
        },
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

    try {
      /**
       * ZIP import pipeline will be implemented
       * in Sprint G.
       *
       * Current ZipService only exists as a stub
       * and does not yet support extraction.
       */

      await prisma.repository.update({
        where: {
          id: repositoryId,
        },
        data: {
          status:
            RepositoryStatus.FAILED,
        },
      });

      return {
        success: false,
        message:
          "ZIP import is not implemented yet.",
      };
    } catch (error) {
      await prisma.repository.update({
        where: {
          id: repositoryId,
        },
        data: {
          status:
            RepositoryStatus.FAILED,
        },
      });

      throw error;
    }
  }
}