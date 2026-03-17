# Docker Commands

This file contains the common Docker commands to run the application.

## Build and Start

To build the Docker images and start the services, run the following command:

```bash
docker-compose up --build
```

This will start the following services:
-   `redis`: The Redis server.
-   `api`: The FastAPI application.
-   `worker`: The Celery worker.
-   `flower`: The Celery monitoring tool.

## Stop

To stop and remove the services, run the following command:

```bash
docker-compose down
```

## View Logs

To view the logs of the running services, run the following command:

```bash
docker-compose logs -f
```

## List Containers

To list the running containers, run the following command:

```bash
docker ps
```
