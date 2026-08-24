# Sandbox Specification

## Threat
Repository scripts can execute arbitrary code.

## Required
- isolated container
- non-root user
- restricted mounts
- restricted network
- CPU quota
- memory quota
- disk quota
- process limit
- execution timeout
- output-size limit
- cleanup

## Rule
No repository execution directly on the host machine.
