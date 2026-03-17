import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

const THEME_STORAGE_KEY = 'mcp-transform-ui-theme';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_26%),linear-gradient(180deg,_#fffdf7_0%,_#f8fafc_55%,_#eef2ff_100%)] text-ink transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#111827_100%)] dark:text-slate-100">
      <header class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/75 backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/75">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a routerLink="/" class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-sm font-extrabold uppercase tracking-[0.2em] text-white dark:bg-amber-500 dark:text-slate-950">
              MCP
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">ETL Monitoring</p>
              <h1 class="text-lg font-extrabold text-ink dark:text-slate-100 sm:text-xl">MCP Data Transform Service</h1>
            </div>
          </a>

          <nav class="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/80">
            <a
              routerLink="/"
              [routerLinkActiveOptions]="{ exact: true }"
              routerLinkActive="bg-ink text-white dark:bg-amber-500 dark:text-slate-950"
              class="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Dashboard
            </a>
            <a
              routerLink="/prompt-tester"
              routerLinkActive="bg-ink text-white dark:bg-amber-500 dark:text-slate-950"
              class="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Prompt Tester
            </a>
            <a
              routerLink="/analytics"
              routerLinkActive="bg-ink text-white dark:bg-amber-500 dark:text-slate-950"
              class="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Analytics
            </a>
            <button
              type="button"
              (click)="toggleTheme()"
              class="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {{ theme() === 'dark' ? 'Light mode' : 'Dark mode' }}
            </button>
          </nav>
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class AppComponent {
  readonly theme = signal<'light' | 'dark'>(this.resolveTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggleTheme(): void {
    const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(nextTheme);
    this.applyTheme(nextTheme);
  }

  private resolveTheme(): 'light' | 'dark' {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}
