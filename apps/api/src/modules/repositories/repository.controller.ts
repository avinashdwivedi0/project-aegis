import type { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

import { RepositoryService } from "./repository.service";

import type {
  ProjectRepositoryParams,
  RepositoryParams,
  RepositoryQuery,
} from "./repository.types";

export class RepositoryController {
  static create =
    asyncHandler<
      AuthenticatedRequest<ProjectRepositoryParams>
    >(async (req, res: Response) => {
      const repository =
        await RepositoryService.create(
          req.params.projectId,
          req.user.userId,
          req.body
        );

      return successResponse(
        res,
        "Repository created successfully.",
        repository,
        201
      );
    });

  static findAll =
    asyncHandler<
      AuthenticatedRequest<ProjectRepositoryParams>
    >(async (req, res: Response) => {
      const query: RepositoryQuery = {
        search:
          typeof req.query.search === "string"
            ? req.query.search
            : undefined,

        provider:
          typeof req.query.provider === "string"
            ? (req.query.provider as RepositoryQuery["provider"])
            : undefined,

        status:
          typeof req.query.status === "string"
            ? (req.query.status as RepositoryQuery["status"])
            : undefined,
      };

      const repositories =
        await RepositoryService.findAll(
          req.params.projectId,
          req.user.userId,
          query
        );

      return successResponse(
        res,
        "Repositories fetched successfully.",
        repositories
      );
    });

  static findById =
    asyncHandler<
      AuthenticatedRequest<RepositoryParams>
    >(async (req, res: Response) => {
      const repository =
        await RepositoryService.findById(
          req.params.id,
          req.user.userId
        );

      return successResponse(
        res,
        "Repository fetched successfully.",
        repository
      );
    });

  static update =
    asyncHandler<
      AuthenticatedRequest<RepositoryParams>
    >(async (req, res: Response) => {
      const repository =
        await RepositoryService.update(
          req.params.id,
          req.user.userId,
          req.body
        );

      return successResponse(
        res,
        "Repository updated successfully.",
        repository
      );
    });

  static delete =
    asyncHandler<
      AuthenticatedRequest<RepositoryParams>
    >(async (req, res: Response) => {
      const result =
        await RepositoryService.delete(
          req.params.id,
          req.user.userId
        );

      return successResponse(
        res,
        result.message
      );
    });
}