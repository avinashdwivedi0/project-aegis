import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse } from "../../utils/response";

import { AuditLogService } from "./audit.service";

type AuditParams = {};

export class AuditController {
  static async list(
    req: AuthenticatedRequest<AuditParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const {
        limit = 100,
        offset = 0,
        actorId,
        targetType,
        targetId,
        success,
      } = req.query;

      const { logs, total } = await AuditLogService.getAuditLogs(
        req.user.userId,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10),
        actorId as string,
        targetType as string,
        targetId as string,
        success === "true" ? true : success === "false" ? false : undefined,
      );

      return successResponse(res, "Audit logs retrieved.", { logs, total });
    } catch (error) {
      next(error);
    }
  }
}
