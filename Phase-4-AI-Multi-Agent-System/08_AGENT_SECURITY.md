# Agent Security

Repository content can contain prompt injection.

Rules:
- System/developer policy outranks repository content.
- Tool calls require explicit permission.
- Paths are validated.
- Commands are allowlisted/profiled.
- Secrets are not passed to agents unless explicitly required and permitted.
- Agent outputs are untrusted until validated.
