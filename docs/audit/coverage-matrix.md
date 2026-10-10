# Frontend inventory and backend coverage matrix

**Scope:** `apps/web/src` compared with the mounted REST operations in [backend-inventory.md](./backend-inventory.md). This is a static source audit; UI flows have not yet been run. The status describes visible source wiring, not successful runtime behavior.

## Frontend stack and API conventions

- React 19, TypeScript, Vite, React Router 7, Axios, Tailwind CSS 4, Framer Motion, Sonner, and Monaco. Routes live in `apps/web/src/App.tsx`; `main.tsx` installs auth/sidebar providers and toaster.
- Axios client is `apps/web/src/services/api.ts`, with a hardcoded `http://localhost:3000/api` base URL and a request interceptor that adds the bearer token from `localStorage`. There is no configured environment-based base URL or refresh/response interceptor.
- Auth state is supplied by `AuthProvider`; protected routes wrap dashboard pages in `ProtectedRoute`. Auth UI uses `/auth/register`, `/auth/login`, `/auth/me`, and `/auth/preferences`. “Logout” only removes the local token; the backend has no logout operation.
- Feature API calls are generally kept in `apps/web/src/services/*.ts`, with page/component state and requests in `apps/web/src/pages` and `apps/web/src/components`.

## Frontend route inventory

| Route | Page | Access | Main backend/data use |
|---|---|---|---|
| `/` | `HomePage` | Public | None |
| `/login`, `/register` | `LoginPage`, `RegisterPage` | Public | Auth service |
| `/dashboard` | `DashboardPage` | Protected | Projects, repositories, analyses and summary data |
| `/projects` | `ProjectsPage` | Protected | Project CRUD |
| `/projects/:projectId/repositories` | `RepositoryPage` | Protected | Repository CRUD, import and indexing |
| `/projects/:projectId/repositories/:repositoryId` | `RepositoryDetailsPage` | Protected | Repository details/stats and navigation |
| `/projects/:projectId/repositories/:repositoryId/chat` | `ChatPage` | Protected | Chat (and explorer context) |
| `/analysis` | `AnalysisPage` | Protected | Analysis run list/details/events/findings/retry/report/patch rejection |
| `/testing` | `TestingPage` | Protected | Analysis adapters and requirement-to-Playwright workflow |
| `/autonomous-testing` | `AutonomousTestingPage` | Protected | Autonomous test runners and history |
| `/reports` | `ReportsPage` | Protected | Analysis runs and downloadable Markdown reports |
| `/test-operations` | `TestOperationsPage` | Protected | Test reports |
| `/self-healing` | `SelfHealingPage` | Protected | Proposal list and review |
| `/memory` | `MemoryPage` | Protected | Indexed files, file content, semantic search |
| `/audit` | `AuditLogPage` | Protected | Audit log filtering and pagination |
| `/ci-integration` | `CiIntegrationPage` | Protected | CI config generation |
| `/settings` | `SettingsPage` | Protected | User preferences and project guardrails |
| `*` | `NotFoundPage` | Public fallback | None |

## Backend capability coverage

Service file references below are under `apps/web/src/services/`; all calls use the shared Axios client unless noted. Line numbers are omitted here because the matrix records stable file-level ownership and this document is a coverage overview, not a code locator. Frontend bodies are compared to the Phase 1 schemas at the route-family level; exact form validation/runtime contract verification remains Phase 3/4 work.

