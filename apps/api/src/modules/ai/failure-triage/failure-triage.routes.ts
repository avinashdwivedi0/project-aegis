import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";
import { validate } from "../../../middleware/validate.middleware";

import { FailureTriageController } from "./failure-triage.controller";
import { failureTriageInputSchema } from "./failure-triage.types";

const router = Router();

router.post(
  "/",
  authenticate,
  validate({ body: failureTriageInputSchema }),
  FailureTriageController.triage,
);

export default router;