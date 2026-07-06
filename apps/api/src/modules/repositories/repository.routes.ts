import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

import { RepositoryController } from "./repository.controller";

import {
  createRepositorySchema,
  updateRepositorySchema,
  repositoryParamsSchema,
  projectRepositoryParamsSchema,
  repositoryQuerySchema,
} from "./repository.schema";

const router = Router();

/*
|--------------------------------------------------------------------------
| Project Repository Routes
|--------------------------------------------------------------------------
*/

router.post(
  "/projects/:projectId/repositories",
  authenticate,
  validate(createRepositorySchema),
  RepositoryController.create
);

router.get(
  "/projects/:projectId/repositories",
  authenticate,
  validate({
    ...projectRepositoryParamsSchema,
    ...repositoryQuerySchema,
  }),
  RepositoryController.findAll
);

/*
|--------------------------------------------------------------------------
| Repository Routes
|--------------------------------------------------------------------------
*/

router.get(
  "/repositories/:id",
  authenticate,
  validate(repositoryParamsSchema),
  RepositoryController.findById
);

router.patch(
  "/repositories/:id",
  authenticate,
  validate(updateRepositorySchema),
  RepositoryController.update
);

router.delete(
  "/repositories/:id",
  authenticate,
  validate(repositoryParamsSchema),
  RepositoryController.delete
);

export default router;