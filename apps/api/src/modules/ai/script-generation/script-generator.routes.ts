import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";
import { validate } from "../../../middleware/validate.middleware";

import { ScriptGeneratorController } from "./script-generator.controller";
import { scriptGenerationInputSchema } from "./script-generation.types";

const router = Router();

router.post(
  "/",
  authenticate,
  validate({ body: scriptGenerationInputSchema }),
  ScriptGeneratorController.generate,
);

export default router;