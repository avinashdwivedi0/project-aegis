import crypto from "node:crypto";
import fs from "node:fs/promises";
import fg from "fast-glob";

import { playwrightTestRunnerService } from "../ai/test-runner/test-runner.service";
import { discoverFrontendConfigs, routeBelongsToFrontend, startFrontend } from "./frontend-dev-server";
import { ContainerRunnerService } from "./container-runner.service";
import type { ToolAdapter, ToolAdapterResult, ToolEvidence } from "./tool-adapter.types";

const SOURCE_FILES = "**/*.{js,jsx,ts,tsx,html}";
const IGNORED = ["**/.git/**", "**/node_modules/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**", "**/results/**"];
const REACT_ROUTE = /path\s*[:=]\s*['"](\/[^'"]*)['"]/g;
const AXE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js";
const FINDING_PREFIX = "AEGIS_AXE_FINDINGS:";
type Route = { path: string; file: string; line: number };
type AxeViolation = { id?: string; impact?: string; help?: string; nodes?: Array<{ target?: string[]; failureSummary?: string }> };

export class BrowserAccessibilityAdapter implements ToolAdapter {
  readonly name = "browser-accessibility";
  readonly version = "playwright-axe-4.10.3";

  async canRun(workspace: string): Promise<boolean> {
    return (await this.findRoutes(workspace)).length > 0;
  }

