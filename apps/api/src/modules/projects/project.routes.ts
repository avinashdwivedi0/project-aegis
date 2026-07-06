import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

import { ProjectController } from "./project.controller";
import {
  createProjectSchema,
  projectParamsSchema,
  updateProjectSchema,
} from "./project.schema";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createProjectSchema),
  ProjectController.create
);

router.get(
  "/",
  authenticate,
  ProjectController.findAll
);

router.get(
  "/:id",
  authenticate,
  validate(projectParamsSchema),
  ProjectController.findById
);

router.patch(
  "/:id",
  authenticate,
  validate(updateProjectSchema),
  ProjectController.update
);

router.delete(
  "/:id",
  authenticate,
  validate(projectParamsSchema),
  ProjectController.delete
);

export default router;