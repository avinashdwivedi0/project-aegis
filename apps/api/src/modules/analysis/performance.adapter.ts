import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

import { playwrightTestRunnerService } from "../ai/test-runner/test-runner.service";
import { ContainerRunnerService } from "./container-runner.service";
import { discoverFrontendConfigs, routeBelongsToFrontend, startFrontend } from "./frontend-dev-server";
import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

const SOURCE_FILES = "**/*.{js,jsx,ts,tsx,html}";
const IGNORED = ["**/.git/**", "**/node_modules/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**", "**/results/**"];
const ROUTE_DECLARATION = /path\s*[:=]\s*['"](\/[^'"]*)['"]/g;
const SAMPLE_COUNT = 3;
const DEFAULT_LOAD_P95_LIMIT_MS = 1_000;
const FCP_P95_LIMIT_MS = 1_800;
const LCP_P95_LIMIT_MS = 2_500;
type Route = { path: string; file: string; line: number };
type Sample = { responseStartMs: number; domContentLoadedMs: number; loadMs: number; fcpMs: number; lcpMs: number };

export class PerformanceAdapter implements ToolAdapter {
  readonly name = "performance";
  readonly version = "playwright-navigation-web-vitals";

  async canRun(workspace: string): Promise<boolean> {
    return (await this.findRoutes(workspace)).length > 0;
  }

