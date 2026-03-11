"""MongoDB connection management."""

from __future__ import annotations

import asyncio
from concurrent.futures import Future
from threading import Lock, Thread
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.settings import settings

_mongo_client: AsyncIOMotorClient | None = None
_worker_loop: asyncio.AbstractEventLoop | None = None
_worker_loop_thread: Thread | None = None
_worker_loop_lock = Lock()


def get_database() -> AsyncIOMotorDatabase:
    """Return the shared MongoDB database instance."""

    global _mongo_client

    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(settings.mongo_uri)

    return _mongo_client[settings.mongo_database_name]


def get_prompt_lab_database() -> AsyncIOMotorDatabase:
    """Return the dedicated MongoDB database for prompt playground sessions."""

    global _mongo_client

    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(settings.mongo_uri)

    return _mongo_client[settings.mongo_prompt_lab_database_name]


def _start_worker_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Run the dedicated worker event loop forever."""

    asyncio.set_event_loop(loop)
    loop.run_forever()


def get_worker_event_loop() -> asyncio.AbstractEventLoop:
    """Return a persistent event loop for sync worker Mongo operations."""

    global _worker_loop
    global _worker_loop_thread

    if _worker_loop is not None and _worker_loop.is_running():
        return _worker_loop

    with _worker_loop_lock:
        if _worker_loop is None or not _worker_loop.is_running():
            _worker_loop = asyncio.new_event_loop()
            _worker_loop_thread = Thread(
                target=_start_worker_loop,
                args=(_worker_loop,),
                daemon=True,
                name="mongo-worker-loop",
            )
            _worker_loop_thread.start()

    return _worker_loop


def run_async_in_worker_loop(coroutine: Any) -> Any:
    """Execute an async coroutine on the persistent worker event loop."""

    loop = get_worker_event_loop()
    future: Future[Any] = asyncio.run_coroutine_threadsafe(coroutine, loop)
    return future.result()
