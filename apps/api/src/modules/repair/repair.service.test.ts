import assert from "node:assert/strict";
import test from "node:test";

import { CiIntegrationService } from "../ci/ci-integration.service";
import { testWorkflowInputSchema } from "../ai/test-workflow/test-workflow.types";
import { RepairService } from "./repair.service";
import { canTransitionPatchLifecycle } from "./repair.types";

test("repair lifecycle enforces an explicit human approval gate", () => {
  assert.equal(canTransitionPatchLifecycle("PATCH_GENERATED", "APPROVED"), true);
  assert.equal(canTransitionPatchLifecycle("APPROVED", "TESTS_RERAN"), true);
  assert.equal(canTransitionPatchLifecycle("PATCH_GENERATED", "TESTS_RERAN"), false);
  assert.equal(canTransitionPatchLifecycle("VALIDATED", "PATCH_APPLIED_IN_WORKSPACE"), true);
  assert.equal(canTransitionPatchLifecycle("APPROVED", "REJECTED"), true);
});

test("enforced guardrails block high-risk and critical patches before validation", () => {
  const warning = RepairService.evaluateGuardrailDecision({
    riskScore: 0.9,
    severity: "CRITICAL",
    lifecycle: "PATCH_GENERATED",
    target: "WORKSPACE_SANDBOX",
    projectGuardrails: {
      maxPatchRiskScore: 25,
      requireManualApprovalForCritical: true,
      sandboxOnly: true,
      scope: "ENFORCED",
    },
  });

  assert.equal(warning.allowed, false);
  assert.ok(warning.reason);
  assert.match(warning.reason, /risk score/i);

  const approved = RepairService.evaluateGuardrailDecision({
    riskScore: 0.2,
    severity: "CRITICAL",
    lifecycle: "APPROVED",
    target: "WORKSPACE_SANDBOX",
    projectGuardrails: {
      maxPatchRiskScore: 25,
      requireManualApprovalForCritical: true,
      sandboxOnly: true,
      scope: "ENFORCED",
    },
  });

  assert.equal(approved.allowed, true);
});

test("merge gate honors ENFORCED project guardrails", () => {
  const decision = CiIntegrationService.evaluateMergeGateDecision({
    criticalCount: 2,
    highCount: 1,
    projectGuardrails: {
      maxPatchRiskScore: 50,
      requireManualApprovalForCritical: true,
      sandboxOnly: false,
      scope: "ENFORCED",
    },
  });

  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /risk score|critical/i);
});

test("generated test workflows require explicit human approval before execution", () => {
  assert.doesNotThrow(() => {
    testWorkflowInputSchema.parse({
      projectId: "project-123",
      repositoryId: "repo-123",
      requirement: "A user can sign in.",
      approved: true,
    });
  });

  assert.throws(() => {
    testWorkflowInputSchema.parse({
      projectId: "project-123",
      repositoryId: "repo-123",
      requirement: "A user can sign in.",
      approved: false,
    });
  }, /approved/i);
});
