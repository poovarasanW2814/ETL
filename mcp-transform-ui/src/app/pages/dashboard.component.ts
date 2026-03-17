import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { McpApiService } from '../core/mcp-api.service';
import { JobRecord } from '../models';
import { JobTableComponent } from '../shared/job-table.component';
import { LoaderComponent } from '../shared/loader.component';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, JobTableComponent, LoaderComponent],
  template: `
    <section class="space-y-6">
      <div class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Live Queue Overview</p>
        <div class="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">Transformation job dashboard</h2>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Monitor ETL-triggered MCP jobs, review status changes, and inspect processing throughput from the live backend.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl bg-ink px-4 py-3 text-white dark:bg-slate-800">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-slate-400">Jobs</p>
              <p class="mt-1 text-2xl font-extrabold">{{ jobs.length }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Source</p>
              <p class="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">Live</p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <button
            *ngFor="let filter of filters"
            type="button"
            (click)="applyFilter(filter.value)"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            [ngClass]="activeFilter === filter.value ? 'bg-ink text-white dark:bg-amber-500 dark:text-slate-950' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'"
          >
            {{ filter.label }}
          </button>
        </div>

        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            [(ngModel)]="search"
            (ngModelChange)="onFiltersChange()"
            placeholder="Search job ID, pipeline ID, or batch ID"
            class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 sm:max-w-md"
          />
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <label class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Rows per page</span>
              <select
                [(ngModel)]="limit"
                (ngModelChange)="onFiltersChange()"
                class="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option *ngFor="let option of pageSizeOptions" [ngValue]="option">{{ option }}</option>
              </select>
            </label>
            <div class="text-sm text-slate-500 dark:text-slate-400">Showing page {{ page }} of {{ totalPages }}</div>
          </div>
        </div>
      </div>

      <app-loader *ngIf="loading" label="Fetching MCP jobs..."></app-loader>

      <div *ngIf="!loading && error" class="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">
        {{ error }}
      </div>

      <div *ngIf="!loading && !error && jobs.length === 0" class="glass-panel px-6 py-10 text-center text-slate-500 dark:text-slate-400">
        No MCP jobs available yet.
      </div>

      <app-job-table *ngIf="!loading && !error && jobs.length > 0" [jobs]="jobs"></app-job-table>

      <div *ngIf="!loading && !error && totalPages > 1" class="flex items-center justify-center gap-3">
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
    </section>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly api = inject(McpApiService);
  readonly filters: FilterOption[] = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Success', value: 'SUCCESS' },
    { label: 'Failure', value: 'FAILED' },
  ];
  readonly pageSizeOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  jobs: JobRecord[] = [];
  loading = true;
  error = '';
  activeFilter = '';
  search = '';
  page = 1;
  total = 0;
  limit = 20;

  private socket?: WebSocket;
  private refreshTimeout?: number;
  private reconnectTimeout?: number;
  private reconnectAttempts = 0;

  get totalPages(): number {
    return Math.max(Math.ceil(this.total / this.limit), 1);
  }

  ngOnInit(): void {
    void this.loadJobs();
    this.connectSocket();
  }

  ngOnDestroy(): void {
    if (this.refreshTimeout) {
      window.clearTimeout(this.refreshTimeout);
    }
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
    }
    this.socket?.close();
  }

  applyFilter(value: string): void {
    this.activeFilter = value;
    this.onFiltersChange();
  }

  onFiltersChange(): void {
    this.page = 1;
    this.loading = true;
    void this.loadJobs();
  }

  goToPage(page: number): void {
    this.page = Math.min(Math.max(page, 1), this.totalPages);
    this.loading = true;
    void this.loadJobs();
  }

  private async loadJobs(): Promise<void> {
    try {
      const data = await this.api.getJobs({
        status: this.activeFilter || undefined,
        search: this.search || undefined,
        page: this.page,
        limit: this.limit,
      });
      this.jobs = data.jobs ?? [];
      this.total = data.total ?? 0;
      this.error = '';
    } catch (error: unknown) {
      this.error = this.resolveError(
        error,
        'Unable to load MCP jobs. Ensure the backend exposes /api/v1/mcp-jobs.',
      );
    } finally {
      this.loading = false;
    }
  }

  private connectSocket(): void {
    this.socket = new WebSocket(this.api.getJobEventsWebSocketUrl());
    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };
    this.socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { event_type?: string };
      if (payload.event_type === 'job_log') {
        return;
      }

      if (this.refreshTimeout) {
        return;
      }

      this.refreshTimeout = window.setTimeout(() => {
        this.refreshTimeout = undefined;
        void this.loadJobs();
      }, 400);
    };

    this.socket.onclose = () => {
      const delay = Math.min(2000 * 2 ** this.reconnectAttempts, 30000);
      this.reconnectAttempts += 1;
      this.reconnectTimeout = window.setTimeout(() => this.connectSocket(), delay);
    };
  }

  private resolveError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const inner = (error as { error?: { detail?: string } }).error;
      return inner?.detail ?? fallback;
    }

    return fallback;
  }
}
