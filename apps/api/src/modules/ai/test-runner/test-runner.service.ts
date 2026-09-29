import fs from "fs/promises";
import path from "path";

import { ContainerRunnerService } from "../../analysis/container-runner.service";
import type { ToolRunResult } from "../../analysis/tool-runner.service";

import {
  testRunnerInputSchema,
  testRunnerOutputSchema,
  type TestRunnerInput,
  type TestRunnerOutput,
  type TestResult,
} from "./test-runner.types";

type PlaywrightCommandRunner = (options: {
  workspace: string;
  suiteDirectory: string;
  artifactDirectory: string;
  args: string[];
  timeoutMs: number;
}) => Promise<ToolRunResult>;

const defaultRunner: PlaywrightCommandRunner = (options) =>
  ContainerRunnerService.run({
    command: "node",
    args: [
      "/usr/lib/node_modules/@playwright/test/cli.js",
      ...options.args,
    ],
    workspace: options.workspace,
    image:
      process.env.PLAYWRIGHT_CONTAINER_IMAGE ??
      "aegis-playwright-runner:local",
    timeoutMs: options.timeoutMs,
    environment: {
      NODE_PATH: "/usr/lib/node_modules",
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

    await fs.rm(runDirectory, {
      recursive: true,
      force: true,
    });
    await fs.mkdir(suiteDirectory, { recursive: true });
    await fs.mkdir(artifactDirectory, { recursive: true });

    await fs.writeFile(
      path.join(suiteDirectory, "playwright.config.ts"),
      [
        "export default {",
        "  testDir: './tests',",
        "  outputDir: '/artifacts/output',",
        "  reporter: [['json']],",
        "  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    for (const file of validatedInput.files) {
      const target = this.resolveSafePath(
        suiteDirectory,
        file.path,
      );
      await fs.mkdir(path.dirname(target), {
        recursive: true,
      });
      await fs.writeFile(target, file.content, "utf8");
    }

    const execution = await this.runner({
      workspace: validatedInput.workspace,
      suiteDirectory,
      artifactDirectory,
      timeoutMs: validatedInput.timeoutMs,
      args: [
        "test",
        "--config=/generated/playwright.config.ts",
        `--workers=${validatedInput.parallelism}`,
        "--reporter=json",
      ],
    });
    const tests = this.parseResults(execution.stdout);
    const output: TestRunnerOutput = {
      runId: validatedInput.runId,
      repositoryId: validatedInput.repositoryId,
      createdAt: new Date().toISOString(),
      status: this.getStatus(execution, tests),
      total: tests.length,
      passed: tests.filter((test) => test.status === "passed").length,
      failed: tests.filter((test) => test.status === "failed").length,
      skipped: tests.filter((test) => test.status === "skipped").length,
      resultsDirectory: runDirectory,
      tests,
      stdout: execution.stdout,
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

  private parseResults(stdout: string): TestResult[] {
    try {
      const parsed = JSON.parse(stdout) as {
        suites?: Array<unknown>;
      };
      return this.flattenSuites(parsed.suites ?? []);
    } catch {
      return [];
    }
  }

  private flattenSuites(suites: unknown[]): TestResult[] {
    const results: TestResult[] = [];

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
            title: [record.title, specRecord.title]
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
          });
        }
      }

      if (Array.isArray(record.suites)) {
        results.push(...this.flattenSuites(record.suites));
      }
    }

    return results;
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