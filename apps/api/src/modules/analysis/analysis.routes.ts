import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

import { AnalysisController } from "./analysis.controller";
import {
  createAnalysisSchema,
  updateAnalysisProgressSchema,
} from "./analysis.types";

const router = Router();

router.get(
  "/",
  authenticate,
  AnalysisController.list,
);
router.post(
  "/",
  authenticate,
  validate({ body: createAnalysisSchema }),
  AnalysisController.create,
);
router.get(
  "/:id",
  authenticate,
  AnalysisController.get,
);
router.get(
  "/:id/events",
  authenticate,
  AnalysisController.events,
);
router.get(
  "/:id/summary",
  authenticate,
  AnalysisController.summary,
);
router.post(
  "/:id/start",
  authenticate,
  AnalysisController.start,
);
router.patch(
  "/:id/progress",
  authenticate,
  validate({ body: updateAnalysisProgressSchema }),
  AnalysisController.progress,
);
router.post(
  "/:id/complete",
  authenticate,
  AnalysisController.complete,
);
router.post(
  "/:id/cancel",
  authenticate,
  AnalysisController.cancel,
);
router.post(
  "/:id/retry",
  authenticate,
  AnalysisController.retry,
);

export default router;
