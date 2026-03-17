# Start FastAPI locally
# Make sure Docker services are running first with: docker-compose up --build

Write-Host "Starting FastAPI locally on port 8000..." -ForegroundColor Green
Write-Host "Make sure Redis and other Docker services are running!" -ForegroundColor Yellow
Write-Host ""
Write-Host "FastAPI will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Swagger docs at: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
