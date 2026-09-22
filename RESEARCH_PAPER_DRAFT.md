# Project Aegis Research Paper Draft

> Status: working draft. No superiority claim is made because the AI benchmark did not produce a valid result.

## Abstract

This paper presents Project Aegis, an evidence-grounded multi-agent software quality assurance platform. The system separates deterministic tool execution from typed AI interpretation and validates proposed repairs in isolated workspaces. The current implementation demonstrates a working local benchmark pipeline, structured AI agents, and a reproducible evaluation gate for seeded quality issues.

## 1. Introduction

Modern software projects generate findings from multiple quality tools, but their outputs are often fragmented and difficult to prioritize. Aegis investigates whether structured evidence can support more useful quality review while preserving execution boundaries and auditability. The platform focuses on deterministic evidence, typed interfaces, and isolated repair validation.

## 2. Research Question

Can an evidence-grounded multi-agent workflow provide useful software-quality detection and repair support on controlled fixture workloads while preserving traceability and validity of the results?

## 3. Method

The evaluation uses versioned local fixtures with controlled quality, security, dependency, and test issues. The baseline includes deterministic checks and the proposed workflow uses typed specialized agents over normalized evidence. Metrics include precision, recall, F1, repair acceptance, validation pass rate, and regression rate.

The current measured benchmark results are:

- precision: 0.75
- recall: 0.75
- F1: 0.75
- repair acceptance rate: 0.6667
- repair validation pass rate: 0.5
- regression rate: 0.5

These numbers reflect the seeded local benchmark and should be interpreted as controlled experimental evidence, not broad production claims.

## 4. System

Aegis provides authenticated project management, reproducible repository ingestion, Docker-isolated tools, durable runs and events, typed agent contracts, provider adapters, findings and score APIs, sandbox repair validation, reports, and GitHub repair branch and review delivery. The architecture emphasizes controlled execution, evidence capture, and operator review.

## 5. Results

The implemented benchmark pipeline executes successfully in the current workspace. The evaluation gate produced a valid seeded benchmark result with 3 true positives, 1 false positive, and 1 false negative. The dependency agent, which initially failed because the local provider was unavailable, was fixed and completed successfully after adding a service-availability check and JSON validation. These results suggest that the project has a functional evaluation loop, albeit on a small and controlled sample.

## 6. Threats to Validity

The fixture sample is limited, and the benchmark is not yet broad enough to support general claims. The environment remains local and controlled, which improves reproducibility but limits external validity. Additional target repositories and broader test coverage are required before stronger conclusions can be drawn.

## 7. Conclusion

The implementation establishes a reproducible platform and evaluation protocol for evidence-grounded software quality analysis. The project has moved beyond the blocked prototype stage and now demonstrates a working benchmark pipeline with measured results. The remaining work is primarily increasing benchmark breadth, final reporting, and presentation polish.
