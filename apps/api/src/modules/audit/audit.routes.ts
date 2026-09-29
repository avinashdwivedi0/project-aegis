import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";

import { AuditController } from "./audit.controller";

const router = Router();

router.get("/", authenticate, AuditController.list);

export default router;