  async run(workspace: string, signal?: AbortSignal): Promise<ToolAdapterResult> {
    const routes = await this.findRoutes(workspace);
    const loadP95LimitMs = Number(process.env.AEGIS_PERFORMANCE_P95_LIMIT_MS ?? DEFAULT_LOAD_P95_LIMIT_MS);
    if (routes.length === 0) {
      return { tool: this.name, toolVersion: this.version, status: "skipped", checkStatus: "SKIPPED", projectsScanned: 0, command: [], evidence: [], skippedReason: "No supported frontend HTML or React routes were found to measure." };
    }
    const configuredTarget = process.env.AEGIS_PERFORMANCE_URL;
    let service: Awaited<ReturnType<typeof ContainerRunnerService.startWorkspaceDevServer>> | undefined;
    try {
      if (configuredTarget) return await this.runProject(workspace, this.dedupeRoutes(routes), configuredTarget, undefined, loadP95LimitMs, signal);

      const configs = await discoverFrontendConfigs(workspace, routes.map((route) => route.file));
      const projects = configs.map((config) => {
        const seenRoutes = new Set<string>();
        return { config, routes: routes.filter((route) => routeBelongsToFrontend(route.file, config.projectDirectory) && !seenRoutes.has(route.path) && Boolean(seenRoutes.add(route.path))) };
      }).filter((project) => project.routes.length > 0);
      if (projects.length === 0) {
        return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: [], evidence: [], failureReason: "Frontend routes were found, but no supported React/Vite/Next start or dev script was available." };
      }
      const results: ToolAdapterResult[] = [];
      for (const project of projects) {
        try {
          service = await startFrontend(workspace, project.config);
          results.push(await this.runProject(workspace, project.routes, service.url, service.networkName, loadP95LimitMs, signal));
        } catch (error) {
          const failureReason = error instanceof Error ? error.message : String(error);
          results.push({ tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: ["playwright", "browser performance", project.config.projectDirectory], evidence: [], failureReason });
        } finally {
          await service?.stop();
          service = undefined;
        }
      }
      const evidence = results.flatMap((result) => result.evidence);
      const failed = results.some((result) => result.checkStatus === "FAILED");
      return {
        tool: this.name,
        toolVersion: this.version,
        status: failed ? "failed" : "completed",
        checkStatus: failed ? "FAILED" : evidence.some((item) => item.filePath) ? "FINDINGS" : "PASSED",
        projectsScanned: results.reduce((total, result) => total + (result.projectsScanned ?? 0), 0),
        command: ["playwright", "test", "navigation timing", "FCP", "LCP", ...projects.map(({ config }) => config.projectDirectory)],
        execution: { command: "node", args: ["playwright", "browser performance"], status: failed ? "FAILED" : "COMPLETED", exitCode: failed ? 2 : evidence.some((item) => item.filePath) ? 1 : 0, stdout: results.map((result) => result.execution?.stdout ?? "").join("\n"), stderr: results.map((result) => result.execution?.stderr ?? "").join("\n"), durationMs: results.reduce((total, result) => total + (result.execution?.durationMs ?? 0), 0) },
        failureReason: results.filter((result) => result.failureReason).map((result) => result.failureReason).join("\n") || undefined,
        evidence,
      };
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : String(error);
      return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: ["playwright", "test", "browser performance"], evidence: [], failureReason };
    } finally {
      await service?.stop();
    }
  }

  private async runProject(workspace: string, routes: Route[], target: string, networkName: string | undefined, loadP95LimitMs: number, signal?: AbortSignal): Promise<ToolAdapterResult> {
    let runnerResultsDirectory: string | undefined;
    try {
      const files = routes.map((route, index) => ({
        path: `tests/aegis-performance-${index}.spec.ts`,
        language: "typescript" as const,
        testCaseId: `REQ-TC-${800 + index}`,
        content: this.createSpec(route, target, index),
      }));
      const testRun = await playwrightTestRunnerService.run({
        runId: `aegis-performance-${crypto.randomUUID()}`,
        workspace,
        files,
        parallelism: 1,
        timeoutMs: Math.min(420_000, Math.max(60_000, routes.length * 45_000)),
      }, undefined, networkName);
      runnerResultsDirectory = testRun.resultsDirectory;

      const testFailures = testRun.tests.filter((test) => test.status !== "passed");
      if (testRun.status !== "passed" || testFailures.length > 0) {
        return {
          tool: this.name,
          toolVersion: this.version,
          status: "failed",
          checkStatus: "FAILED",
          projectsScanned: 0,
          command: ["playwright", "test", "navigation timing", "FCP", "LCP"],
          execution: { command: "node", args: ["playwright", target], status: testRun.status === "timedOut" ? "TIMED_OUT" : "FAILED", exitCode: 2, stdout: testRun.stdout, stderr: testRun.stderr, durationMs: testRun.durationMs },
          evidence: [],
          failureReason: testFailures.map((test) => `${test.title}: ${test.error ?? test.status}`).join("\n") || `Playwright performance run ended with ${testRun.status}.`,
        };
      }

      const measurements: Array<{ route: Route; samples: Sample[]; p95: Omit<Sample, "responseStartMs"> }> = [];
      for (let index = 0; index < routes.length; index += 1) {
        const report = JSON.parse(await fs.readFile(path.join(testRun.resultsDirectory, "artifacts", `performance-${index}.json`), "utf8")) as Sample[];
        if (!Array.isArray(report) || report.length !== SAMPLE_COUNT) throw new Error(`Playwright performance samples were missing for ${routes[index].path}.`);
        measurements.push({
          route: routes[index],
          samples: report,
          p95: {
            domContentLoadedMs: this.p95(report.map((item) => item.domContentLoadedMs)),
            loadMs: this.p95(report.map((item) => item.loadMs)),
            fcpMs: this.p95(report.map((item) => item.fcpMs)),
            lcpMs: this.p95(report.map((item) => item.lcpMs)),
          },
        });
      }

      const evidence: ToolEvidence[] = measurements.flatMap(({ route, p95 }) => {
        const findings: ToolEvidence[] = [];
        if (p95.loadMs > loadP95LimitMs) findings.push(this.finding(route, "P95_PAGE_LOAD", "moderate", `P95 browser load event ${p95.loadMs}ms exceeded ${loadP95LimitMs}ms.`));
        if (p95.fcpMs > FCP_P95_LIMIT_MS) findings.push(this.finding(route, "P95_FCP", "moderate", `P95 First Contentful Paint ${p95.fcpMs}ms exceeded ${FCP_P95_LIMIT_MS}ms.`));
        if (p95.lcpMs > LCP_P95_LIMIT_MS) findings.push(this.finding(route, "P95_LCP", "high", `P95 Largest Contentful Paint ${p95.lcpMs}ms exceeded ${LCP_P95_LIMIT_MS}ms.`));
        return findings;
      });
      const report = measurements.map(({ route, samples, p95 }) => ({ route, samples, p95 }));
      if (evidence.length === 0) evidence.push(createCompletionEvidence(this.name, this.version, `Measured navigation, FCP, and LCP across ${routes.length} route(s), ${SAMPLE_COUNT} browser loads each.`));
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "completed",
        checkStatus: evidence.some((item) => item.filePath) ? "FINDINGS" : "PASSED",
        projectsScanned: 1,
        command: ["playwright", "test", "navigation timing", "FCP", "LCP", `${routes.length} routes`],
        execution: { command: "node", args: ["playwright", target], status: "COMPLETED", exitCode: evidence.some((item) => item.filePath) ? 1 : 0, stdout: JSON.stringify(report), stderr: testRun.stderr, durationMs: testRun.durationMs },
        evidence,
      };
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : String(error);
      return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: ["playwright", "test", "browser performance"], evidence: [], failureReason };
    } finally {
      if (runnerResultsDirectory) await fs.rm(runnerResultsDirectory, { recursive: true, force: true });
    }
  }

  private finding(route: Route, rule: string, severity: ToolEvidence["severity"], message: string): ToolEvidence {
    return { id: crypto.randomUUID(), tool: this.name, toolVersion: this.version, status: "failed", severity, message, filePath: route.file, lineStart: route.line, code: rule };
  }

  private p95(samples: number[]): number {
    const sorted = [...samples].sort((left, right) => left - right);
    return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
  }

  private dedupeRoutes(routes: Route[]): Route[] {
    const seen = new Set<string>();
    return routes.filter((route) => {
      if (seen.has(route.path)) return false;
      seen.add(route.path);
      return true;
    });
  }

  private async findRoutes(workspace: string): Promise<Route[]> {
    const files = await fg(SOURCE_FILES, { cwd: workspace, onlyFiles: true, ignore: IGNORED, suppressErrors: true });
    const routes = new Map<string, Route>();
    let frontendFound = false;
    for (const file of files) {
      const source = await fs.readFile(path.join(workspace, file), "utf8").catch(() => "");
      const isFrontendRouteFile = /\.(?:jsx|tsx|html)$/.test(file) || /react-router-dom|createBrowserRouter|<Route\b/.test(source);
      if (!isFrontendRouteFile) continue;
      frontendFound = true;
      ROUTE_DECLARATION.lastIndex = 0;
      for (const match of source.matchAll(ROUTE_DECLARATION)) {
        const route = match[1].replace(/\*.*$/, "").replace(/:[^/]+/g, "sample") || "/";
        routes.set(`${file}:${route}`, { path: route, file: file.replaceAll("\\", "/"), line: source.slice(0, match.index ?? 0).split(/\r?\n/).length });
      }
    }
    if (frontendFound && ![...routes.values()].some((route) => route.path === "/")) {
      const htmlEntry = files.find((file) => /(?:^|\/)index\.html$/i.test(file));
      const file = htmlEntry?.replaceAll("\\", "/") ?? "index.html";
      routes.set(`${file}:/`, { path: "/", file, line: 1 });
    }
    return [...routes.values()];
  }

  private createSpec(route: Route, base: string, index: number): string {
    const target = new URL(route.path, `${base.replace(/\/$/, "")}/`).toString();
    return `import { test } from "@playwright/test";\n` +
      `import fs from "node:fs/promises";\n` +
      `test("REQ-TC-${800 + index} ${route.file}:${route.line} ${route.path}", async ({ page }) => {\n` +
      `  await page.addInitScript(() => {\n` +
      `    const scope = window as unknown as { __aegisLcp: number };\n` +
      `    scope.__aegisLcp = 0;\n` +
      `    try { new PerformanceObserver((list) => { for (const entry of list.getEntries()) scope.__aegisLcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch {}\n` +
      `  });\n` +
      `  const samples: Array<{ responseStartMs: number; domContentLoadedMs: number; loadMs: number; fcpMs: number; lcpMs: number }> = [];\n` +
      `  for (let sample = 0; sample < ${SAMPLE_COUNT}; sample += 1) {\n` +
      `    await page.goto(${JSON.stringify(target)}, { waitUntil: "load", timeout: 45000 });\n` +
      `    await page.waitForTimeout(250);\n` +
      `    samples.push(await page.evaluate(() => {\n` +
      `      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;\n` +
      `      const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;\n` +
      `      const lcp = (window as unknown as { __aegisLcp?: number }).__aegisLcp ?? 0;\n` +
      `      return { responseStartMs: Math.round(navigation?.responseStart ?? 0), domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0), loadMs: Math.round(navigation?.loadEventEnd ?? 0), fcpMs: Math.round(fcp), lcpMs: Math.round(lcp) };\n` +
      `    }));\n` +
      `  }\n` +
      `  await fs.writeFile(${JSON.stringify(`/artifacts/performance-${index}.json`)}, JSON.stringify(samples), "utf8");\n` +
      `});\n`;
  }
}
