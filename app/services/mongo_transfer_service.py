"""MongoDB-to-MongoDB transfer helpers for the dedicated UI flow."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from bson import Decimal128, ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.settings import settings

WRITE_MODE_CREATE = "create"
WRITE_MODE_APPEND = "append"
WRITE_MODE_REPLACE = "replace"
SUPPORTED_WRITE_MODES = {
    WRITE_MODE_CREATE,
    WRITE_MODE_APPEND,
    WRITE_MODE_REPLACE,
}


def _build_client(mongo_uri: str) -> AsyncIOMotorClient:
    """Create a short-lived Mongo client for user-supplied credentials."""

    return AsyncIOMotorClient(
        mongo_uri,
        serverSelectionTimeoutMS=settings.mongo_server_selection_timeout_ms,
    )


def _serialize_value(value: Any) -> Any:
    """Convert Mongo values to JSON-safe values for API transport."""

    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, Decimal128):
        return str(value.to_decimal())
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _serialize_value(item) for key, item in value.items()}
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


def _normalize_document(document: dict[str, Any]) -> dict[str, Any]:
    """Normalize a Mongo document for UI preview and writeback."""

    return {str(key): _serialize_value(value) for key, value in document.items()}


async def list_mongo_collections(
    mongo_uri: str,
    database_name: str,
) -> list[str]:
    """Return the collection names available in a MongoDB database."""

    client = _build_client(mongo_uri)
    try:
        await client.admin.command("ping")
        database = client[database_name]
        collections = await database.list_collection_names()
        return sorted(collections)
    finally:
        client.close()


async def list_mongo_databases(mongo_uri: str) -> list[str]:
    """Return the database names available from a MongoDB connection."""

    client = _build_client(mongo_uri)
    try:
        await client.admin.command("ping")
        databases = await client.list_database_names()
        return sorted(databases)
    finally:
        client.close()


async def preview_mongo_collection(
    mongo_uri: str,
    database_name: str,
    collection_name: str,
    limit: int | None,
) -> tuple[list[str], list[dict[str, Any]]]:
    """Return a tabular preview for a MongoDB collection."""

    client = _build_client(mongo_uri)
    try:
        await client.admin.command("ping")
        collection = client[database_name][collection_name]
        cursor = collection.find({})
        if limit is not None:
            cursor = cursor.limit(limit)
            documents = await cursor.to_list(length=limit)
        else:
            documents = await cursor.to_list(length=None)
    finally:
        client.close()

    normalized_documents = [_normalize_document(document) for document in documents]
    columns: list[str] = []
    seen_columns: set[str] = set()

    for document in normalized_documents:
        for key in document:
            if key not in seen_columns:
                seen_columns.add(key)
                columns.append(key)

    return columns, normalized_documents


async def write_mongo_rows(
    mongo_uri: str,
    database_name: str,
    collection_name: str,
    write_mode: str,
    rows: list[dict[str, Any]],
) -> int:
    """Write transformed rows to Mongo using the requested write mode."""

    normalized_mode = write_mode.strip().lower()
    if normalized_mode not in SUPPORTED_WRITE_MODES:
        raise ValueError("Unsupported write mode")

    client = _build_client(mongo_uri)
    try:
        await client.admin.command("ping")
        database = client[database_name]
        existing_collections = set(await database.list_collection_names())

        if normalized_mode == WRITE_MODE_CREATE and collection_name in existing_collections:
            raise ValueError("Destination collection already exists")
        if normalized_mode == WRITE_MODE_APPEND and collection_name not in existing_collections:
            raise ValueError("Destination collection does not exist for append mode")
        if normalized_mode == WRITE_MODE_REPLACE and collection_name not in existing_collections:
            raise ValueError("Destination collection does not exist for replace mode")

        collection = database[collection_name]

        if normalized_mode == WRITE_MODE_REPLACE and collection_name in existing_collections:
            await collection.delete_many({})

        if normalized_mode == WRITE_MODE_CREATE and collection_name not in existing_collections:
            await database.create_collection(collection_name)
            collection = database[collection_name]

        if rows:
            payload = [_normalize_document(row) for row in rows]
            await collection.insert_many(payload)

        return len(rows)
    finally:
        client.close()


def coerce_preview_rows(
    columns: list[str],
    rows: list[dict[str, object | None]],
) -> list[dict[str, object | None]]:
    """Normalize UI rows to the expected ordered Mongo row shape."""

    normalized_rows: list[dict[str, object | None]] = []
    for row in rows:
        normalized_rows.append({column: row.get(column) for column in columns})
    return normalized_rows
