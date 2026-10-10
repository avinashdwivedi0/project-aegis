import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import simpleGit from "simple-git";

import { prisma } from "../../../config/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { SecurityScanAdapter } from "../../analysis/security-scan.adapter.js";
import { DependencyAuditAdapter } from "../../analysis/dependency-audit.adapter.js";
import { blackBoxRunService } from "../black-box/black-box-run.service.js";
import { reactFlowDiscoveryService } from "../black-box/react-flow-discovery.service.js";
import { javascriptRouteDiscoveryService } from "../integration/javascript-route-discovery.service.js";
import { runModeSelectionService, type GeneratedTestDescriptor, type GeneratedTestType, type PreviousTestStatus, type RunMode } from "./run-mode-selection.service.js";
import type { LiveRunModeInput } from "./live-run-mode.types.js";
import { orderIntegrationGenerator } from "../integration/order-integration.generator.js";
import { signupIntegrationGenerator } from "../integration/signup-integration.generator.js";
import { dashboardDataIntegrationGenerator } from "../integration/dashboard-data.integration.generator.js";
import { javascriptUnitDiscoveryService } from "../unit/javascript-unit-discovery.service.js";
import { runRecordService } from "../run-history/run-record.service.js";

type LiveDescriptor = GeneratedTestDescriptor & { suite: string };

async function filesExist(root: string, files: string[]) {
  return Promise.all(files.map(async (file) => {
    try { await fs.access(path.join(root, file)); return true; }
    catch { return false; }
  }));
}

async function savedStatus(
  repositoryId: string,
  kind: string,
  suite: string,
  root: string,
  predicate: (record: Record<string, unknown>) => boolean,
  mode: string | null = null,
): Promise<PreviousTestStatus> {
  const saved = await prisma.autonomousTestRun.findFirst({
    where: { repositoryId, kind, suite, mode },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });
  if (saved) {
    if (saved.status === "passed" || saved.status === "COMPLETED") return "passed";
    if (saved.status === "failed" || saved.status === "FAILED") return "failed";
  }

  let latest: { date: number; status: PreviousTestStatus } | undefined;
  let entries: string[];
  try { entries = await fs.readdir(root); } catch { return "unknown"; }
  for (const entry of entries) {
    try {
      const record = JSON.parse(await fs.readFile(path.join(root, entry, "run.json"), "utf8")) as Record<string, unknown>;
      const repository = record.repository as { id?: string } | undefined;
      if (record.repositoryId !== repositoryId && repository?.id !== repositoryId || !predicate(record)) continue;
      const date = Date.parse(String(record.createdAt ?? "")) || (await fs.stat(path.join(root, entry, "run.json"))).mtimeMs;
      const status = record.status === "passed" || record.status === "COMPLETED" ? "passed"
        : record.status === "failed" || record.status === "FAILED" || record.status === "timedOut" ? "failed" : "unknown";
      if (!latest || date > latest.date) latest = { date, status };
    } catch { /* ignore partial run directories */ }
  }
  return latest?.status ?? "unknown";
}

function compactRunResult(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const execution = record.execution && typeof record.execution === "object" ? record.execution as Record<string, unknown> : {};
  return {
    runId: record.runId,
    type: record.type,
    suite: record.suite,
    status: record.status ?? execution.status,
    total: record.total ?? execution.total,
    passed: record.passed ?? execution.passed,
    failed: record.failed ?? execution.failed,
    skipped: record.skipped ?? execution.skipped,
    durationMs: execution.durationMs,
    routeCoverage: record.routeCoverage,
    discoveredRoutes: record.discoveredRoutes,
    scannedFiles: record.scannedFiles,
    findingCount: record.findingCount,
    findings: record.findings,
    checks: record.checks,
    coverageGaps: record.coverageGaps,
  };
}

export class LiveRunModeService {
  private readonly resultsRoot = path.resolve(process.cwd(), "results");

