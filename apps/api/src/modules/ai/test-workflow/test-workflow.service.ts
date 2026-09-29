import crypto from "node:crypto";

import { prisma } from "../../../config/prisma";
import { requirementAnalystService } from "../requirements/requirement-analyst.service";
import { testDesignerService } from "../test-design/test-designer.service";
import { scriptGeneratorService } from "../script-generation/script-generator.service";
import { playwrightTestRunnerService } from "../test-runner/test-runner.service";
import { localTestGeneratorService } from "./local-test-generator.service";

import {
  testWorkflowInputSchema,
  type TestWorkflowInput,
} from "./test-workflow.types";

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

    if (!repository?.workspacePath) {
      throw new Error(
        "Repository not found, access denied, or workspace is unavailable.",
      );
    }

    // Zero-cost local mode: use heuristic-based generation
    if (process.env.AGENT_MODE === "local") {
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
        testCases.testCases,
      );

      const runId = `workflow-${crypto.randomUUID()}`;
      const run = await playwrightTestRunnerService.run({
        runId,
        repositoryId: repository.id,
        workspace: repository.workspacePath,
        files: scripts.files,
        parallelism: validatedInput.parallelism,
      });

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
    });

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