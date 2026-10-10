import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { ImportService } from "./import.service";

export class ImportController {
  static async importGitHub(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const repositoryId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message:
            "GitHub repository URL is required.",
        });
      }

      const result =
        await ImportService.importFromGitHub(
          repositoryId,
          url,
          req.user.userId,
        );

      return res.status(200).json({
        success: true,
        message:
          "Repository imported successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async importZip(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const repositoryId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "A ZIP archive is required in the archive field.",
        });
      }

      const result =
        await ImportService.importFromZip(
          repositoryId,
          req.file.path,
          req.user.userId,
        );

      return res.status(200).json({
        success: true,
        message:
          "ZIP import completed.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
