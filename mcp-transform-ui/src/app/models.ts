export interface JobMetrics {
  rows_processed?: number | null;
  columns_processed?: number | null;
  processing_time_seconds?: number | null;
}

export interface JobProgress {
  progress?: number | null;
  processed_rows?: number | null;
  total_rows?: number | null;
  estimated_seconds_remaining?: number | null;
}

export interface JobTimestamps {
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface PromptInsight {
  source_column: string;
  target_column: string;
  prompt?: string | null;
  detected_format?: string | null;
  target_format?: string | null;
}

export interface JobRecord {
  job_id: string;
  pipeline_id?: string | null;
  batch_id?: string | null;
  status?: string | null;
  worker?: string | null;
  metrics?: JobMetrics;
  progress?: JobProgress;
  timestamps?: JobTimestamps;
  payload?: unknown;
  prompt_insights?: PromptInsight[];
  retry_available?: boolean;
}

export interface JobsResponse {
  jobs: JobRecord[];
  total: number;
}

export interface JobLog {
  timestamp: string;
  level: string;
  message: string;
}

export interface FailedRecord {
  row: number | string;
  source_column?: string | null;
  source_value?: string | null;
  error?: string | null;
}

export interface PreviewSample {
  source_value?: string | null;
  transformed_value?: string | null;
}

export interface PreviewColumn {
  source_column: string;
  target_column: string;
  samples: PreviewSample[];
}

export interface JobStatusResponse extends Partial<JobRecord> {
  result?: unknown;
  error?: string | null;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
}

export interface DurationBreakdownItem {
  pipeline_id: string;
  average_duration: number;
}

export interface TimelineItem {
  date: string;
  job_count: number;
}

export interface AnalyticsSummary {
  total_jobs: number;
  success_count: number;
  failed_count: number;
  running_count: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  status_breakdown: StatusBreakdownItem[];
  duration_breakdown: DurationBreakdownItem[];
  timeline: TimelineItem[];
  jobs: JobRecord[];
  total: number;
}

export interface PromptTestResponse {
  prompt: string;
  detected_format?: string | null;
  target_format?: string | null;
  transformed_values: Array<string | null>;
}

export interface MongoCollectionItem {
  name: string;
}

export interface MongoDatabaseItem {
  name: string;
}

export interface DbDatabasesResponse {
  db_type: string;
  databases: MongoDatabaseItem[];
}

export interface DbTablesResponse {
  db_type: string;
  database_name: string;
  tables: MongoCollectionItem[];
}

export interface MongoPreviewRow {
  values: Record<string, string | number | boolean | object | null>;
}

export interface DbTablePreviewResponse {
  db_type: string;
  database_name: string;
  table_name: string;
  columns: string[];
  rows: MongoPreviewRow[];
  total_rows: number;
}

export interface DbWriteResponse {
  db_type: string;
  database_name: string;
  table_name: string;
  write_mode: string;
  rows_written: number;
}
