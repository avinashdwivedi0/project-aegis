import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";
import { validate } from "../../../middleware/validate.middleware";

import { TestDesignController } from "./test-design.controller";
import { testDesignInputSchema } from "./test-design.types";

const router = Router();

router.post(
  "/",
  authenticate,
  validate({ body: testDesignInputSchema }),
  TestDesignController.design,
);

export default router;