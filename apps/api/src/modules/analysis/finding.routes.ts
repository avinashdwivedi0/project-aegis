import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";

import { FindingController } from "./finding.controller";

const router = Router();

router.get(
  "/:id/findings",
  authenticate,
  FindingController.list,
);
router.get(
  "/:id/score",
  authenticate,
  FindingController.score,
);

export default router;
