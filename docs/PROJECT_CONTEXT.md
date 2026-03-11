# Project Context

## Project Goal

`mcp-data-transform-service` is an MCP-based microservice that supports ETL pipelines by handling complex date transformation workloads outside the main ETL transformation engine.

The service exists to normalize inconsistent real-world date values such as:

- `15-01-2024`
- `2024/01/15`
- `Jan 15 2024`
- `20240115`
- `2024-01-15T10:30:00Z`

The ETL platform remains the orchestrator and final data loader. This service is responsible only for intelligent date parsing, format resolution, and normalized output generation.

## Architecture

The service is designed as a scalable Python microservice with clear separation of concerns across API, domain, services, infrastructure, workers, logging, and utilities.

Primary architectural principles:

- ETL remains the source of orchestration.
- MCP focuses only on date parsing and transformation.
- Batch processing is a core requirement.
- Natural-language prompts are used to determine the target date format.
- The system is structured for production deployment and future horizontal scaling.

## ETL Integration Flow

The ETL flow that integrates with this service is:

1. Source data is extracted from the source database.
2. An ETL worker processes transformation stages using Celery.
3. Fields marked with `mappingType: date_transform` are skipped by the ETL date logic.
4. The ETL worker extracts the relevant date values and the user prompt.
5. The ETL worker sends a request to the MCP service.
6. The MCP service analyzes the prompt to determine the target date format.
7. The MCP service detects and parses source date values.
8. The MCP service transforms the values into the target format.
9. The transformed values are returned to the ETL worker.
10. The ETL worker merges the transformed results into the dataset.
11. The ETL pipeline loads the final data into the destination system.

## Tech Stack

- Python
- FastAPI
- Celery
- Redis
- Pydantic
- Loguru
- Pandas
- python-dateutil
- Docker
- Kubernetes

## Project Structure

```text
mcp-data-transform-service/
├── app/
│   ├── api/
│   ├── schemas/
│   ├── services/
│   ├── agents/
│   ├── domain/
│   ├── infrastructure/
│   ├── workers/
│   ├── core/
│   ├── utils/
│   └── logging/
├── tests/
├── docs/
├── scripts/
├── deployments/
├── docker-compose.yml
├── requirements.txt
└── README.md
```

## Scope Notes

- The ETL system is the orchestrator and final loader.
- This service does not own generic ETL transformations.
- This service does not own destination loading.
- This service will expose date transformation capabilities as a reusable microservice contract.
