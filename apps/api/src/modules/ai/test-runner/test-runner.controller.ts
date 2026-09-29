import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { playwrightTestRunnerService } from "./test-runner.service";

export class TestRunnerController {
  static async run(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await playwrightTestRunnerService.run(
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Playwright test run completed.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}