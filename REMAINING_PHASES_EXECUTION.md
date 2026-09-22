# Remaining Phases Execution Plan

## Purpose

This document is the execution order for the remaining Project Aegis MVP work. Each phase is completed only after its exit gate passes. Work proceeds one phase at a time; later phases must not hide failures in earlier foundations.

## Operating rules

1. Deterministic tools produce evidence; agents interpret, prioritize, and explain it.
2. Every agent receives typed input and returns typed output.
3. Agents do not write directly to the repository or database.
4. Every finding must include evidence, source location, severity, confidence, and a reproducible run reference.
5. Every repair must be validated before it is marked successful.
6. Cloud AI calls are bounded, retriable, observable, and replaceable by another provider.
7. A phase is `DONE` only when its executable validation and documentation gate pass.

## Phase order

### Phase 1 - Agent platform foundation (current)

**Goal:** Establish the contracts, registry, provider boundary, and execution lifecycle that every specialized agent will use.

**Deliverables:**

- Versioned agent input/output schemas.
- Agent role registry and capability metadata.
- Provider interface with Gemini implementation and local-provider seam.
- Agent execution service with status, timeout, retry, and structured failure handling.
- Evidence and finding normalization contracts.
- Prompt template versioning and model metadata capture.
- Unit tests for schema validation, registry lookup, provider errors, and execution status transitions.

**Agent sequence:**

1. Project Analyzer
2. Code Quality Agent
3. Security Agent
4. Dependency Agent
5. Test Agent
6. API Agent
7. UI/Accessibility Agent
8. Performance Agent
9. Repair Agent
10. Report Agent

**Exit gate:** One registered agent can receive validated evidence, call a provider, return a validated structured result, and record failure without crashing the API.

### Phase 2 - Ingestion and workspace safety

**Goal:** Make ZIP and Git ingestion reproducible and isolated.

**Deliverables:** safe extraction, path traversal protection, repository discovery, workspace cleanup, import progress, and ingestion tests.

**Exit gate:** A benchmark repository can be imported twice with equivalent file manifests and no files escape its workspace.

### Phase 3 - Analysis jobs and deterministic tool runner

**Goal:** Create durable analysis runs and execute tools in a controlled workspace.

**Deliverables:** analysis job schema, queue/orchestrator, tool command allowlist, process timeout/resource limits, evidence storage, progress events, and cancellation.

**Exit gate:** A run can be started, observed, completed, cancelled, or failed with all tool output linked to the run.

### Phase 4 - Deterministic quality integrations

**Goal:** Produce trustworthy machine-generated evidence before AI interpretation.

**Deliverables:** project discovery, linting, type checking, dependency audit, security scanning, test discovery/execution, API probes, browser/accessibility checks, and performance measurements.

**Exit gate:** At least one supported benchmark produces normalized evidence for each enabled tool, including failures and empty results.

### Phase 5 - Specialized agent workflows

**Goal:** Implement the ten agents against the Phase 1 contracts.

**Deliverables:** role prompts, evidence selection, confidence rules, finding deduplication, prioritization, agent trace metadata, and agent-specific tests.

**Exit gate:** Each enabled agent returns schema-valid output against fixture evidence, and unsupported project types produce an explicit skipped result.

### Phase 6 - Findings, scores, and progress UX

**Goal:** Turn runs into a usable review workflow.

**Deliverables:** findings API, filters, severity/confidence display, quality score calculation, live progress UI, finding details, evidence viewer, and empty/error/loading states.

**Exit gate:** A user can start a run, watch progress, inspect a finding, and trace it back to source evidence.

### Phase 7 - Repair and validation

**Goal:** Generate small, reviewable repairs and prove whether they work.

**Deliverables:** context retrieval, patch generation, diff viewer, sandbox application, test reruns, validation records, approval/rejection lifecycle, and rollback.

**Exit gate:** A fixture finding produces a minimal patch, the patch is applied only in a sandbox, and validation records pass or fail with evidence.

### Phase 8 - Reporting and GitHub workflow

**Goal:** Complete the developer delivery loop.

**Deliverables:** report aggregation/export, commit/ref capture, branch workflow, pull request creation, review summary, and audit trail.

