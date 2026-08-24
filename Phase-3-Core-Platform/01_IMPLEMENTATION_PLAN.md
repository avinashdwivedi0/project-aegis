# Core Implementation Plan

## Foundation
- Repository initialization
- TypeScript configuration
- Linting/formatting
- Environment configuration
- CI

## Backend
- Auth
- Projects
- Sources
- Analysis jobs
- Job status/events
- Persistence

## Workspace
- Temporary directory lifecycle
- Container execution
- Resource limits
- Cleanup

## Analysis
Implement adapters one by one:
1. TypeScript/compiler
2. ESLint
3. Dependency audit
4. Security scanner
5. Test runner
6. Performance/accessibility tool

## Finding Pipeline
Raw output → adapter parser → canonical finding → deduplication → persistence.

## Frontend
Project list, project detail, analysis controls, progress, findings.

## Completion
All critical flows have automated tests and observable failure states.
