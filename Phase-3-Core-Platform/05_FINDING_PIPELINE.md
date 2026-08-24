# Finding Pipeline

## Canonical Finding
category, source, rule, severity, confidence, file location, evidence, description, recommendation, provenance, status.

## Processing
1. Parse tool output.
2. Normalize severity.
3. Normalize location.
4. Attach evidence.
5. Deduplicate.
6. Correlate related findings.
7. Persist.
8. Expose through API.

AI enrichment must never overwrite original analyzer evidence.
