# Backend inventory

**Audit scope:** `apps/api` source as currently mounted by `apps/api/src/server.ts` and `apps/api/src/routes/index.ts`.

The source contains **66 Express route declarations** covering **64 unique method/path combinations**. `GET /api/repositories/:id/files` and `GET /api/repositories/:id/file` each have a duplicate declaration through the repository and explorer routers.

## Stack and process

- **Runtime/framework:** Node.js, TypeScript, Express 5 (`apps/api/src/server.ts`, `app.ts`). The server listens on fixed port **3000**. `config/env.ts` parses `PORT` (default 4000), but `server.ts` does not use it.
- **Database/ORM:** PostgreSQL via Prisma (`apps/api/prisma/schema.prisma`, `src/config/prisma.ts`). Persistent models include users, projects, repositories/files/indexes, analyses/events/tool executions, findings/patches/validations, audit logs, guardrails, self-healing proposals, and autonomous test runs.
- **Request middleware:** Helmet, `cors()` with default configuration, JSON parser, cookie parser, `/api` router, then shared error middleware. Auth is a Bearer JWT, signed with `JWT_SECRET`, expiring after seven days. Passwords use bcrypt helpers.
- **Validation/errors:** Zod on routes that install `validate`; those failures return HTTP 400 `{ success:false, message, errors }`. `ApiError` returns its configured status with `{ success:false, message }`. Missing/invalid bearer token returns 401. Unhandled errors (including ordinary `Error` from services) are logged and returned as HTTP 500 with the exception message.
- **Async execution:** `AnalysisQueue.start()` is called at server startup. The queue polls every second, recovers expired leases, claims pending analysis rows, and runs deterministic/AI analysis. API-triggered analysis create/retry also enqueue work. Analysis completion starts the repair bridge asynchronously. Playwright runner failures can trigger self-healing proposal generation.
- **External integrations:** Groq chat/completions (`GROQ_API_KEY`, `GROQ_CHAT_MODEL`); Ollama embeddings (`EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `OLLAMA_BASE_URL`); GitHub clone/PR operations; Docker/container-backed analysis and Playwright; Semgrep; npm/pnpm audits.

## Protocols and capabilities not exposed as routes

- The mounted API is REST over HTTP. No GraphQL schema/resolver, RPC server, WebSocket server, or socket event handlers were found.
- No logout, password-reset, email verification, OAuth, or MFA endpoints are implemented. JWTs expire after seven days; there is no revocation endpoint.
- CI generation exists, but the documented `CiIntegrationService.handleWebhookEvent()` has no Express route in the mounted router. Generated pipeline YAML therefore does not correspond to a webhook receiver in this API.
- `Role` (`USER`/`ADMIN`) is carried in JWT claims, but the mounted route tree has no role/administrator authorization middleware or admin-only route group.
- Repair service methods `createRepairJob`, `getRepairJob`, `listFindings`, and `getFinding` have no registered route in `repair.routes.ts`; the exposed repair surface is patch-oriented.
- Repository indexing/retrieval, risk planning, repair bridging, AI agents, and cost tracking are service-level capabilities called by other flows; they are not independent HTTP routes.

## Response and error conventions

Most handlers return HTTP JSON `{ success:true, message?, data }`; a few use the same envelope directly and some success handlers return `{ success:true, data }`. Validation and known errors follow the middleware behavior above. Unless a row says otherwise, expected error classes are: **400** malformed input, **401** missing/invalid JWT, **403/404** resource authorization/not found, **409** invalid lifecycle or missing workspace, and **500** unexpected service/provider/filesystem/database failure. Exact route-specific codes are noted below where visible in the controller/service.

## Registered REST operations

`{id}` and other path identifiers are strings; route validation generally requires only non-empty strings. There is no general pagination middleware.

### Authentication — `/api/auth`

| Method + path | Auth / role | Params, query, and body | Success response | Notable errors |
|---|---|---|---|---|
| `POST /register` | Public | JSON `{ name:string(min 2), email:email, password:string(min 6) }` | 201; `data:{ user:{id,name,email,role}, token }` | 400 validation; duplicate email returns 409. |
| `POST /login` | Public | JSON `{ email:email, password:string(min 6) }` | 200; same user/token shape as register | 400 validation; invalid email/password returns 401. |
| `GET /me` | Bearer JWT | None | `data:{id,name,email,role,createdAt,preferences}` | 401; 404 if authenticated user row is absent. |
| `PATCH /preferences` | Bearer JWT | JSON strict object `{ defaultRef?:string(1–200, default HEAD), polling?:boolean(default true) }` | `data:{preferences}` | 400 validation; 401; 500 on persistence errors. |

No logout/reset/OAuth/MFA route is present.

### Projects — `/api/projects`

All operations require a Bearer JWT. Project reads and changes are owner-scoped. No role distinction is applied.

| Method + path | Body/query | Success response | Notable errors |
|---|---|---|---|
| `POST /` | `{ name:string(trimmed, 3–100), description?:string(max 500) }` | 201; created Project row | 400, 401, 500 |
| `GET /` | None | Array of the caller's Project rows, newest updated first | 401, 500 |
| `GET /:id` | `id` path | Project row | 400, 401, 404 |
| `PATCH /:id` | Optional `{name, description, status:ACTIVE\|ARCHIVED\|COMPLETED, visibility:PRIVATE\|TEAM\|PUBLIC}` | Updated Project row | 400, 401, 404, 500 |
| `DELETE /:id` | `id` path | `{message:"Project deleted successfully."}` | 400, 401, 404, 500 |

### Repositories, imports, and explorer

All these routes require a Bearer JWT. The route tree registers `GET /api/repositories/:id/files` and `/file` twice: once from `repository.routes.ts` and again from `explorer.routes.ts`. They currently target the same controller methods. Search is only registered by the explorer router. Repository/provider/status enums and create/update fields below reflect `repository.schema.ts`.

| Method + path | Params/query/body | Success response | Notable errors |
|---|---|---|---|
| `POST /api/projects/:projectId/repositories` | JSON `{name:string(3–150), description?:string(max 1000), provider?:LOCAL\|GITHUB\|ZIP, url?:URL, defaultBranch?:string(max 100), isPrivate?:boolean, workspacePath?:string}` | 201; created Repository row | 400, 401, 404 project, 500 |
| `GET /api/projects/:projectId/repositories` | Query `{search?:string, provider?:LOCAL\|GITHUB\|ZIP, status?:ACTIVE\|INDEXING\|INDEXED\|FAILED\|ARCHIVED}` | Repository rows sorted by updated time | 400, 401, 404 project, 500 |
| `GET /api/repositories/:id` | `id` path | Repository row | 400, 401, 404 |
| `GET /api/repositories/:id/stats` | `id` path | `{id,name,provider,status,defaultBranch,isPrivate,workspaceReady,workspacePath,totalFiles,totalDirectories,updatedAt}` | 400, 401, 404 |
| `POST /api/repositories/:id/index` | `id` path; no body | Index/retrieval result | 400 for missing workspace; 401, 404, 500 |
| `PATCH /api/repositories/:id` | Optional `{name,description,provider,url,defaultBranch,isPrivate,status,workspacePath}`; same bounds/enums as create | Updated Repository row | 400, 401, 404, 500 |
| `DELETE /api/repositories/:id` | `id` path | `{message:"Repository deleted successfully."}` | 400, 401, 404, 500 |
| `GET /api/repositories/:id/files` | `id` path | Array of indexed RepositoryFile rows | 401, 404, 500 |
| `GET /api/repositories/:id/search` | Query `q:string` (required by controller) | Retrieval matches `{success:true,data:results}` | 400 missing query, 401, 404, 500 |
| `GET /api/repositories/:id/file` | Query `path:string` required | `{name,path,language,content}` | 400 missing path/workspace; 401, 404, filesystem errors can be 500 |
| `POST /api/repositories/:id/import/github` | JSON `{url}`; Zod requires valid HTTPS `github.com/{owner}/{repo}[.git]` URL | 200; `{success:true,message,data:{success,workspace,indexedFiles,indexingResult,message}}` | 400 validation/missing URL; 401; import/clone/index errors generally 500 |
| `POST /api/repositories/:id/import/zip` | `multipart/form-data`, one file in field `archive`, `.zip` extension and accepted ZIP MIME; max upload 100 MiB | 200; same import result shape | 400 if missing file; 401; upload/parser errors currently fall through generic error handling (often 500); archive limits/errors can be 500 |

ZIP extraction additionally caps entries at 10,000 and uncompressed size at 100 MiB, and rejects absolute/traversal paths. Import operations change repository status/workspace, scan files, and index retrieval embeddings.

### Analysis runs and findings — `/api/analyses`

All routes require Bearer JWT. Run reads/writes are scoped to the caller's owning project. Analysis create and retry dispatch to the background queue.

| Method + path | Params/query/body | Success response | Notable errors |
|---|---|---|---|
| `GET /` | None | Up to 50 caller-owned runs (summary projection with repository name) | 401, 500 |
| `POST /` | `{projectId,repositoryId,ref?:string(default HEAD),totalStages?:int(0–100),tools?:array(max 100),adapters?:array(max 8)}`. Tool item `{command:node\|npm\|pnpm\|python\|semgrep,args:string[](max 30; each max 500),stage:string(1–100)}`. Adapter enum: `typescript,eslint,dependency-audit,security-scan,test-runner,api-probe,browser-accessibility,performance`. | 201; created AnalysisRun row | 400 validation; 401; 404 owner/project/repository; 409 missing workspace; queue/internal failures 500 |
| `GET /:id` | `id` run path | AnalysisRun row | 401, 404, 500 |
| `GET /:id/events` | Optional query `after` date; invalid date is ignored | Ordered AnalysisEvent array | 401, 404, 500 |
| `GET /:id/summary` | `id` | `{runId,tools:{[tool]:{status,evidence}},totals:{executions,evidence},bySeverity}` | 401, 404, 500 |
| `POST /:id/start` | `id`; no body | Updated AnalysisRun | 401, 404, 409 unless PENDING, 500 |
| `PATCH /:id/progress` | `{completedStages:int>=0,currentStage?:string(1+)\|null}` | Updated AnalysisRun | 400, 401, 404, 409 unless RUNNING, 500 |
| `POST /:id/complete` | `id`; no body | Updated AnalysisRun; asynchronous repair bridge begins | 401, 404, 409 unless RUNNING, 500 |
| `POST /:id/cancel` | `id`; no body | Updated AnalysisRun | 401, 404, 409 unless PENDING/RUNNING, 500 |
| `POST /:id/retry` | `id`; no body | Updated/requeued AnalysisRun | 401, 404, 409 unless FAILED/CANCELLED, 500 |
| `GET /:id/gate` | Optional query `failOnCritical`/`failOnHigh` (`false` disables); `allowedFailures` comma-separated | Merge-gate result from CI service | 401, 404, 500 |
| `GET /:id/findings` | Optional filters `severity,source,file,status` | Owner-scoped analysis findings enriched with repair metadata | 401, 404, 500 |
| `GET /:id/score` | `id` | `{runId,score,scoringVersion,findingCount,evaluatedAt}` | 401, 404, 500 |
| `GET /:id/report` | `id` | Analysis report JSON: run, repository, summary, score, findings | 401, 404, 500 |
| `GET /:id/report.md` | `id` | Markdown attachment `analysis-{id}.md` | 401, 404, 500 |

The analysis-create controller returns a run after queue enqueue; work continues asynchronously. The queue is also a recovery poller, independent of the HTTP request.

### Repair patches — `/api/repairs`

All routes require Bearer JWT. They authorize against the owning project through the finding/patch's repair job.

| Method + path | Params/body | Success response | Notable errors |
|---|---|---|---|
| `POST /findings/:findingId/patch` | Path finding ID; optional body `{promptOverride?:...}` (controller reads it without an installed schema) | 201; generated Patch | 401, 403/404 access/resource, lifecycle/generation errors (400/500) |
| `GET /patches/:patchId` | Patch ID | Patch details | 401, 403/404, 500 |
| `POST /patches/:patchId/validate` | Patch ID; no body | Validation result and lifecycle | 401, 403/404, runner/repository errors 500 |
| `POST /patches/:patchId/apply` | Patch ID; optional raw JSON `targetRepo`; only literal `true` requests project-repo target, otherwise sandbox | Apply result | 401, 403/404, 400 lifecycle, filesystem/GitHub errors 500 |
| `POST /patches/:patchId/reject` | Patch ID; no body | `{patchId,status:"REJECTED"}` | 401, 403/404, 400 if validated/applied, 500 |
| `POST /patches/:patchId/pull-request` | Header `x-github-token` required; body `title` trimmed 1–200 and optional `body` | 201; GitHub PR result | 400 missing header/title or invalid lifecycle; 401, 403/404, upstream GitHub errors 500 |

Service methods for repair-job creation, job status, and repair findings exist, but are not routed from `repair.routes.ts`.

### Reports, audit, guardrails, and CI

| Method + path | Auth / role | Params/query/body | Success response | Notable errors |
|---|---|---|---|---|
| `GET /api/audits` | Bearer JWT; no admin role | Optional `limit` (default 100), `offset` (default 0), `actorId`, `targetType`, `targetId`, `success=true\|false` | `{logs,total}` | 401, 500; results are scoped to the authenticated actor; other actor filters return no rows. Values are parsed but not schema-bounded. |
| `GET /api/projects/:id/guardrails` | Bearer JWT; project owner enforced | `id` project path | Guardrail settings object | 401, 404, 500 |
| `PUT /api/projects/:id/guardrails` | Bearer JWT; project owner enforced | Optional `{maxPatchRiskScore:int 0–100, requireManualApprovalForCritical?:boolean,sandboxOnly?:boolean,scope?:ADVISORY\|ENFORCED}` | 201; saved settings object | 400, 401, 404, 500 |
| `POST /api/ci/projects/:id/ci-config` | Bearer JWT; project and repository ownership enforced | Body requires `{platform:"github"\|"gitlab"\|"azure",repositoryId:string,apiUrl:string}`; optional `triggers`, `analysisTypes`, `mergeGate`. | `{filePath,content}` generated YAML | 400 missing/invalid fields, IDs, unsupported platform; 401, 404, URL/IO errors 500 |

The CI route source comment says `POST /api/projects/:id/ci-config`; because its router is mounted at `/api/ci`, the actual path is `/api/ci/projects/:id/ci-config`.

### AI-assisted requirement/test services

All listed routes require Bearer JWT, but there is no role-specific gate.

| Method + path | Body/query | Success response | Notable errors |
|---|---|---|---|
| `POST /api/chat` | `{repositoryId:string(nonempty),message:string(trimmed 1–10000)}` | `{answer,sources:[{filePath,chunkIndex,score}]}` | 400, 401, 404 repository not found/access denied; API verifies repository ownership. AI provider failure is converted to answer text; retrieval can continue empty. |
| `POST /api/requirements/analyze` | `{requirement:string(trimmed 1–50000)}` | `{contractVersion:"1.0",scenarios:[{id:REQ-SC-nnn+,title,preconditions,priority:critical\|high\|medium\|low}]}` | 400, 401, provider/contract errors 500 |
| `POST /api/test-designs` | `{contractVersion:"1.0",scenarios:[requirement scenario...]}` | `{contractVersion:"1.0",testCases:[{id,scenarioId,title,priority,preconditions,steps,testData,expectedResult}]}` | 400, 401, provider/contract errors 500 |
| `POST /api/script-generators` | `{contractVersion:"1.0",approved:true,testCases:[test case...], min 1}` | `{contractVersion:"1.0",files:[{path:"tests/**/*.spec.ts",language:"typescript",testCaseId,content}]}` | 400, 401, provider/contract errors 500 |
| `POST /api/test-runs` | `{runId:[A-Za-z0-9_-]+,repositoryId:string,files:[generated Playwright files, min 1],parallelism?:int 1–16 default 2,timeoutMs?:positive max 900000 default 180000,compatibility?:{browsers:[chromium\|firefox\|webkit],viewports:[desktop\|mobile]}}`; API resolves workspace from repository | Test run summary `{runId,repositoryId,createdAt,status,total,passed,failed,skipped,resultsDirectory,tests,stdout,stderr,durationMs}` | 400, 401, 404 repository not found/access denied, 409 missing workspace; container/filesystem/test failures generally reflected in result or 500. |
| `POST /api/self-healing/proposals` | `{repositoryId,testRunId,testCaseId:REQ-TC-nnn+,failedLocator(1–2000),domSnapshot(1–2,000,000),screenshot(1–10,000,000)}` | 200; persisted proposal with contract version/locator | 400, 401, 404 repository ownership, provider/contract errors 500 |
| `GET /api/self-healing/proposals` | Optional `repositoryId`, `status=PENDING\|APPROVED\|REJECTED` | Owner-scoped proposal array | 401, 500 |
| `POST /api/self-healing/proposals/:proposalId/review` | Body `{status:"APPROVED"\|"REJECTED"}` | Reviewed proposal | 400, 401, 404, 500 |
| `POST /api/failure-triage` | `{failures:[{id,testCaseId:REQ-TC-nnn+,message(1–10000),stackTrace?:max 20000,screenshot?:max 10000000}], min 1, max 500}` | `{contractVersion:"1.0",groups:[{groupId,classification:real_bug\|locator_change\|flaky\|environment_issue,reasoning}]}` | 400, 401, provider/contract errors 500 |
| `GET /api/test-reports` | Required query `repositoryId` | Test operations report: run history/trends, flaky/slow tests, release readiness | 400 missing repo ID, 401, missing/foreign repo currently ordinary Error→500 |
| `POST /api/test-workflows/run` | `{projectId,repositoryId,requirement(1–50000),parallelism?:int 1–16 default 2}` | Combined scenarios, test cases, generated scripts, Playwright run | 400, 401, 404 ownership, 409 missing workspace, provider/runner errors 500 |

Test-runner service can create self-healing proposals for locator-classified Playwright failures when called with an owner ID. The standalone `/api/test-runs` endpoint supplies the workspace in the body and the repository ID is optional.

### Autonomous testing — `/api/autonomous-testing`

These routes require Bearer JWT and scope repository operations to the owner's project. Work executes inline and results are also written to the API host's results directory and persisted run registry.

| Method + path | Params/body | Success response | Notable errors |
|---|---|---|---|
| `GET /runs/:repositoryId` | Repository ID | Up to 100 merged filesystem/DB run-history items `{runId,type,suite?,mode?,status,createdAt,total,passed,failed,generatedSourceAvailable}` | 400 invalid params, 401, 404 repository, 500 |
| `POST /unit/run` | `{repositoryId,suite:"password-helpers"\|"exported-components"}` | Discovery, generated source, execution counts and status | 400, 401, 404, 409 workspace, 422 unsupported source/recipe, 500 runner |
| `POST /integration/run` | `{repositoryId,suite:"signup-login"\|"new-order"\|"dashboard-data",baseUrl:credential-free HTTP(S) URL}` | Discovered routes/coverage, generated source, execution counts/status | 400, 401, 404, 409, 422 unsupported routes, 500 runner |
| `POST /security/run` | `{repositoryId}` | Secret/dependency findings, checks, scan counts and coverage gaps | 400, 401, 404, 409; audit failure represented in result status/coverage |
| `POST /run-modes/run` | `{repositoryId,mode:smoke\|sanity\|system\|regression\|acceptance,frontendUrl?,dashboardUrl?,integrationBaseUrl?}`; URLs must be HTTP(S) without embedded credentials | Selection, execution/report, gaps; Acceptance returns `/testing?mode=acceptance` | 400, 401, 404, 409 workspace, 422 missing URL/Git history, execution failures in report |
| `POST /black-box/run` | `{repositoryId,frontendUrl,dashboardUrl}`; credential-free HTTP(S) URLs | Discovered signup/login flow, generated Playwright file and execution | 400, 401, 404, 409 workspace/runner, unsupported flow errors 422/500 |
| `POST /black-box/rerun` | `{repositoryId,baselineRunId:[A-Za-z0-9_-]+}` | Regression run summary referencing baseline | 400, 401, 404 wrong/missing baseline, 409 workspace, 500 runner |

### File upload/download details

- Upload: ZIP repository import via `POST /api/repositories/:id/import/zip`, multipart field `archive`, one `.zip`, max 100 MiB; extraction limits above.
- Download: `GET /api/analyses/:id/report.md` sends an attachment as `text/markdown`.
- GitHub clone/import is a JSON URL operation, not an uploaded file.
- No standalone endpoint for downloading Playwright traces/screenshots/generated suite files was found. Test responses include host-side `resultsDirectory`/run references.

## Background and event-triggered work

| Trigger | Work |
|---|---|
| API process startup | `AnalysisQueue.start()` starts the polling queue; every second it recovers expired RUNNING leases and drains up to ten pending runs. |
| `POST /api/analyses` | Creates a pending run and invokes queue enqueue. Queue workers run deterministic adapters, AI agents, then completion/repair bridge as configured. |
| `POST /api/analyses/:id/retry` | Resets eligible failed/cancelled run and queues it. |
| Analysis worker | Renews a 10-minute worker lease every 60 seconds while processing. Events are persisted as `AnalysisEvent` records; no WebSocket/SSE delivery route is mounted. |
| Analysis completion | Fire-and-forget `RepairBridgeService.bridgeRunToRepairJob` scans evidence and creates repair jobs/findings where `repairRequired` is set. |
| Playwright locator failure | Test runner classifies failures and may enqueue/persist a self-healing proposal using local or configured AI provider. |
| Autonomous-testing calls | Unit, integration, security, browser, and run-mode executions run synchronously in request handling; each saves run JSON and a database run record. |

## Audit findings and Phase 3 dispositions

1. **Fixed in Phase 3:** `GET /api/audits` constrains results to `req.user.userId`; an actor filter for another account returns no rows. No admin-wide audit UI exists.
2. **Fixed in Phase 3:** GitHub/ZIP import controllers pass authenticated identity and import service looks up repositories through the owning project before mutation.
3. **Fixed in Phase 3:** chat verifies the selected repository belongs to the authenticated user before retrieval.
4. **Fixed in Phase 3:** direct Playwright run request schema omits `workspace`; controller requires an owned repository and resolves its workspace path server-side.
5. **Fixed in Phase 3:** duplicate registration returns 409 and invalid credentials return 401 via `ApiError`.
6. CORS still uses library defaults without an explicit origin allowlist; `PORT` is parsed but ignored in favor of fixed port 3000. Verify actual frontend/API deployment configuration in Phase 4.
7. `CiIntegrationService.handleWebhookEvent()` is not routed; generated CI workflow authentication has no API token-issuance endpoint. These remain unsupported integration capabilities for final-report justification.

These are inventory observations, not fixes; subsequent phases should verify each one against the frontend and decide/implement the scoped remediation.
