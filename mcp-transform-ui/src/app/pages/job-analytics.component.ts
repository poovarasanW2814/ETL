import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';

import { McpApiService } from '../core/mcp-api.service';
import { AnalyticsResponse } from '../models';
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
          <!-- Status Distribution Pie Chart -->
          <div class="glass-panel px-6 py-6">
            <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Status distribution</h3>
            <div class="mt-6 flex justify-center">
              <canvas #statusChart style="max-width: 300px; max-height: 300px;"></canvas>
            </div>
          </div>

          <!-- Average Duration Bar Chart -->
          <div class="glass-panel px-6 py-6">
            <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Average duration by pipeline</h3>
            <div class="mt-6" [style.height.px]="getDurationChartHeight()">
              <canvas #durationChart></canvas>
            </div>
          </div>
        </div>

        <!-- Job Volume Timeline Bar Chart -->
        <div class="glass-panel px-6 py-6">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Job volume over time</h3>
          <div class="mt-6">
            <canvas #timelineChart style="max-height: 350px;"></canvas>
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
export class JobAnalyticsComponent implements OnInit, OnDestroy {
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('durationChart') durationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('timelineChart') timelineChartRef!: ElementRef<HTMLCanvasElement>;

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

  private statusChartInstance: Chart | null = null;
  private durationChartInstance: Chart | null = null;
  private timelineChartInstance: Chart | null = null;

  get totalPages(): number {
    return this.analytics ? Math.max(Math.ceil(this.analytics.total / this.limit), 1) : 1;
  }

  ngOnInit(): void {
    void this.loadAnalytics();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
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

      // Initialize charts after a short delay to ensure DOM is ready
      setTimeout(() => {
        this.destroyCharts();
        this.initializeCharts();
      }, 0);
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

  private destroyCharts(): void {
    this.statusChartInstance?.destroy();
    this.durationChartInstance?.destroy();
    this.timelineChartInstance?.destroy();
    this.statusChartInstance = null;
    this.durationChartInstance = null;
    this.timelineChartInstance = null;
  }

  private initializeCharts(): void {
    if (!this.analytics) return;

    this.createStatusChart();
    this.createDurationChart();
    this.createTimelineChart();
  }

  private createStatusChart(): void {
    if (!this.statusChartRef?.nativeElement || !this.analytics) return;

    const ctx = this.statusChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = ['#10b981', '#8b5cf6', '#ef4444'];
    this.statusChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.analytics.status_breakdown.map((item) => item.status),
        datasets: [
          {
            data: this.analytics.status_breakdown.map((item) => item.count),
            backgroundColor: colors,
            borderColor: ['#ffffff', '#ffffff', '#ffffff'],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              color: '#64748b',
              font: { size: 12, weight: 'bold' },
            },
          },
        },
      },
    });
  }

  private createDurationChart(): void {
    if (!this.durationChartRef?.nativeElement || !this.analytics) return;

    const ctx = this.durationChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const topDurations = this.analytics.duration_breakdown.slice(0, 8);
    const compactView = typeof window !== 'undefined' && window.innerWidth < 768;

    this.durationChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topDurations.map((item) => this.formatPipelineLabel(item.pipeline_id)),
        datasets: [
          {
            label: 'Average Duration (seconds)',
            data: topDurations.map((item) => item.average_duration),
            backgroundColor: '#f59e0b',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                const item = topDurations[tooltipItems[0]?.dataIndex ?? 0];
                return item?.pipeline_id ?? '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#64748b',
              maxRotation: compactView ? 22 : 0,
              minRotation: compactView ? 22 : 0,
              autoSkip: false,
              font: {
                size: compactView ? 10 : 12,
              },
              padding: 10,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#e2e8f0',
            },
            ticks: {
              color: '#64748b',
            },
          },
        },
      },
    });
  }

  getDurationChartHeight(): number {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 360 : 420;
  }

  private formatPipelineLabel(pipelineId: string): string {
    const cleaned = pipelineId
      .replace(/pipeline/gi, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      return 'Default';
    }

    if (cleaned.length <= 18) {
      return cleaned;
    }

    return `${cleaned.slice(0, 18)}...`;
  }

  private createTimelineChart(): void {
    if (!this.timelineChartRef?.nativeElement || !this.analytics) return;

    const ctx = this.timelineChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.timelineChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.analytics.timeline.map((item) => item.date),
        datasets: [
          {
            label: 'Job Count',
            data: this.analytics.timeline.map((item) => item.job_count),
            backgroundColor: '#1e293b',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: {
              color: '#e2e8f0',
            },
            ticks: {
              color: '#64748b',
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#e2e8f0',
            },
            ticks: {
              color: '#64748b',
            },
          },
        },
      },
    });
  }
}
