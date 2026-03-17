#!/bin/bash

# Start FastAPI locally
# Make sure Docker services are running first with: docker-compose up --build

echo "Starting FastAPI locally on port 8000..."
echo "Make sure Redis and other Docker services are running!"
echo ""
echo "FastAPI will be available at: http://localhost:8000"
echo "Swagger docs at: http://localhost:8000/docs"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
