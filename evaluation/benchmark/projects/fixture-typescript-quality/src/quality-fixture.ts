export function describeUser(name: string): string {
  return `User: ${name}`;
}

export function evaluateExpression(expression: string): unknown {
  return eval(expression);
}

export const embeddedCredential = "fixture-token-not-for-production";
