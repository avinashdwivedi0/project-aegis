# Project Aegis Demo Script

## Objective
Present a concise, evidence-grounded walkthrough of the platform: project creation, repository import, analysis execution, evidence review, repair proposal, validation, and export.

## Demo Flow (10 minutes)

### 1. Opening and project context (30s)
- State the project goal: AI-powered software quality assessment and repair assistance.
- Explain the core value: deterministic tool evidence + structured AI interpretation + sandboxed repair validation.
- Mention the final-year MVP focus and the fact that the demo uses a known, reproducible repository.

### 2. Create a project (45s)
- Open the app.
- Create a new project.
- Enter a project name and repository metadata.
- Show that the project is now listed in the dashboard.

### 3. Import repository (60s)
- Connect or import a known repository.
- If using a local fixture or GitHub repository, show the import flow.
- Explain the safe ingestion and workspace boundary controls.
- Confirm the repository appears in the project detail view.

### 4. Start analysis (45s)
- Click "Start Analysis".
- Explain what is happening behind the scenes:
  - project analysis
  - file discovery
  - deterministic tool execution
  - evidence collection
  - agent interpretation
- Show live progress with stage names and status updates.

### 5. Show project understanding and findings (90s)
- Display the generated project profile.
- Highlight discovered technologies, package manager, framework, and entry points.
- Open the findings list.
- Walk through sample findings such as:
  - dependency vulnerability
  - test failure
  - code-quality issue
- Point to evidence source, severity, and confidence.

### 6. Explain AI reasoning (60s)
- Open a finding detail panel.
- Show source evidence and explanation.
- Clarify the guardrails:
  - evidence-driven output
  - typed contracts
  - no direct arbitrary execution
  - validation before repair claims

### 7. Generate repair proposal (60s)
- Select a finding that has a repair recommendation.
- Show the repair workflow.
- Explain that the patch is proposed in a sandbox before approval.
- Review the diff.

### 8. Validate repair (60s)
- Approve the repair.
- Re-run validation and show before/after behavior.
- Highlight that the patch is checked in an isolated execution context.
- Show regression result and validation evidence.

### 9. Report export and completion (30s)
- Open the report view.
- Show the generated summary report and findings count.
- Explain how the export supports review and auditability.

## Spoken script

"This demo shows Project Aegis as an evidence-grounded software quality platform. We begin with a project, import a repository, and trigger analysis. The system first profiles the project and then runs deterministic quality tools in a controlled environment. Each result is normalized into evidence, and the AI agents interpret that evidence without bypassing the execution and security boundaries. We then review the findings, inspect the supporting evidence, and generate a minimal repair proposal. Importantly, the repair is not applied directly to the user repository; it is validated in a sandbox first. After validation, the system records the evidence and produces a report. That combination of deterministic tooling, structured AI reasoning, and controlled validation is the core contribution of Project Aegis."

## Backup / fallback option
If the live environment is unavailable:
- show screenshots of the dashboard,
- highlight the repository import screen,
- show the analysis progress screen,
- show the finding list and repair diff,
- narrate the validation steps with the recorded output and evidence logs.

## Key demo metrics to mention
- project profiling and import complete
- findings generated from deterministic evidence
- repair proposal generated in sandbox
- validation pass or fail recorded with evidence
- report export available for review
