import crypto from "node:crypto";

import {
  requirementAnalysisOutputSchema,
  type RequirementAnalysisOutput,
  type RequirementScenario,
} from "../requirements/requirement.types";
import {
  testDesignOutputSchema,
  type TestDesignOutput,
  type TestCase,
} from "../test-design/test-design.types";
import {
  scriptGenerationOutputSchema,
  type ScriptGenerationOutput,
} from "../script-generation/script-generation.types";

/**
 * Zero-cost deterministic test generator.
 * Replaces the LLM-based requirement-analyst → test-designer → script-generator pipeline
 * with heuristic-based generation that works entirely locally.
 */
export class LocalTestGeneratorService {
  private static readonly scenarioTemplates: Record<
    string,
    { title: string; preconditions: string[]; priority: RequirementScenario["priority"] }[]
  > = {
    login: [
      {
        title: "Valid user can log in with correct credentials",
        preconditions: ["User account exists", "User is on login page"],
        priority: "critical",
      },
      {
        title: "Invalid credentials show appropriate error",
        preconditions: ["User is on login page"],
        priority: "high",
      },
      {
        title: "Locked account cannot log in",
        preconditions: ["User account is locked"],
        priority: "high",
      },
    ],
    register: [
      {
        title: "New user can register with valid data",
        preconditions: ["Registration page is accessible"],
        priority: "critical",
      },
      {
        title: "Duplicate email registration fails",
        preconditions: ["Existing user with email exists"],
        priority: "high",
      },
      {
        title: "Weak password is rejected",
        preconditions: ["Registration page is accessible"],
        priority: "medium",
      },
    ],
    password: [
      {
        title: "User can request password reset",
        preconditions: ["User has registered account", "Reset page accessible"],
        priority: "critical",
      },
      {
        title: "Valid reset token allows new password",
        preconditions: ["Reset token was emailed to user"],
        priority: "high",
      },
      {
        title: "Expired reset token is rejected",
        preconditions: ["Reset token has expired"],
        priority: "medium",
      },
    ],
    checkout: [
      {
        title: "User can complete purchase with valid card",
        preconditions: ["Cart has items", "User is logged in"],
        priority: "critical",
      },
      {
        title: "Invalid card number shows error",
        preconditions: ["Cart has items", "User is on payment step"],
        priority: "high",
      },
      {
        title: "Empty cart cannot proceed to checkout",
        preconditions: ["Cart is empty"],
        priority: "medium",
      },
    ],
    search: [
      {
        title: "Search returns relevant results",
        preconditions: ["Products exist in catalog"],
        priority: "high",
      },
      {
        title: "Empty query shows all products or guidance",
        preconditions: ["User is on search page"],
        priority: "medium",
      },
      {
        title: "No results message for non-matching query",
        preconditions: ["Catalog has no matching items"],
        priority: "low",
      },
    ],
    crud: [
      {
        title: "User can create new entity",
        preconditions: ["User has create permission", "Form is accessible"],
        priority: "high",
      },
      {
        title: "User can read entity details",
        preconditions: ["Entity exists", "User has read permission"],
        priority: "high",
      },
      {
        title: "User can update entity",
        preconditions: ["Entity exists", "User has update permission"],
        priority: "high",
      },
      {
        title: "User can delete entity",
        preconditions: ["Entity exists", "User has delete permission"],
        priority: "medium",
      },
    ],
  };

  private static readonly stepTemplates: Record<
    string,
    { action: string; expectedResult: string }[]
  > = {
    login: [
      { action: "Navigate to /login", expectedResult: "Login page loads" },
      { action: "Enter valid email", expectedResult: "Email field accepts input" },
      { action: "Enter valid password", expectedResult: "Password field masks input" },
      { action: "Click Login button", expectedResult: "User is redirected to dashboard" },
    ],
    register: [
      { action: "Navigate to /register", expectedResult: "Registration page loads" },
      { action: "Fill required fields", expectedResult: "All fields accept input" },
      { action: "Click Register button", expectedResult: "Account created, user logged in" },
    ],
    password: [
      { action: "Navigate to /forgot-password", expectedResult: "Reset request page loads" },
      { action: "Enter registered email", expectedResult: "Email accepted" },
      { action: "Click Submit", expectedResult: "Reset email sent" },
    ],
    checkout: [
      { action: "Navigate to /cart", expectedResult: "Cart page loads with items" },
      { action: "Click Checkout", expectedResult: "Checkout page loads" },
      { action: "Fill shipping info", expectedResult: "Shipping form validates" },
      { action: "Enter valid card details", expectedResult: "Payment processes" },
      { action: "Click Place Order", expectedResult: "Order confirmation shown" },
    ],
    search: [
      { action: "Navigate to search", expectedResult: "Search input visible" },
      { action: "Enter query term", expectedResult: "Results update in real-time" },
      { action: "Click first result", expectedResult: "Product detail page loads" },
    ],
    crud: [
      { action: "Navigate to entity list", expectedResult: "List page loads" },
      { action: "Click Create New", expectedResult: "Create form opens" },
      { action: "Fill form and submit", expectedResult: "Entity created, appears in list" },
    ],
  };

