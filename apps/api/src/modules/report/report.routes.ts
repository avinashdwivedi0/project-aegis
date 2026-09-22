import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { ReportController } from "./report.controller";

const router = Router();

router.get("/:id/report.md", authenticate, ReportController.download);
router.get("/:id/report", authenticate, ReportController.get);

export default router;