Project Aegis — Complete Technical Definition
1. Project Description

Project Aegis is an AI-powered multi-agent software quality assessment and recommendation platform designed to analyze software projects across multiple quality dimensions, identify defects and risks, explain why those issues matter, and provide evidence-based recommendations for improving the software.

The system acts like an AI Software Quality Engineer.

A developer provides a software project or connects a project repository. Aegis first understands the project structure and technology stack, then creates an analysis plan and delegates different quality checks to specialized analysis agents.

The results from these agents are normalized into a common quality model, correlated with project context and supporting evidence, and passed to a recommendation engine. The platform then presents the findings through a dashboard and generates a comprehensive quality report.

The important distinction is:

Aegis does not simply ask an LLM to "review my code." It combines deterministic software-analysis tools, project context, structured evidence, and AI agents to produce explainable quality assessments.

2. Core Objective

The primary objective is to develop a system capable of:

Understanding a software project
Analyzing its quality
Detecting problems
Classifying and prioritizing those problems
Explaining the evidence behind each finding
Generating actionable recommendations
Tracking the overall quality of the project
Generating a professional quality report

The research objective is to investigate whether a multi-agent, evidence-based architecture can provide more useful and explainable software-quality assessment than relying on a single general-purpose LLM.

3. What Aegis Can Do

At its core, the system will be able to take:

Software Project
       ↓
Project Understanding
       ↓
Quality Analysis
       ↓
Evidence Collection
       ↓
AI Reasoning
       ↓
Finding Prioritization
       ↓
Recommendations
       ↓
Quality Dashboard
       ↓
Final Report

For example, suppose a project contains:

authentication/
    login.ts
    auth.ts
    middleware.ts

Aegis could detect that a token-related implementation has a security weakness.

Instead of returning:

"Your authentication has a security issue."

it should produce something closer to:

Finding:
JWT configuration may allow tokens without an appropriate expiration.

Severity:
HIGH

Category:
Security

Evidence:
auth.ts → token generation logic

Reason:
Long-lived authentication tokens increase the impact of token theft.

Recommendation:
Configure an appropriate token expiration policy and implement
token refresh/revocation mechanisms where required.

Reference:
Relevant security guidance

Confidence:
0.91

That evidence → reasoning → recommendation chain is fundamental to the project.

4. Core Functionalities
4.1 Project Ingestion

The user will be able to provide a software project for analysis.

The ingestion subsystem will:

Accept a project/repository.
Identify files and directories.
Detect programming languages.
Detect frameworks.
Detect dependency manifests.
Identify configuration files.
Identify tests.
Build an initial project inventory.

Example:

Project
 ├── TypeScript
 ├── React
 ├── Express
 ├── PostgreSQL
 ├── Jest/Vitest
 └── Docker
4.2 Project Intelligence

Before analyzing individual quality dimensions, Aegis builds a representation of the project.

It should understand:

Project structure
Components/modules
Dependencies
APIs
Configuration
Tests
Documentation
Technology stack
Potential architectural boundaries

This context is then supplied to the analysis system.

4.3 Multi-Agent Quality Analysis

Instead of one giant agent doing everything, Aegis will use specialized agents.

Conceptually:

                 AI Orchestrator
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   Security Agent   Code Agent    Testing Agent
        │              │              │
        ↓              ↓              ↓
   Performance     Architecture    Dependency
      Agent           Agent          Agent

The exact number of agents will be finalized during implementation based on feasibility and research requirements.

4.4 Code Quality Analysis

The platform will examine aspects such as:

Code smells
Complexity
Duplication
Maintainability
Naming quality
Error handling
Unnecessary complexity
Potential bugs
Poor coding patterns

Where possible, deterministic analysis tools should provide the initial evidence, while AI interprets the results in project context.

4.5 Security Analysis

Security analysis will identify issues such as:

Vulnerable coding patterns
Authentication weaknesses
Authorization problems
Insecure configuration
Sensitive-data exposure
Dependency vulnerabilities
Injection-related risks
Security misconfigurations

The AI should not simply invent security findings.

Findings should be tied to observable evidence.

4.6 Testing & Test Quality Analysis

Aegis will inspect:

Presence of tests
Test organization
Test coverage information where available
Missing test scenarios
Edge-case coverage
API testing
Error-path testing
Regression-risk areas

The system can then recommend additional tests.

Example:

Finding:
Authentication failure paths are insufficiently tested.

Risk:
Changes to authentication behavior may introduce regressions.

