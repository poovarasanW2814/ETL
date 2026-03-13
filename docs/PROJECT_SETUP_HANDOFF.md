# Project Setup Handoff

## Purpose
This document explains exactly what a new developer needs to install and run this project on a fresh machine after cloning it from GitHub.

This project has:
- backend API
- Celery worker
- Redis
- MongoDB
- React frontend
- Gemini integration for AI prompt resolution

All of these are needed for the full project flow.

## What This Project Uses

### Backend
- Python
- FastAPI
- Celery
- Redis
- MongoDB
- Gemini API

### Frontend
- React
- Vite
- Tailwind CSS
- Axios
- React Router

## Required Software
The developer needs to install these first.

### 1. Python
Install Python.
Recommended version:
- Python 3.11 or later

Also make sure `python` and `pip` work in terminal.

Test with:
```powershell
python --version
pip --version
```

### 2. Node.js
Install Node.js.
Recommended version:
- Node 18 or later

Test with:
```powershell
node --version
npm --version
```

### 3. Redis
Install Redis and make sure it is running.

This project expects Redis on:
- `localhost:6379`

### 4. MongoDB
Install MongoDB and make sure it is running.

This project expects MongoDB on:
- `localhost:27017`

### 5. Gemini API Key
A valid Gemini API key is required.

This project currently uses:
- `gemini-2.5-flash`

Without a valid Gemini key, AI prompt resolution will fail.

## Step 1. Clone the Project
```powershell
git clone <your-repository-url>
cd mcp-data-transform-service
```

## Step 2. Create Python Virtual Environment
Create a virtual environment in the project root.

```powershell
python -m venv .mcp-dlt
```

Activate it:
```powershell
.\.mcp-dlt\Scripts\Activate.ps1
```

If PowerShell blocks script execution, use the normal PowerShell policy fix or run from Command Prompt.

## Step 3. Install Backend Dependencies
With the virtual environment activated:

```powershell
pip install -r requirements.txt
```

## Step 4. Create the Real Runtime `.env`
This project does not run from `.env.example`.
It runs from:
- `.env`

So after cloning, the developer must create:
- `d:\mcp-data-transform-service\.env`

They can copy from `.env.example`.

Example command:
```powershell
Copy-Item .env.example .env
```

Then update `.env` with a real Gemini key.

## Step 5. Required `.env` Values
The `.env` file should contain values like this:

```env
AI_TIMEOUT_SECONDS=90
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
PROMPT_PLAN_CACHE_TTL_SECONDS=2592000
REDIS_URL=redis://localhost:6379/0
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE_NAME=mcp_transform_service
MONGO_PROMPT_LAB_DATABASE_NAME=mcp_prompt_lab
PROMPT_TEST_TTL_SECONDS=604800
LOG_LEVEL=INFO
APP_NAME=MCP Data Transform Service
API_VERSION=1.0.0
```

Important:
- `GEMINI_API_KEY` must be real
- otherwise AI prompt analysis will not work

## Step 6. Start Redis
Redis must be running before the backend and Celery worker are used.

Expected address:
- `redis://localhost:6379/0`

How to start Redis depends on the machine setup.

## Step 7. Start MongoDB
MongoDB must be running before the backend is used.

Expected address:
- `mongodb://localhost:27017`

How to start MongoDB depends on the machine setup.

## Step 8. Run the Backend API
Open a terminal in the project root.
Activate the virtual environment.
Then run:

```powershell
uvicorn app.main:app --reload
```

If startup is successful, the API will be available at:
- `http://localhost:8000`

Swagger docs will be at:
- `http://localhost:8000/docs`

## Step 9. Run the Celery Worker
Open another terminal.
Go to the project root.
Activate the virtual environment again.
Then run:

```powershell
celery -A app.infrastructure.messaging.celery_app worker -Q transform_dates -l info -P solo
```

This worker is required for:
- async transform jobs
- job status progression
- background date transformation

Without the worker, submitted transform jobs will stay pending.

## Step 10. Run the Frontend
Open another terminal.
Go into the frontend folder:

```powershell
cd mcp-transform-ui
```

Install frontend dependencies:

```powershell
npm install
```

Run the frontend:

```powershell
npm run dev
```

Frontend should be available at:
- `http://localhost:5173`

## What Must Be Running At The Same Time
For the full project to work, these must be running:

1. Redis
2. MongoDB
3. FastAPI backend
4. Celery worker
5. React frontend

If one of these is missing, part of the project will fail.

## Basic Verification Checklist
After setup, verify in this order.

### 1. Backend docs open
Open:
- `http://localhost:8000/docs`

If this works, FastAPI is running.

### 2. Frontend opens
Open:
- `http://localhost:5173`

If this works, React frontend is running.

### 3. Prompt tester works
Try a simple prompt through frontend or Swagger.

Example:
- `Convert to YYYY-MM-DD`

If that works, Gemini and backend transformation flow are working.

### 4. Async transform job works
Submit a transform job.
If worker is running, the job should move:
- `PENDING -> STARTED -> SUCCESS`

## Common Problems and Their Reasons

### Problem 1. Backend starts but AI does not work
Possible reason:
- `.env` missing
- Gemini key missing
- Gemini key invalid

### Problem 2. Jobs stay pending forever
Possible reason:
- Celery worker not started
- Redis not running

### Problem 3. Backend fails on startup
Possible reason:
- missing Python packages
- broken `.env`
- MongoDB/Redis not reachable in some code paths

### Problem 4. Frontend loads but actions fail
Possible reason:
- backend not running
- CORS issue from stale server version
- worker not running
- Gemini request failing

### Problem 5. AI prompt analysis returns errors
Possible reason:
- invalid Gemini key
- Gemini quota/rate limit
- internet/network issue

## Minimum Commands Summary

### Backend setup
```powershell
python -m venv .mcp-dlt
.\.mcp-dlt\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

### Run backend
```powershell
uvicorn app.main:app --reload
```

### Run worker
```powershell
.\.mcp-dlt\Scripts\Activate.ps1
celery -A app.infrastructure.messaging.celery_app worker -Q transform_dates -l info -P solo
```

### Run frontend
```powershell
cd mcp-transform-ui
npm install
npm run dev
```

## Final Note
This project is not just a simple web app.
It depends on multiple services working together.

To run the full project successfully, the developer must make sure:
- the Python environment is installed
- Node.js is installed
- Redis is running
- MongoDB is running
- `.env` exists with a real Gemini key
- backend is running
- worker is running
- frontend is running

Only then the complete flow will work properly.
