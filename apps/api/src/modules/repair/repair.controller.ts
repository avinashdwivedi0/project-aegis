import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse } from "../../utils/response";

import { RepairService } from "./repair.service";

type FindingParams = { findingId: string };
type PatchParams = { patchId: string };

export class RepairController {
  static async generate(
    req: AuthenticatedRequest<FindingParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const patch = await RepairService.generatePatch(
        req.params.findingId,
        req.user.userId,
        { promptOverride: req.body?.promptOverride },
      );
      return successResponse(res, "Patch generated.", patch, 201);
    } catch (error) {
      next(error);
    }
  }

  static async get(
    req: AuthenticatedRequest<PatchParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const patch = await RepairService.getPatch(
        req.params.patchId,
        req.user.userId,
      );
      return successResponse(res, "Patch loaded.", patch);
    } catch (error) {
      next(error);
    }
  }

  static async validate(
    req: AuthenticatedRequest<PatchParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await RepairService.validatePatch(
        req.params.patchId,
        req.user.userId,
      );
      return successResponse(res, "Patch validation completed.", result);
    } catch (error) {
      next(error);
    }
  }

  static async apply(
    req: AuthenticatedRequest<PatchParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await RepairService.applyPatch(
        req.params.patchId,
        req.user.userId,
        req.body?.targetRepo === true,
      );
      return successResponse(res, "Patch application completed.", result);
    } catch (error) {
      next(error);
    }
  }

  static async reject(
    req: AuthenticatedRequest<PatchParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await RepairService.rejectPatch(req.params.patchId, req.user.userId);
      return successResponse(res, "Patch rejected.", result);
    } catch (error) {
      next(error);
    }
  }

  static async pullRequest(
    req: AuthenticatedRequest<PatchParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const token = req.header("x-github-token");
      if (!token) return res.status(400).json({ success: false, message: "x-github-token header is required." });
      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      const body = typeof req.body?.body === "string" ? req.body.body : "";
      if (!title || title.length > 200) {
        return res.status(400).json({ success: false, message: "A pull request title between 1 and 200 characters is required." });
      }
      const result = await RepairService.createPullRequest(
        req.params.patchId,
        req.user.userId,
        token,
        title,
        body,
      );
      return successResponse(res, "Pull request created.", result, 201);
    } catch (error) {
      next(error);
    }
  }
}
