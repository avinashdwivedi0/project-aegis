# API Specification — Initial Contract

## Authentication
- POST /auth/register
- POST /auth/login
- POST /auth/logout

## Projects
- GET /projects
- POST /projects
- GET /projects/:id
- PATCH /projects/:id
- DELETE /projects/:id

## Sources
- POST /projects/:id/sources
- POST /projects/:id/import

## Analysis
- POST /projects/:id/analyses
- GET /analyses/:id
- GET /analyses/:id/stages
- GET /analyses/:id/findings
- GET /analyses/:id/events

## Findings
- GET /findings/:id
- POST /findings/:id/repair-suggestions
- POST /repairs/:id/approve
- POST /repairs/:id/reject
- POST /repairs/:id/revalidate

## Reports
- GET /projects/:id/reports
- POST /projects/:id/reports

API contracts must define authentication, authorization, validation, error formats, pagination, idempotency, and rate limits before implementation.
