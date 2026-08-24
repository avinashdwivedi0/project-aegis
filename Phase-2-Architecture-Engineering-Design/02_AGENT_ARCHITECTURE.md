# Agent Architecture

## Project Understanding Agent
Builds a structured project map. Read-only.

## Quality Analysis Agent
Interprets code-quality evidence and identifies maintainability patterns. Read-only.

## Security & Testing Agent
Interprets security/test evidence and proposes safe tests. Restricted tools.

## Repair Agent
Generates candidate patches. No automatic application.

## Report & Recommendation Agent
Synthesizes findings into user-facing reports. Cannot hide critical findings.

## Agent Contract
Each agent has defined inputs, outputs, permissions, model policy, prompt version, failure behavior, and evaluation metrics.
