import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";

import { RepairController } from "./repair.controller";

const router = Router();

router.post(
  "/findings/:findingId/patch",
  authenticate,
  RepairController.generate,
);
router.get(
  "/patches/:patchId",
  authenticate,
  RepairController.get,
);
router.post(
  "/patches/:patchId/approve",
  authenticate,
  RepairController.approve,
);
router.post(
  "/patches/:patchId/validate",
  authenticate,
  RepairController.validate,
);
router.post(
  "/patches/:patchId/apply",
  authenticate,
  RepairController.apply,
);
router.post(
  "/patches/:patchId/reject",
  authenticate,
  RepairController.reject,
);
router.post(
  "/patches/:patchId/pull-request",
  authenticate,
  RepairController.pullRequest,
);

export default router;
