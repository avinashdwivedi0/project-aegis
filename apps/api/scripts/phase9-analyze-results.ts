import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd(), "../..");
const resultsDir = path.join(root, "evaluation", "results");
const baseline = JSON.parse(await fs.readFile(path.join(resultsDir, "baseline.json"), "utf8")) as {
  generatedAt: string;
  results: Array<{ repositoryId: string; command: string; exitCode: number; stderr: string; stdout: string }>;
};
const ai = JSON.parse(await fs.readFile(path.join(resultsDir, "ai-pipeline.json"), "utf8")) as {
  provider: string;
  model: string;
  startedAt: string;
  completedAt: string;
  result: { status: string; findings?: Array<{ evidenceIds?: string[] }>; errorCode?: string; summary: string };
};

const baselineSummary = {
  commands: baseline.results.length,
  passed: baseline.results.filter((result) => result.exitCode === 0).length,
  failed: baseline.results.filter((result) => result.exitCode !== 0).length,
  unavailable: baseline.results.filter((result) => /not recognized|missing|spawn EINVAL/i.test(`${result.stdout}\n${result.stderr}`)).length,
  intentionalFailures: baseline.results.filter((result) => result.repositoryId === "fixture-node-dependencies" && result.command === "pnpm test" && result.exitCode !== 0).length,
};

const groundTruth = new Set(["fixture/no-eval", "fixture/secret-token"]);
const detected = new Set((ai.result.findings ?? []).flatMap((finding) => finding.evidenceIds ?? []));
const truePositives = [...detected].filter((id) => groundTruth.has(id)).length;
const falsePositives = [...detected].filter((id) => !groundTruth.has(id)).length;
const falseNegatives = [...groundTruth].filter((id) => !detected.has(id)).length;
const precision = truePositives + falsePositives === 0 ? 0 : truePositives / (truePositives + falsePositives);
const recall = truePositives + falseNegatives === 0 ? 0 : truePositives / (truePositives + falseNegatives);

const analysis = {
  schemaVersion: "phase9-analysis-v1",
  generatedAt: new Date().toISOString(),
  baseline: baselineSummary,
  ai: {
    provider: ai.provider,
    model: ai.model,
    status: ai.result.status,
    errorCode: ai.result.errorCode ?? null,
    findingsProduced: ai.result.findings?.length ?? 0,
    comparableDetectionMetrics: ai.result.status === "completed",
    detectionMetrics: ai.result.status === "completed" ? {
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
    } : null,
  },
  conclusions: [
    "The deterministic baseline contains one passing build and one intentional failing test.",
    "The quality fixture's ESLint command detects the seeded no-eval issue after isolated dependencies are installed.",
    ai.result.status === "completed"
      ? "The AI pipeline returned schema-valid findings for the two quality-fixture ground-truth issues; this is a single-fixture detection result, not a general performance claim."
      : "The AI pipeline did not produce findings, so no AI precision, recall, F1, repair, or comparative claim is valid.",
  ],
  limitations: [
    "Only two local fixtures were executed.",
    "The AI detection comparison covers only the TypeScript quality fixture.",
    "The metric fixture validates implementation arithmetic and is not an experimental result.",
  ],
};

const markdown = `# Phase 9 Results Analysis

Generated: ${analysis.generatedAt}

## Evidence

- Baseline commands: ${baselineSummary.commands}
- Baseline passes: ${baselineSummary.passed}
- Baseline failures: ${baselineSummary.failed}
- Unavailable tool commands: ${baselineSummary.unavailable}
- Intentional seeded test failures: ${baselineSummary.intentionalFailures}
- AI provider: ${ai.provider} (${ai.model})
- AI status: ${ai.result.status} (${ai.result.errorCode ?? "none"})
- AI findings produced: ${ai.result.findings?.length ?? 0}
- AI quality-fixture detection precision/recall/F1: ${ai.result.status === "completed" ? `${precision}/${recall}/${precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)}` : "not reported"}

## Conclusions

${analysis.conclusions.map((item) => `- ${item}`).join("\n")}

## Limitations

${analysis.limitations.map((item) => `- ${item}`).join("\n")}

No repair metric is reported because this benchmark run did not apply or validate a patch. The detection result is limited to the TypeScript quality fixture.
`;

await fs.writeFile(path.join(resultsDir, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
await fs.writeFile(path.join(resultsDir, "analysis.md"), markdown);
console.log(`Wrote ${path.join(resultsDir, "analysis.json")} and analysis.md.`);
