# Pending Work Checklist

This checklist contains work that is genuinely unfinished after the local MVP implementation and seeded evaluation runs.

## Evaluation

- [ ] Run all eight deterministic adapters across every benchmark fixture.
- [ ] Run deterministic baselines on pinned external repositories.
- [ ] Run all applicable AI agents on each pinned repository.
- [ ] Record model, prompt version, tool versions, configuration, duration, and raw outputs.
- [ ] Expand the benchmark beyond the two local fixtures.
- [ ] Analyze false positives and false negatives.
- [ ] Measure detection precision, recall, and F1 across repeated runs.
- [ ] Measure repair acceptance, validation pass rate, and regression rate across multiple findings.
- [ ] Compare deterministic-only, single-model, and multi-agent workflows.
- [ ] Document statistical uncertainty and threats to validity.

## Testing And Quality

- [ ] Add broader API and service unit tests.
- [ ] Add database-backed integration tests for analysis, findings, repair, and reports.
- [ ] Add frontend end-to-end coverage for the complete user workflow.
- [ ] Add security regression tests for authentication, authorization, uploads, paths, and repair delivery.
- [ ] Add repair regression fixtures covering successful, failed, rejected, and reverting patches.
- [ ] Run all deterministic adapters on benchmark fixtures with dependencies installed.
- [ ] Review and resolve remaining lint, dependency, and configuration warnings in fixtures.

## Product Delivery

- [ ] Verify GitHub pull-request creation against a test repository with scoped credentials.
- [ ] Add persisted GitHub delivery audit details and review-summary retrieval if required by the release scope.
- [ ] Confirm production configuration for provider selection, model routing, timeouts, and secrets.
- [ ] Confirm deployment configuration and operational monitoring.

## Final Academic Deliverables

- [ ] Convert [FINAL_REPORT_DRAFT.md](FINAL_REPORT_DRAFT.md) into the institution-formatted final report.
- [ ] Convert [RESEARCH_PAPER_DRAFT.md](RESEARCH_PAPER_DRAFT.md) into the final paper.
- [ ] Add architecture and data-flow diagrams.
- [ ] Add final experiment tables and charts.
- [ ] Document limitations, security considerations, and future work.
- [ ] Finalize the demo dataset and recording or fallback screenshots using [Phase 6 demo plan](Phase-6-Research-Deployment-Finalization/09_DEMO_PLAN.md).
- [ ] Finalize the presentation.
- [ ] Finalize viva questions and answers using [Phase 6 viva preparation](Phase-6-Research-Deployment-Finalization/10_VIVA_PREPARATION.md).
- [ ] Perform final submission review and reproducibility check.

## Current Evidence

- Seeded detection comparison: two local fixtures, observed F1 1.0 on each fixture.
- Seeded repair experiment: one temporary-workspace patch, validation passed, no regression observed.
- These results are preliminary and do not justify broad performance claims.
