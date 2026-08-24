# System Architecture

```text
Browser
  |
Frontend
  |
Backend/API
  |
+------------------------------+
| Project / Auth / Results     |
+------------------------------+
  |
Analysis Orchestrator
  |
Job Queue
  |
Isolated Workers
  |-- Static Analysis
  |-- Security
  |-- Dependencies
  |-- Tests
  |-- Performance
  |
Finding Normalization
  |
AI Orchestrator
  |-- Project Understanding
  |-- Quality Analysis
  |-- Security & Testing
  |-- Repair
  |-- Reporting
  |
Results Store
  |
Dashboard / Export
```

Deterministic analyzers remain the evidence-producing layer. AI consumes validated evidence and source context subject to policy.
