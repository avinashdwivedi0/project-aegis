# Security Architecture

## Threat Model
Uploaded repositories are untrusted input and may contain malicious code, malicious build scripts, secrets, oversized files, dependency attacks, prompt injection, or resource-exhaustion attempts.

## Controls
- Isolated execution
- Non-root containers
- CPU/memory/disk/time quotas
- Restricted network
- Read-only host boundaries
- Temporary workspaces
- Secret scanning/redaction
- Authentication/authorization
- Audit logging
- Input limits
- Dependency/tool allowlists

## AI-Specific Threats
- Prompt injection in repository files
- Tool misuse
- Data exfiltration
- Hallucinated findings
- Unsafe generated patches

AI must treat repository content as untrusted data, not system instructions.