Recommendation:
Add tests for invalid credentials, expired tokens,
missing authorization headers, and unauthorized access.
4.7 Architecture Analysis

The architecture agent will examine the structural organization of the application.

It can identify:

Strong coupling
Poor separation of concerns
Circular dependencies
Layer violations
Inappropriate responsibility allocation
Architectural inconsistencies
Potential scalability problems

This is important because software quality isn't just about syntax or bugs.

4.8 Dependency Analysis

The platform will inspect:

Dependency configuration
Outdated packages
Vulnerable dependencies
Unnecessary dependencies
Dependency relationships
Version inconsistencies

This analysis can combine deterministic package-manager/security-tool output with AI interpretation.

4.9 Documentation Quality

Aegis can assess whether the project contains adequate:

README documentation
API documentation
Architecture documentation
Setup instructions
Configuration documentation
Code-level documentation

It can identify documentation gaps and recommend improvements.

4.10 Performance Analysis

The performance subsystem can identify potential performance problems through static/project-level analysis and, where supported, runtime evidence.

Examples include:

Inefficient algorithms
Repeated expensive operations
Database-query concerns
Excessive API calls
Large dependency/resource usage
Potential bottlenecks

Important scope constraint:

Version 1 will not pretend that static inspection can accurately measure every runtime performance characteristic.

Actual runtime benchmarking/profiling belongs to the advanced scope.

4.11 Finding Correlation

This is an important feature.

Different agents may discover related issues.

For example:

Security Agent
       ↓
Authentication weakness

Code Agent
       ↓
Poor error handling

Testing Agent
       ↓
Missing authentication tests

Aegis should recognize that these may concern the same subsystem.

Instead of showing three unrelated problems, it can correlate them into a more meaningful quality picture.

4.12 Evidence-Based Recommendations

Every important recommendation should contain:

Finding
   ↓
Evidence
   ↓
Reasoning
   ↓
Impact
   ↓
Recommendation

This makes the system more explainable.

4.13 Severity & Prioritization

Findings will be prioritized using factors such as:

Severity
Confidence
Impact
Evidence strength
Affected component
Security implications
Maintainability implications

The output could classify findings as:

CRITICAL
HIGH
MEDIUM
LOW
INFO

The exact scoring model will be defined and evaluated during the research phase.

4.14 Quality Dashboard

The frontend will provide a centralized dashboard containing information such as:

Overall Quality Score

Security       ████████░░
Code Quality   █████████░
Testing        ██████░░░░
Architecture   ███████░░░
Dependencies   ████████░░
Documentation  ██████░░░░

Users should also be able to drill down into individual findings.

4.15 Quality Report Generation

Aegis will generate a structured report containing:

Executive summary
Overall quality assessment
Findings
Severity
Evidence
Recommendations
Quality metrics
Category-wise analysis
Technical details
Improvement priorities

This is particularly important because the project needs a meaningful research/evaluation artifact in addition to the application itself.

5. High-Level Architecture — HLD
System Context
                    ┌──────────────────────┐
                    │       Developer      │
                    └──────────┬───────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │    Aegis Web UI      │
                    │ React + TypeScript   │
                    └──────────┬───────────┘
                               │
                         REST / HTTP
                               │
                               ↓
                    ┌──────────────────────┐
                    │      Aegis API       │
                    │ Express + TypeScript │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │   Project   │  │   Analysis  │  │   Report    │
       │   Service   │  │   Service   │  │   Service   │
       └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
              │                │                │
              └────────────────┼────────────────┘
                               ↓
                    ┌──────────────────────┐
                    │   AI Orchestrator    │
                    │      LangGraph       │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
        ┌───────────┐    ┌───────────┐    ┌───────────┐
        │ Security  │    │   Code    │    │  Testing  │
        │   Agent   │    │   Agent   │    │   Agent   │
        └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
              │                │                │
              └────────────────┼────────────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Evidence / Quality   │
                    │      Model            │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Recommendation       │
                    │ Engine               │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │     PostgreSQL       │
                    │       + Prisma       │
                    └──────────────────────┘

                    Local AI Runtime
                         Ollama
6. HLD Components
A. Web Application

Technology: React + TypeScript + Vite

Responsibilities:

User interface
Project management UI
Analysis controls
Dashboard
Findings explorer
Reports
Visualization
B. API Layer

Technology: Express + TypeScript

Responsibilities:

HTTP API
Authentication
Request validation
Project management
Analysis lifecycle
Result retrieval
Report requests
C. AI Orchestrator