  async run(workspace: string, signal?: AbortSignal): Promise<ToolAdapterResult> {
    const routes = await this.findRoutes(workspace);
    if (routes.length === 0) return { tool: this.name, toolVersion: this.version, status: "skipped", checkStatus: "SKIPPED", projectsScanned: 0, command: [], evidence: [], skippedReason: "No supported frontend HTML or React route source was discovered." };
    const services: Array<Awaited<ReturnType<typeof ContainerRunnerService.startWorkspaceDevServer>>> = [];
    let base = process.env.AEGIS_ACCESSIBILITY_URL ?? "http://host.docker.internal:3000";
    try {
      if (!process.env.AEGIS_ACCESSIBILITY_URL) {
        const configs = await discoverFrontendConfigs(workspace, routes.map((route) => route.file));
        const projects = configs.map((config) => {
          const seenRoutes = new Set<string>();
          return { config, routes: routes.filter((route) => routeBelongsToFrontend(route.file, config.projectDirectory) && !seenRoutes.has(route.path) && Boolean(seenRoutes.add(route.path))) };
        }).filter((project) => project.routes.length > 0);
        if (projects.length === 0) return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: [], evidence: [], failureReason: "Frontend routes were found, but no supported React/Vite/Next start or dev script was available." };
        const results = [];
        for (const project of projects) {
          const service = await startFrontend(workspace, project.config);
          services.push(service);
          results.push(await this.runRoutes(workspace, project.routes, service.url, service.networkName, project.config.projectDirectory));
        }
        const evidence = results.flatMap((result) => result.evidence);
        const failed = results.some((result) => result.checkStatus === "FAILED");
        return {
          tool: this.name, toolVersion: this.version,
          status: failed ? "failed" : "completed",
          checkStatus: failed ? "FAILED" : evidence.some((item) => item.filePath) ? "FINDINGS" : "PASSED",
          projectsScanned: results.reduce((total, result) => total + (result.projectsScanned ?? 0), 0),
          command: ["playwright", "test", "axe-core", `${projects.length} frontend project(s)`],
          execution: { command: "node", args: ["playwright", "axe-core"], status: failed ? "FAILED" : "COMPLETED", exitCode: failed ? 2 : evidence.some((item) => item.filePath) ? 1 : 0, stdout: results.map((result) => result.execution?.stdout ?? "").join("\n"), stderr: results.map((result) => result.execution?.stderr ?? "").join("\n"), durationMs: results.reduce((total, result) => total + (result.execution?.durationMs ?? 0), 0) },
          failureReason: results.filter((result) => result.failureReason).map((result) => result.failureReason).join("\n") || undefined,
          evidence,
        };
      }
      const result = await this.runRoutes(workspace, routes, base);
      return result;
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : String(error);
      return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: ["playwright", "test", "axe-core"], evidence: [], failureReason };
    } finally {
      await Promise.all(services.map((service) => service.stop()));
    }
  }

  private async runRoutes(workspace: string, routesToCheck: Route[], base: string, networkName?: string, projectDirectory?: string): Promise<ToolAdapterResult> {
      const files = routesToCheck.map((route, index) => ({
        path: `tests/aegis-accessibility-${index}.spec.ts`,
        language: "typescript" as const,
        testCaseId: `REQ-TC-${900 + index}`,
        content: this.createSpec(route, base, index),
      }));
      const result = await playwrightTestRunnerService.run({
        runId: `aegis-a11y-${crypto.randomUUID()}`,
        workspace,
        files,
        parallelism: 1,
        timeoutMs: Math.min(420_000, Math.max(60_000, routesToCheck.length * 45_000)),
      }, undefined, networkName);
      await fs.rm(result.resultsDirectory, { recursive: true, force: true });
      const evidence: ToolEvidence[] = [];
      const startupErrors: string[] = [];
      for (const test of result.tests) {
        if (test.status === "passed" || !test.error) continue;
        const marker = test.error.indexOf(FINDING_PREFIX);
        if (marker < 0) {
          startupErrors.push(`${test.title}: ${test.error.slice(0, 1000)}`);
          continue;
        }
        const payload = test.error.slice(marker + FINDING_PREFIX.length).split(/\r?\n/)[0];
        try {
          const violation = JSON.parse(payload) as { violations?: AxeViolation[] };
          const routeIndex = Number(test.title.match(/REQ-TC-(\d{3,})/)?.[1] ?? "900") - 900;
          const route = routesToCheck[routeIndex] ?? routesToCheck[0];
          for (const item of violation.violations ?? []) {
            for (const node of item.nodes ?? []) {
              evidence.push({
                id: crypto.randomUUID(),
                tool: this.name,
                toolVersion: this.version,
                status: "failed",
                severity: item.impact === "critical" ? "critical" : item.impact === "serious" ? "high" : item.impact === "moderate" ? "moderate" : "low",
                message: `${item.id}: ${item.help ?? "Accessibility violation"}; impact ${item.impact ?? "unknown"}; selector ${node.target?.join(", ") ?? "unknown"}. ${node.failureSummary ?? ""}`,
                filePath: route.file,
                lineStart: route.line,
                code: item.id ?? "axe/violation",
              });
            }
          }
        } catch {
          startupErrors.push(`${test.title}: axe violation report was malformed.`);
        }
      }
      const failed = result.status !== "passed" && evidence.length === 0 || startupErrors.length > 0;
      if (evidence.length === 0 && !failed) evidence.push({ id: crypto.randomUUID(), tool: this.name, toolVersion: this.version, status: "completed", severity: "info", message: `axe-core found no WCAG violations across ${routesToCheck.length} discovered route(s).` });
      return {
        tool: this.name,
        toolVersion: this.version,
        status: failed ? "failed" : "completed",
        checkStatus: failed ? "FAILED" : evidence.some((item) => item.filePath) ? "FINDINGS" : "PASSED",
        projectsScanned: failed ? 0 : 1,
        failureReason: failed ? startupErrors.join("\n") || result.stderr || `Playwright accessibility run ended with ${result.status}.` : undefined,
        command: ["playwright", "test", "axe-core", `${routesToCheck.length} routes`],
        execution: { command: "node", args: ["playwright", "axe-core", base, projectDirectory ?? "configured target"], status: failed ? "FAILED" : "COMPLETED", exitCode: failed ? 2 : evidence.some((item) => item.filePath) ? 1 : 0, stdout: result.stdout, stderr: result.stderr, durationMs: result.durationMs },
        evidence,
      };
  }

  private async findRoutes(workspace: string): Promise<Route[]> {
    const files = await fg(SOURCE_FILES, { cwd: workspace, onlyFiles: true, ignore: IGNORED, suppressErrors: true });
    const routes = new Map<string, Route>();
    let frontendFound = false;
    for (const file of files) {
      const source = await import("node:fs/promises").then(({ readFile }) => readFile(`${workspace}/${file}`, "utf8")).catch(() => "");
      const isFrontendRouteFile = /\.(?:jsx|tsx|html)$/.test(file)
        || /react-router-dom|createBrowserRouter|<Route\b/.test(source);
      if (!isFrontendRouteFile) continue;
      frontendFound = true;
      REACT_ROUTE.lastIndex = 0;
      for (const match of source.matchAll(REACT_ROUTE)) {
        const route = match[1].replace(/\*.*$/, "").replace(/:[^/]+/g, "sample") || "/";
        routes.set(`${file}:${route}`, { path: route, file: file.replaceAll("\\", "/"), line: source.slice(0, match.index ?? 0).split(/\r?\n/).length });
      }
    }
    if (frontendFound && ![...routes.values()].some((route) => route.path === "/")) {
      const htmlEntry = files.find((file) => /(?:^|\/)index\.html$/i.test(file));
      const file = htmlEntry?.replaceAll("\\", "/") ?? "index.html";
      routes.set(`${file}:/`, { path: "/", file, line: 1 });
    }
    return [...routes.values()].slice(0, 40);
  }

  private createSpec(route: Route, base: string, index: number): string {
    const target = new URL(route.path, `${base.replace(/\/$/, "")}/`).toString();
    return `import { test } from "@playwright/test";\n` +
      `test("REQ-TC-${900 + index} ${route.file}:${route.line} ${route.path}", async ({ page }) => {\n` +
      `  await page.goto(${JSON.stringify(target)}, { waitUntil: "load", timeout: 45000 });\n` +
      `  await page.waitForTimeout(1000);\n` +
      `  await page.addScriptTag({ url: ${JSON.stringify(AXE_CDN)} });\n` +
      `  const violations = await page.evaluate(async () => (window as unknown as { axe: { run: (root: Document) => Promise<{ violations: Array<{id:string,impact?:string,help:string,nodes:Array<{target:string[],failureSummary?:string}>}> }> } }).axe.run(document));\n` +
      `  if (violations.violations.length) { const compact = { violations: violations.violations.map(({id,impact,help,nodes}) => ({id,impact,help,nodes:nodes.map(({target,failureSummary}) => ({target,failureSummary}))})) }; throw new Error(${JSON.stringify(FINDING_PREFIX)} + JSON.stringify(compact)); }\n` +
      `});\n`;
  }
}
