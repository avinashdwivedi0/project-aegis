import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export type GuardrailSettings = {
  id: string;
  projectId: string;
  maxPatchRiskScore: number;
  requireManualApprovalForCritical: boolean;
  sandboxOnly: boolean;
  scope: "ADVISORY" | "ENFORCED";
  createdAt: string;
  updatedAt: string;
};

const DEFAULTS: Omit<GuardrailSettings, "id" | "projectId" | "createdAt" | "updatedAt"> = {
  maxPatchRiskScore: 75,
  requireManualApprovalForCritical: false,
  sandboxOnly: false,
  scope: "ADVISORY",
};

export class GuardrailService {
  private static async ensureProjectOwner(projectId: string, ownerId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId },
      select: { id: true },
    });

    if (!project) {
      throw new ApiError(404, "Project not found or access denied.");
    }
  }

  static async get(projectId: string, ownerId: string): Promise<GuardrailSettings> {
    await this.ensureProjectOwner(projectId, ownerId);
    const settings = await prisma.guardrailSettings.findUnique({
      where: { projectId },
    });

    if (!settings) {
      throw new ApiError(404, "Guardrail settings not found for this project.");
    }

    return this.toApiShape(settings);
  }

  static async upsert(
    projectId: string,
    ownerId: string,
    data: {
      maxPatchRiskScore?: number;
      requireManualApprovalForCritical?: boolean;
      sandboxOnly?: boolean;
      scope?: "ADVISORY" | "ENFORCED";
    }
  ): Promise<GuardrailSettings> {
    await this.ensureProjectOwner(projectId, ownerId);
    const settings = await prisma.guardrailSettings.upsert({
      where: { projectId },
      update: {
        ...(data.maxPatchRiskScore !== undefined && {
          maxPatchRiskScore: data.maxPatchRiskScore,
        }),
        ...(data.requireManualApprovalForCritical !== undefined && {
          requireManualApprovalForCritical: data.requireManualApprovalForCritical,
        }),
        ...(data.sandboxOnly !== undefined && {
          sandboxOnly: data.sandboxOnly,
        }),
        ...(data.scope !== undefined && {
          scope: data.scope,
        }),
      },
      create: {
        projectId,
        maxPatchRiskScore: data.maxPatchRiskScore ?? DEFAULTS.maxPatchRiskScore,
        requireManualApprovalForCritical:
          data.requireManualApprovalForCritical ?? DEFAULTS.requireManualApprovalForCritical,
        sandboxOnly: data.sandboxOnly ?? DEFAULTS.sandboxOnly,
        scope: data.scope ?? DEFAULTS.scope,
      },
    });

    return this.toApiShape(settings);
  }

  private static toApiShape(
    settings: Awaited<ReturnType<typeof prisma.guardrailSettings.findUnique>>
  ): GuardrailSettings {
    if (!settings) {
      throw new ApiError(404, "Guardrail settings not found.");
    }

    return {
      id: settings.id,
      projectId: settings.projectId,
      maxPatchRiskScore: settings.maxPatchRiskScore,
      requireManualApprovalForCritical: settings.requireManualApprovalForCritical,
      sandboxOnly: settings.sandboxOnly,
      scope: settings.scope as "ADVISORY" | "ENFORCED",
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
