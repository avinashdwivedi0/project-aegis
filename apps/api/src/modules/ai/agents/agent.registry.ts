import type { AgentId } from "./agent.types";

export type AgentDefinition = {
  id: AgentId;
  version: string;
  description: string;
  capabilities: string[];
};

const definitions: AgentDefinition[] = [
  { id: "project-analyzer", version: "1.0", description: "Discovers project structure and tooling.", capabilities: ["discovery", "project-profile"] },
  { id: "code-quality", version: "1.0", description: "Interprets lint and maintainability evidence.", capabilities: ["lint", "maintainability"] },
  { id: "security", version: "1.0", description: "Interprets application and dependency security evidence.", capabilities: ["security", "risk"] },
  { id: "dependency", version: "1.0", description: "Assesses dependency health and upgrade impact.", capabilities: ["dependencies", "upgrade-impact"] },
  { id: "test", version: "1.0", description: "Analyzes test coverage and execution evidence.", capabilities: ["tests", "coverage"] },
  { id: "api", version: "1.0", description: "Validates API behavior and contracts.", capabilities: ["api", "contract-validation"] },
  { id: "ui-accessibility", version: "1.0", description: "Reviews browser, responsive, and accessibility evidence.", capabilities: ["ui", "accessibility"] },
  { id: "performance", version: "1.0", description: "Interprets measurable performance evidence.", capabilities: ["performance", "optimization"] },
  { id: "repair", version: "1.0", description: "Proposes minimal repairs for validated findings.", capabilities: ["repair", "patch-planning"] },
  { id: "report", version: "1.0", description: "Aggregates evidence-backed quality reports.", capabilities: ["reporting", "prioritization"] },
];

export function listAgents(): AgentDefinition[] {
  return definitions.map((definition) => ({
    ...definition,
    capabilities: [...definition.capabilities],
  }));
}

export function getAgent(agentId: AgentId): AgentDefinition {
  const definition = definitions.find((item) => item.id === agentId);

  if (!definition) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  return definition;
}
