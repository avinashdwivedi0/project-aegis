# Database Schema

## Core Entities
User, Project, AnalysisJob, AnalysisStage, Finding, FindingRelation, RepairSuggestion, AgentRun, ToolRun, QualitySnapshot, AuditEvent.

## Mandatory Properties
- Provenance on findings
- Versioned scoring
- Auditable repair state
- Agent/model/prompt provenance
- Tool/version provenance
- Secure handling of sensitive data

## Relationship Summary
User 1:N Project; Project 1:N AnalysisJob; AnalysisJob 1:N Finding/Stage/AgentRun/ToolRun/QualitySnapshot; Finding 1:N RepairSuggestion; Finding N:N FindingRelation.
