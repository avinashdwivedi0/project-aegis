import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/auth.middleware.js";
import { liveRunModeService } from "./live-run-mode.service.js";

export class LiveRunModeController {
  static async run(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await liveRunModeService.run(req.user.userId, req.body);
      return res.status(200).json({ success: true, message: "Selected generated-test run mode executed.", data });
    } catch (error) { next(error); }
  }
}
