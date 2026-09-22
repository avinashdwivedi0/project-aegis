# Phase 9 Results Analysis

Generated: 2026-09-21T06:40:59.020Z

## Evidence

- Baseline commands: 4
- Baseline passes: 2
- Baseline failures: 2
- Unavailable tool commands: 0
- Intentional seeded test failures: 1
- AI provider: ollama (qwen2.5-coder:7b)
- AI status: completed (none)
- AI findings produced: 2
- AI quality-fixture detection precision/recall/F1: 1/1/1

## Conclusions

- The deterministic baseline contains one passing build and one intentional failing test.
- The quality fixture's ESLint command detects the seeded no-eval issue after isolated dependencies are installed.
- The AI pipeline returned schema-valid findings for the two quality-fixture ground-truth issues; this is a single-fixture detection result, not a general performance claim.

## Limitations

- Only two local fixtures were executed.
- The AI detection comparison covers only the TypeScript quality fixture.
- The metric fixture validates implementation arithmetic and is not an experimental result.

No repair metric is reported because this benchmark run did not apply or validate a patch. The detection result is limited to the TypeScript quality fixture.
