import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { McpApiService } from '../core/mcp-api.service';
import { AnalyticsResponse, DurationBreakdownItem } from '../models';
import { JobTableComponent } from '../shared/job-table.component';
import { LoaderComponent } from '../shared/loader.component';

@Component({
  selector: 'app-job-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, JobTableComponent, LoaderComponent],
  template: `
    <section class="space-y-6">
      <div class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Job analytics</p>
        <div class="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">Runtime analytics dashboard</h2>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Explore MCP job execution trends across selected time windows with status, duration, and volume breakdowns.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-2xl bg-ink px-4 py-3 text-white dark:bg-slate-800">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-slate-400">Jobs</p>
              <p class="mt-1 text-2xl font-extrabold">{{ analytics?.summary?.total_jobs ?? 0 }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Success</p>
              <p class="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">{{ analytics?.summary?.success_count ?? 0 }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Failed</p>
              <p class="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">{{ analytics?.summary?.failed_count ?? 0 }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Running</p>
              <p class="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">{{ analytics?.summary?.running_count ?? 0 }}</p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex flex-wrap gap-3">
            <button
              *ngFor="let option of durationOptions"
              type="button"
              (click)="selectDuration(option.value)"
              class="rounded-full px-4 py-2 text-sm font-semibold transition"
              [ngClass]="duration === option.value ? 'bg-ink text-white dark:bg-amber-500 dark:text-slate-950' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="flex flex-wrap gap-3">
            <ng-container *ngIf="duration === 'custom'">
              <input
                type="date"
                [(ngModel)]="startDate"
                (ngModelChange)="resetAndLoad()"
                class="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <input
                type="date"
                [(ngModel)]="endDate"
                (ngModelChange)="resetAndLoad()"
                class="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </ng-container>
            <select
              [(ngModel)]="limit"
              (ngModelChange)="resetAndLoad()"
              class="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option *ngFor="let option of pageSizeOptions" [ngValue]="option">{{ option }} / page</option>
            </select>
          </div>
        </div>
      </div>

      <app-loader *ngIf="loading" label="Fetching analytics..."></app-loader>

      <div *ngIf="!loading && error" class="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">
        {{ error }}
      </div>

      <ng-container *ngIf="!loading && !error && analytics">
        <div class="grid gap-6 xl:grid-cols-2">
          <div class="glass-panel px-6 py-6">
            <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Status distribution</h3>
            <div class="mt-6 space-y-4">
              <div *ngFor="let item of analytics.status_breakdown" class="space-y-2">
                <div class="flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span>{{ item.status }}</span>
                  <span>{{ item.count }}</span>
                </div>
                <div class="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div class="chart-bar" [style.width.%]="ratio(item.count, maxStatusCount)"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-panel px-6 py-6">
            <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Average duration by pipeline</h3>
            <div class="mt-6 space-y-4">
              <div *ngFor="let item of topDurations" class="space-y-2">
                <div class="flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span class="truncate pr-4">{{ item.pipeline_id }}</span>
                  <span>{{ item.average_duration | number : '1.0-2' }}s</span>
                </div>
                <div class="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div class="chart-bar" [style.width.%]="ratio(item.average_duration, maxDuration)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-panel px-6 py-6">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Job volume over time</h3>
          <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div *ngFor="let item of analytics.timeline" class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{{ item.date }}</p>
              <p class="mt-3 text-2xl font-extrabold text-ink dark:text-slate-100">{{ item.job_count }}</p>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div class="chart-bar" [style.width.%]="ratio(item.job_count, maxTimelineCount)"></div>
              </div>
            </div>
          </div>
        </div>

        <app-job-table [jobs]="analytics.jobs"></app-job-table>

        <div *ngIf="totalPages > 1" class="flex items-center justify-center gap-3">
          <button
            type="button"
            [disabled]="page === 1"
            (click)="goToPage(page - 1)"
            class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <span class="text-sm font-semibold text-slate-500 dark:text-slate-400">Page {{ page }} / {{ totalPages }}</span>
          <button
            type="button"
            [disabled]="page >= totalPages"
            (click)="goToPage(page + 1)"
            class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </ng-container>
    </section>
  `,
})
export class JobAnalyticsComponent implements OnInit {
  readonly api = inject(McpApiService);
  readonly durationOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Last 24h', value: '24h' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Custom', value: 'custom' },
  ];
  readonly pageSizeOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  duration = '7d';
  startDate = '';
  endDate = '';
  page = 1;
  limit = 20;
  loading = true;
  error = '';
  analytics: AnalyticsResponse | null = null;

  get totalPages(): number {
    return this.analytics ? Math.max(Math.ceil(this.analytics.total / this.limit), 1) : 1;
  }

  get topDurations(): DurationBreakdownItem[] {
    return this.analytics?.duration_breakdown.slice(0, 8) ?? [];
  }

  get maxStatusCount(): number {
    return Math.max(...(this.analytics?.status_breakdown.map((item) => item.count) ?? [1]));
  }

  get maxDuration(): number {
    return Math.max(...this.topDurations.map((item) => item.average_duration), 1);
  }

  get maxTimelineCount(): number {
    return Math.max(...(this.analytics?.timeline.map((item) => item.job_count) ?? [1]));
  }

  ngOnInit(): void {
    void this.loadAnalytics();
  }

  selectDuration(duration: string): void {
    this.duration = duration;
    this.resetAndLoad();
  }

  resetAndLoad(): void {
    this.page = 1;
    this.loading = true;
    void this.loadAnalytics();
  }

  goToPage(page: number): void {
    this.page = Math.min(Math.max(page, 1), this.totalPages);
    this.loading = true;
    void this.loadAnalytics();
  }

  ratio(value: number, maxValue: number): number {
    return maxValue > 0 ? Math.max(8, (value / maxValue) * 100) : 0;
  }

  private async loadAnalytics(): Promise<void> {
    try {
      const params: Record<string, string | number | undefined> = { page: this.page, limit: this.limit };
      if (this.duration === 'custom') {
        params['start_date'] = this.startDate ? new Date(`${this.startDate}T00:00:00`).toISOString() : undefined;
        params['end_date'] = this.endDate ? new Date(`${this.endDate}T23:59:59`).toISOString() : undefined;
      } else {
        params['duration'] = this.duration;
      }

      this.analytics = await this.api.getJobAnalytics(params);
      this.error = '';
    } catch (error: unknown) {
      this.error = this.resolveError(error, 'Unable to load job analytics.');
    } finally {
      this.loading = false;
    }
  }

  private resolveError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const inner = (error as { error?: { detail?: string } }).error;
      return inner?.detail ?? fallback;
    }

    return fallback;
  }
}
