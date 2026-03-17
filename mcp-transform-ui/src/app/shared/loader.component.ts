import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="flex min-h-[240px] flex-col items-center justify-center gap-4 text-center">
      <div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500 dark:border-slate-700 dark:border-t-amber-400"></div>
      <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ label }}</p>
    </div>
  `,
})
export class LoaderComponent {
  @Input() label = 'Loading data...';
}
