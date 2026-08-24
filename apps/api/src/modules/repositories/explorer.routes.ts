import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { ExplorerController } from "./explorer.controller";

const router = Router();

router.get(
  "/:id/files",
  authenticate,
  ExplorerController.getFileTree
);

router.get(
  "/:id/file",
  authenticate,
  ExplorerController.getFileContent
);

export default router;