import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { McpApiService } from '../core/mcp-api.service';
import { FailedRecord, JobLog, JobRecord, JobStatusResponse, PreviewColumn, PreviewSample } from '../models';
import { LoaderComponent } from '../shared/loader.component';
import { LogsPanelComponent } from '../shared/logs-panel.component';
import { ProgressBarComponent } from '../shared/progress-bar.component';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule, RouterLink, LoaderComponent, LogsPanelComponent, ProgressBarComponent, StatusBadgeComponent],
  template: `
    <app-loader *ngIf="loading" label="Fetching job details..."></app-loader>

    <div *ngIf="!loading && error" class="space-y-4">
      <a routerLink="/" class="text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300">Back to dashboard</a>
      <div class="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">{{ error }}</div>
    </div>

    <section *ngIf="!loading && !error" class="space-y-6">
      <a routerLink="/" class="inline-flex text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300">Back to dashboard</a>

      <div
        *ngIf="retryLaunch"
        class="relative overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(236,253,245,0.96))] px-6 py-6 shadow-[0_24px_80px_-40px_rgba(16,185,129,0.65)] dark:border-emerald-900/60 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(135deg,_rgba(6,78,59,0.78),_rgba(2,44,34,0.92))]"
      >
        <div class="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-300/20 blur-2xl dark:bg-emerald-400/10"></div>
        <div class="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.35em] text-emerald-700 dark:text-emerald-300">Retry launched</p>
            <h3 class="mt-2 text-2xl font-extrabold tracking-tight text-emerald-950 dark:text-emerald-50">
              Fresh job created and now live
            </h3>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">
              This run was created from retrying
              <span class="font-mono font-semibold">{{ retryLaunch.previousJobId }}</span>
              and is now being tracked as
              <span class="font-mono font-semibold">{{ retryLaunch.newJobId }}</span>.
            </p>
          </div>

          <div class="grid min-w-[260px] gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-emerald-200/80 bg-white/80 px-4 py-4 backdrop-blur dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <p class="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700/70 dark:text-emerald-300/70">Previous job</p>
              <p class="mt-2 break-all font-mono text-sm font-bold text-emerald-950 dark:text-emerald-50">{{ retryLaunch.previousJobId }}</p>
            </div>
            <div class="rounded-2xl border border-emerald-200/80 bg-white/80 px-4 py-4 backdrop-blur dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <p class="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700/70 dark:text-emerald-300/70">New live job</p>
              <p class="mt-2 break-all font-mono text-sm font-bold text-emerald-950 dark:text-emerald-50">{{ retryLaunch.newJobId }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-panel px-6 py-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Job details</p>
            <h2 class="mt-2 break-all font-mono text-2xl font-extrabold text-ink dark:text-slate-100">{{ mergedJob?.job_id || jobId }}</h2>
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <app-status-badge [status]="mergedJob?.status"></app-status-badge>
              <span class="text-sm text-slate-500 dark:text-slate-400">Live WebSocket updates</span>
              <a
                *ngIf="mergedJob?.pipeline_id"
                [routerLink]="['/pipelines', mergedJob?.pipeline_id]"
                class="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
              >
                View pipeline history
              </a>
              <button
                type="button"
                (click)="handleRetry()"
                [disabled]="retrying"
                class="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-950"
                *ngIf="mergedJob?.retry_available"
              >
                {{ retrying ? 'Retrying...' : 'Retry job' }}
              </button>
              <span
                *ngIf="mergedJob?.retry_available"
                class="text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                Retry available for 24 hours while payload is cached.
              </span>
              <button
                type="button"
                (click)="handleDelete()"
                [disabled]="deleting"
                class="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ deleting ? 'Deleting...' : 'Delete job' }}
              </button>
            </div>
          </div>

          <div class="grid min-w-[280px] grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900" *ngFor="let stat of summaryStats">
              <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{{ stat.label }}</p>
              <p class="mt-2 text-lg font-extrabold text-ink dark:text-slate-100">{{ stat.value }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-panel px-6 py-6">
        <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Progress</h3>
        <div class="mt-5">
          <app-progress-bar
            [progress]="mergedJob?.progress?.progress"
            [processedRows]="mergedJob?.progress?.processed_rows"
            [totalRows]="mergedJob?.progress?.total_rows"
            [etaSeconds]="mergedJob?.progress?.estimated_seconds_remaining"
          ></app-progress-bar>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="glass-panel px-6 py-6">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Runtime metrics</h3>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900" *ngFor="let stat of runtimeStats">
              <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{{ stat.label }}</p>
              <p class="mt-2 text-lg font-extrabold text-ink dark:text-slate-100">{{ stat.value }}</p>
            </div>
          </div>
        </div>

        <div class="glass-panel px-6 py-6">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Prompt inspector</h3>
          <div class="mt-5 space-y-4">
            <ng-container *ngIf="mergedJob?.prompt_insights?.length; else noPromptData">
              <div *ngFor="let insight of mergedJob?.prompt_insights" class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800/70">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Column</p>
                <p class="mt-1 text-sm font-semibold text-ink dark:text-slate-100">{{ insight.source_column }} -> {{ insight.target_column }}</p>
                <p class="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Prompt</p>
                <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ insight.prompt || 'N/A' }}</p>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Detected format</p>
                    <p class="mt-1 text-sm font-semibold text-ink dark:text-slate-100">{{ insight.detected_format || 'N/A' }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Target format</p>
                    <p class="mt-1 text-sm font-semibold text-ink dark:text-slate-100">{{ insight.target_format || 'N/A' }}</p>
                  </div>
                </div>
              </div>
            </ng-container>
            <ng-template #noPromptData>
              <p class="text-sm text-slate-500 dark:text-slate-400">No prompt metadata available.</p>
            </ng-template>
          </div>
        </div>
      </div>

      <app-logs-panel [logs]="logs" (download)="handleDownloadLogs()"></app-logs-panel>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="glass-panel px-6 py-6">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Failed records</h3>
          <div class="mt-5 max-h-[320px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead class="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                <tr>
                  <th class="px-4 py-3">Row</th>
                  <th class="px-4 py-3">Column</th>
                  <th class="px-4 py-3">Source value</th>
                  <th class="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                <ng-container *ngIf="failedRecords.length; else noFailedRecords">
                  <tr *ngFor="let record of failedRecords; trackBy: trackByFailedRecord">
                    <td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{{ record.row }}</td>
                    <td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{{ record.source_column }}</td>
                    <td class="px-4 py-3 font-mono text-sm text-slate-700 dark:text-slate-300">{{ record.source_value || 'N/A' }}</td>
                    <td class="px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{{ record.error }}</td>
                  </tr>
                </ng-container>
                <ng-template #noFailedRecords>
                  <tr>
                    <td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No failed records captured.</td>
                  </tr>
                </ng-template>
              </tbody>
            </table>
          </div>
        </div>

        <div class="glass-panel px-6 py-6">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Transformation preview</h3>
          <div class="mt-5 space-y-4">
            <ng-container *ngIf="preview.length; else noPreviewData">
              <div *ngFor="let column of preview; trackBy: trackByPreviewColumn" class="rounded-2xl border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
                <p class="text-sm font-semibold text-ink dark:text-slate-100">{{ column.source_column }} -> {{ column.target_column }}</p>
                <div class="mt-3 space-y-2">
                  <div *ngFor="let sample of column.samples; trackBy: trackByPreviewSample" class="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <span class="font-mono">{{ sample.source_value || 'N/A' }}</span>
                    <span class="font-mono text-ink dark:text-slate-100">{{ sample.transformed_value || 'N/A' }}</span>
                  </div>
                </div>
              </div>
            </ng-container>
            <ng-template #noPreviewData>
              <p class="text-sm text-slate-500 dark:text-slate-400">No preview data available yet.</p>
            </ng-template>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class JobDetailsComponent implements OnInit, OnDestroy {
  readonly api = inject(McpApiService);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);

  jobId = '';
  job: JobRecord | null = null;
  statusData: JobStatusResponse | null = null;
  logs: JobLog[] = [];
  failedRecords: FailedRecord[] = [];
  preview: PreviewColumn[] = [];
  loading = true;
  error = '';
  deleting = false;
  retrying = false;
  retryLaunch: { previousJobId: string; newJobId: string } | null = null;

  private socket?: WebSocket;
  private reconnectTimeout?: number;
  private reconnectAttempts = 0;
  private routeSubscription?: Subscription;

  get mergedJob(): JobRecord | null {
    if (!this.job && !this.statusData) {
      return null;
    }

    return {
      ...(this.job ?? {}),
      ...(this.statusData ?? {}),
      metrics: this.statusData?.metrics ?? this.job?.metrics,
      timestamps: this.statusData?.timestamps ?? this.job?.timestamps,
      payload: this.job?.payload ?? this.statusData?.payload,
    } as JobRecord;
  }

  get summaryStats(): Array<{ label: string; value: string }> {
    const current = this.mergedJob;
    return [
      { label: 'Pipeline', value: current?.pipeline_id ?? 'N/A' },
      { label: 'Batch', value: current?.batch_id ?? 'N/A' },
      { label: 'Rows processed', value: this.formatValue(current?.metrics?.rows_processed) },
      { label: 'Columns processed', value: this.formatValue(current?.metrics?.columns_processed) },
    ];
  }

  get runtimeStats(): Array<{ label: string; value: string }> {
    const current = this.mergedJob;
    return [
      { label: 'Processing time', value: this.formatValue(current?.metrics?.processing_time_seconds, 's') },
      { label: 'Worker', value: current?.worker ?? 'N/A' },
      { label: 'Created', value: this.formatDate(current?.timestamps?.created_at) },
      { label: 'Started', value: this.formatDate(current?.timestamps?.started_at) },
      { label: 'Completed', value: this.formatDate(current?.timestamps?.completed_at) },
    ];
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const nextJobId = params.get('jobId') ?? '';

      if (!nextJobId) {
        return;
      }

      this.jobId = nextJobId;
      this.resetViewState();
      this.captureRetryLaunchState();
      void this.loadDetails();
      this.reconnectSocket();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
    }
    this.socket?.close();
  }

  async handleDelete(): Promise<void> {
    const confirmed = window.confirm('Delete this job from the monitoring dashboard?');
    if (!confirmed) {
      return;
    }

    try {
      this.deleting = true;
      await this.api.deleteJob(this.jobId);
      await this.router.navigate(['/']);
    } catch (error: unknown) {
      this.error = this.resolveError(error, 'Unable to delete this job.');
    } finally {
      this.deleting = false;
    }
  }

  async handleRetry(): Promise<void> {
    try {
      this.retrying = true;
      const data = await this.api.retryJob(this.jobId);
      await this.router.navigate(['/jobs', data.job_id], {
        state: {
          retryLaunch: {
            previousJobId: this.jobId,
            newJobId: data.job_id,
          },
        },
      });
    } catch (error: unknown) {
      this.error = this.resolveError(error, 'Unable to retry this job.');
    } finally {
      this.retrying = false;
    }
  }

  handleDownloadLogs(): void {
    const content = this.logs
      .map((log) => `[${new Date(log.timestamp).toLocaleString()}] ${log.level} ${log.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.jobId}-logs.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  trackByFailedRecord(index: number, record: FailedRecord): string {
    return `${record.row}-${index}`;
  }

  trackByPreviewColumn(_index: number, column: PreviewColumn): string {
    return `${column.source_column}-${column.target_column}`;
  }

  trackByPreviewSample(index: number, sample: PreviewSample): string {
    return `${sample.source_value ?? 'source'}-${sample.transformed_value ?? 'target'}-${index}`;
  }

  private captureRetryLaunchState(): void {
    const state = (history.state as {
      retryLaunch?: { previousJobId?: string; newJobId?: string };
    })?.retryLaunch;

    if (
      state?.previousJobId &&
      state?.newJobId &&
      state.newJobId === this.jobId &&
      state.previousJobId !== this.jobId
    ) {
      this.retryLaunch = {
        previousJobId: state.previousJobId,
        newJobId: state.newJobId,
      };
      return;
    }

    this.retryLaunch = null;
  }

  private resetViewState(): void {
    this.loading = true;
    this.error = '';
    this.job = null;
    this.statusData = null;
    this.logs = [];
    this.failedRecords = [];
    this.preview = [];
  }

  private reconnectSocket(): void {
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    this.socket?.close();
    this.socket = undefined;
    this.reconnectAttempts = 0;
    this.connectSocket();
  }

  private async loadDetails(): Promise<void> {
    try {
      const [details, status, logData, failedData, previewData] = await Promise.all([
        this.api.getJobDetails(this.jobId),
        this.api.getJobStatus(this.jobId),
        this.api.getJobLogs(this.jobId),
        this.api.getFailedRecords(this.jobId),
        this.api.getPreview(this.jobId),
      ]);

      this.job = details;
      this.statusData = status;
      this.logs = logData.logs ?? [];
      this.failedRecords = failedData.records ?? [];
      this.preview = previewData.columns ?? [];
      this.error = '';
    } catch (error: unknown) {
      console.error('Job details load failed', error);
      this.error = this.resolveError(
        error,
        'Unable to load job details. Ensure the backend exposes /api/v1/mcp-jobs/{job_id}.',
      );
    } finally {
      this.loading = false;
    }
  }

  private connectSocket(): void {
    this.socket = new WebSocket(this.api.getJobEventsWebSocketUrl(this.jobId));
    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };
    this.socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as JobStatusResponse & { event_type?: string };

      if (payload.event_type === 'job_log') {
        this.logs = [...this.logs, payload as unknown as JobLog].slice(-500);
        return;
      }

      if (payload.event_type === 'job_deleted') {
        void this.router.navigate(['/']);
        return;
      }

      if (payload.event_type !== 'job_updated') {
        return;
      }

      this.statusData = {
        ...(this.statusData ?? {}),
        ...payload,
        metrics: payload.metrics ?? this.statusData?.metrics,
        progress: payload.progress ?? this.statusData?.progress,
        timestamps: {
          ...(this.statusData?.timestamps ?? {}),
          ...(payload.timestamps ?? {}),
        },
      };

      if (payload.status === 'SUCCESS' || payload.status === 'FAILED') {
        void this.loadDetails();
      }
    };

    this.socket.onclose = () => {
      const delay = Math.min(2000 * 2 ** this.reconnectAttempts, 30000);
      this.reconnectAttempts += 1;
      this.reconnectTimeout = window.setTimeout(() => this.connectSocket(), delay);
    };
  }

  private formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleString() : 'N/A';
  }

  private formatValue(value: number | string | null | undefined, suffix = ''): string {
    return value === undefined || value === null ? 'N/A' : `${value}${suffix}`;
  }

  private resolveError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error) {
      const httpError = error as {
        status?: number;
        statusText?: string;
        message?: string;
        error?: { detail?: string } | string;
      };

      if (typeof httpError.error === 'object' && httpError.error?.detail) {
        return httpError.error.detail;
      }

      if (typeof httpError.error === 'string' && httpError.error.trim()) {
        return httpError.error;
      }

      if (httpError.status && httpError.statusText) {
        return `Unable to load job details (${httpError.status} ${httpError.statusText}).`;
      }

      if (httpError.message) {
        return httpError.message;
      }
    }

    return fallback;
  }
}
