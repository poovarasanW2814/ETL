# Pending Tasks

## Phase 7 - Logging and Observability

- Structured logging hardening
- Correlation ID propagation across requests and worker boundaries
- Add worker health and queue-depth visibility
- Add operational metrics for job throughput and failure rates
- Add structured logging consistency between FastAPI and Celery worker processes
- Add audit logging for user-supplied Mongo source and destination transfer operations

## Phase 8 - Testing

- Unit tests
- Integration tests
- API contract tests
- Celery worker execution tests
- MongoDB repository tests
- Dedicated Mongo transfer endpoint tests
- Mongo write-mode behavior tests for create, append, and replace flows
- MySQL transfer endpoint tests
- MySQL create, append, and replace mode tests
- End-to-end status persistence tests
- Performance and load benchmarks as automated tests

## Phase 9 - Deployment

- Docker configuration
- Kubernetes deployment manifests
- Production worker startup configuration
- Redis deployment and operational configuration
- MongoDB deployment and connection configuration

## Phase 10 - Operational Hardening

- Add retry policy for recoverable Celery task failures
- Add dead-letter or failure handling strategy for permanently failed jobs
- Add request/result retention policy for Redis-backed job data
- Add retention and archival policy for MongoDB job documents
- Add input size limits and request throttling safeguards
- Add credential-handling safeguards for user-supplied Mongo connection strings in the DB-to-DB flow

## Maintenance Rule

This file must be updated after each completed task so that pending work always reflects the current project state.
