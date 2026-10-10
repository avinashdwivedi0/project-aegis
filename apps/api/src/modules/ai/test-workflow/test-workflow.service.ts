import crypto from "node:crypto";

import { prisma } from "../../../config/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requirementAnalystService } from "../requirements/requirement-analyst.service.js";
import { testDesignerService } from "../test-design/test-designer.service.js";
import { scriptGeneratorService } from "../script-generation/script-generator.service.js";
import { playwrightTestRunnerService } from "../test-runner/test-runner.service.js";
import { localTestGeneratorService } from "./local-test-generator.service.js";
import { AuditLogger } from "../../../utils/audit-logger.js";

import {
  testWorkflowInputSchema,
  type TestWorkflowInput,
} from "./test-workflow.types.js";

export class TestWorkflowService {
  async run(ownerId: string, input: TestWorkflowInput) {
    const validatedInput = testWorkflowInputSchema.parse(input);
    const repository = await prisma.repository.findFirst({
      where: {
        id: validatedInput.repositoryId,
        projectId: validatedInput.projectId,
        project: { ownerId },
      },
      select: {
        id: true,
        workspacePath: true,
      },
    });

    if (!repository) {
      throw new ApiError(404, "Repository not found or access denied.");
    }
    if (!repository.workspacePath) {
      throw new ApiError(
        409,
        "This repository's workspace is missing or was not imported correctly — try re-importing it.",
      );
    }

    // Zero-cost local mode: use heuristic-based generation
    if (process.env.AGENT_MODE?.trim() === "local") {
      const scenarios = await localTestGeneratorService.analyzeRequirement(
        validatedInput.requirement,
      );
      if (scenarios.scenarios.length === 0) {
        throw new Error("No testable scenarios found for the requirement.");
      }

      const testCases = await localTestGeneratorService.designTestCases(
        scenarios.scenarios,
      );
      if (testCases.testCases.length === 0) {
        throw new Error("No test cases generated for the scenarios.");
      }

      const scripts = await localTestGeneratorService.generateScripts(
        testCases,
      );

      const runId = `workflow-${crypto.randomUUID()}`;
      const run = await playwrightTestRunnerService.run({
        runId,
        repositoryId: repository.id,
        workspace: repository.workspacePath,
        files: scripts.files,
        parallelism: validatedInput.parallelism,
      }, ownerId);

      await AuditLogger.record(
        ownerId,
        "TEST_WORKFLOW_APPROVED_RUN",
        "TestWorkflow",
        runId,
        {
          projectId: validatedInput.projectId,
          repositoryId: validatedInput.repositoryId,
          approved: validatedInput.approved,
          requirementLength: validatedInput.requirement.length,
          parallelism: validatedInput.parallelism,
        },
        true,
      );

      return {
        runId,
        requirement: validatedInput.requirement,
        scenarios,
        testCases,
        scripts,
        run,
      };
    }

    // Default Groq-based pipeline (costs tokens)
    const scenarios = await requirementAnalystService.analyze({
      requirement: validatedInput.requirement,
    });
    if (scenarios.scenarios.length === 0) {
      throw new Error(
        "Requirement Analyst found no testable scenarios in the requirement.",
      );
    }

    const testCases = await testDesignerService.design({
      contractVersion: "1.0",
      scenarios: scenarios.scenarios,
    });
    if (testCases.testCases.length === 0) {
      throw new Error(
        "Test Designer produced no test cases for the generated scenarios.",
      );
    }

    const scripts = await scriptGeneratorService.generate({
      contractVersion: "1.0",
      approved: true,
      testCases: testCases.testCases,
    });
    const runId = `workflow-${crypto.randomUUID()}`;
    const run = await playwrightTestRunnerService.run({
      runId,
      repositoryId: repository.id,
      workspace: repository.workspacePath,
      files: scripts.files,
      parallelism: validatedInput.parallelism,
    }, ownerId);

    await AuditLogger.record(
      ownerId,
      "TEST_WORKFLOW_APPROVED_RUN",
      "TestWorkflow",
      runId,
      {
        projectId: validatedInput.projectId,
        repositoryId: validatedInput.repositoryId,
        approved: validatedInput.approved,
        requirementLength: validatedInput.requirement.length,
        parallelism: validatedInput.parallelism,
      },
      true,
    );

    return {
      runId,
      requirement: validatedInput.requirement,
      scenarios,
      testCases,
      scripts,
      run,
    };
  }
}

export const testWorkflowService =
  new TestWorkflowService();
