type RiskInput = {
  patchBytes: number;
  linesAdded: number;
  linesRemoved: number;
  totalFileLines: number;
  findingCategory: string;
};

export class RiskScorer {
  static compute(input: RiskInput): number {
    const fileLines = Math.max(input.totalFileLines, 1);
    const changedLines = input.linesAdded + input.linesRemoved;
    const categoryRisk = input.findingCategory.toLowerCase() === "security" ? 0.25 : 0;
    return Math.min(Number((Math.min(input.patchBytes / 10000, 1) * 0.2 + Math.min(changedLines / fileLines, 1) * 0.55 + categoryRisk).toFixed(4)), 1);
  }
}