Technology: LangGraph

Responsibilities:

Create analysis workflow
Select appropriate agents
Pass project context
Manage agent execution
Aggregate outputs
Handle failures
Coordinate evidence
Trigger recommendation generation
D. Analysis Agents

Specialized agents perform individual quality analyses.

They should be modular so that future agents can be added without redesigning the entire system.

E. Evidence Layer

Stores structured evidence associated with findings.

Example:

Finding
 ├── source
 ├── file
 ├── line/range
 ├── tool output
 ├── rule
 ├── severity
 └── confidence
F. Recommendation Engine

Converts findings into actionable recommendations.

It should consider:

Finding
+
Project Context
+
Evidence
+
Quality Rules
+
AI Reasoning
        ↓
Recommendation
G. Database

Technology: PostgreSQL + Prisma

Stores:

Users
Projects
Analysis runs
Findings
Evidence
Recommendations
Reports
Quality metrics
Agent execution information
7. Low-Level Design — LLD

Now we go one level deeper.

Backend Structure
apps/api/

src/

├── app/
│   ├── app.ts
│   └── server.ts
│
├── config/
│   ├── env.ts
│   └── database.ts
│
├── middleware/
│   ├── auth.ts
│   ├── error-handler.ts
│   └── validation.ts
│
├── modules/
│   ├── auth/
│   ├── projects/
│   ├── analysis/
│   ├── findings/
│   ├── recommendations/
│   └── reports/
│
└── infrastructure/
    ├── database/
    ├── ai/
    └── analyzers/
8. Feature-Level LLD
Project Module
projects/
│
├── project.controller.ts
├── project.service.ts
├── project.repository.ts
├── project.routes.ts
├── project.schema.ts
└── project.types.ts

Flow:

HTTP Request
     ↓
Controller
     ↓
Validation
     ↓
Service
     ↓
Repository
     ↓
PostgreSQL

The controller should not contain business logic.

9. Analysis Module
analysis/
│
├── analysis.controller.ts
├── analysis.service.ts
├── analysis.repository.ts
├── analysis.routes.ts
├── analysis.schema.ts
└── analysis.types.ts

The analysis service communicates with the AI orchestration layer.

POST /projects/:id/analysis
             ↓
      Analysis Service
             ↓
      Project Context
             ↓
       AI Orchestrator
             ↓
       Agent Execution
10. Agent LLD

A common agent interface will allow different agents to operate consistently.

Conceptually:

QualityAgent

├── id
├── name
├── category
├── analyze()
└── capabilities

For example:

SecurityAgent
CodeQualityAgent
TestingAgent
ArchitectureAgent
DependencyAgent
DocumentationAgent

Each agent produces a structured result rather than arbitrary text.

Conceptually:

AgentResult

{
    findings: [],
    evidence: [],
    metrics: [],
    confidence: ...
}

This is critical because the orchestrator needs machine-readable outputs.

11. Agent Execution Flow
Project
   ↓
Project Scanner
   ↓
Project Context
   ↓
Analysis Planner
   ↓
AI Orchestrator
   ↓
┌─────────────────────┐
│ Agent Execution     │
│                     │
│ Security            │
│ Code Quality        │
│ Testing             │
│ Architecture        │
│ Dependencies        │
└──────────┬──────────┘
           ↓
Result Normalization
           ↓
Evidence Validation
           ↓
Finding Correlation
           ↓
Recommendation Engine
           ↓
Quality Metrics
           ↓
Report
12. Database-Level LLD

A simplified initial data model:

User
 │
 └── Project
       │
       ├── AnalysisRun
       │       │
       │       ├── AgentRun
       │       │
       │       └── Finding
       │               │
       │               ├── Evidence
       │               │
       │               └── Recommendation
       │
       └── Report

Potential relationships:

User 1 ─── N Project

Project 1 ─── N AnalysisRun

AnalysisRun 1 ─── N AgentRun

AnalysisRun 1 ─── N Finding

Finding 1 ─── N Evidence

Finding 1 ─── N Recommendation

Project 1 ─── N Report

The actual Prisma schema will be created after we finalize the detailed requirements and API contracts.

13. API Architecture

The API will eventually expose resources such as:

/auth
/projects
/analysis
/findings
/recommendations
/reports

Example lifecycle:

POST   /projects
GET    /projects
GET    /projects/:id

POST   /projects/:id/analysis
GET    /analysis/:id
GET    /analysis/:id/findings

