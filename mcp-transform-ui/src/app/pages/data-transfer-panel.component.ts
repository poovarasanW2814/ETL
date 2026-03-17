import { CommonModule } from '@angular/common';
import { Component, NgZone, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

interface ParsedData {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}

@Component({
  selector: 'app-data-transfer-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-6">
      <div class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Data Transfer</p>
        <div class="mt-3">
          <h2 class="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">Data Transfer Panel</h2>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Upload Excel or CSV files to transfer and process data across your ETL pipelines.
          </p>
        </div>
      </div>

      <!-- File Upload Section -->
      <div class="glass-panel px-6 py-8 lg:max-w-sm">
        <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Upload File</h3>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          .xlsx, .xls, or .csv
        </p>
        
        <div class="mt-4">
          <label class="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 transition hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-amber-500 dark:hover:bg-slate-800/50">
            <input
              type="file"
              #fileInput
              (change)="onFileSelected($event)"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              class="hidden"
            />
            <div class="text-center">
              <svg class="mx-auto h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p class="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Click to upload
              </p>
            </div>
          </label>

          <div *ngIf="uploadedFile()" class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/10">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <svg class="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                </svg>
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-emerald-900 dark:text-emerald-100">{{ uploadedFile()?.name }}</p>
                  <p class="text-xs text-emerald-700 dark:text-emerald-300">{{ formatFileSize(uploadedFile()?.size || 0) }}</p>
                </div>
              </div>
              <button
                type="button"
                (click)="clearFile()"
                class="flex-shrink-0 text-emerald-600 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-4 flex gap-2">
            <button
              type="button"
              (click)="processFile()"
              [disabled]="!uploadedFile()"
              class="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Process
            </button>
            <button
              type="button"
              (click)="clearFile()"
              [disabled]="!uploadedFile()"
              class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Data Preview Section -->
      <div *ngIf="parsedData()" class="space-y-6">
        <!-- Columns Section -->
        <div class="glass-panel px-6 py-8">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Columns</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Found {{ parsedData()?.columns.length }} columns
          </p>
          
          <div class="mt-4 flex flex-wrap gap-2">
            <div
              *ngFor="let column of parsedData()?.columns"
              class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
            >
              {{ column }}
            </div>
          </div>
        </div>

        <!-- Data Preview Section -->
        <div class="glass-panel px-6 py-8">
          <h3 class="mt-4 text-lg font-extrabold text-ink dark:text-slate-100">Data Preview</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Showing first {{ Math.min(10, parsedData()?.rows.length || 0) }} of {{ parsedData()?.rows.length }} rows
          </p>

          <div class="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <th class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">#</th>
                  <th
                    *ngFor="let column of parsedData()?.columns"
                    class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                  >
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let row of parsedData()?.rows.slice(0, 10); let i = index"
                  class="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"
                >
                  <td class="px-4 py-3 text-slate-500 dark:text-slate-400">{{ i + 1 }}</td>
                  <td
                    *ngFor="let cell of row"
                    class="px-4 py-3 text-slate-700 dark:text-slate-300 truncate max-w-xs"
                  >
                    {{ cell }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="glass-panel px-6 py-8">
        <div class="flex items-center gap-3">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent dark:border-amber-500"></div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Processing file...</p>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">
        <p class="text-sm font-semibold">Error processing file:</p>
        <p class="mt-1 text-xs">{{ error() }}</p>
      </div>
    </section>
  `,
})
export class DataTransferPanelComponent {
  uploadedFile = signal<File | null>(null);
  parsedData = signal<ParsedData | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  Math = Math;

  private ngZone = NgZone;

  constructor(private zone: NgZone) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadedFile.set(input.files[0]);
      this.parsedData.set(null);
      this.error.set(null);
    }
  }

  clearFile(): void {
    this.uploadedFile.set(null);
    this.parsedData.set(null);
    this.error.set(null);
  }

  async processFile(): Promise<void> {
    const file = this.uploadedFile();
    if (!file) {
      console.warn('No file selected');
      return;
    }

    console.log('Processing file:', file.name);
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      console.log('File extension:', fileExtension);

      let data: ParsedData | null = null;

      if (fileExtension === 'csv') {
        console.log('Parsing CSV file...');
        data = await this.parseCSV(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        console.log('Parsing Excel file...');
        data = await this.parseExcel(file);
      } else {
        const errorMsg = 'Unsupported file format. Please upload a CSV or Excel file.';
        console.error(errorMsg);
        this.error.set(errorMsg);
        this.isLoading.set(false);
        return;
      }

      if (data) {
        console.log('Parsed data:', data);
        this.zone.run(() => {
          this.parsedData.set(data);
          this.isLoading.set(false);
        });
      }
    } catch (err) {
      const errorMsg = `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('Error:', errorMsg, err);
      this.zone.run(() => {
        this.error.set(errorMsg);
        this.isLoading.set(false);
      });
    }
  }

  private async parseCSV(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter((line) => line.trim());

          if (lines.length === 0) {
            throw new Error('CSV file is empty');
          }

          const columns = this.parseCSVLine(lines[0]);
          const rows = lines.slice(1).map((line) => this.parseCSVLine(line));

          resolve({ columns, rows });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private async parseExcel(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });

          if (!workbook.SheetNames.length) {
            throw new Error('Excel file has no sheets');
          }

          // Get the first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            throw new Error('Sheet is empty');
          }

          const columns = jsonData[0] as string[];
          const rows = jsonData.slice(1) as (string | number | boolean | null)[][];

          console.log('Excel parsed successfully:', { columns, rowCount: rows.length });
          resolve({ columns, rows });
        } catch (err) {
          console.error('Error parsing Excel:', err);
          reject(new Error(`Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
