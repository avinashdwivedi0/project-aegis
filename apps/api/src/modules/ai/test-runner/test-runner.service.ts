import fs from "fs/promises";
import path from "path";

import { prisma } from "../../../config/prisma.js";
import { ContainerRunnerService } from "../../analysis/container-runner.service.js";
import type { ToolRunResult } from "../../analysis/tool-runner.service.js";
import { selfHealingService } from "../self-healing/self-healing.service.js";
import { containsForbiddenXPathSelector } from "../self-healing/self-healing.types.js";
import { isLocatorFailure } from "./locator-failure-classifier.js";

import {
  testRunnerInputSchema,
  testRunnerOutputSchema,
  type TestRunnerInput,
  type TestRunnerOutput,
  type TestResult,
} from "./test-runner.types.js";

type ParsedTestResult = TestResult & {
  domSnapshot?: string;
};

export function resolveSelfHealingTestOutcomes(
  tests: Pick<TestResult, "title" | "status">[],
): Map<string, boolean> {
  const statusesByCase = new Map<string, TestResult["status"][]>();
  for (const test of tests) {
    const testCaseId = test.title.match(/REQ-TC-\d{3,}/)?.[0];
    if (!testCaseId) continue;
    const statuses = statusesByCase.get(testCaseId) ?? [];
    statuses.push(test.status);
    statusesByCase.set(testCaseId, statuses);
  }

  const outcomes = new Map<string, boolean>();
  for (const [testCaseId, statuses] of statusesByCase) {
    if (statuses.some((status) => status === "failed" || status === "timedOut")) {
      outcomes.set(testCaseId, false);
    } else if (statuses.includes("passed")) {
      outcomes.set(testCaseId, true);
    }
  }
  return outcomes;
}

