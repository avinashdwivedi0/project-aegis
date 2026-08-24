/**
 * Types for the Repair Engine (Phase 5)
 *
 * Covers: finding-to-context retrieval, patch generation,
 * patch application in a temporary workspace, regression
 * validation, and repair status tracking.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Enums – must mirror the Prisma enums (kept in sync manually)       */
/* ------------------------------------------------------------------ */

export enum RepairJobStatus {
  PENDING = "PENDING",        // queued, not yet started
  RUNNING = "RUNNING",        // analysis orchestrator active
  COMPLETED = "COMPLETED",    // all agents finished successfully
  FAILED = "FAILED",          // fatal error during run
}

export enum FindingStatus {
  OPEN = "OPEN",              // new, untouched
  REVIEWED = "REVIEWED",      // reviewed by AI / human
  PATCHED = "PATCHED",        // patch generated
  VALIDATED = "VALIDATED",    // patch validated + tests pass
  REJECTED = "REJECTED",      // user / system rejected
}

export enum Severity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  INFO = "INFO",
}

export type PatchLifecycle =
  | "DETECTED"
  | "REVIEWED"
  | "PATCH_GENERATED"
  | "PATCH_APPLIED_IN_WORKSPACE"
  | "TESTS_RERAN"
  | "VALIDATED"
  | "REJECTED";

/* ------------------------------------------------------------------ */
/* Core interfaces                                                    */
/* ------------------------------------------------------------------ */

/**
 * A detected finding (issue) that may be associated with a repair.
 */
export interface Finding {
  findingId: string;             // UUID
  repairJobId: string;           // FK → RepairJob
  category: string;              // e.g. "code-quality", "security"
  severity: Severity;

  // confidence from AI / tool
  confidence: number;            // 0-1

  title: string;
  description: string;           // human-readable
  evidence: FindingEvidence[];
  filePath: string;              // relative to repo root
  startLine?: number;
  endLine?: number;
  detectionSource: string;       // "prettier", "eslint", "semgrep", "AI"
  recommendedFix?: string;

  status: FindingStatus;
  patchId?: string;              // optional FK → Patch when patched

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Evidence supporting a finding.
 */
export interface FindingEvidence {
  type: "stdout" | "stderr" | "file_location" | "metric" | "ai_summary";
  content: string;               // text / JSON serialised
  source: string;                // tool name, agent name
  relevance: number;             // 0-1 weight
}

/**
 * A proposed / applied patch.
 */
export interface Patch {
  patchId: string;
  findingId: string;             // one patch per finding (simplification)
  repairJobId: string;

  /** Unified diff content */
  diffContent: string;

  /** SHA-256 of diffContent */
  diffHash: string;

  /** Size of patch in bytes */
  patchBytes: number;

  /** Lines changed (+/-) */
  linesAdded: number;
  linesRemoved: number;

  /** Computed risk score 0-1 */
  riskScore: number;

  /**
   * Where the patch was / will be applied.
   * - "WORKSPACE_SANDBOX" – tested in Docker sandbox
   * - "PROJECT_REPO"    – applied to live repo (after approval)
   */
  target: "WORKSPACE_SANDBOX" | "PROJECT_REPO";

  lifecycle: PatchLifecycle;

  createdAt: Date;
  updatedAt: Date;
  appliedAt?: Date;              // when applied in sandbox
  validatedAt?: Date;            // when validation completed
}

/**
 * Validation results for a patch.
 */
export interface ValidationResult {
  validationId: string;
  patchId: string;
  status: "PASS" | "FAIL";

  /** Tests run */
  testsRun: number;
  testsPassed: number;
  testsFailed: number;

  /** Static checks rerun */
  lintPassed: boolean;
  typeCheckPassed: boolean;
  securityScanPassed: boolean;

  /**
   * If FAIL, what failed
   */
  failures: string[];

  /** Duration of validation run in milliseconds */
  durationMs: number;

  createdAt: Date;
}

/* ------------------------------------------------------------------ */
/* API Schemas (zod)                                                  */
/* ------------------------------------------------------------------ */

export const CreateRepairJobSchema = z.object({
  projectId: z.string().uuid(),
  repositoryId: z.string().uuid(),
  // optional: specific commit / ref
  ref: z.string().optional().default("HEAD"),
});

export const GeneratePatchSchema = z.object({
  findingId: z.string().uuid(),
  // optional override prompt
  promptOverride: z.string().optional(),
});

export const ApplyPatchSchema = z.object({
  patchId: z.string().uuid(),
  // optional: apply to live repo instead of sandbox
  targetRepo: z.boolean().optional().default(false),
});

export const ListFindingsSchema = z.object({
  repairJobId: z.string().uuid(),
  status: z.nativeEnum(FindingStatus).optional(),
  severity: z.nativeEnum(Severity).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export type CreateRepairJobInput = z.infer<typeof CreateRepairJobSchema>;
export type GeneratePatchInput = z.infer<typeof GeneratePatchSchema>;
export type ApplyPatchInput = z.infer<typeof ApplyPatchSchema>;
export type ListFindingsInput = z.infer<typeof ListFindingsSchema>;