GET    /findings/:id
GET    /findings/:id/evidence

GET    /projects/:id/recommendations

POST   /projects/:id/reports
GET    /reports/:id

These are architectural examples, not yet the frozen API contract. We'll define the actual contracts before implementation.

14. AI Architecture

The AI architecture is deliberately hybrid.

          Software Project
                 ↓
        Deterministic Tools
                 ↓
         Raw Observations
                 ↓
        ┌────────────────┐
        │ AI Orchestrator│
        └───────┬────────┘
                ↓
        Specialized Agents
                ↓
        Structured Findings
                ↓
        Evidence Correlation
                ↓
        Recommendation Agent
                ↓
          Final Assessment

The key principle:

LLMs reason over evidence; they should not be treated as the sole source of truth.

This is one of the most important architectural/research principles of Aegis.

15. Hybrid AI Architecture

We previously decided that the system should use a hybrid architecture.

That means we can combine:

Deterministic analysis

Examples:

Linters
Static analysis
Dependency scanners
Test results
Coverage reports
Project metadata

with:

AI analysis

Using Ollama/LangGraph for:

Contextual reasoning
Finding explanation
Cross-finding correlation
Recommendation generation
Documentation assessment
Architectural reasoning

Therefore:

Deterministic Evidence
          +
      AI Reasoning
          ↓
Evidence-Based Assessment

This is significantly stronger than simply sending the entire repository to an LLM.

16. Advanced Functionalities — Version 1

These are the advanced features we actually intend to implement, not merely future ideas.

16.1 Multi-Agent Orchestration

LangGraph will coordinate specialized agents rather than having one agent perform every task.

16.2 Adaptive Analysis

The orchestrator should eventually decide which analyses are relevant based on project characteristics.

Example:

Python + Django

↓

Python Code Analysis
Django Security Analysis
Dependency Analysis
Testing Analysis

versus:

React + Node

↓

JavaScript/TypeScript Analysis
React Analysis
Node Security Analysis
Dependency Analysis
Testing Analysis

This avoids running irrelevant analyses.

16.3 Evidence-Linked Findings

Every finding should retain its origin.

Finding
 ↓
Evidence
 ↓
File
 ↓
Location
 ↓
Rule/Observation
16.4 Confidence Scoring

The system should distinguish:

High confidence
Medium confidence
Low confidence

A high-confidence deterministic security finding should not be treated the same way as an AI-generated architectural hypothesis.

16.5 Finding Correlation

Multiple observations can be connected to a single broader quality issue.

16.6 Explainable Recommendations

Instead of:

Fix this.

the platform explains:

Problem
 ↓
Evidence
 ↓
Why it matters
 ↓
Potential impact
 ↓
Recommended solution
16.7 Quality Knowledge Graph

Version 1 will implement a lightweight knowledge graph model using PostgreSQL relationships/structured entities, rather than immediately introducing a dedicated graph database.

It can represent relationships such as:

Project
  ↓
Component
  ↓
Finding
  ↓
Evidence
  ↓
Risk
  ↓
Recommendation
  ↓
Quality Dimension

This gives us a researchable architecture without unnecessarily increasing deployment complexity.

17. Future Scope

These features are deliberately not required for Version 1.

17.1 Automated Code Fixing

Future versions could allow:

Finding
 ↓
AI-generated Patch
 ↓
Sandbox Validation
 ↓
Tests
 ↓
Developer Approval
 ↓
Apply Fix

This is substantially more difficult than recommendation generation, so it should not be part of the initial implementation unless the core system is already stable.

17.2 Autonomous Fix-and-Verify Loop

Eventually:

Detect
 ↓
Fix
 ↓
Run Tests
 ↓
Re-analyze
 ↓
Verify
 ↓
Accept / Reject

This could become a major future research direction.

17.3 Runtime Observability

Future versions could integrate:

Runtime profiling
Application performance monitoring
Memory analysis
API latency
Database performance
Production telemetry
17.4 CI/CD Integration

Aegis could become a quality gate:

Git Push
   ↓
CI Pipeline
   ↓
Aegis Analysis
   ↓
Quality Gate
   ↓
PASS / FAIL
17.5 Pull Request Review

Future versions could automatically analyze:

Git Diff
 ↓
Affected Components
 ↓
Quality Analysis
 ↓
PR Comments
17.6 Team Collaboration

Future scope could include:

Team projects
Finding assignment
Comments
Issue tracking
Quality trends
Role-based access
17.7 Cloud AI Providers

