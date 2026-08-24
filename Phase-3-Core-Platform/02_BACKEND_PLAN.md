# Backend Plan

Modules:
- auth
- users
- projects
- sources
- workspaces
- analyses
- stages
- findings
- repairs
- agents
- reports
- audit

Rules:
- Domain logic stays out of controllers.
- Validation at boundaries.
- Typed service contracts.
- Centralized error handling.
- Explicit authorization checks.
- Idempotency for job creation where needed.
