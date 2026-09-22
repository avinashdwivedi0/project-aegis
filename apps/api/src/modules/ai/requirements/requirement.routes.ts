import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";
import { validate } from "../../../middleware/validate.middleware";

import { RequirementController } from "./requirement.controller";
import { requirementAnalysisInputSchema } from "./requirement.types";

const router = Router();

router.post(
  "/analyze",
  authenticate,
  validate({
    body: requirementAnalysisInputSchema,
  }),
  RequirementController.analyze,
);

export default router;