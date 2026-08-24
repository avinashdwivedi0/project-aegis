# AI Architecture

## Layers
Provider abstraction → model router → agent runtime → context builder → tools → structured output validator → persistence → evaluation telemetry.

## Context
Prefer structured findings, project maps, selected source snippets, test results, and dependency metadata over indiscriminate full-repository prompting.

## Provider Strategy
Local model first for suitable routine tasks; cloud models only where permitted and where evaluation shows material benefit.