| Capability (method + path) | Frontend location | Status | Notes |
|---|---|---|---|
| `POST /api/auth/register` | `components/auth/AuthForm.tsx`, `services/auth.ts`; `RegisterPage.tsx` | ✅ Fully implemented | Real API/form, client validation and duplicate-email 409 response. Email verification endpoint is not implemented. |
| `POST /api/auth/login` | `components/auth/AuthForm.tsx`, `services/auth.ts`; `LoginPage.tsx` | ✅ Fully implemented | Real API/form, client validation and invalid-credentials 401 response. Reset/OAuth/MFA endpoints do not exist. |
| `GET /api/auth/me` | `contexts/AuthProvider` (auth context), `services/auth.ts` | ⚠️ Partial | Token restore is wired; any request error clears the token, including network/server failures. |
| `PATCH /api/auth/preferences` | `pages/SettingsPage.tsx`, `services/auth.ts` | ✅ Fully implemented | Preferences form calls the matching operation. Runtime response/error behavior unverified. |
| `POST /api/projects` | `pages/ProjectsPage.tsx`, project modal/form, `services/project.ts` | ✅ Fully implemented | Create form and refresh/list flow present. |
| `GET /api/projects` | `pages/ProjectsPage.tsx`, dashboard/settings/testing pages, `services/project.ts` | ✅ Fully implemented | Project list is used across flows. |
| `GET /api/projects/:id` | `services/project.ts` | ⚠️ Partial | Client helper exists; no clear page use found. |
| `PATCH /api/projects/:id` | `pages/ProjectsPage.tsx`, `components/projects/EditProjectModal.tsx`, `services/project.ts` | ✅ Fully implemented | Edit form uses project update helper. |
| `DELETE /api/projects/:id` | `pages/ProjectsPage.tsx`, `components/projects/DeleteProjectModal.tsx`, `services/project.ts` | ✅ Fully implemented | Confirmation modal and list refresh present. |
| `POST /api/projects/:projectId/repositories` | `pages/RepositoryPage.tsx`, `components/repositories/*`, `services/repository.ts` | ✅ Fully implemented | Create flow is wired. |
| `GET /api/projects/:projectId/repositories` | `pages/RepositoryPage.tsx`, `pages/MemoryPage.tsx`, test pages, `services/repository.ts` | ✅ Fully implemented | Lists are populated from API; some pages default to the first project/repository. |
| `GET /api/repositories/:id` | `pages/RepositoryDetailsPage.tsx`, `pages/ChatPage.tsx`, `services/repository.ts` | ✅ Fully implemented | Detail and chat flows load repository records from the API. |
| `GET /api/repositories/:id/stats` | `pages/RepositoryDetailsPage.tsx`, `services/repository-stats.ts` | ✅ Fully implemented | Stats flow is wired. |
| `POST /api/repositories/:id/index` | `components/repositories/RepositoryIndexButton.tsx`, `services/repository.ts` | ✅ Fully implemented | Index action is available and refreshes repository state. |
| `PATCH /api/repositories/:id` | Repository edit form/modal, `services/repository.ts` | ✅ Fully implemented | Repository update flow present. |
| `DELETE /api/repositories/:id` | Repository delete modal, `services/repository.ts` | ✅ Fully implemented | Confirmation flow present. |
| `GET /api/repositories/:id/files` | Explorer/memory components, `services/explorer.ts` | ✅ Fully implemented | Used to show indexed files. Backend declares this route twice. |
| `GET /api/repositories/:id/search` | `pages/MemoryPage.tsx`, `services/explorer.ts` | ✅ Fully implemented | Debounced semantic search; stale results/error-state behavior should be verified. |
| `GET /api/repositories/:id/file` | Memory/explorer components, `services/explorer.ts` | ✅ Fully implemented | File content is loaded for selected indexed file. |
| `POST /api/repositories/:id/import/github` | Repository import modal/form, `services/import.ts` | ✅ Fully implemented | GitHub URL flow; API verifies repository ownership. |
| `POST /api/repositories/:id/import/zip` | Repository import modal/form, `services/import.ts` | ✅ Fully implemented | Multipart archive flow; API verifies repository ownership; runtime size/type handling needs testing. |
| `GET /api/analyses` | `pages/AnalysisPage.tsx`, `pages/ReportsPage.tsx`, `services/analysis.ts` | ✅ Fully implemented | Run lists use API data. |
| `POST /api/analyses` | `pages/TestingPage.tsx`, `services/analysis.ts` | ✅ Fully implemented | Selected adapters/tools are submitted to create runs. |
| `GET /api/analyses/:id` | `pages/AnalysisPage.tsx`, `services/analysis.ts` | ✅ Fully implemented | Detail polling is used. |
| `GET /api/analyses/:id/events` | Analysis progress component, `services/analysis.ts` | ✅ Fully implemented | Polling/events UI is wired; no push transport exists backend-side. |
| `GET /api/analyses/:id/summary` | `components/analysis/AnalysisProgress.tsx`, `services/analysis.ts` | ✅ Fully implemented | Expandable per-tool/evidence and severity summary. |
| `POST /api/analyses/:id/start` | No direct frontend call | ⚠️ Partial | Analysis creation automatically queues the worker; this alternate lifecycle operation is reserved for orchestration and has no distinct user action. |
| `PATCH /api/analyses/:id/progress` | No frontend call found | ❌ Missing | Worker/internal lifecycle operation; no user UI expected. |
| `POST /api/analyses/:id/complete` | No frontend call found | ❌ Missing | Worker/internal lifecycle operation; no user UI expected. |
| `POST /api/analyses/:id/cancel` | `components/analysis/AnalysisProgress.tsx`, `services/analysis.ts` | ✅ Fully implemented | Active runs have cancel action with pending/error feedback. |
| `POST /api/analyses/:id/retry` | Analysis progress/detail, `services/analysis.ts` | ✅ Fully implemented | Retry button calls matching route. |
| `GET /api/analyses/:id/gate` | `components/analysis/AnalysisProgress.tsx`, `services/analysis.ts` | ✅ Fully implemented | Gate pass/block reason and findings count display beside run progress. |
| `GET /api/analyses/:id/findings` | Findings dashboard, `services/analysis.ts` | ✅ Fully implemented | Filters/findings details are present. |
| `GET /api/analyses/:id/score` | Findings/dashboard/report components, `services/analysis.ts` | ✅ Fully implemented | Score is consumed in analysis reporting. |
| `GET /api/analyses/:id/report` | `pages/ReportsPage.tsx`, `services/analysis.ts` | ✅ Fully implemented | Exports JSON report in addition to Markdown. |
| `GET /api/analyses/:id/report.md` | Analysis findings/report components, `pages/ReportsPage.tsx`, `services/analysis.ts` | ✅ Fully implemented | Downloads blob attachment. |
| `POST /api/repairs/findings/:findingId/patch` | `components/analysis/FindingsDashboard.tsx`, `services/analysis.ts` | ✅ Fully implemented | Patch ID, diff, and lifecycle are mapped from the Patch record. |
| `GET /api/repairs/patches/:patchId` | Findings dashboard, `services/analysis.ts` | ✅ Fully implemented | Patch detail is refreshed before validation. |
| `POST /api/repairs/patches/:patchId/validate` | `components/analysis/FindingsDashboard.tsx`, `services/analysis.ts` | ✅ Fully implemented | Validate action displays lifecycle and errors. |
| `POST /api/repairs/patches/:patchId/apply` | `components/analysis/FindingsDashboard.tsx`, `services/analysis.ts` | ✅ Fully implemented | Confirms before applying to isolated workspace and reports failures. |
| `POST /api/repairs/patches/:patchId/reject` | `components/analysis/FindingsDashboard.tsx`, `services/analysis.ts` | ✅ Fully implemented | Disabled for validated or terminal states and reports errors. |
| `POST /api/repairs/patches/:patchId/pull-request` | `components/analysis/FindingsDashboard.tsx`, `services/analysis.ts` | ✅ Fully implemented | Validated patch exposes token/title form; token is sent in header and cleared after success. |
| `GET /api/audits` | `pages/AuditLogPage.tsx`, `services/analysis.ts` | ⚠️ Partial | Filters and pagination exist; unsupported `runId` removed. API is scoped to the authenticated actor; actor filters for other users return no rows. |
| `GET /api/projects/:id/guardrails` | `pages/SettingsPage.tsx`, `services/guardrail.ts` | ✅ Fully implemented | Guardrail configuration loads by project. |
| `PUT /api/projects/:id/guardrails` | `pages/SettingsPage.tsx`, `services/guardrail.ts` | ✅ Fully implemented | Save flow is wired. |
| `POST /api/ci/projects/:id/ci-config` | `pages/CiIntegrationPage.tsx`, `services/ci-integration.ts` | ✅ Fully implemented | Correct mounted path and generated YAML copy/download UI. It is a generator; there is no webhook receiver. |
| `POST /api/chat` | `pages/ChatPage.tsx`, `hooks/useChat.ts`, `services/chat.ts` | ⚠️ Partial | Chat flow is real and repository ownership is checked at the API boundary. No live token streaming event endpoint exists. |
| `POST /api/requirements/analyze` | `pages/TestingPage.tsx` through workflow client | ✅ Fully implemented | Workflow uses combined `/test-workflows/run`, which invokes the requirement pipeline server-side. No separate direct call found. |
| `POST /api/test-designs` | `pages/TestingPage.tsx` through workflow client | ✅ Fully implemented | Used as a workflow stage server-side; frontend does not call independently. |
| `POST /api/script-generators` | `pages/TestingPage.tsx` through workflow client | ✅ Fully implemented | Used as a workflow stage server-side; frontend does not call independently. |
| `POST /api/test-runs` | `components/testing/PlaywrightRunnerPanel.tsx`, `services/playwright-runner.ts` | ✅ Fully implemented | Added test editor/run results; API now resolves workspace from an authenticated owner-scoped repository instead of trusting a submitted path. |
| `POST /api/self-healing/proposals` | No direct frontend call found | ⚠️ Partial | Backend can create proposals automatically after a runner failure; UI only lists/reviews proposals. |
| `GET /api/self-healing/proposals` | `pages/SelfHealingPage.tsx`, `services/self-healing.ts` | ✅ Fully implemented | Proposal list and status filtering are wired. |
| `POST /api/self-healing/proposals/:proposalId/review` | `pages/SelfHealingPage.tsx`, `services/self-healing.ts` | ✅ Fully implemented | Approve/reject confirmation and refresh flow present. |
| `POST /api/failure-triage` | `components/testing/FailureTriagePanel.tsx`, `services/failure-triage.ts` | ✅ Fully implemented | Submits failure message, test ID, optional stack and displays classification. |
| `GET /api/test-reports` | `pages/TestOperationsPage.tsx`, `services/test-report.ts` | ✅ Fully implemented | Repository-specific report view is present. |
| `POST /api/test-workflows/run` | `pages/TestingPage.tsx`, `services/test-workflow.ts` | ✅ Fully implemented | Full requirement-to-script-to-run action is present. |
| `GET /api/autonomous-testing/runs/:repositoryId` | `pages/AutonomousTestingPage.tsx`, `services/autonomous-testing.ts` | ✅ Fully implemented | History and refresh controls are wired. |
| `POST /api/autonomous-testing/unit/run` | `pages/AutonomousTestingPage.tsx`, `services/autonomous-testing.ts` | ✅ Fully implemented | Selectable supported suites and result UI. |
| `POST /api/autonomous-testing/integration/run` | `pages/AutonomousTestingPage.tsx`, `services/autonomous-testing.ts` | ✅ Fully implemented | Base URL and suite submitted. |
| `POST /api/autonomous-testing/security/run` | `pages/AutonomousTestingPage.tsx`, `services/autonomous-testing.ts` | ✅ Fully implemented | Security scan and result UI. |
| `POST /api/autonomous-testing/run-modes/run` | `pages/AutonomousTestingPage.tsx`, `services/autonomous-testing.ts` | ⚠️ Partial | Mode form/result wired; backend supports optional frontend/dashboard/integration URLs, but only the visible black-box URL fields and mode are apparent in inspected page. Confirm mode-specific URLs. |
| `POST /api/autonomous-testing/black-box/run` | `pages/AutonomousTestingPage.tsx`, `services/autonomous-testing.ts` | ✅ Fully implemented | Frontend/dashboard URL form and result display. |
| `POST /api/autonomous-testing/black-box/rerun` | `pages/AutonomousTestingPage.tsx`, `services/autonomous-testing.ts` | ⚠️ Partial | Rerun is wired but baseline selection/validation UX needs review; page appears to use a saved baseline implicitly. |

