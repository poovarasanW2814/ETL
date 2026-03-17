import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <div class="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          class="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 transition-all duration-500"
          [style.width.%]="resolvedProgress"
        ></div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span class="font-semibold text-ink dark:text-slate-100">{{ resolvedProgress }}% complete</span>
        <span>Rows processed: {{ (processedRows ?? 0) | number }} / {{ (totalRows ?? 0) | number }}</span>
        <span>ETA: {{ etaSeconds ?? 'N/A' }}{{ etaSeconds !== null && etaSeconds !== undefined ? 's' : '' }}</span>
      </div>
    </div>
  `,
})
export class ProgressBarComponent {
  @Input() progress: number | null | undefined;
  @Input() processedRows: number | null | undefined;
  @Input() totalRows: number | null | undefined;
  @Input() etaSeconds: number | null | undefined;

  get resolvedProgress(): number {
    const value = Number.isFinite(this.progress) ? Number(this.progress) : 0;
    return Math.min(Math.max(value, 0), 100);
  }
}
