# Docker Commands

This file contains the common Docker commands to run the application.

## Architecture

- **FastAPI (Local)**: Runs on your local machine on port 8000
- **Redis (Docker)**: Message broker and cache
- **Celery Worker (Docker)**: Background job processor  
- **Flower (Docker)**: Celery monitoring tool

## Prerequisites

1. **Install local dependencies:**
```bash
pip install -r requirements.txt
```

2. **Setup .env file** (if not already done):
```bash
cp .env.example .env
```

## Build and Start Services (Docker only)

To build the Docker images and start only the backend services:

```bash
docker-compose up --build
```

This will start:
-   `redis`: The Redis server on port 6379
-   `worker`: The Celery worker
-   `flower`: The Celery monitoring tool on port 5555

## Run FastAPI Locally

In a separate terminal, start the FastAPI application:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or use the provided startup script (if available):
```bash
.\scripts\start_api.sh
```

FastAPI will be available at: http://localhost:8000
Swagger docs: http://localhost:8000/docs

## Stop Docker Services

To stop and remove the Docker services:

```bash
docker-compose down
```

## View Logs

To view logs of Docker services:

```bash
docker-compose logs -f
```

To view logs of a specific service:

```bash
docker-compose logs -f worker
docker-compose logs -f redis
docker-compose logs -f flower
```

## List Containers

To list the running Docker containers:

```bash
docker ps
```

## Complete Workflow

**Terminal 1** - Start Docker services:
```bash
docker-compose up --build
```

**Terminal 2** - Start FastAPI locally:
```bash
uvicorn app.main:app --reload --port 8000
```

**Access URLs:**
- FastAPI: http://localhost:8000
- Flower (Celery UI): http://localhost:5555
- Redis: localhost:6379
