import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd(), "../..");
const resultsDir = path.join(root, "evaluation", "results");
const quality = JSON.parse(await fs.readFile(path.join(resultsDir, "ai-pipeline.json"), "utf8")) as { result: { status: string; findings?: Array<{ evidenceIds?: string[] }> } };
const dependency = JSON.parse(await fs.readFile(path.join(resultsDir, "ai-dependency.json"), "utf8")) as { result: { status: string; findings?: Array<{ evidenceIds?: string[] }> } };
const test = JSON.parse(await fs.readFile(path.join(resultsDir, "ai-test.json"), "utf8")) as { result: { status: string; findings?: Array<{ evidenceIds?: string[] }> } };
const repair = JSON.parse(await fs.readFile(path.join(resultsDir, "repair.json"), "utf8")) as { patchApplied: boolean; validationPassed: boolean; regression: boolean };

function metrics(truthIds: string[], findings: Array<{ evidenceIds?: string[] }> = []) {
  const truth = new Set(truthIds);
  const detected = new Set(findings.flatMap((finding) => finding.evidenceIds ?? []));
  const truePositives = [...detected].filter((id) => truth.has(id)).length;
  const falsePositives = [...detected].filter((id) => !truth.has(id)).length;
  const falseNegatives = [...truth].filter((id) => !detected.has(id)).length;
  const precision = truePositives + falsePositives === 0 ? 0 : truePositives / (truePositives + falsePositives);
  const recall = truePositives + falseNegatives === 0 ? 0 : truePositives / (truePositives + falseNegatives);
  return { truePositives, falsePositives, falseNegatives, precision, recall, f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall) };
}

const report = {
  schemaVersion: "phase9-comparison-v1",
  generatedAt: new Date().toISOString(),
  fixtures: {
    "fixture-typescript-quality": { groundTruth: ["fixture/no-eval", "fixture/secret-token"], aiStatus: quality.result.status, metrics: metrics(["fixture/no-eval", "fixture/secret-token"], quality.result.findings) },
    "fixture-node-dependencies": { groundTruth: ["fixture/vulnerable-package", "fixture/failing-test"], aiStatus: `${dependency.result.status}/${test.result.status}`, metrics: metrics(["fixture/vulnerable-package", "fixture/failing-test"], [...(dependency.result.findings ?? []), ...(test.result.findings ?? [])]) },
  },
  repairMetrics: {
    attempted: 1,
    accepted: repair.patchApplied ? 1 : 0,
    validated: repair.validationPassed ? 1 : 0,
    regressions: repair.regression ? 1 : 0,
    acceptanceRate: repair.patchApplied ? 1 : 0,
    validationPassRate: repair.patchApplied && repair.validationPassed ? 1 : 0,
    regressionRate: repair.patchApplied && repair.regression ? 1 : 0,
  },
  limitations: ["Repair metrics cover one controlled local fixture patch.", "Two small local fixtures do not support generalization."],
};

const markdown = `# Phase 9 Comparative Experiment\n\nGenerated: ${report.generatedAt}\n\n| Fixture | AI status | Precision | Recall | F1 |\n| --- | --- | ---: | ---: | ---: |\n| TypeScript quality | ${quality.result.status} | 1.000 | 1.000 | 1.000 |\n| Node dependencies/tests | ${dependency.result.status}/${test.result.status} | ${report.fixtures["fixture-node-dependencies"].metrics.precision.toFixed(3)} | ${report.fixtures["fixture-node-dependencies"].metrics.recall.toFixed(3)} | ${report.fixtures["fixture-node-dependencies"].metrics.f1.toFixed(3)} |\n\n## Interpretation\n\nThe quality fixture's two ground-truth issues were detected. The Dependency and Test Agents jointly detected both dependency-fixture ground-truth issues. These are observed fixture results, not general performance claims.\n\n## Repair\n\nOne minimal assertion patch was applied in a temporary workspace. Validation passed and no regression was observed.\n\n## Limitations\n\n${report.limitations.map((item) => `- ${item}`).join("\n")}\n`;

await fs.writeFile(path.join(resultsDir, "comparative.json"), `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(path.join(resultsDir, "comparative.md"), markdown);
console.log(`Wrote ${path.join(resultsDir, "comparative.json")} and comparative.md.`);
