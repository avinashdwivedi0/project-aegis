import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes";
import projectRoutes from "../modules/projects/project.routes";

import repositoryRoutes from "../modules/repositories/repository.routes";
import importRoutes from "../modules/repositories/import.routes";
import explorerRoutes from "../modules/repositories/explorer.routes";

import aiRoutes from "../modules/ai";
import analysisRoutes from "../modules/analysis/analysis.routes";
import findingRoutes from "../modules/analysis/finding.routes";
import repairRoutes from "../modules/repair/repair.routes";
import reportRoutes from "../modules/report/report.routes";

const router = Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use("/auth", authRoutes);

/*
|--------------------------------------------------------------------------
| Projects
|--------------------------------------------------------------------------
*/

router.use("/projects", projectRoutes);

/*
|--------------------------------------------------------------------------
| Repository CRUD
|--------------------------------------------------------------------------
*/

router.use("/", repositoryRoutes);

/*
|--------------------------------------------------------------------------
| Repository Import
|--------------------------------------------------------------------------
|
| POST /api/repositories/:id/import/github
| POST /api/repositories/:id/import/zip
|
*/

router.use("/repositories", importRoutes);

/*
|--------------------------------------------------------------------------
| Repository Explorer
|--------------------------------------------------------------------------
|
| GET /api/repositories/:id/files
| GET /api/repositories/:id/file
|
*/

router.use("/repositories", explorerRoutes);

/*
|--------------------------------------------------------------------------
| AI
|--------------------------------------------------------------------------
|
| POST /api/chat
|
*/

router.use("/", aiRoutes);

router.use("/analyses", analysisRoutes);
router.use("/analyses", findingRoutes);
router.use("/analyses", reportRoutes);
router.use("/repairs", repairRoutes);

export default router;