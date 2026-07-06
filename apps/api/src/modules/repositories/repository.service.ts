import {
  Prisma,
  RepositoryProvider,
  RepositoryStatus,
} from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

import type {
  CreateRepositoryInput,
  RepositoryQuery,
  UpdateRepositoryInput,
} from "./repository.types";

export class RepositoryService {
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
      },
    });
  }

  static async delete(
    repositoryId: string,
    ownerId: string
  ) {
    await this.findRepository(
      repositoryId,
      ownerId
    );

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