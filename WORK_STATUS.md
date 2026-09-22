# Work Status

> This file is the source of truth for project progress. Update it after
> every meaningful implementation session.

## Status legend

-   `DONE` --- Implemented and verified.
-   `IN_PROGRESS` --- Currently being implemented.
-   `BLOCKED` --- Cannot continue until a dependency/decision is
    resolved.
-   `PENDING` --- Planned but not started.
-   `DEFERRED` --- Intentionally moved outside the current release.

## Current state

**Project:** AI Software Quality Platform\
**Release:** Version 1 --- Final-Year MVP\
**Overall status:** IN_PROGRESS\
**Current phase:** Final academic delivery and benchmark validation\
**Implementation status:** Core phases 1–6 are implemented and validated; remaining work is final benchmarking, reporting, presentation, and viva preparation.

## Completed

### Product definition

-   [x] Standalone AI software quality assurance project selected.
-   [x] Software generation intentionally excluded from Version 1.
-   [x] Future integration with an AI software generator reserved for
    later versions.

### Documentation baseline

-   [x] PRD created.
-   [x] SRS created.
-   [x] Architecture specification created.
-   [x] Security/threat model created.
-   [x] AI agent specification created.
-   [x] Testing/evaluation strategy created.
-   [x] Development roadmap created.
-   [x] Work tracking document created.

## Pending

### Architecture

-   [ ] Finalize technology versions.
-   [ ] Finalize database schema.
-   [ ] Finalize API contracts.
-   [ ] Finalize job/event schemas.
-   [ ] Finalize sandbox policy.

### Backend

-   [ ] Repository initialization.
-   [ ] Authentication.
-   [ ] Project management.
-   [ ] Analysis orchestration.
-   [ ] Sandbox runner.
-   [ ] Evidence storage.
-   [ ] Findings service.
-   [ ] Repair service.
-   [ ] Report service.

### Frontend

-   [x] Application shell and initial professional visual system.
-   [ ] Authentication UI.
-   [x] Project dashboard initial surface.
-   [x] Project ingestion UI, including one-step GitHub repository connection.
-   [ ] Analysis progress UI.
-   [ ] Findings dashboard.
-   [ ] Finding details.
-   [ ] Diff viewer.
-   [ ] Report viewer.

### AI

-   [x] Requirement Analyst Agent (Feature 1)
-   [ ] AI provider abstraction.
-   [x] Local Ollama integration.
-   [ ] Model selection strategy.
-   [ ] Project Analyzer.
-   [ ] Code Quality Agent.
-   [ ] Security Agent.
-   [ ] Dependency Agent.
-   [ ] Test Agent.
-   [ ] API Agent.
-   [ ] UI/Accessibility Agent.
-   [ ] Performance Agent.
-   [ ] Repair Agent.
-   [ ] Report Agent.

### Tool integrations

-   [ ] Linter integration.
-   [ ] Type checker integration.
-   [ ] Dependency scanner.
-   [ ] Security scanner.
-   [ ] Test runner.
-   [ ] Browser automation.
-   [ ] Accessibility scanner.
-   [ ] Performance measurement.

### Validation

-   [x] Versioned benchmark manifest and seeded evaluation fixture.
-   [ ] Unit tests.
-   [ ] Integration tests.
-   [ ] End-to-end tests.
-   [ ] Security tests.
-   [ ] Repair regression tests.
-   [ ] Research evaluation on pinned target repositories.

### Final deliverables

-   [ ] Final report.
-   [ ] Research paper.
-   [ ] Presentation.
-   [ ] Demo script.
-   [ ] Viva preparation.

### 2026-09-22

-   Implemented Feature 1 of the Katalon-style testing workflow: an
    authenticated Requirement Analyst endpoint at
    `POST /api/requirements/analyze` with an external versioned prompt,
    Zod-validated scenario output, provider injection, and focused unit
    tests. Test Designer implementation remains pending review.

## Change log

### 2026-08-17

-   Project direction finalized as a standalone AI Software Quality
    Assurance and Self-Healing platform.
