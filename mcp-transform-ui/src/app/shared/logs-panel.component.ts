import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { JobLog } from '../models';

@Component({
  selector: 'app-logs-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel px-6 py-6">
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Job logs</h3>
        <button
          type="button"
          (click)="download.emit()"
          class="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
        >
          Download logs
        </button>
      </div>

      <div class="mt-5 max-h-[360px] overflow-auto rounded-2xl bg-slate-950 p-4 font-mono text-sm text-slate-100">
        <ng-container *ngIf="logs.length; else emptyState">
          <div
            *ngFor="let log of logs; trackBy: trackByLog"
            class="border-b border-slate-800 py-2 last:border-b-0"
          >
            <span class="text-slate-400">[{{ log.timestamp | date : 'mediumTime' }}]</span>
            <span class="font-bold text-amber-300"> {{ log.level }} </span>
            <span>{{ log.message }}</span>
          </div>
        </ng-container>
        <ng-template #emptyState>
          <p class="text-slate-400">No logs captured yet.</p>
        </ng-template>
      </div>
    </div>
  `,
})
export class LogsPanelComponent {
  @Input() logs: JobLog[] = [];
  @Output() download = new EventEmitter<void>();

  trackByLog(index: number, log: JobLog): string {
    return `${log.timestamp}-${index}`;
  }
}
