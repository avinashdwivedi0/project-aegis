import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";
import { validate } from "../../../middleware/validate.middleware";

import { TestRunnerController } from "./test-runner.controller";
import { testRunnerInputSchema } from "./test-runner.types";

const router = Router();

router.post(
  "/",
  authenticate,
  validate({ body: testRunnerInputSchema }),
  TestRunnerController.run,
);

export default router;