export function applyApprovedLocatorToScript(
  source: string,
  failedLocator: string,
  proposedLocator: string,
): string | undefined {
  if (containsForbiddenXPathSelector(proposedLocator)) return undefined;

  const locatorExpression = failedLocator.trim().replace(/^[A-Za-z_$][\w$]*\s*\.\s*/, "");
  if (!locatorExpression) return undefined;
  const escapedExpression = locatorExpression.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const directLocator = new RegExp(`(\\b[A-Za-z_$][\\w$]*)\\s*\\.\\s*${escapedExpression}`);
  if (directLocator.test(source)) {
    return source.replace(directLocator, (_match, pageObject: string) =>
      `${pageObject}.locator(${JSON.stringify(proposedLocator)})`,
    );
  }

  const selectorMatch = locatorExpression.match(/^locator\(\s*(['"])(.*?)\1\s*\)$/s);
  if (!selectorMatch?.[2]) return undefined;
  const selector = selectorMatch[2];
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const actionLocator = new RegExp(
    `(\\b[A-Za-z_$][\\w$]*\\.(?:locator|click|fill|check|press|selectOption|hover|dblclick)\\s*\\(\\s*)(['"])${escapedSelector}\\2`,
    "g",
  );
  if (!actionLocator.test(source)) return undefined;
  return source.replace(actionLocator, (_match, callPrefix: string) =>
    `${callPrefix}${JSON.stringify(proposedLocator)}`,
  );
}

const DOM_SNAPSHOT_HOOK = String.raw`

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  try {
    await page.locator('input, textarea, select, [contenteditable]').evaluateAll((nodes) => {
      nodes.forEach((node) => {
        if (node instanceof HTMLInputElement) {
          node.removeAttribute('value');
          node.value = '';
        } else if (node instanceof HTMLTextAreaElement) {
          node.textContent = '';
        } else if (node instanceof HTMLSelectElement) {
          node.querySelectorAll('option').forEach((option) => option.removeAttribute('selected'));
        } else {
          node.textContent = '[REDACTED]';
        }
      });
    });
    const snapshot = (await page.content())
      .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
      .slice(0, 2_000_000);
    await testInfo.attach('self-healing-dom-snapshot', {
      body: Buffer.from(snapshot, "utf8"),
      contentType: 'text/html',
    });
  } catch (error) {
    console.warn('Failed to attach self-healing DOM snapshot:', error);
  }
});
`;

type PlaywrightCommandRunner = (options: {
  workspace: string;
  suiteDirectory: string;
  artifactDirectory: string;
  args: string[];
  timeoutMs: number;
  browserCompatibility?: boolean;
  networkName?: string;
}) => Promise<ToolRunResult>;

const defaultRunner: PlaywrightCommandRunner = (options) =>
  ContainerRunnerService.run({
    command: "node",
    args: [
      "/usr/lib/node_modules/@playwright/test/cli.js",
      ...options.args,
    ],
    workspace: options.workspace,
    networkName: options.networkName,
    image:
      process.env.PLAYWRIGHT_CONTAINER_IMAGE ??
      "aegis-playwright-runner:local",
    timeoutMs: options.timeoutMs,
    ...(options.browserCompatibility
      ? { memoryLimitMb: 2048 as const, cpuLimit: 2 as const, pidsLimit: 512 as const }
      : {}),
    environment: {
      NODE_PATH: "/usr/lib/node_modules",
      ...(options.browserCompatibility
        ? {
            HOME: "/tmp",
            XDG_CACHE_HOME: "/tmp/.cache",
            XDG_CONFIG_HOME: "/tmp/.config",
          }
        : {}),
    },
    writableMounts: [
      {
        hostPath: options.suiteDirectory,
        containerPath: "/generated",
      },
      {
        hostPath: options.artifactDirectory,
        containerPath: "/artifacts",
      },
    ],
  });

export class PlaywrightTestRunnerService {
  constructor(
    private readonly runner: PlaywrightCommandRunner =
      defaultRunner,
    private readonly resultsRoot = path.resolve(
      process.cwd(),
      "results",
      "playwright",
    ),
  ) {}

  async run(
    input: TestRunnerInput,
    ownerId?: string,
    networkName?: string,
  ): Promise<TestRunnerOutput> {
    const validatedInput = testRunnerInputSchema.parse(input);
    const startedAt = Date.now();
    const runDirectory = path.join(
      this.resultsRoot,
      validatedInput.runId,
    );
    const suiteDirectory = path.join(
      runDirectory,
      "suite",
    );
    const artifactDirectory = path.join(
      runDirectory,
      "artifacts",
    );

    let filesToRun = validatedInput.files;
    const appliedProposalIds: string[] = [];
    if (ownerId && validatedInput.repositoryId) {
      const approvedProposals = await prisma.selfHealingProposal.findMany({
        where: {
          repositoryId: validatedInput.repositoryId,
          status: "APPROVED",
          testCaseId: { in: validatedInput.files.map((file) => file.testCaseId) },
          repository: { project: { ownerId } },
        },
        select: {
          id: true,
          testCaseId: true,
          failedLocator: true,
          proposedLocator: true,
        },
      });

      for (const proposal of approvedProposals) {
        let applied = false;
        filesToRun = filesToRun.map((file) => {
          if (file.testCaseId !== proposal.testCaseId) return file;
          const content = applyApprovedLocatorToScript(
            file.content,
            proposal.failedLocator,
            proposal.proposedLocator,
          );
          if (content === undefined) return file;
          applied = true;
          return { ...file, content };
        });
        if (applied) appliedProposalIds.push(proposal.id);
      }
    }

    await fs.rm(runDirectory, {
      recursive: true,
      force: true,
    });
    await fs.mkdir(suiteDirectory, { recursive: true });
    await fs.mkdir(artifactDirectory, { recursive: true });

    const compatibilityProjects = validatedInput.compatibility
      ? validatedInput.compatibility.browsers.flatMap((browserName) =>
        validatedInput.compatibility!.viewports.map((viewportName) => ({
          name: `${browserName}-${viewportName}`,
          use: {
            browserName,
            viewport: viewportName === "desktop"
              ? { width: 1280, height: 800 }
              : { width: 390, height: 844 },
          },
        })),
      )
      : undefined;
    const playwrightConfig = {
      testDir: "/generated/tests",
      outputDir: "/artifacts/output",
      reporter: [["json"]],
      use: { screenshot: "only-on-failure", trace: "retain-on-failure" },
      ...(compatibilityProjects ? { projects: compatibilityProjects } : {}),
    };
    await fs.writeFile(
      path.join(suiteDirectory, "playwright.config.ts"),
      `export default ${JSON.stringify(playwrightConfig, null, 2)};\n`,
      "utf8",
    );

    for (const file of filesToRun) {
      const target = this.resolveSafePath(
        suiteDirectory,
        file.path,
      );
      await fs.mkdir(path.dirname(target), {
        recursive: true,
      });
      const hasTestImport = /import\s+\{[^}]*\btest\b[^}]*\}\s+from\s+['"]@playwright\/test['"]/s.test(file.content);
      const content = hasTestImport && !file.content.includes("self-healing-dom-snapshot")
        ? `${file.content}${DOM_SNAPSHOT_HOOK}`
        : file.content;
      await fs.writeFile(target, content, "utf8");
    }

    const execution = await this.runner({
      workspace: validatedInput.workspace,
      suiteDirectory,
      artifactDirectory,
      timeoutMs: validatedInput.timeoutMs,
      browserCompatibility: Boolean(validatedInput.compatibility?.browsers.includes("firefox")),
      networkName,
      args: [
        "test",
        "--config=/generated/playwright.config.ts",
        // Container has limited resources (512m RAM, 1 CPU) — force 1 worker
        "--workers=1",
        "--reporter=json",
      ],
    });

    // Log stderr for debugging container execution issues
    if (execution.status !== "COMPLETED" && execution.stderr) {
      console.error(`[PlaywrightTestRunner] Container execution failed (status: ${execution.status}):`, execution.stderr);
    }
    if (execution.status === "COMPLETED" && execution.stderr) {
      console.warn(`[PlaywrightTestRunner] Container completed with stderr:`, execution.stderr);
    }

    const parsedTests = this.parseResults(execution.stdout);
    if (ownerId && validatedInput.repositoryId) {
      await this.proposeForLocatorFailures(
        ownerId,
        validatedInput.repositoryId,
        validatedInput.runId,
        parsedTests,
        artifactDirectory,
        validatedInput.files,
      );
      await this.validateApprovedProposals(
        ownerId,
        validatedInput.repositoryId,
        parsedTests,
        appliedProposalIds,
      );
    }
    const tests = parsedTests.map(({ domSnapshot: _domSnapshot, ...result }) => result);
    const output: TestRunnerOutput = {
      runId: validatedInput.runId,
      repositoryId: validatedInput.repositoryId,
      createdAt: new Date().toISOString(),
      status: this.getStatus(execution, tests),
      total: tests.length,
      passed: tests.filter((test) => test.status === "passed").length,
      failed: tests.filter((test) => test.status === "failed" || test.status === "timedOut").length,
      skipped: tests.filter((test) => test.status === "skipped").length,
      resultsDirectory: runDirectory,
      tests,
      stdout: this.redactSnapshotBodies(execution.stdout),
      stderr: execution.stderr,
      durationMs: Date.now() - startedAt,
    };

    await fs.writeFile(
      path.join(runDirectory, "run.json"),
      `${JSON.stringify(output, null, 2)}\n`,
      "utf8",
    );

    return testRunnerOutputSchema.parse(output);
  }

  private resolveSafePath(
    root: string,
    relativePath: string,
  ): string {
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(root, relativePath);

    if (
      resolved !== resolvedRoot &&
      !resolved.startsWith(`${resolvedRoot}${path.sep}`)
    ) {
      throw new Error("Generated test path escapes the suite directory.");
    }

    return resolved;
  }

  private parseResults(stdout: string): ParsedTestResult[] {
    try {
      const parsed = JSON.parse(stdout) as {
        suites?: Array<unknown>;
      };
      return this.flattenSuites(parsed.suites ?? []);
    } catch {
      return [];
    }
  }

  private flattenSuites(suites: unknown[]): ParsedTestResult[] {
    const results: ParsedTestResult[] = [];

    for (const suite of suites) {
      if (
        typeof suite !== "object" ||
        suite === null
      ) {
        continue;
      }

      const record = suite as {
        title?: unknown;
        specs?: unknown;
        suites?: unknown;
      };
      if (Array.isArray(record.specs)) {
        for (const spec of record.specs) {
          if (
            typeof spec !== "object" ||
            spec === null
          ) {
            continue;
          }
          const specRecord = spec as {
            title?: unknown;
            tests?: unknown;
          };
          const test = Array.isArray(specRecord.tests)
            ? specRecord.tests[0]
            : undefined;
          const testRecord =
            test && typeof test === "object"
              ? test as {
                  projectName?: unknown;
                  status?: unknown;
                  results?: unknown;
                }
              : undefined;
          const result = Array.isArray(testRecord?.results)
            ? testRecord.results[0]
            : undefined;
          const resultRecord =
            result && typeof result === "object"
              ? result as {
                  status?: unknown;
                  duration?: unknown;
                  error?: { message?: unknown };
                  attachments?: unknown;
                }
              : undefined;

          results.push({
            title: [testRecord?.projectName, record.title, specRecord.title]
              .filter((value): value is string => typeof value === "string")
              .join(" "),
            status: this.normalizeStatus(resultRecord?.status),
            durationMs: typeof resultRecord?.duration === "number"
              ? resultRecord.duration
              : 0,
            error: typeof resultRecord?.error?.message === "string"
              ? resultRecord.error.message
              : undefined,
            screenshot: this.findAttachment(
              resultRecord?.attachments,
              /screenshot/i,
            ),
            trace: this.findAttachment(
              resultRecord?.attachments,
              /trace/i,
            ),
            domSnapshot: this.findAttachmentBody(
              resultRecord?.attachments,
              /self-healing-dom-snapshot/i,
            ),
          });
        }
      }

      if (Array.isArray(record.suites)) {
        results.push(...this.flattenSuites(record.suites));
      }
    }

    return results;
  }

  private async proposeForLocatorFailures(
    ownerId: string,
    repositoryId: string,
    runId: string,
    tests: ParsedTestResult[],
    artifactDirectory: string,
    files: TestRunnerInput["files"],
  ) {
    for (const test of tests) {
      if (!test.error || !isLocatorFailure(test.error)) continue;
      const failedLocator = this.extractFailedLocator(test.error);
      const testCaseId = files.find((file) => test.title.includes(file.testCaseId))?.testCaseId
        ?? test.title.match(/REQ-TC-\d{3,}/)?.[0];
      if (!failedLocator || !testCaseId || !test.domSnapshot || !test.screenshot) {
        console.warn(`[PlaywrightTestRunner] Skipped self-healing for ${test.title}: missing locator, test case, DOM snapshot, or screenshot.`);
        continue;
      }

      try {
        const screenshotPath = this.resolveArtifactPath(artifactDirectory, test.screenshot);
        if (!screenshotPath) continue;
        const domSnapshot = test.domSnapshot;
        if (!domSnapshot || domSnapshot.length > 2_000_000) continue;
        const screenshot = await fs.readFile(screenshotPath);
        const screenshotData = `data:image/png;base64,${screenshot.toString("base64")}`;
        if (screenshotData.length > 10_000_000) continue;

        const proposal = await selfHealingService.propose(ownerId, {
          repositoryId,
          testRunId: runId,
          testCaseId,
          failedLocator,
          domSnapshot,
          screenshot: screenshotData,
        });
        console.info(`[PlaywrightTestRunner] Self-healing proposal created: ${proposal.id} for ${failedLocator}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[PlaywrightTestRunner] Self-healing proposal failed for ${test.title}: ${reason}`);
      }
    }
  }

  private extractFailedLocator(message: string): string | undefined {
    return message.match(/(?:^|\n)Locator:\s*([^\r\n]+)/i)?.[1]?.trim()
      ?? message.match(/strict mode violation:\s*(.+?)\s+resolved to (?:[2-9]|[1-9]\d+) elements/i)?.[1]?.trim()
      ?? message.match(/waiting for\s+(locator\([^\r\n]+|getBy(?:Role|Text|Label|Placeholder|TestId|Title|AltText)\([^\r\n]+)/i)?.[1]?.trim();
  }

  private async validateApprovedProposals(
    ownerId: string,
    repositoryId: string,
    tests: ParsedTestResult[],
    appliedProposalIds: string[],
  ) {
    if (appliedProposalIds.length === 0) return;
    const outcomes = resolveSelfHealingTestOutcomes(tests);
    if (outcomes.size === 0) return;

    const approvedProposals = await prisma.selfHealingProposal.findMany({
      where: {
        id: { in: appliedProposalIds },
        repositoryId,
        status: "APPROVED",
        testCaseId: { in: [...outcomes.keys()] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        testCaseId: true,
      },
    });

    if (approvedProposals.length === 0) {
      return;
    }

    for (const proposal of approvedProposals) {
      const passed = outcomes.get(proposal.testCaseId);
      if (passed === undefined) continue;
      await selfHealingService.validate(
        ownerId,
        proposal.id,
        passed,
        passed
          ? "Re-test passed with the approved locator."
          : "Re-test still failed; self-healing proposal was rolled back.",
      ).catch((error) => {
        console.warn(
          `[PlaywrightTestRunner] Failed to validate approved self-healing proposal ${proposal.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
  }

  private resolveArtifactPath(artifactDirectory: string, containerPath: string): string | undefined {
    const prefix = "/artifacts/";
    if (!containerPath.startsWith(prefix)) return undefined;
    try {
      return this.resolveSafePath(artifactDirectory, containerPath.slice(prefix.length).replaceAll("/", path.sep));
    } catch {
      return undefined;
    }
  }

  private findAttachmentBody(attachments: unknown, pattern: RegExp): string | undefined {
    if (!Array.isArray(attachments)) return undefined;
    const attachment = attachments.find((item) =>
      typeof item === "object" && item !== null &&
      typeof (item as { name?: unknown }).name === "string" &&
      pattern.test((item as { name: string }).name),
    ) as { body?: unknown; contentType?: unknown } | undefined;
    if (typeof attachment?.body !== "string") return undefined;
    return Buffer.from(attachment.body, "base64").toString("utf8");
  }

  private redactSnapshotBodies(stdout: string): string {
    try {
      const parsed = JSON.parse(stdout) as unknown;
      const redact = (value: unknown): void => {
        if (Array.isArray(value)) {
          value.forEach(redact);
        } else if (typeof value === "object" && value !== null) {
          const record = value as Record<string, unknown>;
          if (record.name === "self-healing-dom-snapshot" && "body" in record) {
            record.body = "[DOM snapshot retained only for proposal generation]";
          }
          Object.values(record).forEach(redact);
        }
      };
      redact(parsed);
      return JSON.stringify(parsed);
    } catch {
      return stdout;
    }
  }

  private normalizeStatus(
    status: unknown,
  ): TestResult["status"] {
    if (status === "passed" || status === "skipped" || status === "timedOut") {
      return status;
    }
    return "failed";
  }

  private findAttachment(
    attachments: unknown,
    pattern: RegExp,
  ): string | undefined {
    if (!Array.isArray(attachments)) {
      return undefined;
    }

    const attachment = attachments.find((item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as { name?: unknown }).name === "string" &&
      pattern.test((item as { name: string }).name),
    ) as { path?: unknown } | undefined;

    return typeof attachment?.path === "string"
      ? attachment.path
      : undefined;
  }

  private getStatus(
    execution: ToolRunResult,
    tests: TestResult[],
  ): TestRunnerOutput["status"] {
    if (execution.status === "CANCELLED") return "cancelled";
    if (execution.status === "TIMED_OUT") return "timedOut";
    if (execution.status !== "COMPLETED" || tests.some((test) => test.status === "failed" || test.status === "timedOut")) {
      return "failed";
    }
    return "passed";
  }
}

export const playwrightTestRunnerService =
  new PlaywrightTestRunnerService();
