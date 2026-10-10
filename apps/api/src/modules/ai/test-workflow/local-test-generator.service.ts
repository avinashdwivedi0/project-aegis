import {
  requirementAnalysisOutputSchema,
  type RequirementAnalysisOutput,
  type RequirementScenario,
} from "../requirements/requirement.types.js";
import {
  testDesignOutputSchema,
  type TestDesignOutput,
  type TestCase,
} from "../test-design/test-design.types.js";
import {
  scriptGenerationOutputSchema,
  type ScriptGenerationOutput,
} from "../script-generation/script-generation.types.js";

import { aiConfig } from "../../../config/ai.config.js";
import type { AgentProvider } from "../agents/agent.provider.js";
import { GroqAgentProvider } from "../agents/gemini.provider.js";
import { resolvePromptPath } from "../prompt-path.js";

/**
 * Zero-cost deterministic test generator.
 * Replaces the LLM-based requirement-analyst → test-designer → script-generator pipeline
 * with heuristic-based generation that works entirely locally.
 */
export class LocalTestGeneratorService {
  /**
   * Analyze a requirement string and extract testable scenarios
   * using keyword and pattern matching (no LLM needed).
   */
  async analyzeRequirement(
    requirement: string
  ): Promise<RequirementAnalysisOutput> {
    const scenarios = this.generateScenarios(requirement);
    return {
      contractVersion: "1.0",
      scenarios,
    };
  }

  /**
   * Generate test cases from scenarios using deterministic heuristics.
   */
  async designTestCases(
    scenarios: RequirementScenario[]
  ): Promise<TestDesignOutput> {
    const testCases: TestCase[] = [];

    for (const scenario of scenarios) {
      const steps = this.generateStepsForScenario(scenario);
      testCases.push({
        id: `REQ-TC-${String(testCases.length + 1).padStart(3, "0")}`,
        scenarioId: scenario.id,
        title: scenario.title,
        priority: scenario.priority,
        preconditions: scenario.preconditions,
        steps,
        expectedResult: this.generateExpectedResult(scenario),
        testData: this.extractTestData(scenario),
      });
    }

    return {
      contractVersion: "1.0",
      testCases,
    };
  }

  /**
   * Generate Playwright scripts from test design output
   * using deterministic heuristics instead of LLM calls.
   */
  async generateScripts(
    testDesign: TestDesignOutput
  ): Promise<ScriptGenerationOutput> {
    const files: ScriptGenerationOutput["files"] = [];
    if (testDesign.testCases.length > 0) {
      const testCases = testDesign.testCases;
      const content = this.generateSequentialPlaywrightScript(testCases);
      files.push({
        path: `tests/${testCases[0].id}-sequential.spec.ts`,
        language: "typescript" as const,
        testCaseId: testCases[0].id,
        content,
      });
    }

    return {
      contractVersion: "1.0",
      files,
    };
  }

  /**
   * Generate test scenarios from a requirement string
   * using deterministic heuristics.
   */
  private generateScenarios(
    requirement: string
  ): RequirementScenario[] {
    const scenarios: RequirementScenario[] = [];

    // Extract key elements from requirement
    const urls = this.extractUrls(requirement);
    const quotedMatches = requirement.match(/'[^']*'|"[^"]*"/g) || [];
    const cleanedRequirement = requirement.replace(/'[^']*'|"[^"]*"/g, "").trim();

    // Split requirement into clauses on conjunctions
    const clauses = this.splitIntoClauses(requirement);

    // Process each clause to identify the action and content
    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      const clauseLower = clause.toLowerCase().trim();

      // Extract quoted content specific to this clause
      const clauseQuoted = clause.match(/'[^']*'|"[^"]*"/g) || [];

      // Identify action word and content
      const { action, preconditions, priority } = this.identifyActionAndContent(
        clauseLower,
        clauseQuoted,
        urls,
        i
      );

      scenarios.push({
        id: `REQ-SC-${String(scenarios.length + 1).padStart(3, "0")}`,
        title: action,
        preconditions,
        priority,
      });
    }

    // If no scenarios were generated, try to extract from URLs or quoted content
    if (scenarios.length === 0 && urls.length > 0) {
      scenarios.push({
        id: `REQ-SC-${String(scenarios.length + 1).padStart(3, "0")}`,
        title: `User can navigate to ${urls[0]}`,
        preconditions: ["Browser is available", "Network connectivity"],
        priority: "high",
      });
    }

