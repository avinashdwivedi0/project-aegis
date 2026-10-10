import crypto from "node:crypto";
import fg from "fast-glob";

import { ContainerRunnerService } from "./container-runner.service";
import { projectDiscoveryService } from "./project-discovery.service";
import {
  createCompletionEvidence,
  type ToolAdapter,
  type ToolAdapterResult,
  type ToolEvidence,
} from "./tool-adapter.types";

const PYTHON_SYNTAX_CHECK = [
  "import json, os, pathlib, py_compile, sys",
  "ignored = {'.git', '.venv', 'venv', '__pycache__', 'site-packages', 'node_modules', 'build', 'dist', '.next', 'coverage'}",
  "files = []",
  "for root, directories, names in os.walk('.'):",
  " directories[:] = [name for name in directories if name not in ignored]",
  " files.extend(pathlib.Path(root) / name for name in names if name.endswith('.py'))",
  "issues = []",
  "for index, file in enumerate(files):",
  " try:",
  "  py_compile.compile(str(file), cfile=f'/tmp/aegis-syntax-{index}.pyc', doraise=True)",
  " except py_compile.PyCompileError as error:",
  "  syntax = error.exc_value",
  "  issues.append({'file': file.as_posix(), 'line': getattr(syntax, 'lineno', None), 'message': str(syntax)})",
  " except (UnicodeError, OSError) as error:",
  "  issues.append({'file': file.as_posix(), 'line': None, 'message': str(error)})",
  "print(json.dumps({'files': len(files), 'issues': issues}))",
  "sys.exit(1 if issues else 0)",
].join("\n");

type SyntaxReport = { files?: number; issues?: Array<{ file?: string; line?: number | null; message?: string }> };

export class PythonSyntaxAdapter implements ToolAdapter {
  readonly name = "python-syntax";
  readonly version = "python-py_compile";

  async canRun(workspace: string): Promise<boolean> {
    return (await this.findFiles(workspace)).length > 0;
  }

  async run(workspace: string, signal?: AbortSignal): Promise<ToolAdapterResult> {
    const files = await this.findFiles(workspace);
    if (files.length === 0) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "skipped",
        checkStatus: "SKIPPED",
        projectsScanned: 0,
        command: [],
        evidence: [],
        skippedReason: "No Python source files were found.",
      };
    }

    let execution;
    try {
      execution = await ContainerRunnerService.run({
        command: "python",
        args: ["-c", PYTHON_SYNTAX_CHECK],
        workspace,
        image: "python:3.12-alpine",
        signal,
      });
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : String(error);
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "failed",
        checkStatus: "FAILED",
        projectsScanned: 0,
        command: ["python", "-m", "py_compile"],
        evidence: [],
        failureReason,
      };
    }

    let report: SyntaxReport;
    try {
      report = JSON.parse(execution.stdout) as SyntaxReport;
      if (!Array.isArray(report.issues)) throw new Error("Python syntax checker returned no issues array.");
    } catch (error) {
      const failureReason = execution.stderr || `py_compile diagnostic parsing failed (${execution.status}, exit ${execution.exitCode}): ${error instanceof Error ? error.message : String(error)}`;
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "failed",
        checkStatus: "FAILED",
        projectsScanned: 0,
        command: ["python", "-m", "py_compile"],
        execution,
        evidence: [],
        failureReason,
      };
    }

    const evidence: ToolEvidence[] = (report.issues ?? []).map((issue) => ({
      id: crypto.randomUUID(),
      tool: this.name,
      toolVersion: this.version,
      status: "failed",
      severity: "high",
      message: issue.message ?? "Python syntax compilation failed.",
      filePath: issue.file?.replaceAll("\\", "/"),
      lineStart: issue.line ?? undefined,
      code: "PY_COMPILE",
    }));
    if (execution.status !== "COMPLETED" && evidence.length === 0) {
      return {
        tool: this.name,
        toolVersion: this.version,
        status: "failed",
        checkStatus: "FAILED",
        projectsScanned: 0,
        command: ["python", "-m", "py_compile"],
        execution,
        evidence,
        failureReason: execution.stderr || `Python syntax checker exited with ${execution.status}.`,
      };
    }
    if (evidence.length === 0) evidence.push(createCompletionEvidence(this.name, this.version, `py_compile checked ${report.files ?? files.length} Python file(s).`));
    const projectRoots = await projectDiscoveryService.discover(workspace);
    const pythonProjects = projectRoots.filter((project) =>
      files.some((file) => project.relativeRoot === "." || file.startsWith(`${project.relativeRoot}/`)),
    );

    return {
      tool: this.name,
      toolVersion: this.version,
      status: "completed",
      checkStatus: evidence.some((item) => item.code === "PY_COMPILE") ? "FINDINGS" : "PASSED",
      projectsScanned: Math.max(1, pythonProjects.length),
      command: ["python", "-m", "py_compile"],
      execution,
      evidence,
    };
  }

  private async findFiles(workspace: string): Promise<string[]> {
    return fg("**/*.py", {
      cwd: workspace,
      onlyFiles: true,
      ignore: ["**/.git/**", "**/.venv/**", "**/venv/**", "**/site-packages/**", "**/node_modules/**", "**/__pycache__/**", "**/build/**", "**/dist/**", "**/.next/**", "**/coverage/**"],
      suppressErrors: true,
    });
  }
}
