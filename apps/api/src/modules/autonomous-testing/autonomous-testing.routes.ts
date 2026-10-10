import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { BlackBoxRunController } from "./black-box/black-box-run.controller.js";
import { blackBoxRerunInputSchema, blackBoxRunInputSchema } from "./black-box/black-box-run.types.js";
import { LiveSuiteController } from "./live-suite.controller.js";
import { integrationRunInputSchema, securityRunInputSchema, unitRunInputSchema } from "./live-suite.types.js";
import { liveRunModeInputSchema } from "./run-modes/live-run-mode.types.js";
import { LiveRunModeController } from "./run-modes/live-run-mode.controller.js";
import { RunHistoryController } from "./run-history/run-history.controller.js";
import { runHistoryParamsSchema } from "./run-history/run-history.types.js";

const router = Router();

router.get(
  "/runs/:repositoryId",
  authenticate,
  validate({ params: runHistoryParamsSchema }),
  RunHistoryController.list,
);
router.post("/run-modes/run", authenticate, validate({ body: liveRunModeInputSchema }), LiveRunModeController.run);
router.post("/unit/run", authenticate, validate({ body: unitRunInputSchema }), LiveSuiteController.runUnit);
router.post("/integration/run", authenticate, validate({ body: integrationRunInputSchema }), LiveSuiteController.runIntegration);
router.post("/security/run", authenticate, validate({ body: securityRunInputSchema }), LiveSuiteController.runSecurity);

router.post(
  "/black-box/run",
  authenticate,
  validate({ body: blackBoxRunInputSchema }),
  BlackBoxRunController.run,
);

router.post(
  "/black-box/rerun",
  authenticate,
  validate({ body: blackBoxRerunInputSchema }),
  BlackBoxRunController.rerun,
);

export default router;
