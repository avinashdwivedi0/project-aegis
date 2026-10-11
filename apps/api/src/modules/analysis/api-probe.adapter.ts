import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import fg from "fast-glob";

import { ContainerRunnerService } from "./container-runner.service";
import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

const CONTRACT_FILES = ["openapi.json", "openapi.yaml", "openapi.yml", "swagger.json", "swagger.yaml"];
const SOURCE_FILES = "**/*.{js,cjs,mjs,ts}";
const IGNORED = ["**/.git/**", "**/node_modules/**", "**/vendor/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.venv/**", "**/venv/**", "**/results/**"];
const ROUTE = /\b(?:app|router)\.(get|post|put|patch|delete|head)\s*\(\s*(['"`])([^'"`]+)\2/g;
const ROUTE_PROBE = String.raw`
const endpoints = JSON.parse(process.argv[1]);
const bases = JSON.parse(process.argv[2]);
const timeout = Number(process.argv[3] || 5000);
const config = JSON.parse(process.argv[4] || "null");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  let child;
  let serviceLogs = "";
  let startupError;
  let lastReadinessError = "No readiness request attempted";
  let targetBases = bases;
  try {
    if (config) {
      const startupScript = [
        "const Module = require('node:module');",
        "const entry = process.argv[1];",
        "const originalLoad = Module._load;",
        "Module._load = function(request, parent, isMain) {",
        "  const direct = parent && parent.filename === entry;",
        "  if (direct) console.log('[startup] loading ' + request);",
        "  try { const result = originalLoad.apply(this, arguments); if (direct) console.log('[startup] loaded ' + request); return result; }",
        "  catch (error) { if (direct) console.error('[startup] failed ' + request + ': ' + error); throw error; }",
        "};",
        "require(entry);",
      ].join("\n");
      child = require("node:child_process").spawn("node", ["-e", startupScript, config.entry], {
        cwd: config.cwd,
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: String(config.port),
          ...(config.mongo ? {
            MONGO_URL: "mongodb://mongo:27017/aegis_check",
            MONGO_URI: "mongodb://mongo:27017/aegis_check",
            MONGODB_URI: "mongodb://mongo:27017/aegis_check",
          } : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", (chunk) => { serviceLogs = (serviceLogs + chunk.toString()).slice(-4000); });
      child.stderr.on("data", (chunk) => { serviceLogs = (serviceLogs + chunk.toString()).slice(-4000); });
      child.on("error", (error) => { serviceLogs = (serviceLogs + String(error)).slice(-4000); });
      targetBases = ["http://127.0.0.1:" + config.port];
      let ready = false;
      const deadline = Date.now() + 90000;
      while (!ready && Date.now() < deadline) {
        if (child.exitCode !== null) {
          startupError = "Service exited with " + child.exitCode + ": " + serviceLogs;
          break;
        }
        try {
          const response = await fetch(targetBases[0] + "/", { signal: AbortSignal.timeout(1000) });
          ready = response.status >= 100;
        } catch (error) {
          const cause = error && typeof error === "object" && "cause" in error ? error.cause : undefined;
          const causeDetails = cause && typeof cause === "object"
            ? JSON.stringify({ code: "code" in cause ? cause.code : undefined, message: "message" in cause ? cause.message : undefined })
            : String(cause ?? "");
          lastReadinessError = String(error) + (causeDetails ? " cause=" + causeDetails : "");
        }
        if (!ready) await sleep(300);
      }
      if (!ready && !startupError) {
        startupError = "Service did not open port " + config.port + " within 90 seconds (pid=" + child.pid + ", readiness=" + lastReadinessError + "): " + serviceLogs;
      }
      if (startupError) {
        console.log(JSON.stringify({ startupError, results: [] }));
        return;
      }
    }
    const results = [];
    for (const endpoint of endpoints) {
      let lastError = "No base URL was available";
      let found = false;
      for (const base of targetBases) {
        const url = new URL(endpoint.path, base.endsWith("/") ? base : base + "/").toString();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(url, {
            method: endpoint.method,
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              ...( ["POST", "PUT", "PATCH"].includes(endpoint.method) ? { "Content-Type": "application/json" } : {}),
            },
            ...( ["POST", "PUT", "PATCH"].includes(endpoint.method) ? { body: "{}" } : {}),
          });
          const body = (await response.text()).slice(0, 2048);
          results.push({ endpoint, url, status: response.status, ok: response.status < 500, body });
          found = true;
          break;
        } catch (error) {
          lastError = String(error);
        } finally {
          clearTimeout(timer);
        }
      }
      if (!found) results.push({ endpoint, error: lastError });
    }
    console.log(JSON.stringify({ results }));
  } finally {
    if (child && !child.killed) {
      child.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => child.once("close", resolve)),
        sleep(2000),
      ]);
      if (child.exitCode === null) child.kill("SIGKILL");
    }
  }
};
main().catch((error) => { console.error(error); process.exit(2); });
`;

type Endpoint = { method: string; path: string; file: string; line: number };
type ProbeOutput = { startupError?: string; results?: Array<{ endpoint: Endpoint; url?: string; status?: number; ok?: boolean; body?: string; error?: string }> };
type StartConfig = { cwd: string; entry: string; port: number; mongo: boolean };
const execFileAsync = promisify(execFile);

export class ApiProbeAdapter implements ToolAdapter {
  readonly name = "api-probe";
  readonly version = "docker-openapi-express";

  async canRun(workspace: string): Promise<boolean> {
    return (await this.findEndpoints(workspace)).length > 0;
  }

  async run(workspace: string, signal?: AbortSignal): Promise<ToolAdapterResult> {
    const endpoints = await this.findEndpoints(workspace);
    if (endpoints.length === 0) {
      return { tool: this.name, toolVersion: this.version, status: "skipped", checkStatus: "SKIPPED", projectsScanned: 0, command: [], evidence: [], skippedReason: "No OpenAPI/Swagger contract or supported Express route definitions were found." };
    }

    const bases = await this.findBaseUrls(workspace);
    if (bases.length === 0) {
      return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: [], evidence: [], failureReason: "API endpoints were discovered, but no safe local service startup target or configured contract server was found." };
    }

    let networkName: string | undefined;
    let mongoContainer: string | undefined;
    try {
      let startConfig: StartConfig | undefined;
      if (!process.env.AEGIS_API_PROBE_URL) {
        const discovered = await this.findStartConfig(workspace, endpoints);
        if (discovered.reason) {
          return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: [], evidence: [], failureReason: discovered.reason };
        }
        startConfig = discovered.config;
      }
      if (startConfig?.mongo) {
        networkName = "aegis-api-" + crypto.randomUUID().replaceAll("-", "").slice(0, 16);
        mongoContainer = networkName + "-mongo";
        await execFileAsync("docker", ["network", "create", networkName], { windowsHide: true, timeout: 30_000 });
        await execFileAsync("docker", ["run", "--detach", "--rm", "--name", mongoContainer, "--network", networkName, "--network-alias", "mongo", "--env", "MONGO_INITDB_DATABASE=aegis_check", "mongo:8.0"], { windowsHide: true, timeout: 60_000 });
        const mongoDeadline = Date.now() + 30_000;
        let mongoReady = false;
        while (!mongoReady && Date.now() < mongoDeadline) {
          try {
            const ping = await execFileAsync("docker", ["exec", mongoContainer, "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"], { windowsHide: true, timeout: 5_000 });
            mongoReady = ping.stdout.trim() === "1";
          } catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
        }
        if (!mongoReady) throw new Error("Disposable MongoDB did not become ready within 30 seconds.");
      }
      const execution = await ContainerRunnerService.run({
        command: "node",
        args: ["-e", ROUTE_PROBE, JSON.stringify(endpoints), JSON.stringify(startConfig ? ["http://127.0.0.1:" + startConfig.port] : bases), "5000", JSON.stringify(startConfig ?? null)],
        workspace,
        networkName,
        timeoutMs: Math.min(300_000, Math.max(120_000, endpoints.length * 7_500)),
        signal,
      });
      let report: ProbeOutput;
      try {
        report = JSON.parse(execution.stdout) as ProbeOutput;
        if (report.startupError) {
          return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: ["node", "<docker API service startup>"], execution, evidence: [], failureReason: report.startupError };
        }
        if (!Array.isArray(report.results)) throw new Error("API probe returned an invalid results array.");
      } catch (error) {
        return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: ["node", "<docker API probe>"], execution, evidence: [], failureReason: execution.stderr || `API probe could not start or return JSON: ${error instanceof Error ? error.message : String(error)}` };
      }

      const startupFailures = report.results.filter((result) => result.error);
      const evidence: ToolEvidence[] = report.results.flatMap((result) => {
        if (result.error) return [];
        if ((result.status ?? 0) >= 500 || result.status === 404) return [{ id: crypto.randomUUID(), tool: this.name, toolVersion: this.version, status: "failed" as const, severity: "high" as const, message: `${result.endpoint.method} ${result.endpoint.path} returned HTTP ${result.status}.`, filePath: result.endpoint.file, lineStart: result.endpoint.line, code: `HTTP_${result.status}` }];
        return [];
      });
      if (evidence.length === 0) evidence.push(createCompletionEvidence(this.name, this.version, `Probed ${report.results.length} discovered API endpoint(s) in Docker.`));
      const failed = execution.status !== "COMPLETED" || startupFailures.length > 0;
      return {
        tool: this.name,
        toolVersion: this.version,
        status: failed ? "failed" : "completed",
        checkStatus: failed ? "FAILED" : evidence.some((item) => item.filePath) ? "FINDINGS" : "PASSED",
        projectsScanned: 1,
        failureReason: failed ? execution.stderr || (startupFailures.length > 0 ? `No local service could be started/reached on the discovered ports: ${startupFailures.map((item) => `${item.endpoint.path}: ${item.error}`).join("; ")}` : `API probe exited with ${execution.status}.`) : undefined,
        command: ["node", "<docker API probe>", `${endpoints.length} endpoints`],
        execution,
        evidence,
      };
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : String(error);
      return { tool: this.name, toolVersion: this.version, status: "failed", checkStatus: "FAILED", projectsScanned: 0, command: ["node", "<docker API probe>"], evidence: [], failureReason };
    } finally {
      if (mongoContainer) await execFileAsync("docker", ["rm", "--force", mongoContainer], { windowsHide: true, timeout: 10_000 }).catch(() => undefined);
      if (networkName) await execFileAsync("docker", ["network", "rm", networkName], { windowsHide: true, timeout: 10_000 }).catch(() => undefined);
    }
  }

  private async findStartConfig(workspace: string, endpoints: Endpoint[]): Promise<{ config?: StartConfig; reason?: string }> {
    const routeFile = endpoints.find((endpoint) => /\.(?:js|cjs|mjs)$/.test(endpoint.file))?.file;
    if (!routeFile) return {};
    const workspaceRoot = path.resolve(workspace);
    let directory = path.resolve(workspaceRoot, path.dirname(routeFile));
    while (directory === workspaceRoot || directory.startsWith(workspaceRoot + path.sep)) {
      try {
        const manifest = JSON.parse(await fs.readFile(path.join(directory, "package.json"), "utf8")) as { main?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
        const mongo = Boolean(dependencies.mongoose || dependencies.mongodb);
        const unsupportedDatabase = ["pg", "mysql", "mysql2", "mariadb", "sequelize", "@prisma/client"].some((name) => dependencies[name]);
        if (unsupportedDatabase && !mongo) {
          return { reason: "The discovered API uses a database stack without an isolated disposable runner; startup was refused." };
        }
        const source = await fs.readFile(path.join(workspaceRoot, routeFile), "utf8").catch(() => "");
        const defaultPort = Number(source.match(/\bPORT\s*=\s*process\.env\.PORT\s*\|\|\s*(\d+)/)?.[1] ?? 3000);
        for (const entry of [manifest.main, "index.js", "server.js", "app.js"].filter((value): value is string => Boolean(value))) {
          const absoluteEntry = path.resolve(directory, entry);
          if (absoluteEntry !== directory && !absoluteEntry.startsWith(directory + path.sep)) continue;
          try {
            await fs.access(absoluteEntry);
            const projectRelative = path.relative(workspaceRoot, directory).split(path.sep).join("/");
            const entryRelative = path.relative(workspaceRoot, absoluteEntry).split(path.sep).join("/");
            return { config: { cwd: path.posix.join("/workspace", projectRelative), entry: path.posix.join("/workspace", entryRelative), port: defaultPort, mongo } };
          } catch { /* Try the next conventional entrypoint. */ }
        }
        return { reason: "An API package manifest was found, but no JavaScript main/index/server/app entrypoint could be started safely." };
      } catch { /* Walk to a parent package manifest. */ }
      if (directory === workspaceRoot) break;
      directory = path.dirname(directory);
    }
    return {};
  }

  private async findEndpoints(workspace: string): Promise<Endpoint[]> {
    const contracts = await fg(CONTRACT_FILES.flatMap((file) => [file, `**/${file}`]), { cwd: workspace, onlyFiles: true, ignore: IGNORED, suppressErrors: true });
    const endpoints: Endpoint[] = [];
    for (const contract of contracts) {
      if (!contract.endsWith(".json")) continue;
      try {
        const document = JSON.parse(await fs.readFile(path.join(workspace, contract), "utf8")) as { paths?: Record<string, Record<string, unknown>> };
        for (const [route, operations] of Object.entries(document.paths ?? {})) {
          for (const method of Object.keys(operations)) {
            if (["get", "post", "put", "patch", "delete", "head"].includes(method.toLowerCase())) endpoints.push({ method: method.toUpperCase(), path: route, file: contract, line: 1 });
          }
        }
      } catch { /* Malformed contracts are ignored; source discovery can still succeed. */ }
    }
    const files = await fg(SOURCE_FILES, { cwd: workspace, onlyFiles: true, ignore: IGNORED, suppressErrors: true });
    for (const file of files) {
      const content = await fs.readFile(path.join(workspace, file), "utf8").catch(() => "");
      ROUTE.lastIndex = 0;
      for (const match of content.matchAll(ROUTE)) endpoints.push({ method: match[1].toUpperCase(), path: match[3], file: file.replaceAll("\\", "/"), line: content.slice(0, match.index ?? 0).split(/\r?\n/).length });
    }
    const deduped = new Map<string, Endpoint>();
    for (const endpoint of endpoints) deduped.set(`${endpoint.method} ${endpoint.path} ${endpoint.file}`, endpoint);
    return [...deduped.values()];
  }

  private async findBaseUrls(workspace: string): Promise<string[]> {
    const configured = process.env.AEGIS_API_PROBE_URL;
    if (configured) return [configured];
    const contracts = await fg(CONTRACT_FILES.flatMap((file) => [file, `**/${file}`]), { cwd: workspace, onlyFiles: true, ignore: IGNORED, suppressErrors: true });
    for (const contract of contracts) {
      if (!contract.endsWith(".json")) continue;
      try {
        const document = JSON.parse(await fs.readFile(path.join(workspace, contract), "utf8")) as { servers?: Array<{ url?: string }> };
        const url = document.servers?.find((server) => server.url)?.url;
        if (url) return [url.replace(/\blocalhost\b|\b127\.0\.0\.1\b/, "host.docker.internal")];
      } catch { /* Try another contract or local service defaults. */ }
    }
    // Never make a hand-entered URL a prerequisite. The conventional service
    // port is a bounded local fallback; connection refusal becomes FAILED.
    return ["http://host.docker.internal:3000"];
  }
}
