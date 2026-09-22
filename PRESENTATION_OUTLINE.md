# Project Aegis Presentation Outline

## Slide 1 — Title
Project Aegis
AI-Powered Software Quality Assessment and Repair Platform

## Slide 2 — Problem
Modern software teams receive fragmented quality signals from linting, dependency scans, tests, and security tools. These outputs are hard to interpret, prioritize, and act upon consistently.

## Slide 3 — Solution
Project Aegis combines:
- deterministic evidence collection
- typed AI agent interpretation
- sandboxed repair validation
- evidence-backed reporting

## Slide 4 — Architecture Overview
- API layer
- PostgreSQL + Prisma persistence
- Docker sandbox runner
- Specialized AI agents
- React frontend
- Findings and repair workflow

## Slide 5 — Evidence-first Design
- quality tools produce normalized evidence
- AI agents only act on typed structured input
- no arbitrary execution outside the sandbox boundary

## Slide 6 — Agent Workflow
- Project Analyzer
- Code Quality Agent
- Security Agent
- Dependency Agent
- Test Agent
- Repair Agent
- Report Agent

## Slide 7 — Repair and Validation
- proposed repair generated from evidence
- patch reviewed in isolated workspace
- validation rerun with recorded results
- approval required before external delivery

## Slide 8 — Evaluation Method
- seeded local benchmark fixtures
- deterministic baseline and AI pipeline comparison
- precision, recall, F1, repair acceptance, validation pass rate, regression rate

## Slide 9 — Current Results
- Phase 9 evaluation gate passed
- dependency agent benchmark completed successfully after provider fix
- measured local benchmark results: precision 0.75, recall 0.75, F1 0.75

## Slide 10 — Limitations
- benchmark remains small and local
- not enough external repositories yet
- stronger claims require wider dataset and repeated runs

## Slide 11 — Future Work
- larger pinned repository benchmark
- expanded repair validation suite
- stronger model routing and provider resilience
- final submission/report preparation

## Slide 12 — Conclusion
Project Aegis demonstrates a practical, evidence-grounded approach for software quality assessment and controlled repair assistance in a structured MVP framework.
