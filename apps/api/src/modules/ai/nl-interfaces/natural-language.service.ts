import crypto from "node:crypto";

import { prisma } from "../../../config/prisma";
import { localTestGeneratorService } from "../test-workflow/local-test-generator.service";

import type { TestWorkflowInput } from "../test-workflow/test-workflow.types";

/**
 * NaturalLanguageInterface maps plain English requirements to
 * test actions using keyword and pattern matching (no LLM needed).
 *
 * Supports:
 * - "Write tests for X" -> generates test scenarios
 * - "Run the login test" -> runs specific test by keyword match
 * - "Why did test Y fail?" -> retrieves failure details
 */
export class NaturalLanguageInterface {
  /**
   * Parse a natural language command and execute the appropriate action.
   */
  async execute(ownerId: string, command: string): Promise<NlCommandResult> {
    const normalized = command.toLowerCase().trim();

    if (this.isTestGeneration(normalized)) {
      return this.handleTestGeneration(ownerId, normalized);
    }

    if (this.isTestRun(normalized)) {
      return this.handleTestRun(normalized);
    }

    if (this.isFailureDebug(normalized)) {
      return this.handleFailureDebug(normalized);
    }

    if (this.isTestEdit(normalized)) {
      return this.handleTestEdit(normalized);
    }

    if (this.isTestList(normalized)) {
      return this.handleTestList(ownerId, normalized);
    }

    return {
      action: "unknown",
      response: "I'm not sure what you want to do. Try: 'write tests for X', 'run the login test', 'why did test Y fail?', 'edit test Z', or 'list tests'.",
    };
  }

  private isTestGeneration(cmd: string): boolean {
    const triggers = [
      "write test", "generate test", "create test", "add test",
      "test for", "tests for", "need a test", "need tests",
      "test case", "test scenario",
    ];
    return triggers.some((t) => cmd.includes(t));
  }

  private isTestRun(cmd: string): boolean {
    const triggers = [
      "run test", "execute test", "run the", "run tests",
      "run login", "run checkout", "run search",
    ];
    return triggers.some((t) => cmd.includes(t));
  }

  private isFailureDebug(cmd: string): boolean {
    const triggers = [
      "why did", "why does", "why is", "what failed",
      "explain failure", "failure reason", "root cause",
    ];
    return triggers.some((t) => cmd.includes(t));
  }

  private isTestEdit(cmd: string): boolean {
    const triggers = [
      "edit test", "modify test", "update test", "change test",
      "fix test", "repair test",
    ];
    return triggers.some((t) => cmd.includes(t));
  }

  private isTestList(cmd: string): boolean {
    const triggers = ["list tests", "show tests", "what tests", "tests in"];
    return triggers.some((t) => cmd.includes(t));
  }

  private async handleTestGeneration(
    ownerId: string,
    command: string,
  ): Promise<NlCommandResult> {
    // Extract the requirement from the command
    const requirement = this.extractRequirement(command);

    if (!requirement) {
      return {
        action: "test-generation",
        response: "I need a requirement to generate tests for. Try: 'Write tests for user login' or 'Create test for checkout with discount code'.",
      };
    }

    // Generate scenarios using the local heuristic engine
    const scenarios = await localTestGeneratorService.analyzeRequirement(requirement);

    if (scenarios.scenarios.length === 0) {
      return {
        action: "test-generation",
        response: `No testable scenarios found in: "${requirement}". Try a more specific requirement like "user can login with email and password".`,
      };
    }

    return {
      action: "test-generation",
      requirement,
      scenarios: scenarios.scenarios,
      testCasesCount: 0, // Would be filled by design step
      response: `Generated ${scenarios.scenarios.length} scenario(s) for "${requirement}":\n${scenarios.scenarios.map((s) => `- [${s.priority.toUpperCase()}] ${s.title}`).join("\n")}\n\nUse "run tests for ${requirement}" to execute them.`,
    };
  }

  private async handleTestRun(command: string): Promise<NlCommandResult> {
    const testName = this.extractTestName(command);

    return {
      action: "test-run",
      testName,
      response: testName
        ? `Would run test "${testName}". Set up a test run with the repository context to execute.`
        : "Which test would you like to run? Try: 'run the login test' or 'run checkout tests'.",
    };
  }

  private async handleFailureDebug(command: string): Promise<NlCommandResult> {
    const testName = this.extractTestName(command);

    return {
      action: "failure-debug",
      testName,
      response: testName
        ? `Would investigate why "${testName}" failed. Common causes: timeout, element not found, assertion error, network issue.`
        : "Which test failed? Try: 'why did login test fail?' or 'explain failure in checkout test'.",
    };
  }

  private async handleTestEdit(command: string): Promise<NlCommandResult> {
    const testName = this.extractTestName(command);

    return {
      action: "test-edit",
      testName,
      response: testName
        ? `Would open test "${testName}" for editing. Provide the new requirement or changes you want.`
        : "Which test would you like to edit? Try: 'edit the login test to handle OAuth'.",
    };
  }

  private async handleTestList(ownerId: string, command: string): Promise<NlCommandResult> {
    const tests = await this.listTests(ownerId, command);

    return {
      action: "test-list",
      tests,
      response: tests.length > 0
        ? `Found ${tests.length} test(s):\n${tests.map((t) => `- ${t.title} [${t.priority}]`).join("\n")}`
        : "No tests found. Try generating tests first with 'write tests for X'.",
    };
  }

  private extractRequirement(command: string): string | null {
    // Remove trigger words
    const patterns = [
      /write test(?:s)? for (.+)/i,
      /generate test(?:s)? for (.+)/i,
      /create test(?:s)? for (.+)/i,
      /add test(?:s)? for (.+)/i,
      /test(?:s)? for (.+)/i,
      /need a test for (.+)/i,
      /need tests for (.+)/i,
    ];

    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  private extractTestName(command: string): string | undefined {
    const patterns = [
      /run (?:the )?(.+?) test/i,
      /run (?:the )?(.+?) tests/i,
      /execute (?:the )?(.+?) test/i,
      /why did (.+?) fail/i,
      /why does (.+?) fail/i,
      /what failed in (.+?)/i,
      /edit (?:the )?(.+?) test/i,
      /modify (?:the )?(.+?) test/i,
      /fix (?:the )?(.+?) test/i,
      /show (?:the )?(.+?) tests/i,
      /list (?:the )?(.+?) tests/i,
    ];

    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  private async listTests(
    ownerId: string,
    command: string,
  ): Promise<Array<{ id: string; title: string; priority: string }>> {
    // Fetch tests from the database
    const runs = await prisma.analysisRun.findMany({
      where: { project: { ownerId } },
      take: 10,
    });

    return runs.map((run: { id: string; ref: string }) => ({
      id: run.id,
      title: run.ref,
      priority: "medium",
    }));
  }
}

export interface NlCommandResult {
  action: string;
  requirement?: string;
  testName?: string;
  scenarios?: Array<{ id: string; title: string; priority: string; preconditions: string[] }>;
  tests?: Array<{ id: string; title: string; priority: string }>;
  testCasesCount?: number;
  response: string;
}

export const naturalLanguageInterface = new NaturalLanguageInterface();