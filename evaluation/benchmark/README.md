# Benchmark Fixtures

The fixtures in this directory are intentionally small, versioned local projects for smoke evaluation and demonstrations.

- `fixture-typescript-quality`: contains a dynamic evaluation call and a clearly labeled fixture credential.
- `fixture-node-dependencies`: pins an intentionally vulnerable dependency and contains a controlled failing test.

These are seeded evaluation inputs, not production examples. Their ground truth is recorded in [manifest.json](manifest.json). Validate the manifest with:

```text
pnpm --dir apps/api check:phase9:benchmark
```

The benchmark gate checks metadata and paths only. It does not claim precision, recall, repair success, or any other experimental result.

Run the deterministic baseline capture with:

```text
pnpm --dir apps/api run:phase9:baseline
```

Results are written to `evaluation/results/baseline.json` with command,
version, exit code, timestamps, and bounded stdout/stderr. The current local
capture records the intentional failing test and an unavailable ESLint binary;
install fixture dependencies before treating static-tool results as valid.

Run the local AI pipeline benchmark with:

```text
pnpm --dir apps/api run:phase9:ai
```

This uses the configured Ollama model (`OLLAMA_MODEL`, defaulting to
`qwen2.5-coder:7b`) through the Aegis provider contract and writes
`evaluation/results/ai-pipeline.json`. A failed provider or agent result is
retained as evidence and must not be counted as a detection score. The current
run reached Ollama but failed agent-output validation after the bounded timeout.

The dependency-fixture run is recorded in `evaluation/results/ai-dependency.json`;
the combined scoped comparison is in `evaluation/results/comparative.md`. The
comparison excludes repair metrics and does not evaluate the seeded failing test
with the Test Agent yet.

The isolated repair experiment is recorded in `evaluation/results/repair.json`
and contributes one observed case to the comparison: the minimal patch passed
validation with no regression. This is not a general repair-success claim.
