import {
  NextFunction,
  Request,
  Response,
} from "express";

import { ImportService } from "./import.service";

export class ImportController {
  static async importGitHub(
    req: Request,
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
    req: Request,
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