-   Website/application generation excluded from Version 1.
-   Documentation baseline established for Claude Code-assisted
    development.

### 2026-08-24

-   Audited implementation status against the repository; existing routed
    frontend and API modules were found beyond the original documentation
    baseline.
-   Added a professional light visual system for the public landing shell,
    dashboard shell, navigation, dashboard cards, and primary controls.
-   Frontend visual changes pass the Vite production bundle; TypeScript and
    lint validation remain blocked by existing chat component prop and hook
    issues.
-   Fixed the dashboard repository action route and connected GitHub import to
    repository creation with provider-specific URL validation.
-   Fixed the backend GitHub import clone path by letting Git create the target
    directory instead of pre-creating an empty folder that can fail clone
    operations, and normalized trailing-slash repository URLs before validation.
-   Verified the import path with a real GitHub clone using the project service.
-   Added `REMAINING_PHASES_EXECUTION.md` with sequential MVP phases, exit
    gates, and an agent-first implementation track.
-   Added versioned typed agent contracts and a registry for the ten planned
    specialized agents; the focused TypeScript validation passes.
-   Added the provider interface, Gemini provider adapter, and guarded agent
    executor with timeout and structured provider failure handling; focused
    typecheck and executor smoke test pass.
-   Added the deterministic Project Analyzer, which profiles languages,
    frameworks, package managers, commands, entry points, and file counts;
    real web-workspace smoke test passes.
-   Completed the Phase 1 agent foundation gate with a repeatable check for
    registry completeness, contract validation, executor success/failure,
    and Project Analyzer behavior.
-   Started Phase 2 with a workspace-bound path resolver and protected
    explorer file reads against path traversal; focused TypeScript and runtime
    traversal checks pass.
-   Implemented bounded ZIP extraction with entry-count and uncompressed-size
    limits, absolute/traversal path rejection, and cleanup on extraction
    failure; valid extraction and path-guard checks pass.
-   Connected repository deletion to imported workspace cleanup with
    best-effort filesystem handling; focused repository-service typecheck
    passes.
-   Frontend TypeScript build and ESLint now pass.
-   Completed the ZIP import pipeline and made repository file scanning
    deterministic for repeatable manifests.
-   Added the Phase 2 ingestion check covering equivalent archive manifests
    and workspace traversal rejection; it passes with
    `pnpm --dir apps/api check:phase2`.
-   Added the multipart ZIP upload boundary with a 100 MB limit, server-side
    temporary filenames, archive filtering, and cleanup after import.
-   Updated the web import service to send ZIP archives using the API contract.
-   Added a database-backed Phase 2 import check that compares persisted
    manifests across equivalent ZIP imports.
-   Completed Phase 2 ingestion and workspace safety: deterministic scanning,
    bounded ZIP extraction, secure multipart upload, traversal protection,
    cleanup, and database-backed repeat-import validation all pass.
-   Started Phase 3 with the durable `AnalysisRun` schema, Prisma migration,
    typed lifecycle service, and authenticated analysis-run routes.
-   Added the bounded deterministic tool runner with an executable allowlist,
    host shell disabled, workspace validation, timeout, output limits, and
    cancellation; `pnpm --dir apps/api check:phase3:runner` passes.
-   Phase 3 orchestration now uses the Docker sandbox; direct host execution
    remains unavailable for repository analysis.
-   Added durable tool-execution evidence and an analysis orchestrator that
    advances progress and records completed, failed, and cancelled stages.
-   The database-backed orchestration check passes with persisted run status,
    progress, and tool output evidence.
-   Added durable analysis events and owner-scoped event retrieval; the
    orchestration gate verifies ordered queued, started, stage, and completed
    events in PostgreSQL.
-   Added the Docker container runner with no network, read-only mounts,
    dropped capabilities, non-root execution, resource limits, timeout,
    cancellation, output limits, and automatic cleanup. The live container
    gate passes, and orchestration now uses it by default.