The current architecture can eventually support external models in addition to Ollama.

For example:

AI Provider Interface

├── Ollama
├── OpenAI
├── Anthropic
└── Other providers

This should be implemented behind an abstraction rather than hard-coding one provider into the business logic.

17.8 Dedicated Vector Database / Graph Database

If evaluation demonstrates that PostgreSQL is insufficient, later versions could introduce:

Vector database
Dedicated graph database
Advanced semantic retrieval

But we should not add them merely because they are technologically fashionable.

18. Explicit Version 1 Scope

This is important because this project could easily become too large.

Version 1 WILL include:
Project ingestion
       ↓
Project understanding
       ↓
Multi-agent analysis
       ↓
Code quality
Security
Testing
Architecture
Dependencies
Documentation
       ↓
Evidence collection
       ↓
Finding correlation
       ↓
Severity/confidence
       ↓
Recommendations
       ↓
Quality dashboard
       ↓
Report generation
Version 1 WILL NOT require:
❌ Autonomous production deployment
❌ Fully autonomous code modification
❌ Production monitoring
❌ Complete runtime profiling
❌ Enterprise collaboration
❌ Dedicated graph database
❌ Full CI/CD platform
❌ Universal support for every programming language

This scope boundary is critical to making the project achievable by one developer.

19. Research Paper Angle

The research paper should not merely say:

"We developed an AI application."

The research question should be closer to:

Can a hybrid multi-agent architecture combining deterministic software-analysis evidence with LLM-based contextual reasoning provide an effective and explainable approach to automated software quality assessment?

Then we can experimentally evaluate:

Detection effectiveness
False positives
Recommendation usefulness
Confidence calibration
Explainability
Agent specialization vs single-agent analysis
Processing time
Resource consumption

This gives the project an actual research component, rather than simply being a software implementation.

20. What Makes the Project Advanced

The advanced nature of Aegis comes from the system design, not simply from putting an LLM behind a UI.

The important chain is:

Repository
    ↓
Project Intelligence
    ↓
Analysis Planning
    ↓
Specialized Agents
    ↓
Deterministic Evidence
    ↓
AI Reasoning
    ↓
Evidence Correlation
    ↓
Confidence
    ↓
Risk Prioritization
    ↓
Recommendations
    ↓
Quality Score
    ↓
Report

That is the core intellectual architecture.

21. Final HLD

At the highest level:

                         ┌─────────────────┐
                         │     Developer   │
                         └────────┬────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │       Web Frontend      │
                    │ React + TypeScript      │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │        REST API         │
                    │ Express + TypeScript    │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
      Project Service      Analysis Service    Report Service
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │    AI Orchestrator      │
                    │       LangGraph         │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
         Security            Code Quality       Testing
           Agent                Agent             Agent
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │ Evidence & Finding      │
                    │ Normalization Layer     │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │ Recommendation Engine   │
                    └────────────┬────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │ PostgreSQL + Prisma     │
                    └─────────────────────────┘
                                 ▲
                                 │
                    ┌─────────────────────────┐
                    │ Ollama / Local Models   │
                    └─────────────────────────┘
22. Final LLD Flow

A single analysis request will eventually look like this:

User
 │
 │ POST /projects/:id/analysis
 ▼
API Controller
 │
 ▼
Analysis Service
 │
 ├── Load Project
 │
 ├── Validate Project
 │
 └── Create Analysis Run
             │
             ▼
       Project Scanner
             │
             ▼
       Project Context
             │
             ▼
      Analysis Planner
             │
             ▼
       AI Orchestrator
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
   Agent   Agent   Agent
      │      │      │
      └──────┼──────┘
             ▼
      Result Normalizer
             │
             ▼
      Evidence Validator
             │
             ▼
       Finding Correlator
             │
             ▼
      Recommendation Engine
             │
             ▼
       Quality Calculator
             │
             ▼
          Database
             │
             ▼
          Report
             │
             ▼
        Web Dashboard
23. The Golden Rule for Project Aegis

This is the sentence I want us to keep visible in PROJECT_BIBLE.md:

Project Aegis exists to improve software quality through explainable, evidence-based, multi-agent analysis—not merely to demonstrate the use of generative AI.

That sentence should act as our scope guardrail.

Whenever we propose a new feature, architecture, library, AI model, or "cool" idea, I'll evaluate it against this objective and against the Version 1 scope.

Where We Actually Start Coding

Our current repository is already initialized and pushed successfully.

So the next engineering task is not to redesign the project.
