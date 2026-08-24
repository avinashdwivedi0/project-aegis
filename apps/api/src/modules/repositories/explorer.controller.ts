import { NextFunction, Request, Response } from "express";
import { ExplorerService } from "./explorer.service";

export class ExplorerController {
  static async getFileTree(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const repositoryId = req.params.id as string;

      const files =
        await ExplorerService.getFileTree(
          repositoryId
        );

      return res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFileContent(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const repositoryId = req.params.id as string;
      const filePath = req.query.path as string;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          message: "File path is required.",
        });
      }

      const file =
        await ExplorerService.getFileContent(
          repositoryId,
          filePath
        );

      return res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      next(error);
    }
  }
}