-   Integrated a database-backed tool plan with the in-process queue worker;
    queued runs dispatch to Docker and persist their stage evidence and
    progress events. The queue-backed orchestration check passes.
-   Added startup queue polling so persisted `PENDING` runs are rediscovered
    after an API restart and dispatched automatically.
-   Added atomic database leases for queue claims, with expiry-based retry and
    lease release on terminal run states; duplicate dispatch is rejected.
-   Added periodic lease heartbeats while workers execute, with ownership
    checks and guaranteed heartbeat cleanup after processing.
-   Added expired-lease recovery that returns interrupted running jobs to the
    durable queue and records a recovery event.
-   Started Phase 4 with a TypeScript tool-adapter contract and Docker-backed
    compiler adapter that normalizes skipped and failed compiler evidence.
-   Added the Docker-backed ESLint adapter with configuration detection, JSON
    diagnostic parsing, canonical file/line/rule evidence, and failure mapping.
-   Added the Docker-backed dependency audit adapter with pnpm/npm lockfile
    detection, JSON report parsing, severity normalization, and advisory evidence.
-   Added the Docker-backed Semgrep security adapter with configuration
    detection, JSON finding parsing, severity normalization, and source locations.
-   Added the Docker-backed test runner adapter with package-script detection,
    package-manager selection, and failure evidence normalization.
-   Added the bounded API probe adapter with OpenAPI/Swagger detection,
    configurable target probing, timeout handling, response capture, and HTTP evidence.
-   Added the Docker-backed browser/accessibility adapter with Playwright
    detection and normalized browser test failure evidence.
-   Added the bounded HTTP performance adapter with fixed sampling, timeout
    handling, P95 latency measurement, and threshold evidence.
-   Integrated all Phase 4 adapters through a registry and deterministic
    analysis service; completed and skipped tool outcomes now persist with
    normalized evidence on `ToolExecution`.
-   Connected empty-plan analysis runs to the full deterministic adapter
    pipeline, while preserving explicit staged tool plans for targeted runs.
-   Started Phase 5 with a schema-valid Code Quality Agent service that filters
    lint/compiler evidence and returns explicit skipped results when evidence is absent.
-   Added a schema-valid Security Agent service that filters Semgrep and
    dependency evidence while preserving severity, package, rule, and source context.
-   Added a schema-valid Dependency Agent service that filters audit evidence
    and preserves package, severity, and advisory context.
-   Added a schema-valid Test Agent service that filters test-runner evidence
    and preserves result, exit, and source context.
-   Added a schema-valid API Agent service that filters API probe evidence and
    preserves HTTP status and contract context.
-   Added a schema-valid UI/Accessibility Agent service that filters browser
    evidence and preserves rule, location, and failure context.
-   Added a schema-valid Performance Agent service that filters latency
    evidence and preserves threshold and metric context.
-   Added a schema-valid Repair Agent service that assembles finding and source
    context without mutating repositories or applying patches.
-   Added a schema-valid Report Agent service that assembles evidence for
    executive summary, coverage, recommendations, limitations, and provenance sections.
-   Completed Phase 5 specialized agents: all ten agent services now have
    typed executor integration and focused schema-valid contract gates.
-   Started Phase 6 with owner-scoped findings and score APIs, filterable
    normalized evidence, and versioned quality-score calculation.
-   Added the Phase 6 findings dashboard with score display, severity/source
    filters, loading/error/empty states, and run-scoped evidence rows.
-   Added live run progress polling with current stage, progress bar, event
    history, completion, failure, cancellation, and loading states.
-   Added selectable finding details with severity, status, source, rule, and
    file-location metadata in the findings dashboard.
-   Added a safe diff viewer surface that renders generated patches when
    available and clearly handles findings without patches.
-   Connected finding details to the authenticated patch-generation endpoint;
    generated diffs can now be previewed without applying them.
-   Added authenticated repair routes for patch generation, retrieval,
    validation, and approval-gated application, while preserving sandbox-only
    defaults in the existing repair service.
