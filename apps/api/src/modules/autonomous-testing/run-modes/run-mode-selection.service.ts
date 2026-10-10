export const RUN_MODES = [
  "smoke",
  "sanity",
  "system",
  "regression",
  "acceptance",
] as const;

export type RunMode = (typeof RUN_MODES)[number];
export type GeneratedTestType =
  | "unit"
  | "integration"
  | "black-box"
  | "compatibility"
  | "security";
export type PreviousTestStatus = "passed" | "failed" | "skipped" | "unknown";

/** Metadata is emitted beside existing generated test files; run modes only select it. */
export type GeneratedTestDescriptor = {
  id: string;
  type: GeneratedTestType;
  sourceFiles: string[];
  tags: string[];
  previousStatus: PreviousTestStatus;
};

export type RunModeSelection = {
  mode: RunMode;
  changedFiles: string[];
  selected: GeneratedTestDescriptor[];
  reason: string;
};

export type RunModeExecution = {
  selection: RunModeSelection;
  scheduled: Array<{
    descriptor: GeneratedTestDescriptor;
    status: "passed" | "failed";
    output?: string;
    error?: string;
  }>;
  totals: { selected: number; passed: number; failed: number };
};

function normalizeRepoPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").toLowerCase();
}

function isAffected(test: GeneratedTestDescriptor, changedFiles: string[]): boolean {
  if (changedFiles.length > 0 && test.sourceFiles.includes("*")) return true;
  const changed = new Set(changedFiles.map(normalizeRepoPath));
  return test.sourceFiles.some((sourceFile) => changed.has(normalizeRepoPath(sourceFile)));
}

export class RunModeSelectionService {
  select(
    mode: RunMode,
    inventory: GeneratedTestDescriptor[],
    changedFiles: string[] = [],
  ): RunModeSelection {
    let selected: GeneratedTestDescriptor[];
    let reason: string;

    switch (mode) {
      case "smoke":
        selected = inventory.filter((test) => test.tags.includes("critical"));
        reason = "Only generated tests tagged as critical paths (auth, payments, core navigation).";
        break;
      case "sanity":
        selected = inventory.filter((test) => isAffected(test, changedFiles));
        reason = `Only tests mapped to files in the latest commit (${changedFiles.length} changed files).`;
        break;
      case "system":
        selected = inventory;
        reason = "All generated unit, integration, black-box, compatibility, and security checks.";
        break;
      case "regression":
        selected = inventory.filter((test) =>
          test.previousStatus === "passed" && isAffected(test, changedFiles),
        );
        reason = `Previously passing tests mapped to changed files (${changedFiles.length} changed files).`;
        break;
      case "acceptance":
        selected = [];
        reason = "Acceptance (UAT) delegates the human requirement to the existing Testing page workflow.";
        break;
    }

    return { mode, changedFiles, selected, reason };
  }

  async schedule<T, R>(
    items: T[],
    parallelism: number,
    execute: (item: T, index: number) => Promise<R>,
  ): Promise<Array<{ item: T; result?: R; error?: string }>> {
    if (!Number.isInteger(parallelism) || parallelism < 1) {
      throw new Error("Parallelism must be a positive integer.");
    }

    const output: Array<{ item: T; result?: R; error?: string } | undefined> =
      new Array(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(parallelism, items.length);
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        const item = items[index]!;
        try {
          output[index] = { item, result: await execute(item, index) };
        } catch (error) {
          output[index] = {
            item,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }));
    return output.filter((item): item is NonNullable<typeof item> => item !== undefined);
  }

  async execute(
    mode: RunMode,
    inventory: GeneratedTestDescriptor[],
    changedFiles: string[],
    parallelism: number,
    run: (descriptor: GeneratedTestDescriptor) => Promise<string>,
  ): Promise<RunModeExecution> {
    const selection = this.select(mode, inventory, changedFiles);
    if (mode === "acceptance") {
      return { selection, scheduled: [], totals: { selected: 0, passed: 0, failed: 0 } };
    }

    const scheduled = await this.schedule(selection.selected, parallelism, async (descriptor) =>
      run(descriptor));
    const results = scheduled.map(({ item, result, error }) => ({
      descriptor: item,
      status: error === undefined ? "passed" as const : "failed" as const,
      ...(result === undefined ? {} : { output: result }),
      ...(error === undefined ? {} : { error }),
    }));
    return {
      selection,
      scheduled: results,
      totals: {
        selected: results.length,
        passed: results.filter(({ status }) => status === "passed").length,
        failed: results.filter(({ status }) => status === "failed").length,
      },
    };
  }
}

export const runModeSelectionService = new RunModeSelectionService();
