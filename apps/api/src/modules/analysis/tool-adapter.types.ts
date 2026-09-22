import type { ToolRunResult } from "./tool-runner.service";

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
  command: string[];
  execution?: ToolRunResult;
  evidence: ToolEvidence[];
  skippedReason?: string;
};

export interface ToolAdapter {
  readonly name: string;
  readonly version: string;
  canRun(workspace: string): Promise<boolean>;
  run(workspace: string, signal?: AbortSignal): Promise<ToolAdapterResult>;
}
