export type JavaScriptUnitTarget = {
  name: string;
  filePath: string;
  kind: "function" | "arrow" | "method";
  lineStart: number;
  lineEnd: number;
  parameters: string[];
  isAsync: boolean;
  exported: boolean;
  branchCount: number;
  implementation: string;
  confidence: "high" | "medium" | "low";
  unsupportedReasons: string[];
};

export type CharacterizationBaseline = {
  exactHash: string;
  cases: Array<{ name: string; result: string | boolean }>;
  fixedSaltHex: string;
  password: string;
};
