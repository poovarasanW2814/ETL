import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { McpApiService } from '../core/mcp-api.service';
import { PromptTestResponse } from '../models';

@Component({
  selector: 'app-prompt-tester',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-6">
      <div class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Prompt playground</p>
        <h2 class="mt-3 text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">Test date prompts before running ETL jobs</h2>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Enter sample values and a natural-language instruction to preview how the MCP service resolves the target format and transforms the data.
        </p>
      </div>

      <form (ngSubmit)="handleSubmit()" class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="glass-panel px-6 py-6">
          <label class="block text-sm font-semibold text-ink dark:text-slate-100">Prompt</label>
          <input
            type="text"
            [(ngModel)]="prompt"
            name="prompt"
            class="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />

          <label class="mt-6 block text-sm font-semibold text-ink dark:text-slate-100">Input values</label>
          <textarea
            [(ngModel)]="values"
            name="values"
            rows="10"
            class="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-4 font-mono text-sm text-ink outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="One value per line"
          ></textarea>

          <button
            type="submit"
            [disabled]="loading"
            class="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
          >
            {{ loading ? 'Testing...' : 'Run prompt test' }}
          </button>
        </div>

        <div class="glass-panel px-6 py-6">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Output preview</h3>

          <div *ngIf="error" class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-500/10 dark:text-rose-300">
            {{ error }}
          </div>

          <div *ngIf="loading" class="mt-5 flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/60">
            <div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500 dark:border-slate-700 dark:border-t-amber-400"></div>
            <p class="mt-5 text-sm font-semibold text-ink dark:text-slate-100">Running prompt test</p>
            <p class="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              The AI planner is analyzing the prompt and preparing the transformation preview.
            </p>
          </div>

          <div *ngIf="!loading && result" class="mt-5 space-y-5">
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Prompt inspector</p>
              <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">{{ result.prompt }}</p>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Detected format</p>
                  <p class="mt-1 text-sm font-semibold text-ink dark:text-slate-100">{{ result.detected_format || 'N/A' }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Target format</p>
                  <p class="mt-1 text-sm font-semibold text-ink dark:text-slate-100">{{ result.target_format || 'Unresolved' }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 dark:border-slate-700">
              <div class="grid grid-cols-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">
                <span>Source</span>
                <span>Output</span>
              </div>
              <div class="divide-y divide-slate-100 dark:divide-slate-800">
                <div *ngFor="let sourceValue of splitValues(); let i = index" class="grid grid-cols-2 gap-4 bg-white px-4 py-3 text-sm dark:bg-slate-900">
                  <span class="font-mono text-slate-700 dark:text-slate-300">{{ sourceValue || 'N/A' }}</span>
                  <span class="font-mono text-ink dark:text-slate-100">{{ result.transformed_values[i] ?? 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>

          <p *ngIf="!loading && !result && !error" class="mt-5 text-sm text-slate-500 dark:text-slate-400">
            Run a prompt test to preview transformation behavior.
          </p>
        </div>
      </form>
    </section>
  `,
})
export class PromptTesterComponent {
  readonly api = inject(McpApiService);

  prompt = 'Convert to YYYY-MM-DD';
  values = '12-05-2024\n01/06/2024';
  result: PromptTestResponse | null = null;
  loading = false;
  error = '';

  splitValues(): string[] {
    return this.values.split('\n');
  }

  async handleSubmit(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      this.result = await this.api.testPrompt({
        prompt: this.prompt,
        values: this.splitValues().map((value) => value.trim()),
      });
    } catch (error: unknown) {
      this.error = this.resolveError(error, 'Unable to test the supplied prompt.');
      this.result = null;
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
