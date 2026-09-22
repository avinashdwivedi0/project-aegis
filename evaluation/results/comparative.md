# Phase 9 Comparative Experiment

Generated: 2026-09-21T06:41:00.908Z

| Fixture | AI status | Precision | Recall | F1 |
| --- | --- | ---: | ---: | ---: |
| TypeScript quality | completed | 1.000 | 1.000 | 1.000 |
| Node dependencies/tests | failed/completed | 1.000 | 0.500 | 0.667 |

## Interpretation

The quality fixture's two ground-truth issues were detected. The Dependency and Test Agents jointly detected both dependency-fixture ground-truth issues. These are observed fixture results, not general performance claims.

## Repair

One minimal assertion patch was applied in a temporary workspace. Validation passed and no regression was observed.

## Limitations

- Repair metrics cover one controlled local fixture patch.
- Two small local fixtures do not support generalization.