-   Repaired the invalid patch generator syntax and verified the frontend
    repair/diff workflow build; the full API build still has existing broader
    repair/schema compiler failures.
-   Added an owner-scoped analysis summary API aggregating persisted tool
    execution and severity evidence for downstream findings and dashboard views.
-   Verified all eight Phase 4 adapter checks, including the integrated
    pipeline; benchmark-wide execution remains the Phase 4 exit-gate work.
-   Implemented the repair workflow Prisma models and non-destructive
    migration, restored repair route registration, and verified API build,
    migration status, and startup with repair dependencies enabled.
-   Added the Phase 7 repair lifecycle gate covering indexed context,
    unified patch generation, validation, application, and persisted audit
    records; `pnpm --dir apps/api check:phase7:repair` passes.
-   Hardened repair validation and default application to operate on temporary
    workspace copies; live repository application remains explicit opt-in.
-   Fixed findings dashboard request state updates to satisfy React effect
    linting while preserving loading and error states; API/web builds,
    frontend lint, and Phase 7 repair validation all pass.
-   Added the owner-scoped `GET /api/analyses/:id/report` endpoint with
    reproducible run metadata, repository details, findings, score, and
    summary aggregation; the Phase 8 report gate passes.
-   Added downloadable Markdown reports at `GET /api/analyses/:id/report.md`
    with escaped finding content; the report export gate, API build, and
    frontend lint all pass.
-   Connected Markdown report downloads to the findings dashboard with an
    authenticated action, loading state, and generated filename; frontend
    lint/build and the Phase 8 report gate pass.
-   Added dedicated `aegis/repair-{patchId}` branch preparation before any
    validated live repair application; API/web builds and the Phase 7 repair
    gate pass.
-   Added commit creation for successful live repairs on their dedicated
    branches, with commit and branch metadata returned in the application
    result and commit failures persisted as failed applications.
-   Connected the Reports page to owner-scoped analysis run history with
    open-run navigation and Markdown export actions; API/web builds, lint,
    and the findings regression check pass.
-   Connected Testing to repository selection, configurable functional,
    security, and build checks, and real analysis-run creation with redirect
    to live progress; API/web builds and frontend lint pass.
-   Connected Memory to indexed repository files with path search and stored
    content preview via `?repositoryId=`; frontend lint/build and API build pass.
-   Connected Settings to authenticated account data and locally persisted
    analysis preferences with save feedback; frontend lint/build and API build
    pass. Testing, Reports, Memory, and Settings now have functional behavior.
-   Removed hidden-context dependency from direct Testing and Memory routes;
    both now discover the first accessible project or repository when opened
    directly, while explicit query context remains supported.
-   Fixed Testing run creation by allowing the UI's `semgrep` security tool in
    the API analysis schema; API/web builds, orchestration, adapter pipeline,
    and repair regression checks pass.
-   Fixed functional validation failures for repositories without a test
    script by using pnpm's supported `--if-present` form; frontend lint/build
    and API build pass.
-   Expanded Testing to select all eight deterministic adapters: TypeScript,
    ESLint, dependency audit, security scan, functional tests, API probes,
    browser/accessibility, and performance; adapter pipeline and queue gates
    pass.
-   Stabilized the container-backed orchestration fixture with a realistic
    completion polling window; Phase 3 orchestration now passes reliably.
-   Added owner-scoped semantic Memory search over stored embeddings, with
    debounced ranked chunk results and source preview in the Memory page;
    API/web builds, frontend lint, and adapter pipeline checks pass.
-   Added backend-persisted user preferences with authenticated GET/PUT
    settings support and frontend save/error states; migration status,
    report regression, lint, and final API/web builds pass.
-   Added a database-backed Settings preferences gate; Settings, Reports,
    Repair, frontend lint, and final API/web build checks all pass.
-   Wired persisted preferences into workflows: Testing now sends the saved
    analysis ref, and live progress polling honors the Settings toggle;
    focused regressions, lint, and final API/web builds pass.
