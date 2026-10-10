import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { ContainerRunnerService } from "../analysis/container-runner.service.js";
import { exportedComponentGenerator } from "./unit/exported-component.generator.js";
import { javascriptUnitDiscoveryService } from "./unit/javascript-unit-discovery.service.js";
import { passwordCharacterizationGenerator } from "./unit/password-characterization.generator.js";
import type { CharacterizationBaseline, JavaScriptUnitTarget } from "./unit/unit.types.js";
import { javascriptRouteDiscoveryService } from "./integration/javascript-route-discovery.service.js";
import { orderIntegrationGenerator } from "./integration/order-integration.generator.js";
import { signupIntegrationGenerator } from "./integration/signup-integration.generator.js";
import { dashboardDataIntegrationGenerator } from "./integration/dashboard-data.integration.generator.js";
import { repositorySecretScanService } from "./security/repository-secret-scan.service.js";
import { DependencyAuditAdapter } from "../analysis/dependency-audit.adapter.js";
import { runRecordService } from "./run-history/run-record.service.js";
import type { IntegrationRunInput, SecurityRunInput, UnitRunInput } from "./live-suite.types.js";

type SuiteKind = "unit" | "integration";

function counts(stdout: string) {
  const value = (name: string) => Number(stdout.match(new RegExp(`# ${name} (\\d+)`, "i"))?.[1] ?? 0);
  return { total: value("tests"), passed: value("pass"), failed: value("fail"), skipped: value("skipped") };
}

export class LiveSuiteService {
  private readonly resultsRoot = path.resolve(process.cwd(), "results", "autonomous-testing");

