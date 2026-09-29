/**
 * PII Redaction Service
 *
 * Strips or masks sensitive data before sending to LLMs or indexing.
 * Zero-cost: runs locally with regex patterns.
 */

export interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

export interface RedactionResult {
  content: string;
  redacted: boolean;
  matches: Array<{ rule: string; count: number }>;
}

/**
 * Default PII patterns to redact
 */
export const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  // API keys and tokens
  {
    name: "api-key",
    pattern: /(?:api[_-]?key|apikey|api_secret|access_token|bearer_token)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})/gi,
    replacement: "[REDACTED_API_KEY]",
    description: "API keys in config or code",
  },
  {
    name: "jwt-token",
    pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    replacement: "[REDACTED_JWT]",
    description: "JWT tokens",
  },
  {
    name: "aws-key",
    pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
    replacement: "[REDACTED_AWS_KEY]",
    description: "AWS access keys",
  },
  {
    name: "github-token",
    pattern: /gh[ps]_[a-zA-Z0-9]{36,}/g,
    replacement: "[REDACTED_GITHUB_TOKEN]",
    description: "GitHub personal access tokens",
  },
  {
    name: "slack-token",
    pattern: /xox[baprs]-[a-zA-Z0-9-]+/g,
    replacement: "[REDACTED_SLACK_TOKEN]",
    description: "Slack tokens",
  },
  {
    name: "stripe-key",
    pattern: /sk_(?:live|test)_[a-zA-Z0-9]{24,}/g,
    replacement: "[REDACTED_STRIPE_KEY]",
    description: "Stripe secret keys",
  },
  {
    name: "sendgrid-key",
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
    replacement: "[REDACTED_SENDGRID_KEY]",
    description: "SendGrid API keys",
  },
  // Database connection strings
  {
    name: "connection-string",
    pattern: /(?:mongodb|postgresql|mysql|redis):\/\/[^\s"']+/gi,
    replacement: "[REDACTED_CONNECTION_STRING]",
    description: "Database connection strings",
  },
  // Emails
  {
    name: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: "[REDACTED_EMAIL]",
    description: "Email addresses",
  },
  // Phone numbers
  {
    name: "phone",
    pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[REDACTED_PHONE]",
    description: "Phone numbers",
  },
  // Credit card numbers (basic Luhn check not done)
  {
    name: "credit-card",
    pattern: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
    replacement: "[REDACTED_CREDIT_CARD]",
    description: "Credit card numbers",
  },
  // SSN
  {
    name: "ssn",
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    replacement: "[REDACTED_SSN]",
    description: "US Social Security Numbers",
  },
  // Private keys
  {
    name: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gi,
    replacement: "[REDACTED_PRIVATE_KEY]",
    description: "Private keys",
  },
  // SSH keys
  {
    name: "ssh-key",
    pattern: /ssh-(?:rsa|dss|ed25519|ecdsa) [A-Za-z0-9+/]+[=]{0,3}(?:\s+[^\s]+)?/g,
    replacement: "[REDACTED_SSH_KEY]",
    description: "SSH public keys",
  },
  // Generic secrets (key=value patterns)
  {
    name: "secret-value",
    pattern: /(?:password|secret|token|key)\s*[:=]\s*["']?([^\s"']{8,})/gi,
    replacement: "$1=[REDACTED_SECRET]",
    description: "Generic secret values",
  },
];

/**
 * PiiRedactionService applies redaction rules to text content
 */
export class PiiRedactionService {
  private rules: RedactionRule[];
  private customRules: RedactionRule[] = [];

  constructor(customRules?: RedactionRule[]) {
    this.rules = [...DEFAULT_REDACTION_RULES, ...(customRules ?? [])];
    this.customRules = customRules ?? [];
  }

  /**
   * Add a custom redaction rule
   */
  addRule(rule: RedactionRule): void {
    this.customRules.push(rule);
    this.rules.push(rule);
  }

  /**
   * Remove a custom rule by name
   */
  removeRule(name: string): boolean {
    const index = this.customRules.findIndex((r) => r.name === name);
    if (index >= 0) {
      this.customRules.splice(index, 1);
      this.rules = [...DEFAULT_REDACTION_RULES, ...this.customRules];
      return true;
    }
    return false;
  }

  /**
   * Redact PII from text content
   */
  redact(text: string): RedactionResult {
    let content = text;
    const matches: Array<{ rule: string; count: number }> = [];
    let redacted = false;

    for (const rule of this.rules) {
      const ruleMatches = content.match(rule.pattern);
      if (ruleMatches && ruleMatches.length > 0) {
        matches.push({ rule: rule.name, count: ruleMatches.length });
        content = content.replace(rule.pattern, rule.replacement);
        redacted = true;
      }
    }

    return { content, redacted, matches };
  }

  /**
   * Redact multiple texts (e.g., array of file contents)
   */
  redactMany(texts: string[]): RedactionResult[] {
    return texts.map((t) => this.redact(t));
  }

  /**
   * Check if text contains PII (without modifying)
   */
  containsPii(text: string): boolean {
    return this.rules.some((rule) => rule.pattern.test(text));
  }

  /**
   * Get all rule names
   */
  getRuleNames(): string[] {
    return this.rules.map((r) => r.name);
  }

  /**
   * Redact file content for safe LLM submission
   * Preserves file structure but masks sensitive data
   */
  redactFileContent(filePath: string, content: string): RedactionResult {
    // Skip redaction for certain file types that are known safe
    const safeExtensions = [".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".lock"];
    const ext = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
    if (safeExtensions.includes(ext)) {
      return { content, redacted: false, matches: [] };
    }

    return this.redact(content);
  }

  /**
   * Redact only high-risk patterns (for performance)
   */
  redactHighRiskOnly(text: string): RedactionResult {
    const highRiskRules = this.rules.filter((r) =>
      ["api-key", "jwt-token", "aws-key", "github-token", "private-key", "connection-string", "stripe-key"].includes(r.name)
    );

    let content = text;
    const matches: Array<{ rule: string; count: number }> = [];
    let redacted = false;

    for (const rule of highRiskRules) {
      const ruleMatches = content.match(rule.pattern);
      if (ruleMatches && ruleMatches.length > 0) {
        matches.push({ rule: rule.name, count: ruleMatches.length });
        content = content.replace(rule.pattern, rule.replacement);
        redacted = true;
      }
    }

    return { content, redacted, matches };
  }
}

/**
 * Convenience function for quick redaction
 */
export function redactPii(text: string, customRules?: RedactionRule[]): RedactionResult {
  const service = new PiiRedactionService(customRules);
  return service.redact(text);
}

/**
 * Check if content is safe for LLM submission
 */
export function isSafeForLlm(text: string): boolean {
  const service = new PiiRedactionService();
  return !service.containsPii(text);
}

// Export singleton with default rules
export const piiRedactionService = new PiiRedactionService();