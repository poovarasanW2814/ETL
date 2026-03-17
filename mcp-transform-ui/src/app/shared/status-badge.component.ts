import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

const STATUS_STYLES: Record<string, string> = {
  SUCCESS:
    'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-900',
  FAILED:
    'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-900',
  STARTED:
    'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-900',
  PENDING:
    'bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600',
  processing:
    'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-900',
  RECEIVED:
    'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-900',
  RETRY:
    'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-900',
  completed:
    'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-900',
  failed:
    'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-900',
};

const ACTIVE_STATUSES = new Set(['STARTED', 'PENDING', 'processing', 'RECEIVED', 'RETRY']);

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ring-1"
      [ngClass]="badgeClass"
    >
      <span *ngIf="isActive" class="relative flex h-2.5 w-2.5">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40"></span>
        <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-current"></span>
      </span>
      {{ status || 'UNKNOWN' }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() status: string | null | undefined;

  get badgeClass(): string {
    return STATUS_STYLES[this.status ?? ''] ?? STATUS_STYLES['PENDING'];
  }

  get isActive(): boolean {
    return ACTIVE_STATUSES.has(this.status ?? '');
  }
}