**Exit gate:** A completed run produces a reproducible report and an approved repair can be submitted as a reviewable GitHub change.

### Phase 9 - Evaluation and final deliverables

**Goal:** Measure the system and prepare the final-year submission.

**Deliverables:** benchmark suite, baseline comparison, AI pipeline metrics, false-positive analysis, repair success rate, limitations, final report, research paper, diagrams, demo script, presentation, and viva notes.

**Exit gate:** Results are reproducible from documented commands and every claim has supporting evidence.

## Agent implementation contract

Every agent must implement:

- `id`, `version`, `capabilities`, and supported project types.
- Input schema: project profile, evidence references, prompt version, and run metadata.
- Output schema: findings, recommendations, confidence, citations, skipped reasons, and execution metadata.
- Explicit timeout and provider error behavior.
- No direct filesystem mutation or arbitrary command execution.
- Deterministic fixture tests for valid, empty, malformed, timeout, and provider-failure cases.

## Current execution checklist

- [x] Identify current roadmap and agent specification.
- [x] Confirm provider model and embedding compatibility.
- [x] Add versioned agent contracts.
- [x] Add agent registry.
- [x] Add provider interface and provider error types.
- [x] Add guarded agent executor with timeout and structured failures.
- [x] Add first Project Analyzer execution path.
- [x] Add Phase 1 tests and exit-gate command.
- [x] Add deterministic workspace scanning and ZIP ingestion pipeline.
- [x] Add Phase 2 ingestion safety check for repeatable manifests and path traversal.
- [x] Add server-managed multipart ZIP upload handling and temporary archive cleanup.
- [x] Update `WORK_STATUS.md` after each completed phase.
- [x] Add a versioned Phase 9 benchmark manifest and deterministic metric fixture.
- [x] Add seeded local benchmark fixtures with controlled ground-truth issues.
- [x] Add benchmark metadata and fixture-path validation.
- [x] Add authenticated pull-request creation for validated repair branches.
- [x] Capture deterministic baseline command outcomes for seeded fixtures.
- [x] Add and execute the local Ollama AI benchmark runner with failure capture.
- [x] Analyze recorded baseline and AI outcomes without fabricating metrics.
- [x] Resolve the Ollama structured-output failure for the quality fixture.
- [x] Run the Ollama Dependency Agent and generate a scoped comparative report.
- [x] Run the Ollama Test Agent and complete two-fixture detection coverage.
- [x] Measure one controlled repair's validation and regression outcome.
- [x] Create evidence-grounded working drafts for report, paper, demo, and viva preparation.
- [x] Add an executable Phase 9 evaluation gate for detection and repair metrics.
- [ ] Run the benchmark against pinned target repositories and record raw results.
- [ ] Produce the final report, research paper, presentation, demo script, and viva notes.

## Phase transition record

| Phase | Status | Evidence |
|---|---|---|
| 1. Agent platform foundation | DONE | `pnpm --dir apps/api check:phase1` passes |
| 2. Ingestion and workspace safety | DONE | `check:phase2` and `check:phase2:integration` pass; equivalent ZIP imports persist identical manifests |
| 3. Analysis jobs and tool runner | DONE | Durable database queue, crash recovery, tool evidence, Docker isolation, ordered events, atomic claims, and lease heartbeats pass |
| 4. Deterministic integrations | IN_PROGRESS | All eight adapters are registry-integrated and pass focused checks; benchmark-wide execution remains |
| 5. Specialized agents | DONE | All ten specialized Agent services pass their focused schema and skipped-evidence gates |
| 6. Findings and UX | DONE | Findings, score, evidence, progress, detail, diff, repair, report, and preferences workflows pass focused checks |
| 7. Repair and validation | DONE | Repair lifecycle, sandbox validation, approval, branch, commit, rejection, and regression checks pass |
| 8. Reporting and GitHub | DONE | Owner-scoped reports, Markdown export, report history, and repair branch/commit workflow pass focused checks |
| 9. Evaluation and deliverables | IN_PROGRESS | Versioned benchmark manifest and deterministic metric gate exist; pinned benchmark runs and academic deliverables remain |
