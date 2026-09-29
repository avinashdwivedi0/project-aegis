import type { AgentProvider, AgentProviderRequest } from "../agents/agent.provider";
import { AgentProviderError } from "../agents/agent.provider";
import { agentOutputSchema, type AgentEvidence, type AgentOutput } from "../agents/agent.types";
import { getAgent } from "../agents/agent.registry";

/**
 * LocalAgentProvider implements the AgentProvider interface without calling
 * any external LLM. It produces deterministic findings based on the evidence
 * passed in and the agent type.
 *
 * This makes the entire analysis pipeline zero-cost (no Groq/Ollama calls).
 * Switch via env var: AGENT_MODE=local
 */
export class LocalAgentProvider implements AgentProvider {
  async generate(request: AgentProviderRequest): Promise<string> {
    const definition = getAgent(request.agentId as "test" | "project-analyzer" | "code-quality" | "security" | "dependency" | "api" | "ui-accessibility" | "performance" | "repair" | "report");
    const findings = this.buildFindings(definition.id, request.prompt);

    const output: AgentOutput = agentOutputSchema.parse({
      contractVersion: "1.0",
      agentId: definition.id,
      agentVersion: "1.0",
      status: "completed",
      findings,
      summary: `${definition.id}: local analysis complete. ${findings.length} finding(s) found.`,
      durationMs: 0,
    });

    return JSON.stringify(output);
  }

  private buildFindings(agentId: string, prompt: string): AgentOutput["findings"] {
    // Parse any embedded evidence from the prompt to produce grounded findings
    const evidenceBlocks = this.extractEvidence(prompt);
    const findings: AgentOutput["findings"] = [];

    switch (agentId) {
      case "code-quality":
        findings.push(...this.codeQualityFindings(evidenceBlocks));
        break;
      case "security":
        findings.push(...this.securityFindings(evidenceBlocks));
        break;
      case "dependency":
        findings.push(...this.dependencyFindings(evidenceBlocks));
        break;
      case "test":
        findings.push(...this.testFindings(evidenceBlocks));
        break;
      case "api":
        findings.push(...this.apiFindings(evidenceBlocks));
        break;
      case "ui-accessibility":
        findings.push(...this.uiAccessibilityFindings(evidenceBlocks));
        break;
      case "performance":
        findings.push(...this.performanceFindings(evidenceBlocks));
        break;
      case "report":
        findings.push(...this.reportFindings(evidenceBlocks));
        break;
      default:
        findings.push({
          id: `local-${agentId}-001`,
          title: `${agentId} analysis complete`,
          description: `Local agent analyzed ${evidenceBlocks.length} evidence item(s). No issues detected.`,
          severity: "info",
          confidence: 0.8,
          evidenceIds: [],
          filePath: undefined,
          lineStart: undefined,
          lineEnd: undefined,
          recommendation: "No action required.",
          repairRequired: false,
        });
    }

    return findings;
  }

  private extractEvidence(prompt: string): string[] {
    try {
      const parsed = JSON.parse(prompt);
      const evidence = parsed.evidence ?? parsed.evidence ?? [];
      if (Array.isArray(evidence)) {
        return evidence.map((e: { content?: string; message?: string; tool?: string }) =>
          typeof e === "object" ? (e.content ?? e.message ?? String(e)) : String(e)
        );
      }
    } catch {
      // not JSON, treat as plain text
    }
    return [prompt];
  }

  private severityFromTool(tool: string): "critical" | "high" | "medium" | "low" | "info" {
    if (tool.includes("security") || tool.includes("semgrep")) return "high";
    if (tool.includes("dependency") || tool.includes("audit")) return "medium";
    return "info";
  }

  private codeQualityFindings(evidence: string[]): AgentOutput["findings"] {
    return evidence.map((msg, i) => ({
      id: `code-quality-local-${i}`,
      title: `Code quality issue from ${msg.slice(0, 40)}`,
      description: msg,
      severity: (this.severityFromTool(msg) as AgentOutput["findings"][0]["severity"]),
      confidence: 0.75,
      evidenceIds: [`evidence-${i}`],
      filePath: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      recommendation: "Review the flagged code and address the issue.",
      repairRequired: true,
    }));
  }

  private securityFindings(evidence: string[]): AgentOutput["findings"] {
    return evidence.map((msg, i) => ({
      id: `security-local-${i}`,
      title: `Security concern detected`,
      description: msg,
      severity: this.severityFromTool(msg),
      confidence: 0.8,
      evidenceIds: [`evidence-${i}`],
      filePath: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      recommendation: "Review and remediate the security concern.",
      repairRequired: true,
    }));
  }

  private dependencyFindings(evidence: string[]): AgentOutput["findings"] {
    return evidence.map((msg, i) => ({
      id: `dependency-local-${i}`,
      title: `Dependency issue detected`,
      description: msg,
      severity: "medium" as const,
      confidence: 0.7,
      evidenceIds: [`evidence-${i}`],
      filePath: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      recommendation: "Update the dependency to the latest secure version.",
      repairRequired: true,
    }));
  }

  private testFindings(evidence: string[]): AgentOutput["findings"] {
    return evidence.map((msg, i) => ({
      id: `test-local-${i}`,
      title: `Test gap identified`,
      description: msg,
      severity: "low" as const,
      confidence: 0.7,
      evidenceIds: [`evidence-${i}`],
      filePath: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      recommendation: "Add or improve tests to cover this area.",
      repairRequired: true,
    }));
  }

  private apiFindings(evidence: string[]): AgentOutput["findings"] {
    return evidence.map((msg, i) => ({
      id: `api-local-${i}`,
      title: `API concern detected`,
      description: msg,
      severity: "medium" as const,
      confidence: 0.75,
      evidenceIds: [`evidence-${i}`],
      filePath: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      recommendation: "Review the API contract and ensure proper error handling.",
      repairRequired: false,
    }));
  }

  private uiAccessibilityFindings(evidence: string[]): AgentOutput["findings"] {
    return evidence.map((msg, i) => ({
      id: `ui-local-${i}`,
      title: `Accessibility concern detected`,
      description: msg,
      severity: "low" as const,
      confidence: 0.7,
      evidenceIds: [`evidence-${i}`],
      filePath: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      recommendation: "Add aria-labels or improve semantic HTML structure.",
      repairRequired: true,
    }));
  }

  private performanceFindings(evidence: string[]): AgentOutput["findings"] {
    return evidence.map((msg, i) => ({
      id: `performance-local-${i}`,
      title: `Performance concern detected`,
      description: msg,
      severity: "medium" as const,
      confidence: 0.75,
      evidenceIds: [`evidence-${i}`],
      filePath: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      recommendation: "Optimize the flagged code path.",
      repairRequired: false,
    }));
  }

  private reportFindings(evidence: string[]): AgentOutput["findings"] {
    return [{
      id: `report-local-001`,
      title: "Quality report summary",
      description: `Local analysis found ${evidence.length} evidence item(s). Review individual agent findings for details.`,
      severity: "info",
      confidence: 0.9,
      evidenceIds: evidence.map((_, i) => `evidence-${i}`),
      filePath: undefined,
      lineStart: undefined,
      lineEnd: undefined,
      recommendation: "Review all agent findings above.",
      repairRequired: false,
    }];
  }
}

export const localAgentProvider = new LocalAgentProvider();
