import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

import { RepositoryController } from "./repository.controller";
import { ExplorerController } from "./explorer.controller";

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

router.get(
  "/repositories/:id/stats",
  authenticate,
  validate(repositoryParamsSchema),
  RepositoryController.getStats
);

router.post(
  "/repositories/:id/index",
  authenticate,
  validate(repositoryParamsSchema),
  RepositoryController.index
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

/*
|--------------------------------------------------------------------------
| Repository Explorer
|--------------------------------------------------------------------------
*/

router.get(
  "/repositories/:id/files",
  authenticate,
  validate(repositoryParamsSchema),
  ExplorerController.getFileTree
);

router.get(
  "/repositories/:id/file",
  authenticate,
  ExplorerController.getFileContent
);

export default router;