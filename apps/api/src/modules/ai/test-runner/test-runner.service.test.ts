import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import test from "node:test";

import type { ToolRunResult } from "../../analysis/tool-runner.service";

import { PlaywrightTestRunnerService } from "./test-runner.service";

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
        assert.equal(options.args.includes("--workers=3"), true);
        assert.equal(options.args.includes("--trace=retain-on-failure"), true);
        assert.equal(options.args.includes("--screenshot=only-on-failure"), true);
        assert.equal(await fs.readFile(path.join(options.suiteDirectory, "tests/REQ-TC-001.spec.ts"), "utf8"), files[0]?.content);
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