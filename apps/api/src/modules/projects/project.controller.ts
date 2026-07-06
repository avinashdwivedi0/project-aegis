import type { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

import { ProjectService } from "./project.service";
import type { ProjectParams } from "./project.types";

export class ProjectController {
  static create =
    asyncHandler<AuthenticatedRequest>(
      async (req, res: Response) => {
        const project =
          await ProjectService.create(
            req.user.userId,
            req.body
          );

        return successResponse(
          res,
          "Project created successfully.",
          project,
          201
        );
      }
    );

  static findAll =
    asyncHandler<AuthenticatedRequest>(
      async (req, res: Response) => {
        const projects =
          await ProjectService.findAll(
            req.user.userId
          );

        return successResponse(
          res,
          "Projects fetched successfully.",
          projects
        );
      }
    );

  static findById =
    asyncHandler<
      AuthenticatedRequest<ProjectParams>
    >(async (req, res: Response) => {
      const project =
        await ProjectService.findById(
          req.params.id,
          req.user.userId
        );

      return successResponse(
        res,
        "Project fetched successfully.",
        project
      );
    });

  static update =
    asyncHandler<
      AuthenticatedRequest<ProjectParams>
    >(async (req, res: Response) => {
      const project =
        await ProjectService.update(
          req.params.id,
          req.user.userId,
          req.body
        );

      return successResponse(
        res,
        "Project updated successfully.",
        project
      );
    });

  static delete =
    asyncHandler<
      AuthenticatedRequest<ProjectParams>
    >(async (req, res: Response) => {
      const result =
        await ProjectService.delete(
          req.params.id,
          req.user.userId
        );

      return successResponse(
        res,
        result.message
      );
    });
}