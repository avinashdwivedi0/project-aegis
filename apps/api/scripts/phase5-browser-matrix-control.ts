import path from "node:path";

import { playwrightTestRunnerService } from "../src/modules/ai/test-runner/test-runner.service.js";

const workspace = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const runId = `phase5_control_${Date.now()}`;
const browsers = (process.argv[3] ?? "chromium,firefox,webkit")
  .split(",")
  .map((browser) => browser.trim())
  .filter(Boolean) as Array<"chromium" | "firefox" | "webkit">;
const viewports = (process.argv[4] ?? "desktop,mobile")
  .split(",")
  .map((viewport) => viewport.trim())
  .filter(Boolean) as Array<"desktop" | "mobile">;
const injectChromiumOnlyIssue = process.argv[6] === "inject-chromium-only-issue";
const content = `import { test, expect } from '@playwright/test';

test('browser renders an inline page at the configured viewport', async ({ page, browserName }) => {
  await page.setContent('<!doctype html><html><head><title>Compatibility control</title></head><body><h1>Compatibility control</h1></body></html>');
  ${injectChromiumOnlyIssue ? "if (browserName === 'chromium') await page.locator('h1').evaluate((node) => { (node as HTMLElement).style.display = 'none'; });" : ""}
  await expect(page).toHaveTitle('Compatibility control');
  await expect(page.getByRole('heading', { name: 'Compatibility control' })).toBeVisible();
  const expectedWidth = test.info().project.name.endsWith('-mobile') ? 390 : 1280;
  expect(page.viewportSize()?.width).toBe(expectedWidth);
});
`;

const execution = await playwrightTestRunnerService.run({
  runId,
  workspace,
  files: [{ path: "tests/compatibility-control.spec.ts", language: "typescript", testCaseId: "REQ-TC-005", content }],
  timeoutMs: Number(process.argv[5] ?? 300_000),
  compatibility: {
    browsers,
    viewports,
  },
});

console.log(JSON.stringify({
  runId,
  control: "Render an inline document, assert title and heading, and check desktop/mobile viewport width",
  injectedIssue: injectChromiumOnlyIssue ? "Hide the heading only in Chromium to verify engine-specific attribution" : undefined,
  status: execution.status,
  total: execution.total,
  passed: execution.passed,
  failed: execution.failed,
  tests: execution.tests,
}, null, 2));