-   Added strict Zod validation for persisted Settings preferences; Settings,
    Reports, Repair, frontend lint, and final API/web build checks pass.
-   Added explicit patch rejection through the authenticated API and finding
    details UI, persisting rejected patch and finding states; repair/report
    regressions, frontend lint, and final API/web builds pass.
-   Added retry support for failed or cancelled analysis runs, preserving
    prior evidence and restarting queue processing from the progress UI;
    orchestration, Settings, repair, lint, and final API/web builds pass.
-   Completed the local MVP implementation batches. Remaining work is Phase 9
    benchmark/evaluation and final academic deliverables, plus optional
    GitHub push/PR delivery requiring repository credentials and permissions.

### 2026-08-25

-   Added a versioned Phase 9 benchmark manifest with pinned fixture versions,
    issue categories, ground-truth finding IDs, baselines, and metric names.
-   Added a deterministic evaluation fixture and executable metric gate for
    detection precision/recall/F1 plus repair acceptance, validation, and
    regression rates. Live benchmark execution and academic deliverables
    remain pending.
-   Added two versioned local benchmark fixtures with controlled quality,
    security, dependency, and test issues, plus a manifest validation gate.
    Baseline and AI pipeline execution remain pending.
-   Added authenticated pull-request creation for validated Aegis repair
    branches, with request-scoped GitHub tokens and no credential persistence.
    The no-network delivery contract check passes.
-   Added deterministic baseline capture for the seeded benchmark fixtures.
    The recorded run includes the intentional failing test and identifies the
    missing fixture ESLint installation; AI runs and comparative analysis remain
    pending.
-   Added an Ollama provider and local AI benchmark runner. The benchmark was
    executed and recorded a provider failure from the full agent prompt; no AI
    detection score is claimed until a valid structured agent result is captured.
-   Added reproducible baseline/AI results analysis in
    `evaluation/results/analysis.json` and `analysis.md`. The analysis reports
    observed outcomes and limitations without claiming unsupported comparisons.
-   Installed isolated dependencies for both benchmark fixtures and reran the
    deterministic baseline. ESLint now detects the seeded `no-eval` finding;
    the build passes and the seeded test fails as expected.
-   Retried the Ollama benchmark with a bounded 180-second timeout. Ollama is
    reachable, but the full agent response ended as `agent-execution-failed`
    after 168 seconds, so comparative AI metrics remain unavailable.
-   Fixed the Ollama prompt contract with explicit output and finding shapes.
    The local AI benchmark now returns two schema-valid findings matching the
    quality fixture ground truth, producing a limited precision/recall/F1 of
    1.0/1.0/1.0. Repair and multi-fixture comparative results remain pending.
-   Ran the Ollama Dependency Agent against the dependency fixture and wrote
    scoped comparative results. The quality fixture F1 is 1.0; dependency
    fixture partial F1 is 0.667 because the seeded failing test was not evaluated
    by the Test Agent. Repair metrics remain unavailable.
-   Ran the Ollama Test Agent against the seeded failing test and regenerated
    the comparison. Both fixtures now have complete ground-truth detection
    coverage with observed precision/recall/F1 of 1.0/1.0/1.0. Repair metrics
    remain unavailable because no benchmark patch was applied and validated.
-   Ran an isolated repair experiment for the seeded failing test. One minimal
    patch was applied in a temporary workspace, the repaired test passed, and
    no regression was observed. Recorded repair acceptance, validation, and
    regression rates are 1.0, 1.0, and 0.0 for this single case.
-   Added grounded working drafts for the final report, research paper, demo
    script, and viva preparation. Final experimental results and submission
    formatting remain pending.
-   Added `PENDING_WORK_CHECKLIST.md` as the single checklist for genuinely
    unfinished evaluation, testing, delivery, and academic work.

## Rules for updating this file

After completing work:

1.  Move completed items to `DONE`.
2.  Record meaningful implementation changes in the change log.
3.  Add blockers explicitly.
4.  Do not mark a feature complete until it has been tested.
5.  Keep this file synchronized with the actual repository.
