import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";
import { validate } from "../../../middleware/validate.middleware";

import { SelfHealingController } from "./self-healing.controller";
import { selfHealingInputSchema } from "./self-healing.types";

const router = Router();

router.post(
  "/proposals",
  authenticate,
  validate({ body: selfHealingInputSchema }),
  SelfHealingController.propose,
);
router.get(
  "/proposals",
  authenticate,
  SelfHealingController.list,
);
router.post(
  "/proposals/:proposalId/review",
  authenticate,
  SelfHealingController.review,
);
router.post(
  "/proposals/:proposalId/validate",
  authenticate,
  SelfHealingController.validate,
);
router.post(
  "/proposals/:proposalId/retry",
  authenticate,
  SelfHealingController.retry,
);

export default router;