### Backend operations without a user-facing UI

The missing analysis worker lifecycle routes (`start`, `progress`, `complete`) are considered internal orchestration operations. The remaining ❌ and ⚠️ rows are user-visible gaps to resolve in Phase 3, except where the operation is deliberately only a backend substage of the combined test workflow. Phase 3 should explicitly document any endpoint kept internal-only.

## Reverse audit: frontend-only, placeholder, and suspect wiring

| Finding | Location | Assessment |
|---|---|---|
| Hardcoded local API origin | `services/api.ts`, `apps/web/.env.example` | Addressed in Phase 3: `VITE_API_BASE_URL` overrides the local development default. |
| Search input advertises projects/repositories/reports but only stored local text | `components/dashboard/SearchBar.tsx`, `pages/ProjectsPage.tsx` | Addressed: submit navigates to projects with a query applied to project name/description. |
| Notification dropdown read static `notification.data.ts` | `components/dashboard/NotificationDropdown.tsx` | Addressed: loads recent analysis activity from API; no dedicated notification endpoint exists, so read state is local presentation state. |
| Mobile “Menu” button had no handler | `components/Navbar.tsx` | Addressed: button toggles public mobile navigation links. |
| Memory selected first project/repository | `pages/MemoryPage.tsx` | Addressed: explicit project/repository selectors; a repository query parameter is resolved to its owning project when possible. |
| Dashboard retained placeholders after request failure | `pages/DashboardPage.tsx` | Addressed: shows unavailable values and an error message instead of zero/fake totals. |
| Audit client sent `runId` filter unsupported by server | `services/analysis.ts` `getAuditLogs`, `pages/AuditLogPage.tsx` | Addressed: unsupported query parameter removed. |
| “Logout” is client-only | `services/auth.ts`, `components/dashboard/UserMenu.tsx`, `Sidebar.tsx`, `MobileSidebar.tsx` | No logout endpoint exists. Clearing local JWT is the available behavior. |
| Ownership boundaries on audit/import/chat/test-run | API controllers and services | Addressed in Phase 3: audits are actor-scoped; import, chat, and Playwright run resolve resources against the authenticated owner. Verify cross-owner requests in Phase 4. |
| CI page takes `apiUrl` from user | `pages/CiIntegrationPage.tsx` | This field is included by CI generation contract; check default/validation and use in generated artifact in Phase 3/4. |
| No server event subscription for analysis/chat progress | Analysis progress and `hooks/useChat.ts` | UI polling/request handling is used; backend inventory has no SSE/WebSocket route. |
| Generated reports/runs may show host-local paths | Analysis report and autonomous/testing result components | No dedicated trace/generated-suite download endpoint exists; browser cannot assume API filesystem paths are directly accessible. |

