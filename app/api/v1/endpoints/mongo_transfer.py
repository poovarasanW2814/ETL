"""Generic DB-to-DB transfer endpoints for MongoDB and MySQL."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pymongo.errors import PyMongoError
from sqlalchemy.exc import SQLAlchemyError

from app.logging.logger import logger
from app.schemas.request import (
    DbConnectionRequest,
    DbTablePreviewRequest,
    DbUriRequest,
    DbWriteRequest,
)
from app.schemas.response import (
    DbDatabasesResponse,
    DbNameResponse,
    DbPreviewRowResponse,
    DbTableNameResponse,
    DbTablePreviewResponse,
    DbTablesResponse,
    DbWriteResponse,
)
from app.services.mongo_transfer_service import (
    coerce_preview_rows,
    list_mongo_databases,
    list_mongo_collections,
    preview_mongo_collection,
    write_mongo_rows,
)
from app.services.mysql_transfer_service import (
    list_mysql_databases,
    list_mysql_tables,
    preview_mysql_table,
    write_mysql_rows,
)

router = APIRouter(tags=["db-transfer"])


def _normalize_db_type(db_type: str) -> str:
    normalized_db_type = db_type.strip().lower()
    if normalized_db_type not in {"mongodb", "mysql"}:
        raise ValueError("Unsupported database type")
    return normalized_db_type


@router.post(
    "/db-transfer/databases",
    response_model=DbDatabasesResponse,
    summary="List databases for a supported source or destination connection",
)
async def list_connection_databases(payload: DbUriRequest) -> DbDatabasesResponse:
    """List databases for either MongoDB or MySQL."""

    try:
        db_type = _normalize_db_type(payload.db_type)
        if db_type == "mongodb":
            databases = await list_mongo_databases(payload.connection_uri)
        else:
            databases = list_mysql_databases(payload.connection_uri)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except (PyMongoError, SQLAlchemyError) as exc:
        logger.warning("Failed to list databases", db_type=payload.db_type, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to connect to {payload.db_type}",
        ) from exc

    return DbDatabasesResponse(
        db_type=db_type,
        databases=[DbNameResponse(name=name) for name in databases],
    )


@router.post(
    "/db-transfer/source/tables",
    response_model=DbTablesResponse,
    summary="List source tables or collections",
)
async def list_source_tables(payload: DbConnectionRequest) -> DbTablesResponse:
    """List tables or collections from a source database."""

    try:
        db_type = _normalize_db_type(payload.db_type)
        if db_type == "mongodb":
            tables = await list_mongo_collections(payload.connection_uri, payload.database_name)
        else:
            tables = list_mysql_tables(payload.connection_uri, payload.database_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except (PyMongoError, SQLAlchemyError) as exc:
        logger.warning(
            "Failed to list source tables",
            db_type=payload.db_type,
            database_name=payload.database_name,
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to connect to source {payload.db_type}",
        ) from exc

    return DbTablesResponse(
        db_type=db_type,
        database_name=payload.database_name,
        tables=[DbTableNameResponse(name=name) for name in tables],
    )


@router.post(
    "/db-transfer/source/preview",
    response_model=DbTablePreviewResponse,
    summary="Preview source table or collection data",
)
async def preview_source_table(payload: DbTablePreviewRequest) -> DbTablePreviewResponse:
    """Return a tabular preview for a selected source table or collection."""

    try:
        db_type = _normalize_db_type(payload.db_type)
        if db_type == "mongodb":
            columns, rows = await preview_mongo_collection(
                payload.connection_uri,
                payload.database_name,
                payload.table_name,
                payload.limit,
            )
        else:
            columns, rows = preview_mysql_table(
                payload.connection_uri,
                payload.database_name,
                payload.table_name,
                payload.limit,
            )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except (PyMongoError, SQLAlchemyError) as exc:
        logger.warning(
            "Failed to preview source table",
            db_type=payload.db_type,
            database_name=payload.database_name,
            table_name=payload.table_name,
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to load source data from {payload.db_type}",
        ) from exc

    return DbTablePreviewResponse(
        db_type=db_type,
        database_name=payload.database_name,
        table_name=payload.table_name,
        columns=columns,
        rows=[DbPreviewRowResponse(values=row) for row in rows],
        total_rows=len(rows),
    )


@router.post(
    "/db-transfer/destination/tables",
    response_model=DbTablesResponse,
    summary="List destination tables or collections",
)
async def list_destination_tables(payload: DbConnectionRequest) -> DbTablesResponse:
    """List tables or collections from a destination database."""

    return await list_source_tables(payload)


@router.post(
    "/db-transfer/destination/write",
    response_model=DbWriteResponse,
    summary="Write transformed rows to a destination table or collection",
)
async def write_destination_table(payload: DbWriteRequest) -> DbWriteResponse:
    """Write transformed rows to either MongoDB or MySQL."""

    normalized_rows = coerce_preview_rows(payload.columns, payload.rows)

    try:
        db_type = _normalize_db_type(payload.db_type)
        if db_type == "mongodb":
            rows_written = await write_mongo_rows(
                payload.connection_uri,
                payload.database_name,
                payload.table_name,
                payload.write_mode,
                normalized_rows,
            )
        else:
            rows_written = write_mysql_rows(
                payload.connection_uri,
                payload.database_name,
                payload.table_name,
                payload.write_mode,
                normalized_rows,
            )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except (PyMongoError, SQLAlchemyError) as exc:
        logger.warning(
            "Failed to write destination table",
            db_type=payload.db_type,
            database_name=payload.database_name,
            table_name=payload.table_name,
            write_mode=payload.write_mode,
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to write to destination {payload.db_type}",
        ) from exc

    return DbWriteResponse(
        db_type=db_type,
        database_name=payload.database_name,
        table_name=payload.table_name,
        write_mode=payload.write_mode,
        rows_written=rows_written,
    )
