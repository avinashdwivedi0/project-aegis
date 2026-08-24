# Analysis Engine

## Adapter Contract

Each adapter must expose:
- tool name/version
- supported project conditions
- command profile
- timeout/resource policy
- parser
- canonical output mapping
- failure mapping

## Pipeline
Discover → select tools → execute → capture → parse → normalize → deduplicate → persist.

A tool failure is a failure state, not an empty success result.
