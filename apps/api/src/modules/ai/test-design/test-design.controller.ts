import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { testDesignerService } from "./test-designer.service";

export class TestDesignController {
  static async design(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await testDesignerService.design(
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Test cases generated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}