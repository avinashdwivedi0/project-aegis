import { NextFunction, Request, Response } from "express";
import { ExplorerService } from "./explorer.service";
import { RepositoryService } from "./repository.service";
import { retrievalService } from "../ai/retrieval/retrieval.service";

export class ExplorerController {
  static async search(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const repositoryId = req.params.id as string;
      const ownerId = (req as Request & { user: { userId: string } }).user.userId;
      await RepositoryService.findForOwner(repositoryId, ownerId);
      const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!query) return res.status(400).json({ success: false, message: "Search query is required." });
      const results = await retrievalService.search({ repositoryId, query, limit: 10 });
      return res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  static async getFileTree(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const repositoryId = req.params.id as string;
      const ownerId = (req as Request & { user: { userId: string } }).user.userId;
      await RepositoryService.findForOwner(repositoryId, ownerId);

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
      const ownerId = (req as Request & { user: { userId: string } }).user.userId;
      await RepositoryService.findForOwner(repositoryId, ownerId);
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