    // Fallback for quoted content only
    if (scenarios.length === 0 && quotedMatches.length > 0) {
      const text = quotedMatches[0]?.replace(/['"]/g, "") ?? "";
      scenarios.push({
        id: `REQ-SC-${String(scenarios.length + 1).padStart(3, "0")}`,
        title: `User can interact with '${text}'`,
        preconditions: ["Application is loaded", "Input field is visible"],
        priority: "medium",
      });
    }

    // Final fallback
    if (scenarios.length === 0) {
      scenarios.push({
        id: `REQ-SC-001`,
        title: `User can perform action described in requirement`,
        preconditions: ["System is available"],
        priority: "medium",
      });
    }

    return scenarios;
  }

  /**
   * Split a requirement into clauses based on conjunctions and action markers
   */
  private splitIntoClauses(requirement: string): string[] {
    // Action words that typically start a new clause after a comma
    const actionWords = [
      "type", "enter", "fill", "press", "click", "see", "verify",
      "check", "confirm", "open", "visit", "go to", "navigate", "input",
      "complete", "mark", "select", "choose", "add", "remove", "delete",
      "create", "update", "search", "filter", "sort", "view", "edit"
    ];
    const actionPattern = actionWords.map((w) => w.replace(/\s+/g, "\\s+")).join("|");

    // Split on commas that precede action words or conjunctions
    const splitRegex = new RegExp(
      `\\s*,\\s*(?=\\s*(?:${actionPattern}|and\\s+to|user\\s+can|\\s+and\\s+))`,
      "gi",
    );
    const clauses = requirement.split(splitRegex);

    // Further split on "and" / "then" that connect actions
    const result: string[] = [];

    for (const clause of clauses) {
      const parts = clause.split(/\s+(?:and|then)\s+/i);
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.length > 0) {
          result.push(trimmed);
        }
      }
    }

