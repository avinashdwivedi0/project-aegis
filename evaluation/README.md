# Phase 9 Evaluation

The benchmark manifest is [benchmark/manifest.json](benchmark/manifest.json). It records the fixture versions, issue categories, ground-truth IDs, comparison baselines, and metric names. The manifest does not claim experimental results.

Run the deterministic evaluator from the repository root:

```text
pnpm --dir apps/api check:phase9:evaluation
```

The evaluator uses [phase9-fixture.json](phase9-fixture.json) to verify the metric implementation. Replace that fixture with a recorded benchmark result only after pinning the repository revision, tool versions, provider/model, prompt version, configuration, and raw outputs.

Metrics are calculated as follows:

- Detection: precision, recall, and F1 from set-based finding IDs.
- Repair acceptance: accepted repairs divided by attempted repairs.
- Repair validation pass rate: validated repairs divided by accepted repairs.
- Regression rate: repairs marked as regressing divided by accepted repairs.

A zero denominator produces `0`; this makes empty or unsupported runs explicit instead of manufacturing a result.
