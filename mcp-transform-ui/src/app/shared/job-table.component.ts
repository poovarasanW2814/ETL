import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

import { JobRecord } from '../models';
import { StatusBadgeComponent } from './status-badge.component';

@Component({
  selector: 'app-job-table',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  template: `
    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-panel transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead class="bg-slate-50/90 dark:bg-slate-950/80">
            <tr class="text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <th class="px-5 py-4">Job ID</th>
              <th class="px-5 py-4">Pipeline</th>
              <th class="px-5 py-4">Batch</th>
              <th class="px-5 py-4">Rows</th>
              <th class="px-5 py-4">Progress</th>
              <th class="px-5 py-4">Time</th>
              <th class="px-5 py-4">Status</th>
              <th class="px-5 py-4">Created</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              *ngFor="let job of jobs; trackBy: trackByJob"
              class="cursor-pointer transition hover:bg-amber-50/60 dark:hover:bg-slate-800/70"
              (click)="openJob(job.job_id)"
            >
              <td class="px-5 py-4 font-mono text-sm font-semibold text-ink dark:text-slate-100">{{ job.job_id }}</td>
              <td class="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                <button
                  *ngIf="job.pipeline_id; else noPipeline"
                  type="button"
                  (click)="openPipeline($event, job.pipeline_id)"
                  class="font-semibold text-amber-700 transition hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  {{ job.pipeline_id }}
                </button>
                <ng-template #noPipeline>N/A</ng-template>
              </td>
              <td class="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">{{ job.batch_id || 'N/A' }}</td>
              <td class="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">{{ formatNumber(job.metrics?.rows_processed) }}</td>
              <td class="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">{{ job.progress?.progress ?? 0 }}%</td>
              <td class="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">{{ formatSeconds(job.metrics?.processing_time_seconds) }}</td>
              <td class="px-5 py-4"><app-status-badge [status]="job.status"></app-status-badge></td>
              <td class="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">{{ formatDate(job.timestamps?.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class JobTableComponent {
  @Input() jobs: JobRecord[] = [];

  private readonly router = inject(Router);

  trackByJob(_index: number, job: JobRecord): string {
    return job.job_id;
  }

  openJob(jobId: string): void {
    void this.router.navigate(['/jobs', jobId]);
  }

  openPipeline(event: Event, pipelineId: string | null | undefined): void {
    event.stopPropagation();
    if (!pipelineId) {
      return;
    }

    void this.router.navigate(['/pipelines', pipelineId]);
  }

  formatDate(value: string | null | undefined): string {
    return value ? new Date(value).toLocaleString() : 'N/A';
  }

  formatNumber(value: number | null | undefined): string {
    return value === undefined || value === null ? 'N/A' : value.toLocaleString();
  }

  formatSeconds(value: number | null | undefined): string {
    return value === undefined || value === null ? 'N/A' : `${value}s`;
  }
}
