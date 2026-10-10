import type { NextFunction, Response } from "express";

import { prisma } from "../../../config/prisma";
import type { AuthenticatedRequest } from "../../../middleware/auth.middleware";
import { ApiError } from "../../../utils/ApiError";
import { chatService } from "./chat.service";

export class ChatController {
  static async chat(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const repository = await prisma.repository.findFirst({
        where: { id: req.body.repositoryId, project: { ownerId: req.user.userId } },
        select: { id: true },
      });
      if (!repository) throw new ApiError(404, "Repository not found or access denied.");
      const response =
        await chatService.chat(req.body);

      return res.status(200).json({
        success: true,
        message: "Chat response generated successfully.",
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
}
