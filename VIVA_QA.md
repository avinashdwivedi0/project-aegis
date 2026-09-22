# Viva Questions and Answers

## 1. What problem does Project Aegis solve?
It reduces the gap between raw tool output and actionable software-quality decisions. Instead of relying on disconnected diagnostics, the platform converts tool output into structured evidence and uses specialized agents to interpret that evidence in a traceable way.

## 2. Why use both deterministic tools and AI agents?
Deterministic tools provide reliable, reproducible evidence. AI agents are used to interpret, prioritize, and explain that evidence. This keeps the system grounded in evidence rather than letting free-form AI reasoning operate without checks.

## 3. What is the security model?
The system uses isolated execution, workspace boundaries, sandbox validation, explicit approval flows, and provider-level boundaries. Repairs are not applied blindly; they are validated before they are treated as successful.

## 4. Why is the sandbox important?
It prevents unreviewed or unsafe changes from reaching the user repository. It also allows validation to occur in an isolated environment so results can be measured and rolled back if needed.

## 5. What was the main technical challenge?
The main challenge was building a trustworthy pipeline: deterministic tool execution, durable run tracking, provider resilience, evidence normalization, and repair validation all needed to work together without losing traceability.

## 6. How were the agents validated?
The project uses phase-gate checks, contract validation, and controlled benchmark fixtures. The benchmark results are measured with precision, recall, F1, repair acceptance, validation pass rate, and regression rate.

## 7. What are the limitations?
The benchmark is small and local, not broad enough for general production claims. More external repositories and repeated runs are needed before making strong claims about general performance.

## 8. What is the future work?
The next step is larger benchmark coverage, stronger repair-validation coverage, more target repositories, and final documentation and presentation delivery.

## 9. How does the system handle AI hallucination risk?
The design minimizes that risk by using typed contracts, evidence as the input, required JSON outputs, severity/confidence fields, and validation gates. The system does not accept free-form unstructured outputs as the basis for applying change.

## 10. What is the contribution of the project?
The contribution is an evidence-grounded, controlled-quality platform that combines deterministic tools, multi-agent reasoning, and sandbox validation into a reproducible workflow for software quality assessment and repair support.
