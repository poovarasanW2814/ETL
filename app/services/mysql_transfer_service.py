"""MySQL-to-MySQL transfer helpers for the DB transfer flow."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import BIGINT, BOOLEAN, FLOAT, TEXT, Boolean, Column, MetaData, Table, Text, create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import SQLAlchemyError

from app.services.mongo_transfer_service import (
    SUPPORTED_WRITE_MODES,
    WRITE_MODE_APPEND,
    WRITE_MODE_CREATE,
    WRITE_MODE_REPLACE,
)


def _build_mysql_engine(connection_uri: str, database_name: str | None = None) -> Engine:
    """Create a MySQL engine for either server-level or database-level operations."""

    url = make_url(connection_uri)
    if database_name is not None:
        url = url.set(database=database_name)
    return create_engine(url, pool_pre_ping=True)


def _serialize_mysql_value(value: Any) -> Any:
    """Convert MySQL values to JSON-safe values for API transport."""

    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return str(value)


def _quote_identifier(identifier: str) -> str:
    """Quote a MySQL identifier safely."""

    return f"`{identifier.replace('`', '``')}`"


def _infer_column_type(values: list[Any]) -> Any:
    """Infer a reasonable SQLAlchemy column type for create-table mode."""

    non_null_values = [value for value in values if value is not None]
    if not non_null_values:
        return Text

    if all(isinstance(value, bool) for value in non_null_values):
        return Boolean
    if all(isinstance(value, int) and not isinstance(value, bool) for value in non_null_values):
        return BIGINT
    if all(isinstance(value, (int, float)) and not isinstance(value, bool) for value in non_null_values):
        return FLOAT
    return TEXT


def list_mysql_databases(connection_uri: str) -> list[str]:
    """Return the database names available from a MySQL connection."""

    engine = _build_mysql_engine(connection_uri)
    try:
        with engine.connect() as connection:
            rows = connection.execute(text("SHOW DATABASES"))
            return sorted(str(row[0]) for row in rows if row[0] is not None)
    finally:
        engine.dispose()


def list_mysql_tables(connection_uri: str, database_name: str) -> list[str]:
    """Return the table names available in a selected MySQL database."""

    engine = _build_mysql_engine(connection_uri, database_name)
    try:
        inspector = inspect(engine)
        return sorted(inspector.get_table_names())
    finally:
        engine.dispose()


def preview_mysql_table(
    connection_uri: str,
    database_name: str,
    table_name: str,
    limit: int | None,
) -> tuple[list[str], list[dict[str, Any]]]:
    """Return a preview of rows from a selected MySQL table."""

    engine = _build_mysql_engine(connection_uri, database_name)
    try:
        quoted_table_name = _quote_identifier(table_name)
        query = f"SELECT * FROM {quoted_table_name}"
        if limit is not None:
            query = f"{query} LIMIT {int(limit)}"

        with engine.connect() as connection:
            result = connection.execute(text(query))
            rows = [dict(row) for row in result.mappings().all()]
    finally:
        engine.dispose()

    columns = list(rows[0].keys()) if rows else []
    normalized_rows = [
        {str(key): _serialize_mysql_value(value) for key, value in row.items()}
        for row in rows
    ]
    if not columns and normalized_rows:
        columns = list(normalized_rows[0].keys())
    return columns, normalized_rows


def write_mysql_rows(
    connection_uri: str,
    database_name: str,
    table_name: str,
    write_mode: str,
    rows: list[dict[str, Any]],
) -> int:
    """Write transformed rows to a MySQL destination table."""

    normalized_mode = write_mode.strip().lower()
    if normalized_mode not in SUPPORTED_WRITE_MODES:
        raise ValueError("Unsupported write mode")

    engine = _build_mysql_engine(connection_uri, database_name)
    metadata = MetaData()
    try:
        inspector = inspect(engine)
        table_exists = inspector.has_table(table_name)

        if normalized_mode == WRITE_MODE_CREATE and table_exists:
            raise ValueError("Destination table already exists")
        if normalized_mode == WRITE_MODE_APPEND and not table_exists:
            raise ValueError("Destination table does not exist for append mode")
        if normalized_mode == WRITE_MODE_REPLACE and not table_exists:
            raise ValueError("Destination table does not exist for replace mode")

        if normalized_mode == WRITE_MODE_CREATE:
            sample_values_by_column = {
                column: [row.get(column) for row in rows]
                for column in (rows[0].keys() if rows else [])
            }
            table = Table(
                table_name,
                metadata,
                *[
                    Column(column_name, _infer_column_type(values))
                    for column_name, values in sample_values_by_column.items()
                ],
            )
            metadata.create_all(engine, tables=[table])
        else:
            table = Table(table_name, metadata, autoload_with=engine)

        quoted_table_name = _quote_identifier(table_name)
        with engine.begin() as connection:
            if normalized_mode == WRITE_MODE_REPLACE:
                connection.execute(text(f"DELETE FROM {quoted_table_name}"))

            if rows:
                if normalized_mode != WRITE_MODE_CREATE:
                    table = Table(table_name, MetaData(), autoload_with=engine)
                connection.execute(table.insert(), rows)

        return len(rows)
    finally:
        engine.dispose()
