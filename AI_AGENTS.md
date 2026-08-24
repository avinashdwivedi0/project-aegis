# AI Agent Specification

## 1. Agent philosophy

Agents are specialized components, not independent uncontrolled
chatbots.

Each agent receives structured context and returns structured results.

## 2. Project Analyzer Agent

### Responsibilities

-   Identify languages and frameworks.
-   Identify package managers.
-   Identify build/test commands.
-   Identify project entry points.
-   Detect project type.

### Output

Structured project profile.

## 3. Code Quality Agent

### Responsibilities

-   Interpret lint/static-analysis results.
-   Identify maintainability issues.
-   Detect code smells.
-   Prioritize issues.

### Must include

Evidence and source locations.

## 4. Security Agent

### Responsibilities

-   Interpret security scanner results.
-   Identify insecure patterns.
-   Explain exploitability at a safe defensive level.
-   Recommend mitigations.

## 5. Dependency Agent

### Responsibilities

-   Interpret dependency audit results.
-   Identify outdated or vulnerable dependencies.
-   Assess upgrade impact.

## 6. Test Agent

### Responsibilities

-   Discover existing tests.
-   Identify coverage gaps.
-   Generate targeted tests.
-   Execute tests in the sandbox.
-   Summarize failures.

## 7. API Agent

### Responsibilities

-   Discover supported endpoints.
-   Generate safe test cases.
-   Validate status codes, schemas, authentication behavior, and error
    handling.

## 8. UI/Accessibility Agent

### Responsibilities

-   Analyze browser/runtime evidence.
-   Identify accessibility issues.
-   Check responsive behavior where supported.
-   Recommend UI fixes.

## 9. Performance Agent

### Responsibilities

-   Interpret measurable performance data.
-   Identify likely bottlenecks.
-   Recommend optimizations.

## 10. Repair Agent

### Responsibilities

-   Select repair strategy.
-   Generate minimal patches.
-   Avoid unrelated changes.
-   Explain changes.
-   Request validation.

### Repair rules

1.  Prefer the smallest safe change.
2.  Preserve existing behavior unless the finding requires behavior
    change.
3.  Never claim success before validation.
4.  If validation fails, mark the repair as failed and provide the
    evidence.

## 11. Report Agent

Creates an evidence-backed summary:

-   Overall quality
-   Critical findings
-   High-priority findings
-   Improvements
-   Remaining risks
-   Validation status

## 12. Agent communication

Use versioned structured schemas rather than free-form text between
agents.

Example:

``` json
{
  "finding_id": "SEC-001",
  "severity": "high",
  "confidence": 0.93,
  "evidence": [],
  "repair_required": true
}
```
