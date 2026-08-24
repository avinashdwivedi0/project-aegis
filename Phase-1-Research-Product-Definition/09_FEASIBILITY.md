# Feasibility Study

## Technical
Feasible using existing static-analysis, security, testing, containerization, database, and LLM technologies. The key engineering risk is safe orchestration of untrusted repositories.

## Economic
Use open-source tooling and local models where practical. Cloud AI should be optional and controlled by a provider abstraction.

## Operational
The workflow must be understandable to developers and expose evidence, not only AI prose.

## Schedule
The project is feasible if Version 1 scope is frozen and advanced features are deferred.

## Research
Feasible because deterministic analyzers can provide baselines and AI components can be evaluated independently.

## Main Risks
- AI hallucination
- sandbox escape
- long analysis times
- excessive cloud cost
- scope creep
- insufficient benchmark data
- unreliable repair patches

## Mitigation
Evidence grounding, isolation, resource limits, model routing, strict scope gates, reproducible experiments, and mandatory revalidation.
