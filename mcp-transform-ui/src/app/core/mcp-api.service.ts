import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import {
  AnalyticsResponse,
  FailedRecord,
  JobLog,
  JobRecord,
  JobsResponse,
  JobStatusResponse,
  DbDatabasesResponse,
  DbTablePreviewResponse,
  DbTablesResponse,
  DbWriteResponse,
  PreviewColumn,
  PromptTestResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class McpApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =
    (globalThis as { __MCP_API_BASE_URL__?: string }).__MCP_API_BASE_URL__ ?? 'http://localhost:8000';

  getJobEventsWebSocketUrl(jobId?: string): string {
    const url = new URL(this.baseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/jobs';

    if (jobId) {
      url.searchParams.set('jobId', jobId);
    }

    return url.toString();
  }

  async getJobs(params: Record<string, string | number | undefined>): Promise<JobsResponse> {
    return firstValueFrom(
      this.http.get<JobsResponse>(`${this.baseUrl}/api/v1/mcp-jobs`, {
        params: this.buildParams(params),
      }),
    );
  }

  async getPipelineJobs(
    pipelineId: string,
    params: Record<string, string | number | undefined>,
  ): Promise<JobsResponse> {
    return firstValueFrom(
      this.http.get<JobsResponse>(`${this.baseUrl}/api/v1/pipelines/${pipelineId}/jobs`, {
        params: this.buildParams(params),
      }),
    );
  }

  async getJobAnalytics(
    params: Record<string, string | number | undefined>,
  ): Promise<AnalyticsResponse> {
    return firstValueFrom(
      this.http.get<AnalyticsResponse>(`${this.baseUrl}/api/v1/mcp-jobs/analytics`, {
        params: this.buildParams(params),
      }),
    );
  }

  async getJobDetails(jobId: string): Promise<JobRecord> {
    return firstValueFrom(this.http.get<JobRecord>(`${this.baseUrl}/api/v1/mcp-jobs/${jobId}`));
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return firstValueFrom(
      this.http.get<JobStatusResponse>(`${this.baseUrl}/api/v1/transform-status/${jobId}`),
    );
  }

  async submitTransformDatesJob(payload: {
    pipeline_id: string;
    batch_id: string;
    columns: Array<{
      source_column: string;
      target_column: string;
      values: Array<string | null>;
      prompt: string;
    }>;
  }): Promise<{ job_id: string; status?: string }> {
    return firstValueFrom(
      this.http.post<{ job_id: string; status?: string }>(
        `${this.baseUrl}/api/v1/transform-dates`,
        payload,
      ),
    );
  }

  async getJobLogs(jobId: string): Promise<{ logs: JobLog[] }> {
    return firstValueFrom(
      this.http.get<{ logs: JobLog[] }>(`${this.baseUrl}/api/v1/mcp-jobs/${jobId}/logs`),
    );
  }

  async getFailedRecords(jobId: string): Promise<{ records: FailedRecord[] }> {
    return firstValueFrom(
      this.http.get<{ records: FailedRecord[] }>(
        `${this.baseUrl}/api/v1/mcp-jobs/${jobId}/failed-records`,
      ),
    );
  }

  async getPreview(jobId: string): Promise<{ columns: PreviewColumn[] }> {
    return firstValueFrom(
      this.http.get<{ columns: PreviewColumn[] }>(`${this.baseUrl}/api/v1/mcp-jobs/${jobId}/preview`),
    );
  }

  async retryJob(jobId: string): Promise<{ job_id: string }> {
    return firstValueFrom(
      this.http.post<{ job_id: string }>(`${this.baseUrl}/api/v1/mcp-jobs/${jobId}/retry`, {}),
    );
  }

  async deleteJob(jobId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/api/v1/mcp-jobs/${jobId}`));
  }

  async testPrompt(payload: { prompt: string; values: string[] }): Promise<PromptTestResponse> {
    return firstValueFrom(
      this.http.post<PromptTestResponse>(`${this.baseUrl}/api/v1/prompt-tester`, payload, {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }

  async getDatabases(payload: {
    db_type: string;
    connection_uri: string;
  }): Promise<DbDatabasesResponse> {
    return firstValueFrom(
      this.http.post<DbDatabasesResponse>(
        `${this.baseUrl}/api/v1/db-transfer/databases`,
        payload,
      ),
    );
  }

  async getSourceTables(payload: {
    db_type: string;
    connection_uri: string;
    database_name: string;
  }): Promise<DbTablesResponse> {
    return firstValueFrom(
      this.http.post<DbTablesResponse>(
        `${this.baseUrl}/api/v1/db-transfer/source/tables`,
        payload,
      ),
    );
  }

  async previewSourceTable(payload: {
    db_type: string;
    connection_uri: string;
    database_name: string;
    table_name: string;
    limit?: number | null;
  }): Promise<DbTablePreviewResponse> {
    return firstValueFrom(
      this.http.post<DbTablePreviewResponse>(
        `${this.baseUrl}/api/v1/db-transfer/source/preview`,
        payload,
      ),
    );
  }

  async getDestinationTables(payload: {
    db_type: string;
    connection_uri: string;
    database_name: string;
  }): Promise<DbTablesResponse> {
    return firstValueFrom(
      this.http.post<DbTablesResponse>(
        `${this.baseUrl}/api/v1/db-transfer/destination/tables`,
        payload,
      ),
    );
  }

  async writeDestinationTable(payload: {
    db_type: string;
    connection_uri: string;
    database_name: string;
    table_name: string;
    write_mode: string;
    columns: string[];
    rows: Record<string, string | number | boolean | object | null>[];
  }): Promise<DbWriteResponse> {
    return firstValueFrom(
      this.http.post<DbWriteResponse>(
        `${this.baseUrl}/api/v1/db-transfer/destination/write`,
        payload,
      ),
    );
  }

  private buildParams(params: Record<string, string | number | undefined>): HttpParams {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return httpParams;
  }
}
