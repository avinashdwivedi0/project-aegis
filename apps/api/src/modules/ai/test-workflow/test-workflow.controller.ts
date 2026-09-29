import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/auth.middleware";
import { testWorkflowService } from "./test-workflow.service";

export class TestWorkflowController {
  static async run(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await testWorkflowService.run(
        req.user.userId,
        req.body,
      );
      return res.status(200).json({
        success: true,
        message: "Generated Playwright workflow completed.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}