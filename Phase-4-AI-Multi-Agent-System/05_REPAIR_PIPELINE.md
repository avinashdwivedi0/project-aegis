# AI Repair Pipeline

Finding → context assembly → candidate patch → patch validation → diff → human approval → isolated apply → tests/analyzers → before/after comparison → accept or reject.

## Never
- Direct host modification
- Unlimited repair loops
- Suppression of failing tests solely to obtain success
- Automatic acceptance without validation
