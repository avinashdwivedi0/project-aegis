import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { scriptGeneratorService } from "./script-generator.service";

export class ScriptGeneratorController {
  static async generate(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await scriptGeneratorService.generate(
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Playwright scripts generated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}