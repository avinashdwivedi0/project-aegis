import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";
import { validate } from "../../../middleware/validate.middleware";

import { TestWorkflowController } from "./test-workflow.controller";
import { testWorkflowInputSchema } from "./test-workflow.types";

const router = Router();

router.post(
  "/run",
  authenticate,
  validate({ body: testWorkflowInputSchema }),
  TestWorkflowController.run,
);

export default router;