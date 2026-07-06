import {
  ProjectStatus,
  ProjectVisibility,
} from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.types";

export class ProjectService {
  static async create(
    ownerId: string,
    data: CreateProjectInput
  ) {
    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId,
      },
    });
  }

  static async findAll(ownerId: string) {
    return prisma.project.findMany({
      where: {
        ownerId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  static async findById(
    id: string,
    ownerId: string
  ) {
    const project =
      await prisma.project.findFirst({
        where: {
          id,
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

  static async update(
    id: string,
    ownerId: string,
    data: UpdateProjectInput
  ) {
    await this.findById(id, ownerId);

    return prisma.project.update({
      where: {
        id,
      },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),

        ...(data.description !== undefined && {
          description: data.description,
        }),

        ...(data.status !== undefined && {
          status:
            data.status as ProjectStatus,
        }),

        ...(data.visibility !== undefined && {
          visibility:
            data.visibility as ProjectVisibility,
        }),
      },
    });
  }

  static async delete(
    id: string,
    ownerId: string
  ) {
    await this.findById(id, ownerId);

    await prisma.project.delete({
      where: {
        id,
      },
    });

    return {
      message:
        "Project deleted successfully.",
    };
  }
}