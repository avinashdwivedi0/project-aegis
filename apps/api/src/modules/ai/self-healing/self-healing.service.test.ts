import assert from "node:assert/strict";
import test from "node:test";

import type { AgentProvider } from "../agents/agent.provider";

import { SelfHealingService } from "./self-healing.service";
import { findUniqueCandidateLocators } from "./local-self-healing.service";
import {
  canTransitionSelfHealingStatus,
  canRetrySelfHealingStatus,
  containsForbiddenXPathSelector,
  manualSelfHealingValidationSchema,
  resolveSelfHealingValidationOutcome,
} from "./self-healing.types";

test("self-healing rejects XPath proposals and does not auto-apply changes", async () => {
  const provider: AgentProvider = {
    async generate() {
      return JSON.stringify({
        contractVersion: "1.0",
        strategy: "css",
        locator: "//button[@id='save']",
        confidence: 0.9,
        reasoning: "XPath was selected.",
      });
    },
  };
  const service = new SelfHealingService(
    provider,
    "prompts/self-healing.v1.prompt",
  );

  await assert.rejects(
    service.propose("missing-owner", {
      repositoryId: "missing-repository",
      testRunId: "run-1",
      testCaseId: "REQ-TC-001",
      failedLocator: "getByRole('button', { name: 'Save' })",
      domSnapshot: "<button id='save'>Save</button>",
      screenshot: "results/run-1/save.png",
    }),
    /not found or access denied/i,
  );
});

test("self-healing treats uppercase XPath selectors as forbidden", () => {
  assert.equal(containsForbiddenXPathSelector("XPath=/html/body/button"), true);
  assert.equal(containsForbiddenXPathSelector("[data-testid='save']"), false);
});

test("self-healing lifecycle only allows guarded governance transitions", () => {
  assert.equal(canTransitionSelfHealingStatus("PENDING", "APPROVED"), true);
  assert.equal(canTransitionSelfHealingStatus("APPROVED", "VALIDATING"), true);
  assert.equal(canTransitionSelfHealingStatus("APPROVED", "VALIDATED"), true);
  assert.equal(canTransitionSelfHealingStatus("PENDING", "VALIDATED"), false);
  assert.equal(canTransitionSelfHealingStatus("REJECTED", "APPROVED"), false);
  assert.equal(canTransitionSelfHealingStatus("ROLLED_BACK", "PENDING"), true);
  assert.equal(canTransitionSelfHealingStatus("REJECTED", "PENDING"), true);
});

test("self-healing retry is only allowed for failed or rolled-back proposals", () => {
  assert.equal(canRetrySelfHealingStatus("ROLLED_BACK", 0), true);
  assert.equal(canRetrySelfHealingStatus("REJECTED", 2), true);
  assert.equal(canRetrySelfHealingStatus("ROLLED_BACK", 3), false);
  assert.equal(canRetrySelfHealingStatus("APPROVED", 0), false);
  assert.equal(canRetrySelfHealingStatus("VALIDATED", 0), false);
});

test("validation resolves to a guarded outcome after re-test execution", () => {
  assert.equal(resolveSelfHealingValidationOutcome(true), "VALIDATED");
  assert.equal(resolveSelfHealingValidationOutcome(false), "ROLLED_BACK");
});

test("manual self-healing validation permits rollback but not a claimed pass", () => {
  assert.equal(manualSelfHealingValidationSchema.safeParse({ passed: false }).success, true);
  assert.equal(manualSelfHealingValidationSchema.safeParse({ passed: true }).success, false);
});

test("local healing only proposes unique DOM selectors and ranks stable IDs first", () => {
  const candidates = findUniqueCandidateLocators(`
    <button data-testid="duplicate" role="button" class="action primary">One</button>
    <button data-testid="duplicate" role="button" class="action primary">Two</button>
    <button data-testid="save" role="button" class="save">Save</button>
  `);

  assert.equal(candidates[0]?.locator, '[data-testid="save"]');
  assert.equal(candidates.some((candidate) => candidate.locator === '[data-testid="duplicate"]'), false);
  assert.equal(candidates.some((candidate) => candidate.locator === '[role="button"]'), false);
});