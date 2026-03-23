"""Request schemas for date transformation endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DateColumnRequest(BaseModel):
    """Batch payload for a single source date column."""

    source_column: str = Field(..., description="Name of the source column")
    target_column: str = Field(..., description="Name of the target column")
    values: list[str | None] = Field(
        ...,
        description="Batch of date values to transform",
    )
    prompt: str = Field(
        ...,
        description="Natural-language instruction for the target date format",
    )


class TransformDatesRequest(BaseModel):
    """Top-level request payload sent by the ETL worker."""

    pipeline_id: str = Field(..., description="Unique pipeline identifier")
    batch_id: str = Field(..., description="Unique batch identifier")
    columns: list[DateColumnRequest] = Field(
        ...,
        description="Collection of columns requiring date transformation",
    )


class PromptTestRequest(BaseModel):
    """Ad hoc prompt-testing payload from the monitoring UI."""

    values: list[str | None] = Field(
        ...,
        description="Sample date values to test against a prompt",
    )
    prompt: str = Field(
        ...,
        description="Natural-language date transformation instruction",
    )
    source_column: str = Field(
        default="test_date",
        description="Optional source column label for the playground",
    )
    target_column: str = Field(
        default="test_date_transformed",
        description="Optional target column label for the playground",
    )


class MongoUriRequest(BaseModel):
    """Connection details for a user-supplied MongoDB server."""

    mongo_uri: str = Field(..., description="MongoDB connection string")


class MongoConnectionRequest(MongoUriRequest):
    """Connection details for a user-supplied MongoDB database."""

    database_name: str = Field(..., description="MongoDB database name")


class MongoCollectionPreviewRequest(MongoConnectionRequest):
    """Request payload for previewing a source collection."""

    collection_name: str = Field(..., description="MongoDB collection name")
    limit: int | None = Field(
        default=100,
        description="Maximum number of documents to return; null means all documents",
    )


class MongoWriteRequest(MongoConnectionRequest):
    """Request payload for writing transformed rows to MongoDB."""

    collection_name: str = Field(..., description="Destination collection name")
    write_mode: str = Field(
        ...,
        description="Destination write mode: create, append, or replace",
    )
    columns: list[str] = Field(
        ...,
        description="Ordered output column names",
    )
    rows: list[dict[str, object | None]] = Field(
        ...,
        description="Rows to write to the destination collection",
    )


class DbUriRequest(BaseModel):
    """Connection details for a user-supplied source or destination database server."""

    db_type: str = Field(..., description="Database type, such as mongodb or mysql")
    connection_uri: str = Field(..., description="Database connection string")


class DbConnectionRequest(DbUriRequest):
    """Connection details for a specific database/catalog."""

    database_name: str = Field(..., description="Database name")


class DbTablePreviewRequest(DbConnectionRequest):
    """Request payload for previewing a selected source table or collection."""

    table_name: str = Field(..., description="Table or collection name")
    limit: int | None = Field(
        default=100,
        description="Maximum number of rows/documents to return; null means all",
    )


class DbWriteRequest(DbConnectionRequest):
    """Request payload for writing transformed rows to a destination table or collection."""

    table_name: str = Field(..., description="Destination table or collection name")
    write_mode: str = Field(
        ...,
        description="Destination write mode: create, append, or replace",
    )
    columns: list[str] = Field(..., description="Ordered output column names")
    rows: list[dict[str, object | None]] = Field(
        ...,
        description="Rows to write to the destination table or collection",
    )
