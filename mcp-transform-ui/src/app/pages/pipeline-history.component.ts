import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { McpApiService } from '../core/mcp-api.service';
import { JobRecord } from '../models';
import { JobTableComponent } from '../shared/job-table.component';
import { LoaderComponent } from '../shared/loader.component';

@Component({
  selector: 'app-pipeline-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, JobTableComponent, LoaderComponent],
  template: `
    <section class="space-y-6">
      <a routerLink="/" class="inline-flex text-sm font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300">
        Back to dashboard
      </a>

      <div class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Pipeline execution history</p>
        <div class="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">{{ pipelineId }}</h2>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Review all MCP transformation jobs associated with this ETL pipeline.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl bg-ink px-4 py-3 text-white dark:bg-slate-800">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-slate-400">Jobs</p>
              <p class="mt-1 text-2xl font-extrabold">{{ total }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Page</p>
              <p class="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">{{ page }}</p>
            </div>
            <div class="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-700">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Per page</p>
              <p class="mt-1 text-2xl font-extrabold text-ink dark:text-slate-100">{{ limit }}</p>
            </div>
          </div>
        </div>

        <div class="mt-5 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>Rows per page</span>
          <select
            [(ngModel)]="limit"
            (ngModelChange)="resetAndLoad()"
            class="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option *ngFor="let option of pageSizeOptions" [ngValue]="option">{{ option }}</option>
          </select>
        </div>
      </div>

      <app-loader *ngIf="loading" label="Fetching pipeline history..."></app-loader>

      <div *ngIf="!loading && error" class="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">
        {{ error }}
      </div>

      <div *ngIf="!loading && !error && jobs.length === 0" class="glass-panel px-6 py-10 text-center text-slate-500 dark:text-slate-400">
        No jobs found for this pipeline.
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
export class PipelineHistoryComponent implements OnInit {
  readonly api = inject(McpApiService);
  readonly route = inject(ActivatedRoute);
  readonly pageSizeOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  pipelineId = '';
  jobs: JobRecord[] = [];
  loading = true;
  error = '';
  page = 1;
  total = 0;
  limit = 20;

  get totalPages(): number {
    return Math.max(Math.ceil(this.total / this.limit), 1);
  }

  ngOnInit(): void {
    this.pipelineId = this.route.snapshot.paramMap.get('pipelineId') ?? '';
    void this.loadJobs();
  }

  resetAndLoad(): void {
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
      const data = await this.api.getPipelineJobs(this.pipelineId, { page: this.page, limit: this.limit });
      this.jobs = data.jobs ?? [];
      this.total = data.total ?? 0;
      this.error = '';
    } catch (error: unknown) {
      this.error = this.resolveError(error, 'Unable to load pipeline execution history.');
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
