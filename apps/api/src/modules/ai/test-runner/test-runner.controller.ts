import type { NextFunction, Response } from "express";

import { prisma } from "../../../config/prisma";
import type { AuthenticatedRequest } from "../../../middleware/auth.middleware";
import { ApiError } from "../../../utils/ApiError";
import { playwrightTestRunnerService } from "./test-runner.service";

export class TestRunnerController {
  static async run(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const repositoryId = typeof req.body?.repositoryId === "string" ? req.body.repositoryId : "";
      if (!repositoryId) throw new ApiError(400, "repositoryId is required.");
      const repository = await prisma.repository.findFirst({
        where: { id: repositoryId, project: { ownerId: req.user.userId } },
        select: { workspacePath: true },
      });
      if (!repository) throw new ApiError(404, "Repository not found or access denied.");
      if (!repository.workspacePath) throw new ApiError(409, "Repository workspace is not available.");
      const data = await playwrightTestRunnerService.run(
        { ...req.body, workspace: repository.workspacePath },
        req.user.userId,
      );

      return res.status(200).json({
        success: true,
        message: "Playwright test run completed.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