  private async workspace(ownerId: string, repositoryId: string) {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, project: { ownerId } },
      select: { id: true, name: true, workspacePath: true },
    });
    if (!repository) throw new ApiError(404, "Repository not found or access denied.");
    if (!repository.workspacePath) throw new ApiError(409, "This repository's workspace is missing or was not imported correctly — try re-importing it.");
    return repository;
  }

  async runUnit(ownerId: string, input: UnitRunInput) {
    const repository = await this.workspace(ownerId, input.repositoryId);
    const runId = `autonomous-unit-${crypto.randomUUID()}`;
    let generatedTest: string;
    let targetFiles: Array<{ file: string; targets: unknown[] }>;

    if (input.suite === "password-helpers") {
      const sourceFile = "backend/index.js";
      let targets: JavaScriptUnitTarget[];
      try { targets = await javascriptUnitDiscoveryService.discoverFile(repository.workspacePath!, sourceFile); }
      catch { throw new ApiError(422, `Supported source file ${sourceFile} was not found or could not be parsed.`); }
      const selected = targets.filter(({ name }) => name === "hashPassword" || name === "verifyPassword");
      let baseline: CharacterizationBaseline;
      try {
        baseline = JSON.parse(await fs.readFile(path.resolve(process.cwd(), "results/phase1-unit-baseline.json"), "utf8")) as CharacterizationBaseline;
      } catch {
        throw new ApiError(503, "The captured password characterization baseline is unavailable on this API instance.");
      }
      try { generatedTest = passwordCharacterizationGenerator.generate(selected, baseline); }
      catch (error) { throw new ApiError(422, error instanceof Error ? error.message : "Password helper behavior could not be characterized."); }
      targetFiles = [{ file: sourceFile, targets: selected.map(({ name, lineStart, lineEnd, confidence }) => ({ name, lineStart, lineEnd, confidence })) }];
    } else {
      const selections = [
        { filePath: "dashboard/src/components/DoughnoutChart.js", name: "DoughnutChart", behavior: "doughnut-chart" as const },
        { filePath: "dashboard/src/components/VerticalGraph.js", name: "VerticalGraph", behavior: "vertical-graph" as const },
        { filePath: "frontend/src/landing_page/home/Hero.js", name: "Hero", behavior: "landing-hero" as const },
      ];
      const candidates = await Promise.all(selections.map(async (selection) => {
        let targets: JavaScriptUnitTarget[];
        try { targets = await javascriptUnitDiscoveryService.discoverFile(repository.workspacePath!, selection.filePath); }
        catch { throw new ApiError(422, `Supported component source ${selection.filePath} was not found or could not be parsed.`); }
        const target = targets.find(({ name }) => name === selection.name);
        if (!target) throw new ApiError(422, `Supported exported component ${selection.name} was not found at ${selection.filePath}.`);
        try { return { target, source: await fs.readFile(path.join(repository.workspacePath!, selection.filePath), "utf8"), behavior: selection.behavior }; }
        catch { throw new ApiError(422, `Supported component source ${selection.filePath} could not be read.`); }
      }));
      generatedTest = exportedComponentGenerator.generate(candidates);
      targetFiles = candidates.map(({ target }) => ({ file: target.filePath, targets: [{ name: target.name, lineStart: target.lineStart, lineEnd: target.lineEnd, confidence: target.confidence }] }));
    }

    const runDirectory = path.join(this.resultsRoot, runId);
    await fs.mkdir(runDirectory, { recursive: true });
    const testPath = path.join(runDirectory, "generated.test.cjs");
    await fs.writeFile(testPath, generatedTest, "utf8");
    const execution = await ContainerRunnerService.run({
      command: "node", args: ["--test", "/generated/generated.test.cjs"], workspace: repository.workspacePath!,
      writableMounts: [{ hostPath: runDirectory, containerPath: "/generated" }], timeoutMs: 90_000, maxOutputBytes: 1_000_000,
    });
    const summary = counts(execution.stdout);
    const result = { runId, repository: { id: repository.id, name: repository.name }, type: "unit" as const, suite: input.suite, status: execution.status === "COMPLETED" && summary.failed === 0 ? "passed" : "failed", targetFiles, generatedTest: { path: "generated.test.cjs", content: generatedTest }, execution, ...summary };
    await fs.writeFile(path.join(runDirectory, "run.json"), JSON.stringify(result, null, 2));
    await runRecordService.save({ repositoryId: repository.id, runId, kind: "unit", suite: input.suite, status: result.status, result });
    return result;
  }

  async runIntegration(ownerId: string, input: IntegrationRunInput) {
    const repository = await this.workspace(ownerId, input.repositoryId);
    let discovery;
    try { discovery = await javascriptRouteDiscoveryService.discover(repository.workspacePath!); }
    catch (error) { throw new ApiError(422, error instanceof Error ? error.message : "Repository routes could not be discovered."); }
    let generatedTest: string;
    const selectedRoutes = input.suite === "signup-login"
      ? discovery.routes.filter((route) => ["/signup", "/login"].includes(route.path))
      : input.suite === "new-order"
        ? discovery.routes.filter((route) => route.path === "/newOrder")
        : discovery.routes.filter((route) => ["/addHoldings", "/addPositions", "/allHoldings", "/allPositions", "/forgot-password"].includes(route.path));
    const selectedRouteKeys = new Set(selectedRoutes.map((route) => `${route.method} ${route.path}`));
    try {
      generatedTest = input.suite === "signup-login"
        ? signupIntegrationGenerator.generate(discovery.routes, input.baseUrl)
        : input.suite === "new-order"
          ? orderIntegrationGenerator.generate(discovery.routes, input.baseUrl)
          : dashboardDataIntegrationGenerator.generate(discovery.routes, input.baseUrl);
    } catch (error) {
      throw new ApiError(422, error instanceof Error ? error.message : "No supported integration boundary was found.");
    }

    const runId = `autonomous-integration-${crypto.randomUUID()}`;
    const runDirectory = path.join(this.resultsRoot, runId);
    await fs.mkdir(runDirectory, { recursive: true });
    await fs.writeFile(path.join(runDirectory, "generated.test.cjs"), generatedTest, "utf8");
    const execution = await ContainerRunnerService.run({
      command: "node", args: ["--test", "/generated/generated.test.cjs"], workspace: repository.workspacePath!,
      writableMounts: [{ hostPath: runDirectory, containerPath: "/generated" }],
      environment: { BASE_URL: input.baseUrl }, timeoutMs: 90_000, maxOutputBytes: 1_000_000,
    });
    const summary = counts(execution.stdout);
    const result = {
      runId, repository: { id: repository.id, name: repository.name }, type: "integration" as const,
      status: execution.status === "COMPLETED" && summary.failed === 0 ? "passed" : "failed",
      suite: input.suite, contractKind: discovery.contractKind, contractFiles: discovery.contractFiles,
      routeCoverage: {
        covered: selectedRoutes.length,
        discovered: discovery.routes.length,
        uncovered: discovery.routes.filter((route) => !selectedRouteKeys.has(`${route.method} ${route.path}`)).map(({ method, path: routePath }) => `${method} ${routePath}`),
      },
      discoveredRoutes: selectedRoutes.map(({ handlerSource: _handlerSource, ...route }) => route),
      generatedTest: { path: "generated.test.cjs", content: generatedTest }, execution, ...summary,
    };
    await fs.writeFile(path.join(runDirectory, "run.json"), JSON.stringify(result, null, 2));
    await runRecordService.save({ repositoryId: repository.id, runId, kind: "integration", suite: input.suite, status: result.status, result });
    return result;
  }

  async runSecurity(ownerId: string, input: SecurityRunInput) {
    const repository = await this.workspace(ownerId, input.repositoryId);
    const scan = await repositorySecretScanService.scan(repository.workspacePath!);
    const dependencyAudit = new DependencyAuditAdapter();
    const coverageGaps: string[] = [];
    let dependencyResult;
    if (await dependencyAudit.canRun(repository.workspacePath!)) {
      try {
        dependencyResult = await dependencyAudit.run(repository.workspacePath!);
      } catch (error) {
        dependencyResult = {
          status: "failed" as const,
          evidence: [],
          error: error instanceof Error ? error.message : String(error),
        };
      }
      if (dependencyResult.status === "failed") {
        coverageGaps.push(`Dependency audit could not complete: ${"error" in dependencyResult ? dependencyResult.error : "the package manager did not return a valid audit report."}`);
      }
    } else {
      dependencyResult = { status: "skipped" as const, evidence: [] };
      coverageGaps.push("Dependency audit skipped: no supported root or nested pnpm/npm lockfile was found.");
    }

    const dependencyFindings = dependencyResult.evidence.map((finding) => ({
      ruleId: finding.code ?? "dependency-vulnerability",
      severity: finding.severity ?? "info",
      filePath: finding.packageName ?? "dependency lockfile",
      line: 0,
      message: finding.message,
    }));
    const findings = [
      ...scan.findings,
      ...dependencyFindings,
    ];
    const runId = `autonomous-security-${crypto.randomUUID()}`;
    const runDirectory = path.join(this.resultsRoot, runId);
    await fs.mkdir(runDirectory, { recursive: true });
    const result = {
      runId, repository: { id: repository.id, name: repository.name }, type: "security" as const, suite: "secrets",
      status: findings.length || dependencyResult.status === "failed"
        ? "failed" as const
        : dependencyResult.status === "skipped" ? "partial" as const : "passed" as const,
      scannedFiles: scan.scannedFiles,
      findingCount: findings.length,
      findings,
      checks: [
        { name: "source-secrets", status: scan.status, coverage: `${scan.scannedFiles} source files` },
        { name: "dependency-audit", status: dependencyResult.status, packages: dependencyResult.evidence.length },
      ],
      coverageGaps,
    };
    await fs.writeFile(path.join(runDirectory, "run.json"), JSON.stringify(result, null, 2));
    await runRecordService.save({ repositoryId: repository.id, runId, kind: "security", suite: "secrets", status: result.status, result });
    return result;
  }
}

export const liveSuiteService = new LiveSuiteService();
