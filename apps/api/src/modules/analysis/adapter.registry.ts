import type { ToolAdapter } from "./tool-adapter.types";
import { ApiProbeAdapter } from "./api-probe.adapter";
import { BrowserAccessibilityAdapter } from "./browser-accessibility.adapter";
import { DependencyAuditAdapter } from "./dependency-audit.adapter";
import { EslintAdapter } from "./eslint.adapter";
import { PerformanceAdapter } from "./performance.adapter";
import { SecurityScanAdapter } from "./security-scan.adapter";
import { TestRunnerAdapter } from "./test-runner.adapter";
import { TypeScriptAdapter } from "./typescript.adapter";

const adapters: ToolAdapter[] = [
  new TypeScriptAdapter(),
  new EslintAdapter(),
  new DependencyAuditAdapter(),
  new SecurityScanAdapter(),
  new TestRunnerAdapter(),
  new ApiProbeAdapter(),
  new BrowserAccessibilityAdapter(),
  new PerformanceAdapter(),
];

export class AdapterRegistry {
  static all() {
    return [...adapters];
  }

  static get(name: string) {
    return adapters.find((adapter) => adapter.name === name);
  }
}
