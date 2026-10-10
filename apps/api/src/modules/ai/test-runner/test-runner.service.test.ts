import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import test from "node:test";

import type { ToolRunResult } from "../../analysis/tool-runner.service";

import {
  applyApprovedLocatorToScript,
  PlaywrightTestRunnerService,
  resolveSelfHealingTestOutcomes,
} from "./test-runner.service";

const files = [
  {
    path: "tests/REQ-TC-001.spec.ts",
    language: "typescript" as const,
    testCaseId: "REQ-TC-001",
    content: "import { test } from '@playwright/test';",
  },
];

const passedOutput = JSON.stringify({
  suites: [
    {
      title: "REQ-TC-001",
      specs: [
        {
          title: "Reset password",
          tests: [
            {
              results: [
                {
                  status: "passed",
                  duration: 42,
                  attachments: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

function result(stdout: string, status: ToolRunResult["status"] = "COMPLETED"): ToolRunResult {
  return {
    command: "pnpm",
    args: [],
    status,
    exitCode: status === "COMPLETED" ? 0 : null,
    stdout,
    stderr: "",
    durationMs: 42,
  };
}

test("runner writes generated suites and normalizes Playwright results", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-runner-"));
  const workspace = path.join(root, "workspace");
  await fs.mkdir(workspace);

  try {
    const runner = new PlaywrightTestRunnerService(
      async (options) => {
        assert.equal(options.args.includes("--workers=1"), true);
        const config = await fs.readFile(path.join(options.suiteDirectory, "playwright.config.ts"), "utf8");
        assert.match(config, /"trace":\s*"retain-on-failure"/);
        assert.match(config, /"screenshot":\s*"only-on-failure"/);
        const writtenScript = await fs.readFile(path.join(options.suiteDirectory, "tests/REQ-TC-001.spec.ts"), "utf8");
        assert.equal(writtenScript.startsWith(files[0]?.content ?? ""), true);
        assert.equal(writtenScript.includes("self-healing-dom-snapshot"), true);
        return result(passedOutput);
      },
      path.join(root, "results"),
    );

    const output = await runner.run({
      runId: "run-1",
      workspace,
      files,
      parallelism: 3,
    });

    assert.equal(output.status, "passed");
    assert.equal(output.total, 1);
    assert.equal(output.passed, 1);
    assert.equal(await fs.stat(path.join(output.resultsDirectory, "run.json")) instanceof Object, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("runner records timeout status without fabricating test results", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-runner-"));
  const workspace = path.join(root, "workspace");
  await fs.mkdir(workspace);

  try {
    const runner = new PlaywrightTestRunnerService(
      async () => result("", "TIMED_OUT"),
      path.join(root, "results"),
    );
    const output = await runner.run({
      runId: "run-timeout",
      workspace,
      files,
    });

    assert.equal(output.status, "timedOut");
    assert.equal(output.total, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("Firefox compatibility requests the expanded browser container profile", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-runner-firefox-"));
  const workspace = path.join(root, "workspace");
  await fs.mkdir(workspace);
  try {
    let browserCompatibility: boolean | undefined;
    const runner = new PlaywrightTestRunnerService(async (options) => {
      browserCompatibility = options.browserCompatibility;
      return result(passedOutput);
    }, path.join(root, "results"));
    await runner.run({
      runId: "firefox-profile",
      workspace,
      files,
      compatibility: { browsers: ["firefox"], viewports: ["desktop"] },
    });
    assert.equal(browserCompatibility, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("runner counts a Playwright timed-out test as failed in the summary", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aegis-runner-"));
  const workspace = path.join(root, "workspace");
  await fs.mkdir(workspace);

  try {
    const runner = new PlaywrightTestRunnerService(
      async () => result(timedOutTestOutput),
      path.join(root, "results"),
    );
    const output = await runner.run({
      runId: "run-test-timeout",
      workspace,
      files,
    });

    assert.equal(output.status, "failed");
    assert.equal(output.total, 1);
    assert.equal(output.passed, 0);
    assert.equal(output.failed, 1);
    assert.equal(output.tests[0]?.status, "timedOut");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("self-healing validation uses only explicit results for cases in the rerun", () => {
  const outcomes = resolveSelfHealingTestOutcomes([
    { title: "REQ-TC-001 reset password", status: "passed" },
    { title: "REQ-TC-002 update profile", status: "skipped" },
    { title: "unrelated test", status: "passed" },
  ]);

  assert.equal(outcomes.get("REQ-TC-001"), true);
  assert.equal(outcomes.has("REQ-TC-002"), false);
  assert.equal(outcomes.has("REQ-TC-003"), false);

  const failedOutcomes = resolveSelfHealingTestOutcomes([
    { title: "REQ-TC-004 payment", status: "passed" },
    { title: "REQ-TC-004 payment retry", status: "timedOut" },
  ]);
  assert.equal(failedOutcomes.get("REQ-TC-004"), false);
});

test("approved locators rewrite the failed selector in Playwright actions", () => {
  const source = `test('REQ-TC-001', async ({ page }) => { await page.click('button.old'); });`;
  assert.equal(
    applyApprovedLocatorToScript(source, "locator('button.old')", "[data-testid=save]"),
    `test('REQ-TC-001', async ({ page }) => { await page.click("[data-testid=save]"); });`,
  );
  assert.equal(applyApprovedLocatorToScript(source, "locator('missing')", "button.new"), undefined);
  assert.equal(applyApprovedLocatorToScript(source, "locator('button.old')", "//button"), undefined);
});

const timedOutTestOutput = JSON.stringify({
  suites: [{
    title: "REQ-TC-001",
    specs: [{
      title: "Signup button remains available",
      tests: [{ results: [{
        status: "timedOut",
        duration: 30_000,
        error: { message: "Test timeout of 30000ms exceeded." },
        attachments: [],
      }] }],
    }],
  }],
});
