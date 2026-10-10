# Backend/frontend wiring audit — final report

## Coverage

The full method/path mapping is in [coverage-matrix.md](./coverage-matrix.md). It covers all 64 unique mounted REST operations. The routes marked ⚠️ are either orchestration-only operations with no distinct user action (`POST /analyses/:id/start`, progress updates, completion) or capabilities limited by backend/API design (chat has no streaming event transport; black-box rerun selection is tied to the current generated baseline). There are no remaining ❌ user-facing operations without an identified implementation or explicit internal-only reason.

Protocol operations that do not exist in the backend also cannot be wired: logout/revocation, password reset, email verification, OAuth, MFA, and WebSocket/SSE updates. CI webhook handling has a service method but no mounted webhook endpoint or token-issuance flow.

## Files created or modified for this audit

- Created `docs/audit/backend-inventory.md`, `docs/audit/coverage-matrix.md`, and this report.
- Created `apps/web/.env.example`, `apps/web/src/components/testing/FailureTriagePanel.tsx`, `apps/web/src/components/testing/PlaywrightRunnerPanel.tsx`, `apps/web/src/services/failure-triage.ts`, and `apps/web/src/services/playwright-runner.ts`.
- Frontend wiring and state changes: `apps/web/src/App.tsx` was already changed before Phase 3; this audit changed `components/Navbar.tsx`, `components/analysis/AnalysisProgress.tsx`, `components/analysis/FindingsDashboard.tsx`, `components/dashboard/NotificationDropdown.tsx`, `components/dashboard/SearchBar.tsx`, `components/auth/AuthForm.tsx`, `context/AuthProvider.tsx`, `pages/AuditLogPage.tsx`, `pages/DashboardPage.tsx`, `pages/MemoryPage.tsx`, `pages/ProjectsPage.tsx`, `pages/ReportsPage.tsx`, `pages/SettingsPage.tsx`, `pages/SelfHealingPage.tsx`, `pages/TestOperationsPage.tsx`, `pages/AutonomousTestingPage.tsx`, `pages/CiIntegrationPage.tsx`, `services/analysis.ts`, and `services/api.ts`.
- API changes: `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/ai/chat/chat.controller.ts`, `apps/api/src/modules/ai/test-runner/test-runner.controller.ts`, `apps/api/src/modules/ai/test-runner/test-runner.routes.ts`, `apps/api/src/modules/ai/test-runner/test-runner.types.ts`, `apps/api/src/modules/audit/audit.controller.ts`, `apps/api/src/modules/audit/audit.service.ts`, `apps/api/src/modules/repositories/import.controller.ts`, and `apps/api/src/modules/repositories/import.service.ts`.
- Some paths were already modified before Phase 3 began. The repository had additional pre-existing changes; those unrelated changes were not reverted or included in the audit report as audit edits.

## Bugs found and addressed

- Replaced the fixed frontend API origin with `VITE_API_BASE_URL`, retaining the local API URL as a development fallback.
- Fixed generic 500 responses for duplicate signup and invalid login credentials (409 and 401 respectively), and aligned browser form constraints with API validation.
- Scoped audit queries to the authenticated actor. Repository import and chat now verify resource ownership. Direct Playwright runs require an owned repository and derive its workspace path on the API; client-supplied workspace paths are stripped by the request schema.
- Wired missing analysis summary, merge gate, cancel, JSON report download, repair patch detail/validation/application/rejection, GitHub PR creation, direct Playwright execution, and failure triage flows.
- Replaced demo notification data with API-backed analysis activity; made dashboard search submit to project filtering; enabled the public mobile navigation; removed silent first-repository selection in Memory and Test Intelligence; corrected the unsupported audit `runId` filter; and exposed dashboard data failures rather than placeholder zeros.
- Kept guardrails labeled advisory because backend persistence exists but enforcement is not connected to repair decisions.

## Verification evidence

- `pnpm build` — passed: API TypeScript compilation and web production build.
- `pnpm --dir apps/web exec tsc -b` — passed.
- `pnpm lint` — passed.
- `pnpm test` — 17 passed, 0 failed.
- Local smoke: web `GET /` → 200; API `GET /api/auth/me` without token → 401; login with a syntactically valid nonexistent account → 401; CORS preflight → 204 and `Access-Control-Allow-Origin: *`.
- Live integrations: Groq models endpoint → 200; configured Ollama tags endpoint → 200. API and web development servers both started successfully after allowing Vite’s native binding to run outside the sandbox.
- Build emits a non-failing Vite warning for the main JavaScript chunk (~716 kB before gzip, ~207 kB gzip).

## Intentionally absent or internal-only

- Analysis `progress` and `complete` are worker lifecycle endpoints; analysis creation enqueues work. The standalone `start` operation has no separate UI because user creation already queues the run.
- Logout only clears the browser token because the backend has no revocation/logout operation. Reset password, verification, OAuth, and MFA have no backend routes.
- Failure triage, requirement analysis, test design, and script generation are also invoked as stages of the combined workflow; the individual AI stages do not need separate user forms.
- No admin-only interface was added because the mounted API currently has no role-protected admin operations.
- The frontend has no configured component/E2E test framework. Browser-driven click-through tests were not added as a new dependency.

## Remaining risks and manual QA

- CORS currently allows `*`; production should use an explicit origin allowlist. The API parses `PORT` but listens on hardcoded port 3000. Configure `VITE_API_BASE_URL` for each deployment.
- The generated CI workflows refer to API behavior, but the webhook receiver and CI credential/token flow are absent. GitHub import and pull-request creation still require a valid user token and repository access.
- The API tests exercise service contracts but not the new ownership gates via HTTP integration tests. Verify cross-account audit/import/chat/test-run access with two real user accounts.
- Exercise authenticated project/repository CRUD, ZIP upload boundaries, analysis cancellation/retry, patch validate/apply/PR, failure triage, and expired-session/network recovery in a browser.
- Docker-backed browser execution was not run during this audit. Validate the configured Playwright image and repository workspace mounts on the target host.
- Verify that production secrets and third-party provider quotas are configured. Endpoint reachability was checked; full AI generation, GitHub mutations, and deployment CORS were not exercised.

## Commit status

No commit was created. The working tree contained many pre-existing and unrelated modifications from prior work, including edits to files needed by this audit; committing the full tree would have bundled changes outside this audit. The audit changes are reviewable in the current diff.
