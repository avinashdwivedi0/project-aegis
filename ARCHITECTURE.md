# System Architecture

## 1. High-level architecture

``` text
Web Client
   |
API / WebSocket Gateway
   |
Project Service ---- Database
   |
Analysis Orchestrator
   |
   +-- Project Discovery
   +-- Static Analysis
   +-- Security Agent
   +-- Code Quality Agent
   +-- Dependency Agent
   +-- Test Agent
   +-- API Agent
   +-- UI/Accessibility Agent
   +-- Performance Agent
   +-- Repair Agent
   +-- Report Agent
   |
Sandbox / Runner
   |
Evidence Store
```

## 2. Architectural principles

### Separation of deterministic analysis and AI reasoning

Use deterministic tools whenever a rule can be checked reliably without
an LLM.

AI should primarily handle:

-   cross-tool reasoning;
-   prioritization;
-   contextual explanations;
-   root-cause analysis;
-   repair generation;
-   test generation;
-   repair validation reasoning.

### Isolation

Untrusted project code must execute inside an isolated sandbox.

### Reproducibility

An analysis run should record:

-   project version/commit;
-   tool versions;
-   configuration;
-   model/provider;
-   prompts or prompt template version;
-   timestamps;
-   results.

### Modular agents

Agents communicate through typed inputs and outputs rather than directly
modifying shared state.

## 3. Core services

### Project Service

Manages project metadata and source versions.

### Analysis Orchestrator

Creates and schedules analysis jobs.

### Tool Runner

Executes deterministic analyzers in the sandbox.

### Agent Service

Runs specialized AI agents through a provider abstraction.

### Findings Service

Normalizes results into a common finding model.

### Repair Service

Creates patches and validates them.

### Report Service

Aggregates results into human-readable reports.

## 4. AI provider abstraction

``` text
Agent
  |
AI Provider Interface
  |
  +-- Local Ollama
  +-- Cloud Provider
  +-- Future Provider
```

No agent should directly depend on a specific model provider.

## 5. Initial deployment

For the final-year MVP:

-   Frontend and API can run on one development machine.
-   PostgreSQL stores application metadata.
-   Local filesystem/object storage stores project artifacts.
-   Docker provides isolated execution.
-   Ollama can provide local model inference.
-   A cloud model may be used selectively for difficult reasoning tasks.

## 6. Future scaling

The architecture should allow:

-   job queues;
-   separate worker machines;
-   object storage;
-   Redis;
-   multiple model providers;
-   horizontal worker scaling.

Do not implement distributed infrastructure until the MVP requires it.
