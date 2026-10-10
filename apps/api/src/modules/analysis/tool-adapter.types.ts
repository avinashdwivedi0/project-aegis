import { randomUUID } from "node:crypto";
import type { ToolRunResult } from "./tool-runner.service";

export type CheckStatus = "PASSED" | "FINDINGS" | "FAILED" | "SKIPPED";

/** A user-visible issue; summaries without a source location stay in the check result reason. */
export type CheckFinding = {
  checkType: string;
  severity: "critical" | "high" | "moderate" | "low" | "info";
  filePath: string;
  line?: number;
  column?: number;
  ruleId: string;
  message: string;
  tool: string;
};

export type CheckResult = {
  checkType: string;
  status: CheckStatus;
  reason?: string;
  projectsScanned: number;
  findings: CheckFinding[];
};

export type ToolEvidence = {
  id: string;
  tool: string;
  toolVersion: string;
  status: "completed" | "failed" | "skipped";
  message: string;
  severity?: "critical" | "high" | "moderate" | "low" | "info";
  packageName?: string;
  filePath?: string;
  lineStart?: number;
  columnStart?: number;
  code?: string;
};

export type ToolAdapterResult = {
  tool: string;
  toolVersion: string;
  status: "completed" | "failed" | "skipped";
  /** Explicit four-state result for user-facing selected checks. */
  checkStatus?: CheckStatus;
  projectsScanned?: number;
  command: string[];
  execution?: ToolRunResult;
  evidence: ToolEvidence[];
  skippedReason?: string;
  failureReason?: string;
};

export function createCompletionEvidence(
  tool: string,
  toolVersion: string,
  message: string,
): ToolEvidence {
  return {
    id: randomUUID(),
    tool,
    toolVersion,
    status: "completed",
    severity: "info",
    message,
  };
}

export interface ToolAdapter {
  readonly name: string;
  readonly version: string;
  canRun(workspace: string): Promise<boolean>;
  run(workspace: string, signal?: AbortSignal): Promise<ToolAdapterResult>;
}
