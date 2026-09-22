import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

import { ImportController } from "./import.controller";

import { importGitHubSchema } from "./import.schema";
import { zipUpload } from "./zip-upload";

const router = Router();

router.post(
  "/:id/import/github",
  authenticate,
  validate(importGitHubSchema),
  ImportController.importGitHub
);

router.post(
  "/:id/import/zip",
  authenticate,
  zipUpload.single("archive"),
  ImportController.importZip
);

export default router;