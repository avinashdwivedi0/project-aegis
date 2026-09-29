import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

import { GuardrailController } from "./guardrail.controller";
import {
  guardrailParamsSchema,
  upsertGuardrailSchema,
} from "./guardrail.schema";

const router = Router();

router.get(
  "/:id/guardrails",
  authenticate,
  validate(guardrailParamsSchema),
  GuardrailController.get
);

router.put(
  "/:id/guardrails",
  authenticate,
  validate(upsertGuardrailSchema),
  GuardrailController.upsert
);

export default router;