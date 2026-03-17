import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-data-transfer-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-6">
      <div class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Data Transfer</p>
        <div class="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">Data Transfer Panel</h2>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Manage and monitor data transfers across your ETL pipelines.
            </p>
          </div>
        </div>
      </div>

      <div class="glass-panel px-6 py-8">
        <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Coming Soon</h3>
        <p class="mt-4 text-sm text-slate-600 dark:text-slate-300">
          The Data Transfer Panel is being configured. Please check back soon for detailed information about what this feature will do.
        </p>
      </div>
    </section>
  `,
})
export class DataTransferPanelComponent {}