No frontend API call to a wholly unregistered REST path was confirmed in the service scan. Direct service use and polling behavior still need contract/runtime validation in Phase 4. Public anchor links in `Navbar.tsx` are section links on the home page and are intentional.

## Phase 3 implementation progress

- Added analysis summary, merge-gate, and cancellation actions; completed patch validation, sandbox application, and GitHub PR actions.
- Fixed signup/login error status contracts and owner-scoped audit, repository import, chat, and direct test-run operations.
- Added direct Playwright execution and failure triage UI. The test-run API resolves workspace from an authenticated owner-scoped repository rather than trusting a submitted path.
- Replaced static dashboard notifications with API-backed analysis activity, connected dashboard search to project filtering, enabled public mobile navigation, and made dashboard failures visible.
- Added an environment-configurable API origin and `.env.example`; made repository selection explicit in Memory and Test Intelligence; removed the unsupported audit `runId` filter.
- Phase 3 source changes were followed by the Phase 4 verification results below; end-to-end gaps are listed explicitly there.

## Phase 4 verification results

- `pnpm build` — passed for API and web. Vite emitted a bundle-size warning: the main JavaScript chunk is about 716 kB before gzip (207 kB gzip).
- `pnpm lint` — passed with no ESLint errors or warnings.
- `pnpm --dir apps/web exec tsc -b` — passed.
- `pnpm test` — passed: 17 tests, 0 failures.
- Local smoke checks — Vite home page returned HTTP 200; API `/auth/me` returned expected 401 without a token; invalid login returned 401; CORS preflight returned 204 with `Access-Control-Allow-Origin: *`.
- API and web dev servers started locally. Database reachability was confirmed indirectly through the valid login request returning 401 for a nonexistent test account rather than a database error.
- Configured Groq `/models` and Ollama `/api/tags` endpoints both returned HTTP 200. GitHub import/PR actions, Docker-backed Playwright, and browser-authenticated CRUD flows were not exercised end to end.
- The first in-sandbox build/test attempts failed with child-process `EPERM`; rerunning those commands with approval outside the sandbox passed. A separate in-sandbox Vite startup had the same issue; the approved startup succeeded.
- No browser E2E/component test harness is configured in `apps/web`. Full click-through negative-path coverage, expired-session behavior, cross-owner authorization requests, uploads, and GitHub PR delivery remain manual QA items.