  private async persistReport(report: Record<string, unknown>) {
    const reportId = randomUUID();
    const reportDirectory = path.join(this.resultsRoot, "run-modes");
    await fs.mkdir(reportDirectory, { recursive: true });
    const reportPath = path.join(reportDirectory, `${reportId}.json`);
    const temporaryPath = `${reportPath}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(report, null, 2), "utf8");
    await fs.rename(temporaryPath, reportPath);
    return { reportId, reportPath };
  }

  private async resolveRepository(ownerId: string, repositoryId: string) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, project: { ownerId } },
      select: { id: true, name: true, workspacePath: true },
    });
    if (!repository) throw new ApiError(404, "Repository not found or access denied.");
    if (!repository.workspacePath) throw new ApiError(409, "This repository's workspace is missing or was not imported correctly — try re-importing it.");
    return repository;
  }

  async run(ownerId: string, input: LiveRunModeInput) {
    const repository = await this.resolveRepository(ownerId, input.repositoryId);
    const workspace = repository.workspacePath!;
    let changedFiles: string[] = [];
    if (input.mode === "sanity" || input.mode === "regression") {
      try {
        const git = simpleGit(workspace);
        const isRepo = await git.checkIsRepo();
        if (!isRepo) throw new Error("Repository workspace has no Git history.");
        const diff = await git.diff(["--name-only", "HEAD~1", "HEAD"]);
        changedFiles = diff.split(/\r?\n/).map((file) => file.trim()).filter(Boolean);
      } catch (error) {
        throw new ApiError(422, error instanceof Error ? error.message : "Could not identify the latest commit changes.");
      }
    }

    if (input.mode === "acceptance") {
      return { repository: { id: repository.id, name: repository.name }, mode: input.mode, changedFiles, selection: [], gaps: [], acceptancePath: "/testing?mode=acceptance", message: "Acceptance uses the existing human-written requirement workflow." };
    }

    const descriptors: LiveDescriptor[] = [];
    const gaps: string[] = [];
    const unitRuns = path.join(this.resultsRoot, "autonomous-testing");
    const playwrightRuns = path.join(this.resultsRoot, "playwright");
    const unitFiles = ["dashboard/src/components/DoughnoutChart.js", "dashboard/src/components/VerticalGraph.js", "frontend/src/landing_page/home/Hero.js"];
    const hasAllComponents = (await filesExist(workspace, unitFiles)).every(Boolean);
    if (hasAllComponents) descriptors.push({
      id: "unit-exported-components", type: "unit", suite: "exported-components", sourceFiles: unitFiles, tags: [],
      previousStatus: await savedStatus(repository.id, "unit", "exported-components", unitRuns, (record) => record.type === "unit" && record.suite === "exported-components"),
    });
    else gaps.push("Unit: exported-component recipe requires the discovered DoughnutChart, VerticalGraph, and Hero source files.");
    const passwordPath = "backend/index.js";
    if ((await filesExist(workspace, [passwordPath]))[0]) {
      const targets = await javascriptUnitDiscoveryService.discoverFile(workspace, passwordPath);
      if (targets.some(({ name }) => name === "hashPassword") && targets.some(({ name }) => name === "verifyPassword")) descriptors.push({
        id: "unit-password-helpers", type: "unit", suite: "password-helpers", sourceFiles: [passwordPath], tags: ["critical"],
        previousStatus: await savedStatus(repository.id, "unit", "password-helpers", unitRuns, (record) => record.type === "unit" && record.suite === "password-helpers"),
      });
    }

    const routes = await javascriptRouteDiscoveryService.discover(workspace);
    if (routes.routes.some(({ method, path: routePath }) => method === "POST" && routePath === "/signup") && routes.routes.some(({ method, path: routePath }) => method === "POST" && routePath === "/login")) {
      try {
        signupIntegrationGenerator.generate(routes.routes, input.integrationBaseUrl ?? "http://localhost");
        descriptors.push({ id: "integration-signup-login", type: "integration", suite: "signup-login", sourceFiles: ["backend/index.js"], tags: ["critical"],
          previousStatus: await savedStatus(repository.id, "integration", "signup-login", unitRuns, (record) => record.type === "integration" && record.suite === "signup-login") });
      } catch (error) { gaps.push(`Integration signup/login: ${error instanceof Error ? error.message : String(error)}`); }
    }
    if (routes.routes.some(({ method, path: routePath }) => method === "POST" && routePath === "/newOrder")) {
      try {
        orderIntegrationGenerator.generate(routes.routes, input.integrationBaseUrl ?? "http://localhost");
        descriptors.push({ id: "integration-new-order", type: "integration", suite: "new-order", sourceFiles: ["backend/index.js"], tags: ["critical"],
          previousStatus: await savedStatus(repository.id, "integration", "new-order", unitRuns, (record) => record.type === "integration" && record.suite === "new-order") });
      } catch (error) { gaps.push(`Integration /newOrder: ${error instanceof Error ? error.message : String(error)}`); }
    }
    try {
      dashboardDataIntegrationGenerator.generate(routes.routes, input.integrationBaseUrl ?? "http://localhost");
      descriptors.push({ id: "integration-dashboard-data", type: "integration", suite: "dashboard-data", sourceFiles: ["backend/index.js"], tags: [],
        previousStatus: await savedStatus(repository.id, "integration", "dashboard-data", unitRuns, (record) => record.type === "integration" && record.suite === "dashboard-data") });
    } catch (error) { gaps.push(`Integration dashboard data routes: ${error instanceof Error ? error.message : String(error)}`); }

    try {
      await reactFlowDiscoveryService.discoverSignupLogin(workspace);
      const hasUrls = Boolean(input.frontendUrl && input.dashboardUrl);
      descriptors.push({ id: "black-box-signup-login", type: "black-box", suite: "signup-login", sourceFiles: ["frontend/src/landing_page/signup/Signup.js", "frontend/src/landing_page/login/Login.js"], tags: ["critical"],
        previousStatus: await savedStatus(repository.id, "black-box", "signup-login", playwrightRuns, (record) => String(record.runId ?? "").startsWith("autonomous-blackbox-") && !String(record.runId ?? "").startsWith("autonomous-blackbox-compatibility-")) });
      if (!hasUrls) gaps.push("Black-box execution requires frontendUrl and dashboardUrl.");
      descriptors.push({ id: "compatibility-signup-login", type: "compatibility", suite: "compatibility", sourceFiles: ["frontend/src/landing_page/signup/Signup.js", "frontend/src/landing_page/login/Login.js"], tags: ["critical"],
        previousStatus: await savedStatus(repository.id, "black-box", "compatibility", playwrightRuns, (record) => String(record.runId ?? "").startsWith("autonomous-blackbox-compatibility-"), "compatibility") });
      if (!hasUrls) gaps.push("Compatibility execution requires frontendUrl and dashboardUrl.");
    } catch (error) { gaps.push(`Black-box/compatibility: ${error instanceof Error ? error.message : String(error)}`); }

    const security = new SecurityScanAdapter();
    const dependencyAudit = new DependencyAuditAdapter();
    const hasDependencyLockfiles = await dependencyAudit.canRun(workspace);
    descriptors.push({
      id: "security-secrets", type: "security", suite: "secrets", sourceFiles: ["*"], tags: [],
      previousStatus: await savedStatus(repository.id, "security", "secrets", unitRuns, (record) => record.type === "security" && record.suite === "secrets"),
    });
    if (await security.canRun(workspace)) descriptors.push({
      id: "security-semgrep", type: "security", suite: "semgrep", sourceFiles: ["*"], tags: [], previousStatus: "unknown",
    });
    else gaps.push("Semgrep security rules: no repository Semgrep configuration was discovered; the built-in secret-pattern scan still runs.");
    if (!hasDependencyLockfiles) gaps.push("Dependency audit: no supported root or nested npm/pnpm lockfile was discovered.");

    const selection = runModeSelectionService.select(input.mode as RunMode, descriptors, changedFiles);
    if (selection.selected.some(({ type }) => type === "integration") && !input.integrationBaseUrl) {
      throw new ApiError(422, `${input.mode} mode selected integration checks and requires integrationBaseUrl.`);
    }
    if (selection.selected.some(({ type }) => type === "black-box" || type === "compatibility") && (!input.frontendUrl || !input.dashboardUrl)) {
      throw new ApiError(422, `${input.mode} mode selected browser checks and requires frontendUrl and dashboardUrl.`);
    }
    const details = new Map<string, unknown>();
    const execution = await runModeSelectionService.execute(input.mode as RunMode, descriptors, changedFiles, 1, async (descriptor) => {
      const liveDescriptor = descriptor as LiveDescriptor;
      let result: unknown;
      if (descriptor.type === "unit") {
        result = await (await import("../live-suite.service.js")).liveSuiteService.runUnit(ownerId, { repositoryId: repository.id, suite: liveDescriptor.suite as "password-helpers" | "exported-components" });
        const value = result as { failed: number; execution: { status: string } };
        if (value.failed || value.execution.status !== "COMPLETED") throw new Error(JSON.stringify(result));
      } else if (descriptor.type === "integration") {
        if (!input.integrationBaseUrl) throw new Error("Integration execution requires integrationBaseUrl.");
        result = await (await import("../live-suite.service.js")).liveSuiteService.runIntegration(ownerId, { repositoryId: repository.id, suite: liveDescriptor.suite as "signup-login" | "new-order" | "dashboard-data", baseUrl: input.integrationBaseUrl });
        const value = result as { failed: number; execution: { status: string } };
        if (value.failed || value.execution.status !== "COMPLETED") throw new Error(JSON.stringify(result));
      } else if (descriptor.type === "black-box" || descriptor.type === "compatibility") {
        if (!input.frontendUrl || !input.dashboardUrl) throw new Error("Browser execution requires frontendUrl and dashboardUrl.");
        result = await blackBoxRunService.run(ownerId, { repositoryId: repository.id, frontendUrl: input.frontendUrl, dashboardUrl: input.dashboardUrl }, descriptor.type === "compatibility");
        const value = result as { execution: { failed: number; status: string } };
        if (value.execution.failed || value.execution.status !== "passed") throw new Error(JSON.stringify(result));
      } else {
        if (liveDescriptor.suite === "secrets") {
          const value = await (await import("../live-suite.service.js")).liveSuiteService.runSecurity(ownerId, { repositoryId: repository.id });
          result = value;
          details.set(descriptor.id, compactRunResult(value));
          if (value.findingCount || value.status !== "passed" || value.coverageGaps.length > 0) {
            throw new Error(`${value.findingCount} finding(s); status=${value.status}; coverageGaps=${JSON.stringify(value.coverageGaps)}`);
          }
          return JSON.stringify(compactRunResult(value));
        }
        const value = await security.run(workspace);
        result = value;
        details.set(descriptor.id, compactRunResult(value));
        if (value.status !== "completed" || value.evidence.length > 0) throw new Error(JSON.stringify(value));
      }
      const compact = compactRunResult(result);
      details.set(descriptor.id, compact);
      return JSON.stringify(compact);
    });

    const report = {
      createdAt: new Date().toISOString(), repository: { id: repository.id, name: repository.name }, mode: input.mode, changedFiles, gaps,
      selection: execution.selection.selected.map((descriptor) => ({ ...descriptor, suite: (descriptor as LiveDescriptor).suite })),
      execution: { totals: execution.totals, scheduled: execution.scheduled.map((item) => ({
        descriptor: item.descriptor, status: item.status, error: item.error,
        result: details.get(item.descriptor.id),
      })) },
    };
    const persisted = await this.persistReport(report);
    const response = {
      ...report,
      runId: persisted.reportId,
      report: { id: persisted.reportId, path: path.relative(this.resultsRoot, persisted.reportPath) },
    };
    const failed = execution.totals.failed > 0;
    const status = execution.totals.selected === 0 ? "unknown" : failed ? "failed" : "passed";
    await runRecordService.save({
      repositoryId: repository.id,
      runId: persisted.reportId,
      kind: "run-mode",
      mode: input.mode,
      status,
      result: response,
    });
    return response;
  }
}

export const liveRunModeService = new LiveRunModeService();
