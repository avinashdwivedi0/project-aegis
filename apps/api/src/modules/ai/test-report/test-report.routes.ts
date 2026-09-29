import { Router } from "express";

import { authenticate } from "../../../middleware/auth.middleware";
import { TestReportController } from "./test-report.controller";

const router = Router();

router.get("/", authenticate, TestReportController.get);

export default router;