import path from "node:path";

import { BrowserAccessibilityAdapter } from "../src/modules/analysis/browser-accessibility.adapter.js";
import { PerformanceAdapter } from "../src/modules/analysis/performance.adapter.js";
import { discoverFrontendConfig } from "../src/modules/analysis/frontend-dev-server.js";

const workspace = path.resolve(process.argv[2] ?? "C:/aegis/repo-2662ae14442f7d86");
const accessibilityRoutes = await (new BrowserAccessibilityAdapter() as unknown as { findRoutes: (root: string) => Promise<unknown[]> }).findRoutes(workspace);
const performanceRoutes = await (new PerformanceAdapter() as unknown as { findRoutes: (root: string) => Promise<unknown[]> }).findRoutes(workspace);
const config = await discoverFrontendConfig(workspace, accessibilityRoutes.map((route) => (route as { file: string }).file));
process.stdout.write(`${JSON.stringify({ config, accessibilityRoutes, performanceRoutes }, null, 2)}\n`);
