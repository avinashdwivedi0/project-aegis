import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../../../config/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { playwrightTestRunnerService } from "../../ai/test-runner/test-runner.service.js";
import { reactFlowDiscoveryService } from "./react-flow-discovery.service.js";
import { signupLoginPlaywrightGenerator } from "./signup-login-playwright.generator.js";
import type { BlackBoxRerunInput, BlackBoxRunInput } from "./black-box-run.types.js";
import { runRecordService } from "../run-history/run-record.service.js";

export class BlackBoxRunService {
  private readonly resultsRoot = path.resolve(process.cwd(), "results", "playwright");

  async run(ownerId: string, input: BlackBoxRunInput, compatibility = false) {
    const repository = await prisma.repository.findFirst({
      where: { id: input.repositoryId, project: { ownerId } },
      select: { id: true, name: true, workspacePath: true },
    });
    if (!repository) throw new ApiError(404, "Repository not found or access denied.");
    if (!repository.workspacePath) {
      throw new ApiError(409, "This repository's workspace is missing or was not imported correctly — try re-importing it.");
    }

    const flow = await reactFlowDiscoveryService.discoverSignupLogin(repository.workspacePath);
    const generatedFile = signupLoginPlaywrightGenerator.generate(flow, {
      frontend: input.frontendUrl,
      dashboard: input.dashboardUrl,
    });
    const runId = `autonomous-blackbox${compatibility ? "-compatibility" : ""}-${crypto.randomUUID()}`;
    const execution = await playwrightTestRunnerService.run({
      runId,
      repositoryId: repository.id,
      workspace: repository.workspacePath,
      files: [{
        path: "tests/signup-login.inferred.spec.ts",
        language: "typescript",
        testCaseId: "REQ-TC-001",
        content: generatedFile,
      }],
      parallelism: 1,
      ...(compatibility ? { compatibility: { browsers: ["chromium", "firefox", "webkit"], viewports: ["desktop", "mobile"] } } : {}),
    }, ownerId);

    const result = {
      runId: execution.runId,
      repository: { id: repository.id, name: repository.name },
      type: "black-box" as const,
      ...(compatibility ? { mode: "compatibility" as const } : {}),
      discoveredFlow: flow,
      generatedFile: {
        path: "tests/signup-login.inferred.spec.ts",
        content: generatedFile,
      },
      execution,
    };
    await runRecordService.save({
      repositoryId: repository.id,
      runId: execution.runId,
      kind: "black-box",
      suite: compatibility ? "compatibility" : "signup-login",
      mode: compatibility ? "compatibility" : undefined,
      status: execution.status,
      result,
    });
    return result;
  }

  async rerun(ownerId: string, input: BlackBoxRerunInput) {
    const repository = await prisma.repository.findFirst({
      where: { id: input.repositoryId, project: { ownerId } },
      select: { id: true, name: true, workspacePath: true },
    });
    if (!repository) throw new ApiError(404, "Repository not found or access denied.");
    if (!repository.workspacePath) {
      throw new ApiError(409, "This repository's workspace is missing or was not imported correctly — try re-importing it.");
    }

    const baselineDirectory = path.resolve(this.resultsRoot, input.baselineRunId);
    if (!baselineDirectory.startsWith(`${this.resultsRoot}${path.sep}`)) {
      throw new ApiError(400, "Invalid baseline run identifier.");
    }
    let baseline: { repositoryId?: string };
    let content: string;
    try {
      baseline = JSON.parse(await fs.readFile(path.join(baselineDirectory, "run.json"), "utf8")) as { repositoryId?: string };
      content = await fs.readFile(path.join(baselineDirectory, "suite", "tests", "signup-login.inferred.spec.ts"), "utf8");
    } catch {
      throw new ApiError(404, "Baseline generated test was not found for this repository.");
    }
    if (baseline.repositoryId !== repository.id) {
      throw new ApiError(404, "Baseline generated test was not found for this repository.");
    }

    const runId = `autonomous-blackbox-regression-${crypto.randomUUID()}`;
    const execution = await playwrightTestRunnerService.run({
      runId,
      repositoryId: repository.id,
      workspace: repository.workspacePath,
      files: [{
        path: "tests/signup-login.inferred.spec.ts",
        language: "typescript",
        testCaseId: "REQ-TC-001",
        content,
      }],
      parallelism: 1,
    }, ownerId);

    const result = {
      runId,
      repository: { id: repository.id, name: repository.name },
      type: "black-box" as const,
      mode: "regression" as const,
      baselineRunId: input.baselineRunId,
      execution,
    };
    await runRecordService.save({
      repositoryId: repository.id,
      runId,
      kind: "black-box",
      suite: "signup-login",
      mode: "regression",
      status: execution.status,
      result,
    });
    return result;
  }
}

export const blackBoxRunService = new BlackBoxRunService();