    return result.length > 0 ? result : [requirement];
  }

  /**
   * Extract clean URLs from text, stripping trailing punctuation
   * that might be part of sentence but not URL (e.g., "https://example.com." → "https://example.com")
   */
  private extractUrls(text: string): string[] {
    const matches = text.match(/https?:\/\/[^\s,]+/g) || [];
    return matches.map((url) => url.replace(/[.,;:!?]+$/, ""));
  }

  /**
   * Identify the action word and associated content from a clause
   */
  private identifyActionAndContent(
    clause: string,
    quotedMatches: string[],
    urls: string[],
    index: number
  ): { action: string; preconditions: string[]; priority: RequirementScenario["priority"] } {
    // Order matters: "press" must come before "enter" since "press Enter" contains "enter"
    const actionWords = [
      "open", "visit", "go to", "navigate to",
      "log in", "login",
      "register", "sign up", "sign in", "signout",
      "type", "fill", "input",
      "press", "click", "submit",
      "complete", "mark",
      "enter", "see", "verify", "check", "confirm",
      "appear", "display", "show", "render",
      "search", "filter", "sort", "view", "edit", "add", "remove",
      "create", "read", "update", "delete",
    ];

    // Find the action word in the clause
    let actionWord = "";
    for (const word of actionWords) {
      if (clause.includes(word)) {
        actionWord = word;
        break;
      }
    }

    // Determine content based on action and clause context
    const content = this.extractContentForAction(clause, quotedMatches, urls, actionWord, index);

    return {
      action: content.action,
      preconditions: content.preconditions,
      priority: content.priority,
    };
  }

  /**
   * Extract content (title, preconditions) based on action word and clause context
   */
  private extractContentForAction(
    clause: string,
    quotedMatches: string[],
    urls: string[],
    actionWord: string,
    index: number
  ): { action: string; preconditions: string[]; priority: RequirementScenario["priority"] } {
    // Login actions
    if (["log in", "login"].includes(actionWord)) {
      const text = quotedMatches[0]?.replace(/['"]/g, "") || "credentials";
      const action = text
        ? `User can log in with ${text}`
        : "User can log in";
      return {
        action,
        preconditions: ["User account exists", "Login page is accessible"],
        priority: "high",
      };
    }

    // Navigation actions - pair with URLs
    if (["open", "visit", "go to", "navigate to"].includes(actionWord)) {
      const url = urls[index] || urls[0] || "";
      const action = url ? `User can open ${url}` : "User can navigate to a page";
      return {
        action,
        preconditions: ["Browser is available", "Network connectivity"],
        priority: "high",
      };
    }

    // Input actions - pair with quoted strings
    if (["type", "enter", "fill", "input"].includes(actionWord)) {
      const text = quotedMatches[0]?.replace(/['"]/g, "");
      if (!text) {
        // No quoted content found - try to extract from clause context
        const clauseLower = clause.toLowerCase();
        if (clauseLower.includes("email")) return { action: "User can enter email in the input field", preconditions: ["Application is loaded", "Input field is visible"], priority: "high" };
        if (clauseLower.includes("password")) return { action: "User can enter password in the input field", preconditions: ["Application is loaded", "Input field is visible"], priority: "high" };
        if (clauseLower.includes("username")) return { action: "User can enter username in the input field", preconditions: ["Application is loaded", "Input field is visible"], priority: "high" };
        return { action: "User can type in the input field", preconditions: ["Application is loaded", "Input field is visible"], priority: "high" };
      }
      const action = `User can type '${text}' into the input field`;
      return {
        action,
        preconditions: ["Application is loaded", "Input field is visible"],
        priority: "high",
      };
    }

    // Submit and click actions (press, click, submit)
    if (["press", "click", "submit"].includes(actionWord)) {
      const hasEnter = clause.includes("enter");
      // Check if clause mentions checkbox for click-specific handling
      if (clause.includes("checkbox") || clause.includes("check box")) {
        return {
          action: "User can click the checkbox",
          preconditions: ["Checkbox is visible", "Checkbox is interactive"],
          priority: "medium",
        };
      }
      const action = hasEnter
        ? "User can press Enter"
        : "User can submit the form";
      return {
        action,
        preconditions: ["Input field is visible", "Form is ready"],
        priority: "medium",
      };
    }

    // Complete/mark actions (e.g., "complete the task", "mark as done")
    if (["complete", "mark"].includes(actionWord)) {
      const clauseLower = clause.toLowerCase();
      if (clauseLower.includes("checkbox") || clauseLower.includes("check box")) {
        return {
          action: "User can mark the checkbox as complete",
          preconditions: ["Checkbox is visible", "Checkbox is interactive"],
          priority: "medium",
        };
      }
      return {
        action: "User can complete the task",
        preconditions: ["Task is visible", "Task is actionable"],
        priority: "medium",
      };
    }

    // Verification actions - pair with quoted strings
    if (["see", "verify", "check", "confirm"].includes(actionWord)) {
      const text = quotedMatches[0]?.replace(/['"]/g, "");
      if (!text) {
        // No quoted content found - use clause context
        const clauseLower = clause.toLowerCase();
        if (clauseLower.includes("completed") || clauseLower.includes("complete") || clauseLower.includes("marked")) {
          return { action: "User can see the item marked as completed", preconditions: ["Page is loaded", "List is visible"], priority: "high" };
        }
        if (clauseLower.includes("visible")) {
          return { action: "User can see the element is visible", preconditions: ["Page is loaded"], priority: "high" };
        }
        if (clauseLower.includes("result")) {
          return { action: "User can see the result", preconditions: ["Page is loaded"], priority: "high" };
        }
        if (clauseLower.includes("checkbox") || clauseLower.includes("check box")) {
          return { action: "User can see the checkbox is checked", preconditions: ["Page is loaded", "Checkbox is visible"], priority: "high" };
        }
        return { action: "User can verify the expected content is visible", preconditions: ["Page is loaded", "List is visible"], priority: "high" };
      }
      const action = `User can see '${text}' appear in the list`;
      return {
        action,
        preconditions: ["Page is loaded", "List is visible"],
        priority: "high",
      };
    }

    // Register actions
    if (["register", "sign up"].includes(actionWord)) {
      const text = quotedMatches[0]?.replace(/['"]/g, "") || "registration";
      const action = text
        ? `User can register with ${text}`
        : "User can register";
      return {
        action,
        preconditions: ["Registration page is accessible", "Form is visible"],
        priority: "high",
      };
    }

    // Sign in actions
    if (["sign in"].includes(actionWord)) {
      const text = quotedMatches[0]?.replace(/['"]/g, "") || "credentials";
      const action = text
        ? `User can sign in with ${text}`
        : "User can sign in";
      return {
        action,
        preconditions: ["User account exists", "Login page is accessible"],
        priority: "high",
      };
    }

    // Search actions
    if (["search"].includes(actionWord)) {
      const text = quotedMatches[0]?.replace(/['"]/g, "") || "search term";
      const action = text
        ? `User can search for '${text}'`
        : "User can search";
      return {
        action,
        preconditions: ["Search page is accessible", "Search input is visible"],
        priority: "high",
      };
    }

    // Default fallback - pair action with nearest content
    const text = quotedMatches[0]?.replace(/['"]/g, "") || "";
    const url = urls[0] || "";

    if (url && !actionWord) {
      return {
        action: `User can open ${url}`,
        preconditions: ["Browser is available"],
        priority: "high",
      };
    }

    if (text && !actionWord) {
      return {
        action: `User can interact with '${text}'`,
        preconditions: ["Input field is visible"],
        priority: "medium",
      };
    }

    return {
      action: `User can perform action: ${clause.substring(0, 50)}`,
      preconditions: ["System is available"],
      priority: "medium",
    };
  }

  /**
   * Generate test steps for a scenario
   */
  private generateStepsForScenario(scenario: RequirementScenario): TestDesignOutput["testCases"][number]["steps"] {
    const title = scenario.title;
    const lowerTitle = title.toLowerCase();

    // Login steps
    if (lowerTitle.includes("log in") || lowerTitle.includes("login")) {
      return [
        {
          number: 1,
          action: "Navigate to login page",
          expectedResult: "Login page loads",
        },
        {
          number: 2,
          action: "Enter valid credentials",
          expectedResult: "Credentials are accepted",
        },
        {
          number: 3,
          action: "Click Login button",
          expectedResult: "User is logged in",
        },
      ];
    }

    // Register steps
    if (lowerTitle.includes("register") || lowerTitle.includes("sign up")) {
      return [
        {
          number: 1,
          action: "Navigate to registration page",
          expectedResult: "Registration page loads",
        },
        {
          number: 2,
          action: "Fill registration form",
          expectedResult: "Form is filled",
        },
        {
          number: 3,
          action: "Click Register button",
          expectedResult: "Account is created",
        },
      ];
    }

    // Sign in steps
    if (lowerTitle.includes("sign in")) {
      return [
        {
          number: 1,
          action: "Navigate to sign-in page",
          expectedResult: "Sign-in page loads",
        },
        {
          number: 2,
          action: "Enter credentials",
          expectedResult: "Credentials are accepted",
        },
        {
          number: 3,
          action: "Click Sign In button",
          expectedResult: "User is signed in",
        },
      ];
    }

    // Search steps
    if (lowerTitle.includes("search")) {
      const textMatch = title.match(/'[^']*'|"[^"]*"/);
      const text = textMatch ? textMatch[0].replace(/['"]/g, "") : "search term";
      return [
        {
          number: 1,
          action: `Search for '${text}'`,
          expectedResult: "Search results are displayed",
        },
      ];
    }

    // Navigation steps
    if (lowerTitle.includes("open") || lowerTitle.includes("navigate") || lowerTitle.includes("visit")) {
      const urlMatch = title.match(/https?:\/\/[^\s,]+/);
      if (urlMatch) {
        return [{
          number: 1,
          action: `Navigate to ${urlMatch[0]}`,
          expectedResult: `Page loads successfully at ${urlMatch[0]}`,
        }];
      }
      return [{
        number: 1,
        action: "Navigate to the page",
        expectedResult: "Page loads successfully",
      }];
    }

    // Submit/Press steps - check BEFORE input steps since "press Enter" contains "enter"
    if (lowerTitle.includes("press") || lowerTitle.includes("submit")) {
      const pressMatch = title.match(/press\s+(\w+)/i);
      if (pressMatch) {
        const key = pressMatch[1] || "Enter";
        return [{
          number: 1,
          action: `Press ${key}`,
          expectedResult: `"${key}" key is pressed`,
        }];
      }
      return [{
        number: 1,
        action: "Press Enter",
        expectedResult: "Form is submitted",
      }];
    }

    // Input steps - check after press to avoid "press Enter" matching "enter"
    if (lowerTitle.includes("type") || lowerTitle.includes("fill")) {
      const textMatch = title.match(/'[^']*'|"[^"]*"/);
      if (textMatch) {
        const text = textMatch[0].replace(/['"]/g, "");
        return [{
          number: 1,
          action: `Type '${text}' into the input field`,
          expectedResult: `Input field contains '${text}'`,
        }];
      }
      return [{
        number: 1,
        action: "Type into the input field",
        expectedResult: "Input field contains the entered text",
      }];
    }

    // Verification steps
    if (lowerTitle.includes("see") || lowerTitle.includes("verify") || lowerTitle.includes("appear")) {
      if (lowerTitle.includes("checkbox") || lowerTitle.includes("checked") || lowerTitle.includes("completed")) {
        return [{ number: 1, action: "Verify the task checkbox is checked", expectedResult: "Task is marked as complete" }];
      }
      const textMatch = title.match(/'[^']*'|"[^"]*"/);
      if (textMatch) {
        const text = textMatch[0].replace(/['"]/g, "");
        return [{
          number: 1,
          action: `Verify '${text}' is visible in the list`,
          expectedResult: `Text '${text}' appears in the item list`,
        }];
      }
      return [{
        number: 1,
        action: "Verify the expected content is visible",
        expectedResult: "Expected content is visible",
      }];
    }

    // Checkbox steps
    if (lowerTitle.includes("checkbox") || lowerTitle.includes("check box")) {
      if (lowerTitle.includes("click")) {
        return [{
          number: 1,
          action: "Click the checkbox",
          expectedResult: "Checkbox is checked",
        }];
      }
      if (lowerTitle.includes("see") || lowerTitle.includes("verify") || lowerTitle.includes("checked")) {
        return [{
          number: 1,
          action: "Verify the checkbox is checked",
          expectedResult: "Checkbox is checked",
        }];
      }
      return [{
        number: 1,
        action: "Interact with the checkbox",
        expectedResult: "Checkbox state is toggled",
      }];
    }

    // Complete steps
    if (lowerTitle.includes("complete") || lowerTitle.includes("mark") || lowerTitle.includes("done")) {
      if (lowerTitle.includes("task")) {
        return [{
          number: 1,
          action: "Verify the task checkbox is checked",
          expectedResult: "Task is marked as complete",
        }];
      }
      if (lowerTitle.includes("checkbox") || lowerTitle.includes("check box")) {
        return [{
          number: 1,
          action: "Mark the checkbox as complete",
          expectedResult: "Checkbox is checked",
        }];
      }
      return [{
        number: 1,
        action: "Complete the action",
        expectedResult: "Action is completed successfully",
      }];
    }

    // Default step
    return [{
      number: 1,
      action: "Execute the test action",
      expectedResult: "Action is processed successfully",
    }];
  }

  /**
   * Generate expected result for a scenario
   */
  private generateExpectedResult(scenario: RequirementScenario): string {
    const title = scenario.title.toLowerCase();

    if (title.includes("open") || title.includes("navigate") || title.includes("visit")) {
      const urlMatch = title.match(/https?:\/\/[^\s,]+/);
      return urlMatch ? `Page loads successfully at ${urlMatch[0]}` : "Page loads successfully";
    }

    if (title.includes("type") || title.includes("enter") || title.includes("fill")) {
      const textMatch = scenario.title.match(/'[^']*'|"[^"]*"/);
      return textMatch ? `Input field contains ${textMatch[0]}` : "Input field contains the entered text";
    }

    if (title.includes("press") || title.includes("submit")) {
      return "Form is submitted successfully";
    }

    if (title.includes("see") || title.includes("verify") || title.includes("appear")) {
      const textMatch = scenario.title.match(/'[^']*'|"[^"]*"/);
      return textMatch ? `${textMatch[0]} appears in the list` : "Expected content is visible";
    }

    return "Requirement is fulfilled successfully";
  }

  /**
   * Extract test data from a scenario
   */
  private extractTestData(scenario: RequirementScenario): string[] {
    const title = scenario.title;
    const data: string[] = [];

    // Extract URLs
    const urls = this.extractUrls(title);
    data.push(...urls);

    // Extract quoted strings
    const quoted = title.match(/'[^']*'|"[^"]*"/g) || [];
    for (const q of quoted) {
      data.push(q.replace(/['"]/g, ""));
    }

    return data;
  }

  /**
   * Generate a Playwright test script from a test case
   */
  private generatePlaywrightScript(testCase: TestCase): string {
    // Escape single quotes in title for JavaScript string literals
    const escapedTitle = testCase.title.replace(/'/g, "\\'");
    return `import { test, expect } from '@playwright/test';

test.describe('${escapedTitle}', () => {
  test('${testCase.id}: ${escapedTitle}', async ({ page }) => {
    // Preconditions
    // ${testCase.preconditions.join('\n    // ')}

    // Test data
    ${testCase.testData.length > 0 ? `const testData = ${JSON.stringify(testCase.testData, null, 2)};` : ''}

    // Test steps
    ${testCase.steps
      .map(
        (step, index) => `
    // Step ${step.number}: ${step.action}
    ${this.generateStepCode(step, testCase.testData, index === 0)}`
      )
      .join('\n')}

    // Assertions
    expect(page).toBeDefined();
  });
});`;
  }

  private generateSequentialPlaywrightScript(testCases: TestCase[]): string {
    const testName = testCases.map((testCase) => testCase.title).join(" → ").replace(/'/g, "\\'");
    const allTestData = [...new Set(testCases.flatMap((testCase) => testCase.testData))];
    const steps = testCases.flatMap((testCase) => testCase.steps.map((step, index) =>
      `    // ${testCase.id}: ${step.action}\n    ${this.generateStepCode(step, allTestData, index === 0)}`,
    )).join("\n");
    return `import { test, expect } from '@playwright/test';

test('${testName}', async ({ page }) => {
${steps}
});`;
  }

  /**
   * Generate code for a single test step
   */
  private generateStepCode(
    step: { action: string; expectedResult: string },
    testData: string[],
    isFirstStep: boolean
  ): string {
    const { action, expectedResult } = step;
    const lowerAction = action.toLowerCase();

    // Navigation steps
    if (
      lowerAction.includes("navigate") ||
      lowerAction.includes("open") ||
      lowerAction.includes("visit") ||
      lowerAction.includes("go to")
    ) {
      const urlMatch = action.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        return `await page.goto('${urlMatch[0]}');`;
      }
      // Extract URL from testData if available
      for (const data of testData) {
        if (data.match(/^https?:\/\//)) {
          return `await page.goto('${data}');`;
        }
      }
      return `await page.goto('https://example.com'); // TODO: Extract URL from requirement`;
    }

    // Press Enter steps - check BEFORE input steps since "press Enter" contains "enter"
    if (lowerAction.includes("press enter") || lowerAction === "press enter") {
      return `await page.press('input, textarea, [contenteditable]', 'Enter');`;
    }

    // Input steps
    if (
      lowerAction.includes("type") ||
      lowerAction.includes("fill") ||
      lowerAction.includes("input")
    ) {
      const textMatch = action.match(/'[^']*'|"[^"]*"/);
      if (textMatch) {
        const text = textMatch[0].replace(/['"]/g, "");
        return `await page.fill('input, textarea, [contenteditable]', '${text}');`;
      }
      // Extract text from testData if available
      for (const data of testData) {
        if (!data.match(/^https?:\/\//)) {
          return `await page.fill('input, textarea, [contenteditable]', '${data}');`;
        }
      }
      return `await page.fill('input, textarea, [contenteditable]', 'test input'); // TODO: Extract text from requirement`;
    }

    // Click steps
    if (lowerAction.includes("click") || lowerAction.includes("submit")) {
      // Checkbox click
      if (lowerAction.includes("checkbox") || lowerAction.includes("check box")) {
        return `await page.check('input[type="checkbox"], [role="checkbox"]');`;
      }
      return `await page.click('button, input[type="submit"], [role="button"]');`;
    }

    // Complete/Mark steps
    if (lowerAction.includes("complete") || lowerAction.includes("mark") || lowerAction.includes("done")) {
      // Checkbox completion
      if (lowerAction.includes("checkbox") || lowerAction.includes("check box")) {
        return `await page.check('input[type="checkbox"], [role="checkbox"]');`;
      }
      // Task completion
      if (lowerAction.includes("task")) {
        return `await page.click('[data-testid="complete"], button:has-text("Complete"), button:has-text("Done")');`;
      }
      return `// TODO: Implement completion action: ${action}`;
    }

    // Verification steps
    if (
      lowerAction.includes("see") ||
      lowerAction.includes("verify") ||
      lowerAction.includes("check") ||
      lowerAction.includes("confirm")
    ) {
      if (lowerAction.includes("checkbox") || lowerAction.includes("checked") || lowerAction.includes("completed")) {
        return `await expect(page.locator('input[type="checkbox"]')).toBeChecked();`;
      }
      const textMatch = action.match(/'[^']*'|"[^"]*"/);
      if (textMatch) {
        const text = textMatch[0].replace(/['"]/g, "");
        return `await expect(page.getByText('${text}', { exact: false })).toBeVisible();`;
      }
      // Extract text from testData if available
      for (const data of testData) {
        if (!data.match(/^https?:\/\//)) {
          return `await expect(page.getByText('${data}', { exact: false })).toBeVisible();`;
        }
      }
      return `await expect(page.bodyText()).toContain('expected result'); // TODO: Extract text from requirement`;
    }

    // Default fallback
    return `// TODO: Implement action: ${action}`;
  }
}

export const localTestGeneratorService = new LocalTestGeneratorService();
