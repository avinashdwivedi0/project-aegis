# Security Requirements and Threat Model

## 1. Security objective

The platform executes and analyzes potentially untrusted software.
Security must therefore be treated as a first-class architectural
requirement.

## 2. Critical threats

### T-01 Arbitrary code execution

A submitted project may contain malicious code.

**Controls** - Run project code only inside isolated containers. - Never
execute submitted code directly on the API host. - Apply CPU, memory,
process, disk, and execution-time limits. - Use non-root containers. -
Restrict filesystem access.

### T-02 Network abuse

A project may attempt scanning, exfiltration, or abuse of external
services.

**Controls** - Default-deny outbound networking for analysis
containers. - Allow only explicitly required endpoints. - Monitor
network activity.

### T-03 Secret leakage

Source code may contain API keys or credentials.

**Controls** - Never expose host secrets to project containers. - Detect
likely secrets before processing. - Redact secrets from logs and
reports. - Never send secrets to an AI provider.

### T-04 Prompt injection

Repository files may contain instructions designed to manipulate an AI
agent.

**Controls** - Treat repository content as untrusted data. - Separate
system instructions from repository content. - Do not allow repository
text to override agent policy. - Require structured tool calls.

### T-05 Supply-chain attacks

Dependencies may be malicious or vulnerable.

**Controls** - Record package manifests and lockfiles. - Run dependency
vulnerability scanners. - Prefer reproducible installs. - Restrict
package installation network access.

### T-06 Path traversal

Malicious archives may attempt to write outside the project workspace.

**Controls** - Validate archive paths. - Normalize paths. - Reject
traversal outside the designated workspace.

### T-07 Resource exhaustion

Large or malicious projects may consume excessive resources.

**Controls** - Maximum project size. - Maximum file count. - CPU/memory
limits. - Timeouts. - Maximum process count.

## 3. Authentication

-   Hash passwords using a modern password hashing algorithm.
-   Use secure sessions/tokens.
-   Validate authorization on every project operation.
-   Never trust client-supplied project ownership.

## 4. API security

-   Input validation
-   Rate limiting
-   Secure headers
-   CORS policy
-   Structured error responses
-   Audit logging

## 5. AI safety

The AI must not:

-   expose credentials;
-   disable security controls;
-   execute arbitrary host commands;
-   silently modify protected files;
-   claim validation without evidence.

## 6. Repair safety

Repairs should initially be generated into a temporary workspace.

The platform should show:

-   files changed;
-   diff;
-   tests/checks run;
-   validation result.

User approval should be required before committing changes in the MVP.

## 7. Security testing

The platform itself must be tested against:

-   malicious archives;
-   path traversal;
-   prompt injection;
-   command injection;
-   unauthorized project access;
-   secret leakage;
-   resource exhaustion.
