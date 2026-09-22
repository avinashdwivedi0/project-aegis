/**
 * Repair Service – core orchestration for Phase 5 Repair Engine
 *
 * Responsibilities:
 *  - Create & manage RepairJob lifecycle
 *  - Coordinate finding-to-context retrieval
 *  - Delegate patch generation to PatchGenerator
 *  - Delegate patch validation to PatchValidator
 *  - Delegate sandboxed application to FileApplier
 *  - Track repair status & audit trail
 */

import { FindingSeverity } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import type {
  Finding,
  Patch,
  ValidationResult,
  CreateRepairJobInput,
  GeneratePatchInput,
  ApplyPatchInput,
  FindingStatus,
  PatchLifecycle,
  Severity,
} from "./repair.types";
import { PatchGenerator } from "./patchGenerator";
import { PatchValidator } from "./patchValidator";
import { FileApplier } from "./fileApplier";
import { RiskScorer } from "./riskScorer";
import { GitHubService } from "../repositories/github.service";

/* ------------------------------------------------------------------ */
/* Helper: map Prisma → domain objects                                 */
/* ------------------------------------------------------------------ */

function mapPrismaFinding(f: any): Finding {
  return {
    findingId: f.id,
    repairJobId: f.repairJobId,
    category: f.category,
    severity: f.severity as Severity,
    confidence: f.confidence,
    title: f.title,
    description: f.description,
    evidence: f.evidence as Finding["evidence"],
    filePath: f.filePath,
    startLine: f.startLine ?? undefined,
    endLine: f.endLine ?? undefined,
    detectionSource: f.detectionSource,
    recommendedFix: f.recommendedFix ?? undefined,
    status: f.status as FindingStatus,
    patchId: f.patchId ?? undefined,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

function mapPrismaPatch(p: any): Patch {
  return {
    patchId: p.id,
    findingId: p.findingId,
    repairJobId: p.repairJobId,
    diffContent: p.diffContent,
    diffHash: p.diffHash,
    patchBytes: p.patchBytes,
    linesAdded: p.linesAdded,
    linesRemoved: p.linesRemoved,
    riskScore: p.riskScore,
    target: p.target,
    lifecycle: p.lifecycle as PatchLifecycle,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    appliedAt: p.appliedAt ?? undefined,
    validatedAt: p.validatedAt ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Service                                                             */
/* ------------------------------------------------------------------ */

export class RepairService {
  /* ---------------------- RepairJob CRUD -------------------------- */

  /**
   * Create a new repair job for a project/repository.
   * Triggers the analysis orchestration asynchronously.
   */
  static async createRepairJob(
    ownerId: string,
    data: CreateRepairJobInput
  ) {
    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, ownerId },
    });
    if (!project) {
      throw new ApiError(404, "Project not found or access denied");
    }

    const repo = await prisma.repository.findFirst({
      where: { id: data.repositoryId, projectId: data.projectId },
    });
    if (!repo) {
      throw new ApiError(404, "Repository not found in project");
    }

    // Create the job
    const job = await prisma.repairJob.create({
      data: {
        projectId: data.projectId,
        repositoryId: data.repositoryId,
        ref: data.ref ?? "HEAD",
        status: "PENDING",
      },
    });

    // Kick off async orchestration (fire-and-forget, result polled)
    this.orchestrateAnalysis(job.id).catch((err) => {
      console.error(`[RepairService] orchestration failed for job ${job.id}:`, err);
    });

    return {
      jobId: job.id,
      status: job.status,
      message: "Repair job created, analysis starting",
    };
  }

  /**
   * Get repair job status + basic stats
   */
  static async getRepairJob(jobId: string, ownerId: string) {
    const job = await prisma.repairJob.findFirst({
      where: { id: jobId },
      include: {
        project: { select: { ownerId: true } },
        _count: { select: { findings: true, patches: true } },
      },
    });

    if (!job) throw new ApiError(404, "Repair job not found");
    if (job.project.ownerId !== ownerId) throw new ApiError(403, "Access denied");

    return {
      jobId: job.id,
      projectId: job.projectId,
      repositoryId: job.repositoryId,
      ref: job.ref,
      status: job.status,
      stats: {
        totalFindings: job._count.findings,
        totalPatches: job._count.patches,
      },
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  /* ---------------------- Findings -------------------------- */

  /**
   * List findings for a repair job with filters
   */
  static async listFindings(jobId: string, params: any) {
    const { status, severity, search, limit = 20, offset = 0 } = params;

    const where: any = { repairJobId: jobId };
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { filePath: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.finding.findMany({
        where,
        orderBy: [
          { severity: "desc" },
          { confidence: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.finding.count({ where }),
    ]);

    return {
      items: items.map(mapPrismaFinding),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single finding with its evidence and patch (if any)
   */
  static async getFinding(findingId: string, ownerId: string) {
    const finding = await prisma.finding.findUnique({
      where: { id: findingId },
      include: {
        repairJob: { include: { project: { select: { ownerId: true } } } },
        patch: true,
      },
    });

    if (!finding) throw new ApiError(404, "Finding not found");
    if (finding.repairJob.project.ownerId !== ownerId) {
      throw new ApiError(403, "Access denied");
    }

    return mapPrismaFinding(finding);
  }

  /* ---------------------- Patch Generation -------------------------- */

  /**
   * Generate a patch for a specific finding using the PatchGenerator agent.
   */
  static async generatePatch(findingId: string, ownerId: string, opts?: { promptOverride?: string }) {
    // Fetch finding + repo context
    const finding = await prisma.finding.findUnique({
      where: { id: findingId },
      include: {
        repairJob: {
          include: {
            repository: true,
            project: { select: { ownerId: true } },
          },
        },
      },
    });

    if (!finding) throw new ApiError(404, "Finding not found");
    if (finding.repairJob.project.ownerId !== ownerId) {
      throw new ApiError(403, "Access denied");
    }
    if (finding.patchId) {
      throw new ApiError(400, "Finding already has a patch");
    }

    // Retrieve file content for context
    const fileContent = await this.getFileContent(finding.repairJob.repositoryId, finding.filePath);

    // Build context for patch generator
    const context = {
      filePath: finding.filePath,
      fileContent,
      finding: {
        title: finding.title,
        description: finding.description,
        evidence: finding.evidence,
        startLine: finding.startLine,
        endLine: finding.endLine,
        recommendedFix: finding.recommendedFix,
      },
      promptOverride: opts?.promptOverride,
    };

    // Generate patch
    const generated = await PatchGenerator.generate(context);

    // Compute risk score
    const riskScore = RiskScorer.compute({
      patchBytes: Buffer.byteLength(generated.diffContent, "utf8"),
      linesAdded: generated.linesAdded,
      linesRemoved: generated.linesRemoved,
      totalFileLines: fileContent.split("\n").length,
      findingCategory: finding.category,
    });

    // Persist patch
    const patch = await prisma.patch.create({
      data: {
        findingId,
        repairJobId: finding.repairJobId,
        diffContent: generated.diffContent,
        diffHash: generated.diffHash,
        patchBytes: Buffer.byteLength(generated.diffContent, "utf8"),
        linesAdded: generated.linesAdded,
        linesRemoved: generated.linesRemoved,
        riskScore,
        target: "WORKSPACE_SANDBOX",
        lifecycle: "PATCH_GENERATED",
      },
    });

    // Update finding status
    await prisma.finding.update({
      where: { id: findingId },
      data: { status: "PATCHED", patchId: patch.id },
    });

    return mapPrismaPatch(patch);
  }

  /**
   * Get patch details
   */
  static async getPatch(patchId: string, ownerId: string) {
    const patch = await prisma.patch.findUnique({
      where: { id: patchId },
      include: {
        finding: { include: { repairJob: { include: { project: { select: { ownerId: true } } } } } },
      },
    });

    if (!patch) throw new ApiError(404, "Patch not found");
    if (patch.finding.repairJob.project.ownerId !== ownerId) {
      throw new ApiError(403, "Access denied");
    }

    return mapPrismaPatch(patch);
  }

  /* ---------------------- Validation / Application -------------------------- */

  /**
   * Validate a patch in the sandbox (run tests, lint, type-check, security).
   */
  static async validatePatch(patchId: string, ownerId: string) {
    const patch = await this.getPatch(patchId, ownerId);
    if (patch.lifecycle === "VALIDATED") {
      return { status: "ALREADY_VALIDATED" as const };
    }

    // Update lifecycle
    await prisma.patch.update({
      where: { id: patchId },
      data: { lifecycle: "TESTS_RERAN" },
    });

    const finding = await prisma.finding.findUnique({ where: { id: patch.findingId } });
    const job = await prisma.repairJob.findUnique({ where: { id: patch.repairJobId } });
    const repo = await prisma.repository.findUnique({ where: { id: job!.repositoryId } });

    // Run validation
    const result = await PatchValidator.validate({
      patchContent: patch.diffContent,
      repository: repo!,
      filePath: finding!.filePath,
      language: this.detectLanguage(finding!.filePath),
    });

    // Persist validation result
    const validation = await prisma.validation.create({
      data: {
        patchId,
        status: result.status,
        testsRun: result.testsRun,
        testsPassed: result.testsPassed,
        testsFailed: result.testsFailed,
        lintPassed: result.lintPassed,
        typeCheckPassed: result.typeCheckPassed,
        securityScanPassed: result.securityScanPassed,
        failures: result.failures,
        durationMs: result.durationMs,
      },
    });

    // Update patch lifecycle
    const newLifecycle = result.status === "PASS" ? "VALIDATED" : "REJECTED";
    await prisma.patch.update({
      where: { id: patchId },
      data: {
        lifecycle: newLifecycle,
        validatedAt: new Date(),
      },
    });

    if (result.status === "PASS") {
      await prisma.finding.update({
        where: { id: patch.findingId },
        data: { status: "VALIDATED" },
      });
    }

    return { validation, patchLifecycle: newLifecycle };
  }

  /**
   * Apply a validated patch (either in sandbox or to the live repo if approved).
   */
  static async applyPatch(patchId: string, ownerId: string, targetRepo = false) {
    const patch = await this.getPatch(patchId, ownerId);

    if (patch.lifecycle !== "VALIDATED") {
      throw new ApiError(400, "Patch must be VALIDATED before applying");
    }

    // Update lifecycle
    await prisma.patch.update({
      where: { id: patchId },
      data: { lifecycle: "PATCH_APPLIED_IN_WORKSPACE" },
    });

    const finding = await prisma.finding.findUnique({ where: { id: patch.findingId } });
    const job = await prisma.repairJob.findUnique({ where: { id: patch.repairJobId } });
    const repo = await prisma.repository.findUnique({ where: { id: job!.repositoryId } });

    if (targetRepo && repo?.workspacePath) {
      await GitHubService.createRepairBranch(repo.workspacePath, patch.patchId);
    }

    // Apply in sandbox
    let result = await FileApplier.apply({
      patchContent: patch.diffContent,
      repository: repo!,
      filePath: finding!.filePath,
      targetRepo,
    });

    if (result.success && targetRepo && repo?.workspacePath) {
      try {
        const delivery = await GitHubService.commitRepairBranch(
          repo.workspacePath,
          finding!.filePath,
          patch.patchId,
        );
        result = { ...result, output: `${result.output} Commit ${delivery.commit} created on ${delivery.branch}.` };
      } catch (error) {
        result = {
          success: false,
          output: result.output,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Persist application result
    await prisma.patchApplication.create({
      data: {
        patchId,
        target: targetRepo ? "PROJECT_REPO" : "WORKSPACE_SANDBOX",
        success: result.success,
        output: result.output,
        error: result.error,
      },
    });

    if (result.success) {
      await prisma.patch.update({
        where: { id: patchId },
        data: {
          lifecycle: targetRepo ? "VALIDATED" : "PATCH_APPLIED_IN_WORKSPACE",
          appliedAt: new Date(),
        },
      });
    }

    return result;
  }

  static async rejectPatch(patchId: string, ownerId: string) {
    const patch = await this.getPatch(patchId, ownerId);
    if (["PATCH_APPLIED_IN_WORKSPACE", "VALIDATED"].includes(patch.lifecycle)) {
      throw new ApiError(400, "Validated or applied patches cannot be rejected");
    }

    await prisma.patch.update({
      where: { id: patchId },
      data: { lifecycle: "REJECTED" },
    });
    await prisma.finding.update({
      where: { id: patch.findingId },
      data: { status: "REJECTED" },
    });
    return { patchId, status: "REJECTED" as const };
  }

  static async createPullRequest(
    patchId: string,
    ownerId: string,
    token: string,
    title: string,
    body: string,
  ) {
    const patch = await this.getPatch(patchId, ownerId);
    if (patch.lifecycle !== "VALIDATED") {
      throw new ApiError(400, "Patch must be VALIDATED before creating a pull request.");
    }
    const job = await prisma.repairJob.findUnique({ where: { id: patch.repairJobId } });
    const repository = job
      ? await prisma.repository.findUnique({ where: { id: job.repositoryId } })
      : null;
    if (!repository?.url) throw new ApiError(400, "A GitHub repository URL is required.");

    const branch = `aegis/repair-${patch.patchId}`;
    return GitHubService.createPullRequest(repository.url, branch, token, title, body);
  }

  /* ---------------------- Helpers -------------------------- */

  /**
   * Retrieve file content from the repository's indexed files.
   */
  private static async getFileContent(repositoryId: string, filePath: string): Promise<string> {
    const file = await prisma.repositoryFile.findFirst({
      where: { repositoryId, path: filePath },
      select: { content: true },
    });
    if (!file) {
      // fallback: empty string – generator will still produce something
      return "";
    }
    return file.content ?? "";
  }

  /**
   * Detect language from file extension (very rough)
   */
  private static detectLanguage(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      java: "java",
      cs: "csharp",
      go: "go",
      rs: "rust",
      php: "php",
      rb: "ruby",
      cpp: "cpp",
      c: "c",
      h: "c",
    };
    return map[ext] ?? "unknown";
  }

  /* ---------------------- Orchestration (async, fire-and-forget) -------------------------- */

  /**
   * Main analysis orchestration – runs in background.
   * Steps:
   * 1. Checkout repo at ref
   * 2. Run deterministic tools (lint, type-check, security scan, tests)
   * 3. Run AI agents to interpret results → create Findings
   * 4. Update job status to COMPLETED
   */
  private static async orchestrateAnalysis(jobId: string): Promise<void> {
    const job = await prisma.repairJob.findUnique({
      where: { id: jobId },
      include: { repository: true, project: true },
    });
    if (!job) return;

    try {
      await prisma.repairJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });

      // TODO: implement actual checkout & tool execution
      // For now, create some mock findings to demonstrate the pipeline
      await this.seedMockFindings(job);

      await prisma.repairJob.update({ where: { id: jobId }, data: { status: "COMPLETED" } });
    } catch (err) {
      console.error(`[RepairService] orchestration error for ${jobId}:`, err);
      await prisma.repairJob.update({ where: { id: jobId }, data: { status: "FAILED" } });
    }
  }

  /**
   * Temporary: seed mock findings so the UI has something to show.
   * Replace with real tool execution in next iteration.
   */
  private static async seedMockFindings(job: any): Promise<void> {
    const mockFindings = [
      {
        category: "code-quality",
        severity: "HIGH",
        confidence: 0.92,
        title: "Unused variable 'config'",
        description: "Variable 'config' is declared but never used",
        evidence: [{ type: "file_location", content: "src/utils/config.ts:15", source: "eslint", relevance: 1 }],
        filePath: "src/utils/config.ts",
        startLine: 15,
        endLine: 15,
        detectionSource: "eslint",
        recommendedFix: "Remove the unused variable or use it",
        status: "OPEN" as FindingStatus,
      },
      {
        category: "security",
        severity: "CRITICAL",
        confidence: 0.88,
        title: "Potential SQL injection in user query",
        description: "User input concatenated directly into SQL query string",
        evidence: [{ type: "file_location", content: "src/db/users.ts:42", source: "semgrep", relevance: 0.95 }],
        filePath: "src/db/users.ts",
        startLine: 40,
        endLine: 45,
        detectionSource: "semgrep",
        recommendedFix: "Use parameterized queries / prepared statements",
        status: "OPEN" as FindingStatus,
      },
      {
        category: "dependency",
        severity: "MEDIUM",
        confidence: 0.75,
        title: "Outdated lodash with known vulnerability",
        description: "lodash@4.17.15 has CVE-2021-23337",
        evidence: [{ type: "metric", content: '{"package":"lodash","version":"4.17.15","cve":"CVE-2021-23337"}', source: "npm-audit", relevance: 1 }],
        filePath: "package.json",
        startLine: 12,
        endLine: 12,
        detectionSource: "npm-audit",
        recommendedFix: "Upgrade lodash to >=4.17.21",
        status: "OPEN" as FindingStatus,
      },
    ];

    await prisma.finding.createMany({
      data: mockFindings.map((f) => ({
        ...f,
        severity: f.severity as FindingSeverity,
        repairJobId: job.id,
      })),
    });
  }
}