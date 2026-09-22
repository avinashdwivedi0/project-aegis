import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

interface RepairOutcome {
  findingId: string;
  accepted: boolean;
  validationPassed: boolean;
  regression: boolean;
}

interface EvaluationInput {
  groundTruthFindingIds: string[];
  detectedFindingIds: string[];
  repairs: RepairOutcome[];
}

export interface EvaluationMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  repairAcceptanceRate: number;
  repairValidationPassRate: number;
  regressionRate: number;
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function calculateMetrics(input: EvaluationInput): EvaluationMetrics {
  const truth = new Set(input.groundTruthFindingIds);
  const detected = new Set(input.detectedFindingIds);
  const truePositives = [...detected].filter((id) => truth.has(id)).length;
  const falsePositives = [...detected].filter((id) => !truth.has(id)).length;
  const falseNegatives = [...truth].filter((id) => !detected.has(id)).length;
  const precision = rate(truePositives, truePositives + falsePositives);
  const recall = rate(truePositives, truePositives + falseNegatives);
  const repairs = input.repairs;
  const accepted = repairs.filter((repair) => repair.accepted).length;
  const validated = repairs.filter((repair) => repair.validationPassed).length;
  const regressions = repairs.filter((repair) => repair.regression).length;

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1: rate(2 * precision * recall, precision + recall),
    repairAcceptanceRate: rate(accepted, repairs.length),
    repairValidationPassRate: rate(validated, accepted),
    regressionRate: rate(regressions, accepted),
  };
}

const fixturePath = path.resolve(process.cwd(), "../../evaluation/phase9-fixture.json");
const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8")) as EvaluationInput;
const metrics = calculateMetrics(fixture);

assert.deepEqual(metrics, {
  truePositives: 3,
  falsePositives: 1,
  falseNegatives: 1,
  precision: 0.75,
  recall: 0.75,
  f1: 0.75,
  repairAcceptanceRate: 2 / 3,
  repairValidationPassRate: 0.5,
  regressionRate: 0.5,
});

console.log(JSON.stringify({ fixture: fixturePath, metrics }, null, 2));
console.log("Phase 9 evaluation check passed.");
