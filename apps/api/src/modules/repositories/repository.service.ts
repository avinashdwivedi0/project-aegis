import {
  Prisma,
  RepositoryProvider,
  RepositoryStatus,
} from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { retrievalService } from "../ai/retrieval/retrieval.service";

import { GitHubService } from "./github.service";

import type {
  CreateRepositoryInput,
  RepositoryQuery,
  UpdateRepositoryInput,
} from "./repository.types";

export class RepositoryService {
  static async findForOwner(repositoryId: string, ownerId: string) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, project: { ownerId } },
      select: { id: true },
    });
    if (!repository) throw new ApiError(404, "Repository not found or access denied.");
    return repository;
  }

  private static async findProject(
    projectId: string,
    ownerId: string
  ) {
    const project =
      await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId,
        },
      });

    if (!project) {
      throw new ApiError(
        404,
        "Project not found."
      );
    }

    return project;
  }

  private static async findRepository(
    repositoryId: string,
    ownerId: string
  ) {
    const repository =
      await prisma.repository.findFirst({
        where: {
          id: repositoryId,
          project: {
            ownerId,
          },
        },
      });

    if (!repository) {
      throw new ApiError(
        404,
        "Repository not found."
      );
    }

    return repository;
  }

  static async create(
    projectId: string,
    ownerId: string,
    data: CreateRepositoryInput
  ) {
    await this.findProject(
      projectId,
      ownerId
    );

    return prisma.repository.create({
      data: {
        name: data.name,
        description: data.description,
        provider:
          data.provider ??
          RepositoryProvider.LOCAL,
        url: data.url,
        defaultBranch:
          data.defaultBranch,
        isPrivate:
          data.isPrivate ?? false,
        workspacePath: data.workspacePath ?? null,
        projectId,
      },
    });
  }

  static async findAll(
    projectId: string,
    ownerId: string,
    query: RepositoryQuery = {}
  ) {
    await this.findProject(
      projectId,
      ownerId
    );

    const where: Prisma.RepositoryWhereInput =
      {
        projectId,
      };

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (query.provider) {
      where.provider =
        query.provider;
    }

    if (query.status) {
      where.status =
        query.status;
    }

    return prisma.repository.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  static async findById(
    repositoryId: string,
    ownerId: string
  ) {
    return this.findRepository(
      repositoryId,
      ownerId
    );
  }

  static async getStats(
    repositoryId: string,
    ownerId: string
  ) {
    const repository =
      await this.findRepository(
        repositoryId,
        ownerId
      );

    const totalFiles =
      await prisma.repositoryFile.count({
        where: {
          repositoryId,
          type: "file",
        },
      });

    const totalDirectories =
      await prisma.repositoryFile.count({
        where: {
          repositoryId,
          type: "directory",
        },
      });

    return {
      id: repository.id,
      name: repository.name,
      provider: repository.provider,
      status: repository.status,
      defaultBranch:
        repository.defaultBranch,
      isPrivate:
        repository.isPrivate,
      workspaceReady:
        repository.workspacePath !==
        null,
      workspacePath:
        repository.workspacePath,
      totalFiles,
      totalDirectories,
      updatedAt:
        repository.updatedAt,
    };
  }

  static async update(
    repositoryId: string,
    ownerId: string,
    data: UpdateRepositoryInput
  ) {
    await this.findRepository(
      repositoryId,
      ownerId
    );

    return prisma.repository.update({
      where: {
        id: repositoryId,
      },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),

        ...(data.description !==
          undefined && {
          description:
            data.description,
        }),

        ...(data.provider !==
          undefined && {
          provider:
            data.provider,
        }),

        ...(data.url !== undefined && {
          url: data.url,
        }),

        ...(data.defaultBranch !==
          undefined && {
          defaultBranch:
            data.defaultBranch,
        }),

        ...(data.isPrivate !==
          undefined && {
          isPrivate:
            data.isPrivate,
        }),

        ...(data.status !==
          undefined && {
          status:
            data.status as RepositoryStatus,
        }),

        ...(data.workspacePath !==
          undefined && {
          workspacePath:
            data.workspacePath,
        }),
      },
    });
  }

  static async index(
    repositoryId: string,
    ownerId: string
  ) {
    const repository = await this.findRepository(
      repositoryId,
      ownerId
    );

    if (!repository.workspacePath) {
      throw new ApiError(
        400,
        "Repository has no workspace. Import a repository before indexing it.",
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
      const result =
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

      return result;
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

  static async delete(
    repositoryId: string,
    ownerId: string
  ) {
    const repository =
      await this.findRepository(
        repositoryId,
        ownerId
      );

    if (repository.workspacePath) {
      try {
        await GitHubService.deleteRepository(
          repository.workspacePath
        );
      } catch (error) {
        console.error(
          "Repository workspace cleanup failed.",
          error
        );
      }
    }

    await prisma.repository.delete({
      where: {
        id: repositoryId,
      },
    });

    return {
      message:
        "Repository deleted successfully.",
    };
  }
}