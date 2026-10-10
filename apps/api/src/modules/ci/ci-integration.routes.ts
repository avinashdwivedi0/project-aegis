import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";

import { prisma } from "../../config/prisma";
import { ciIntegrationService } from "./ci-integration.service";
import { ApiError } from "../../utils/ApiError";

const router = Router();

/**
 * Prisma CUID identifiers are 25 characters: "c" + 24 lowercase alphanumeric chars.
 */
const CUID_PATTERN = /^c[a-z0-9]{24}$/;

/**
 * POST /api/projects/:id/ci-config
 * Body: { platform: "github" | "gitlab" | "azure", repositoryId: string, apiUrl: string, triggers?: string[], analysisTypes?: string[], mergeGate?: boolean }
 * Returns: { filePath: string; content: string } — the generated CI YAML
 */
router.post(
  "/projects/:id/ci-config",
  authenticate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const projectId = Array.isArray(id) ? id[0] : id;
      const { platform, repositoryId, apiUrl, triggers, analysisTypes, mergeGate } = req.body;

      if (!platform || !repositoryId || !apiUrl) {
        return res.status(400).json({
          success: false,
          message: "platform, repositoryId, and apiUrl are required",
        });
      }

      // Strict identifier validation: reject (don't strip) any value not matching the CUID pattern
      if (!CUID_PATTERN.test(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid projectId: must be a CUID (c + 23 lowercase alphanumeric characters)",
        });
      }
      if (!CUID_PATTERN.test(repositoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid repositoryId: must be a CUID (c + 23 lowercase alphanumeric characters)",
        });
      }

      // Verify the project exists and belongs to the authenticated user
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: req.user.userId },
        select: { id: true, name: true },
      });

      if (!project) {
        throw new ApiError(404, "Project not found or access denied.");
      }

      // Verify the repository belongs to this project
      const repository = await prisma.repository.findFirst({
        where: { id: repositoryId, projectId },
        select: { id: true, name: true },
      });

      if (!repository) {
        throw new ApiError(404, "Repository not found or does not belong to this project.");
      }

      let result: { filePath: string; content: string };

      switch (platform) {
        case "github":
          result = await ciIntegrationService.generateGitHubActionsWorkflow(
            projectId,
            {
              repositoryId,
              apiUrl,
              triggers,
              analysisTypes,
              mergeGate,
            }
          );
          break;

        case "gitlab":
          result = await ciIntegrationService.generateGitLabCiConfig(
            projectId,
            {
              repositoryId,
              apiUrl,
              analysisTypes,
              mergeGate,
            }
          );
          break;

        case "azure":
          result = await ciIntegrationService.generateAzurePipelinesConfig(
            projectId,
            {
              repositoryId,
              apiUrl,
              analysisTypes,
              mergeGate,
            }
          );
          break;

        default:
          return res.status(400).json({
            success: false,
            message: `Unsupported CI platform: ${platform}`,
          });
      }

      return res.status(200).json({
        success: true,
        message: `CI configuration generated for ${platform.toUpperCase()}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
