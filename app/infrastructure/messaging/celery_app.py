"""Celery application configuration."""

from __future__ import annotations

from celery import Celery

from app.core.settings import settings

celery = Celery(
    "mcp_transform_service",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    enable_utc=True,
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

celery.autodiscover_tasks(["app.workers"])

# Ensure task registration even when autodiscovery is not triggered by the worker.
import app.workers.tasks
