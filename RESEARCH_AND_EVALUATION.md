# Research and Evaluation Plan

## Research direction

The project should evaluate whether an agentic AI pipeline that combines
deterministic software-quality tools with contextual AI reasoning can
improve defect analysis and repair usefulness.

## Proposed research question

**Can a specialized multi-agent software-quality pipeline improve the
accuracy, usefulness, and repair success of automated software analysis
compared with deterministic tooling alone?**

## Hypotheses

### H1

AI-assisted contextual analysis will identify useful issues that
deterministic tools alone do not adequately explain or prioritize.

### H2

AI-generated repair patches will successfully resolve a measurable
subset of seeded issues without introducing regressions.

### H3

Combining deterministic evidence with AI reasoning will reduce
unsupported findings compared with unconstrained AI-only analysis.

## Experimental setup

Create a benchmark containing projects with known, controlled issues.

For each project:

1.  Establish baseline.
2.  Run deterministic tools.
3.  Run AI-assisted pipeline.
4.  Compare findings against ground truth.
5.  Generate repairs.
6.  Validate repairs.
7.  Measure regressions.

## Metrics

### Detection

-   Precision
-   Recall
-   F1 score
-   False-positive rate

### Repair

-   Repair success rate
-   Regression rate
-   Test pass rate
-   Human acceptance rate

### System

-   Analysis duration
-   Resource usage
-   Model latency
-   Token/API cost

### Usability

-   Time to understand findings
-   Time to resolve selected issues
-   User rating of explanations

## Research integrity

The system must preserve enough metadata to reproduce experiments:

-   Project version
-   Tool versions
-   Configuration
-   Model
-   Prompt-template version
-   Analysis timestamp
-   Findings
-   Patches
-   Validation results

## Limitations to document

-   AI can hallucinate.
-   Ground truth is difficult for real-world projects.
-   Tool coverage varies by language/framework.
-   Some security issues require expert review.
-   Passing tests does not prove correctness.
-   Performance measurements can vary by environment.