  private static readonly testDataTemplates: Record<string, string[]> = {
    login: ["valid_email@test.com", "validPassword123"],
    register: ["newuser@test.com", "StrongPass123!", "John", "Doe"],
    password: ["registered@test.com", "NewStrongPass123!"],
    checkout: ["4242 4242 4242 4242", "12/25", "123", "123 Main St", "Test City", "12345"],
    search: ["test product", "nonexistent item"],
    crud: ["Test Entity", "Description for test entity"],
  };

  async analyzeRequirement(requirement: string): Promise<RequirementAnalysisOutput> {
    const normalized = requirement.toLowerCase();
    const matchedTemplates = this.matchTemplates(normalized);

    if (matchedTemplates.length === 0) {
      // Fallback: generate generic scenarios from keywords
      return this.generateFallbackScenarios(normalized);
    }

    const scenarios: RequirementScenario[] = matchedTemplates.map((template, index) => ({
      id: `REQ-SC-${String(index + 1).padStart(3, "0")}`,
      title: template.title,
      preconditions: template.preconditions,
      priority: template.priority,
    }));

    return requirementAnalysisOutputSchema.parse({
      contractVersion: "1.0",
      scenarios,
    });
  }

  async designTestCases(scenarios: RequirementScenario[]): Promise<TestDesignOutput> {
    const testCases: TestCase[] = [];

    for (const scenario of scenarios) {
      const matched = this.matchTemplates(scenario.title.toLowerCase());
      const templateKey = matched[0]?.title.toLowerCase() ?? "generic";
      const steps = LocalTestGeneratorService.stepTemplates[templateKey] ?? LocalTestGeneratorService.stepTemplates.generic ?? [
        { action: "Perform test action", expectedResult: "Expected outcome occurs" },
      ];

      testCases.push({
        id: `REQ-TC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        scenarioId: scenario.id,
        title: `Test: ${scenario.title}`,
        priority: scenario.priority,
        preconditions: scenario.preconditions,
        steps: steps.map((s, i) => ({
          number: i + 1,
          action: s.action,
          expectedResult: s.expectedResult,
        })),
        expectedResult: scenario.title,
        testData: LocalTestGeneratorService.testDataTemplates[templateKey] ?? ["test data"],
      });
    }

    return testDesignOutputSchema.parse({
      contractVersion: "1.0",
      testCases,
    });
  }

  async generateScripts(testCases: TestCase[]): Promise<ScriptGenerationOutput> {
    const files = testCases.map((tc) => ({
      path: `tests/${tc.id.toLowerCase()}.spec.ts`,
      testCaseId: tc.id,
      content: this.generatePlaywrightScript(tc),
    }));

    return scriptGenerationOutputSchema.parse({
      contractVersion: "1.0",
      files,
    });
  }

  private matchTemplates(requirement: string): Array<{
    title: string;
    preconditions: string[];
    priority: RequirementScenario["priority"];
  }> {
    const matches: Array<{
      title: string;
      preconditions: string[];
      priority: RequirementScenario["priority"];
    }> = [];

    for (const [key, templates] of Object.entries(LocalTestGeneratorService.scenarioTemplates)) {
      if (requirement.includes(key)) {
        matches.push(...templates);
      }
    }

    // If multiple keys matched, deduplicate by title
    const seen = new Set<string>();
    return matches.filter((m) => {
      if (seen.has(m.title)) return false;
      seen.add(m.title);
      return true;
    });
  }

  private generateFallbackScenarios(requirement: string): RequirementAnalysisOutput {
    const words = requirement.split(/\s+/);
    const scenarios: RequirementScenario[] = [];

    // Extract potential action nouns/verbs
    const actions = words.filter((w) =>
      ["create", "read", "update", "delete", "login", "logout", "search", "filter", "sort", "view", "edit", "add", "remove"].includes(w)
    );

    if (actions.length > 0) {
      actions.slice(0, 3).forEach((action, i) => {
        scenarios.push({
          id: `REQ-SC-${String(i + 1).padStart(3, "0")}`,
          title: `User can ${action} resource`,
          preconditions: ["System is accessible"],
          priority: "medium",
        });
      });
    } else {
      // Ultimate fallback
      scenarios.push({
        id: "REQ-SC-001",
        title: "User can perform core action described in requirement",
        preconditions: ["System is accessible"],
        priority: "medium",
      });
    }

    return requirementAnalysisOutputSchema.parse({
      contractVersion: "1.0",
      scenarios,
    });
  }

  private generatePlaywrightScript(testCase: TestCase): string {
    const steps = testCase.steps
      .map(
        (s) => `  await test.step('${this.escape(s.action)}', async () => {
    // ${this.escape(s.action)}
    // Expected: ${this.escape(s.expectedResult)}
  });`
      )
      .join("\n");

    const testData = testCase.testData
      .map((d) => `  const ${this.toVarName(d)} = '${this.escape(d)}';`)
      .join("\n");

    return `import { test, expect } from '@playwright/test';

test('${this.escape(testCase.title)}', async ({ page }) => {
${testData}

${steps}
});
`;
  }

  private escape(str: string): string {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  private toVarName(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }
}

export const localTestGeneratorService = new LocalTestGeneratorService();