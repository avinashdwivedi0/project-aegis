# Technical Requirements Document

## Architecture Direction
Next.js/React/TypeScript frontend; Node.js/TypeScript backend; PostgreSQL; Prisma; asynchronous analysis jobs; isolated Docker workers; provider-agnostic AI layer.

## Major Components
- Frontend
- API/backend
- Project service
- Workspace manager
- Analysis orchestrator
- Job queue
- Tool adapters
- Finding normalization engine
- AI orchestrator
- Repair engine
- Results/report service

## Initial Analysis Tool Candidates
- TypeScript compiler
- ESLint
- Semgrep
- Dependency/security audit tooling
- Playwright
- Lighthouse
- Jest/Vitest

Final tool selection must be validated for licensing, reproducibility, compatibility, and output quality.

## Security Requirements
Untrusted repositories must run in isolated environments with CPU, memory, disk, time, and network controls. No host filesystem access. No uncontrolled command execution. Secrets must be protected/redacted.

## AI Requirements
Structured outputs, provenance, prompt/model versioning, evidence grounding, bounded tool access, validation, retries, and human approval for consequential changes.

## Reliability
Long jobs are asynchronous, retryable where appropriate, timeout-protected, observable, and explicit about partial failure.

## Performance
Targets are established after baseline measurements rather than invented upfront.
