import { playwrightTestRunnerService } from "../src/modules/ai/test-runner/test-runner.service.js";

const repository = process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86";
const content = `import { test as base, expect } from '@playwright/test';
const test = base.extend({
  page: async ({ browser }, use, testInfo) => {
    const viewport = testInfo.project.use.viewport;
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try { await use(page); } finally { await context.close(); }
  },
});
test('firefox custom page fixture probe', async ({ page }) => {
  await page.setContent('<h1>Firefox fixture probe</h1>');
  await expect(page.getByRole('heading', { name: 'Firefox fixture probe' })).toBeVisible();
});
// self-healing-dom-snapshot hook excluded from this isolated fixture probe.
`;
const run = await playwrightTestRunnerService.run({
  runId: `phase5_firefox_fixture_${Date.now()}`,
  workspace: repository,
  files: [{ path: "tests/firefox-fixture-probe.spec.ts", language: "typescript", testCaseId: "REQ-TC-005", content }],
  parallelism: 1,
  timeoutMs: 60_000,
  compatibility: { browsers: ["firefox"], viewports: ["desktop"] },
});
console.log(JSON.stringify({ status: run.status, total: run.total, passed: run.passed, failed: run.failed, tests: run.tests }, null, 2));
