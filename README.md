# AI Software Quality Assurance Platform — Six-Phase Documentation

This package defines the project from research through finalization.

## Phase Order

1. Research & Product Definition
2. Architecture & Engineering Design
3. Core Platform
4. AI & Multi-Agent System
5. Product Integration & Validation
6. Research, Deployment & Finalization

## Governance Rule

A phase must satisfy its exit criteria before the next phase is treated as active.

## AI Tool Usage Rule

Use the best tool for the task rather than forcing one AI to do everything:
- ChatGPT: research, architecture, requirements, evaluation design, technical reasoning.
- Claude: large-context review and complex frontend/UI work when advantageous.
- Cursor/Codex: implementation inside the repository and multi-file code changes.
- Local models/Ollama: privacy-sensitive or routine tasks where quality is sufficient.

The selected tool must not override the project's architecture, security, research, or scope rules.

## Core Engineering Rule

Deterministic evidence → normalized findings → AI interpretation → human-approved repair → independent revalidation.

## Source of Truth

These documents are the baseline. Any major change should be recorded as an Architecture Decision Record or project decision and reflected in the relevant phase documentation.
