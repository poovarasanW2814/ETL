import "@angular/compiler";
import { CommonModule } from '@angular/common';
import { Component, NgZone, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';

interface ParsedData {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}

interface DateDetectionResult {
  isLikelyDate: boolean;
  score: number;
  sampleCount: number;
  matchedCount: number;
}

@Component({
  selector: 'app-data-transfer-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <section class="space-y-6">
      <div class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Data Transfer</p>
        <div class="mt-3">
          <h2 class="text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">Data Transfer Panel</h2>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Upload Excel or CSV files to transform selected columns and download the result.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel px-6 py-8">
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
                  x
                </button>
              </div>
            </div>

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

        <div *ngIf="parsedData()" class="glass-panel px-6 py-8">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Select & Configure Columns</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Found {{ parsedData()!.columns.length }} columns. Likely date columns are preselected from sample values.
          </p>
          <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Generated IDs</p>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pipeline ID</p>
                <p class="mt-1 break-all font-mono text-xs text-ink dark:text-slate-100">{{ pendingPipelineId() }}</p>
              </div>
              <div>
                <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Batch ID</p>
                <p class="mt-1 break-all font-mono text-xs text-ink dark:text-slate-100">{{ pendingBatchId() }}</p>
              </div>
            </div>
          </div>

          <form [formGroup]="columnConfigForm" class="mt-4 space-y-3 max-h-96 overflow-y-auto">
            <div formArrayName="columns" class="space-y-3">
              <div
                *ngFor="let column of columnsFormArray.controls; let i = index"
                [formGroupName]="i"
                class="border border-slate-200 rounded-lg p-3 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
              >
                <div class="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    [id]="'col-' + i"
                    formControlName="selected"
                    (change)="onColumnSelectionChange(i)"
                    class="w-4 h-4 cursor-pointer accent-blue-600"
                  />
                  <label [for]="'col-' + i" class="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
                    {{ column.get('source_column')!.value }}
                  </label>
                  <span
                    *ngIf="isLikelyDateColumn(column.get('source_column')!.value)"
                    class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    Likely date
                  </span>
                </div>

                <div *ngIf="column.get('selected')!.value && isLikelyDateColumn(column.get('source_column')!.value)" class="ml-6 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">
                    Enter a prompt to transform this column as a date. Leave it blank to keep the original values unchanged.
                  </p>
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Output Format Prompt
                    </label>
                    <input
                      type="text"
                      formControlName="prompt"
                      placeholder="e.g., Convert to YYYY-MM-DD"
                      class="w-full px-2 py-1 border border-slate-300 rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    />
                  </div>

                  <div class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      [id]="'new-col-' + i"
                      formControlName="isNewColumn"
                      (change)="onToggleCreateNewColumn(i)"
                      class="w-3 h-3 cursor-pointer"
                    />
                    <label [for]="'new-col-' + i" class="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      Write result to new column
                    </label>
                  </div>

                  <div *ngIf="column.get('isNewColumn')!.value">
                    <input
                      type="text"
                      formControlName="target_column"
                      placeholder="New column name"
                      class="w-full px-2 py-1 border border-slate-300 rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>

          <div class="mt-4">
            <button
              (click)="startTransformation()"
              [disabled]="isTransforming() || !hasSelectedColumns()"
              class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {{ isTransforming() ? 'Processing...' : 'Confirm Selection' }}
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="parsedData()" class="glass-panel px-6 py-8">
        <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Original Data</h3>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Showing first {{ Math.min(10, parsedData()!.rows.length) }} of {{ parsedData()!.rows.length }} rows
        </p>

        <div class="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                <th
                  *ngFor="let column of parsedData()!.columns"
                  class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                >
                  {{ column }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let row of parsedData()!.rows.slice(0, 10); let i = index"
                class="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"
              >
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

      <div *ngIf="transformedData()" class="glass-panel px-6 py-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Transformed Data</h3>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Showing first {{ Math.min(10, transformedData()!.rows.length) }} of {{ transformedData()!.rows.length }} rows
            </p>
          </div>

          <button
            type="button"
            (click)="downloadTransformedDataAsExcel()"
            class="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            Download Excel
          </button>
        </div>

        <div class="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                <th
                  *ngFor="let column of transformedData()!.columns"
                  class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                >
                  {{ column }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let row of transformedData()!.rows.slice(0, 10); let i = index"
                class="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50"
              >
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

      <div *ngIf="isLoading()" class="glass-panel px-6 py-8">
        <div class="flex items-center gap-3">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent dark:border-amber-500"></div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Processing file...</p>
        </div>
      </div>

      <div *ngIf="isTransforming()" class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Transforming data...</p>
        <div class="mt-4">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Progress</span>
            <span>{{ transformProgressPercent() }}%</span>
          </div>
          <div class="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              class="h-2 rounded-full bg-blue-600 transition-all duration-500 dark:bg-blue-500"
              [style.width.%]="transformProgressPercent()"
            ></div>
          </div>
        </div>
      </div>

      <div *ngIf="error()" class="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">
        <p class="text-sm font-semibold">Error processing file:</p>
        <p class="mt-1 text-xs">{{ error() }}</p>
      </div>
      </section>
    </div>
  `,
})
export class DataTransferPanelComponent {
  uploadedFile = signal<File | null>(null);
  parsedData = signal<ParsedData | null>(null);
  transformedData = signal<ParsedData | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  isTransforming = signal(false);
  transformProgressPercent = signal(0);
  Math = Math;

  columnConfigForm: FormGroup;
  private readonly apiBaseUrl =
    (globalThis as { __MCP_API_BASE_URL__?: string }).__MCP_API_BASE_URL__ ?? 'http://localhost:8000';
  private readonly apiUrl = `${this.apiBaseUrl}/api/v1/transform-dates`;
  private readonly transformStatusUrl = `${this.apiBaseUrl}/api/v1/transform-status`;
  private dateDetection = signal<Record<string, DateDetectionResult>>({});
  pendingPipelineId = signal<string>('');
  pendingBatchId = signal<string>('');
  selectedColumnsForDisplay = signal<string[]>([]);
  transformedDateColumns = signal<any[]>([]);

  constructor(private zone: NgZone, private fb: FormBuilder, private http: HttpClient) {
    this.columnConfigForm = this.fb.group({
      columns: this.fb.array([])
    });
    this.refreshGeneratedIds();
  }

  get columnsFormArray(): FormArray {
    return this.columnConfigForm.get('columns') as FormArray;
  }

  isLikelyDateColumn(columnName: string): boolean {
    return this.dateDetection()[columnName]?.isLikelyDate ?? false;
  }

  hasSelectedColumns(): boolean {
    return this.columnsFormArray.value.some((col: any) => col.selected);
  }

  getDisplayColumns(): string[] {
    if (this.selectedColumnsForDisplay().length === 0) {
      return this.parsedData()?.columns || [];
    }

    const selected = this.selectedColumnsForDisplay();
    const transformed = this.transformedDateColumns();

    return this.parsedData()?.columns.filter(col =>
      selected.includes(col) ||
      transformed.some(dc => dc.target_column === col || (dc.isNewColumn === false && dc.source_column === col))
    ) || [];
  }

  private buildPreviewData(data: ParsedData, columnsToKeep: string[]): ParsedData {
    const columnIndexes = columnsToKeep
      .map((column) => data.columns.indexOf(column))
      .filter((index) => index >= 0);

    return {
      columns: columnIndexes.map((index) => data.columns[index]),
      rows: data.rows.map((row) => columnIndexes.map((index) => row[index] ?? null))
    };
  }

  private buildSelectedData(selectedColumns: any[], currentData: ParsedData): ParsedData {
    const outputColumns = selectedColumns.map((col: any) => col.source_column);
    return this.buildPreviewData(currentData, outputColumns);
  }

  private buildTransformedData(
    currentData: ParsedData,
    selectedColumns: any[],
    transformedColumns: any[]
  ): ParsedData {
    const baseData = this.buildSelectedData(selectedColumns, currentData);
    const rows = baseData.rows.map((row) => [...row]);
    const columns = [...baseData.columns];

    transformedColumns.forEach((transformedColumn: any) => {
      const columnIndex = columns.indexOf(transformedColumn.target_column);

      if (columnIndex >= 0) {
        rows.forEach((row, rowIndex) => {
          row[columnIndex] = transformedColumn.values[rowIndex] ?? null;
        });
        return;
      }

      columns.push(transformedColumn.target_column);
      rows.forEach((row, rowIndex) => {
        row.push(transformedColumn.values[rowIndex] ?? null);
      });
    });

    return { columns, rows };
  }

  private pollTransformationStatus(
    jobId: string,
    currentData: ParsedData,
    selectedColumns: any[]
  ): void {

    const checkStatus = () => {
      this.http.get<any>(`${this.transformStatusUrl}/${jobId}`).subscribe({
        next: (statusResponse) => {
          this.zone.run(() => {
            const progressValue =
              typeof statusResponse?.progress?.progress === 'number'
                ? Math.max(0, Math.min(100, Math.round(statusResponse.progress.progress)))
                : null;

            if (progressValue !== null) {
              this.transformProgressPercent.set(progressValue);
            }

            if (statusResponse.status === 'SUCCESS' && statusResponse.result?.columns) {
              const transformedData = this.buildTransformedData(
                currentData,
                selectedColumns,
                statusResponse.result.columns
              );

              this.transformedData.set(transformedData);
              this.isTransforming.set(false);
              this.transformProgressPercent.set(100);
              this.error.set(null);
              return;
            }

            if (statusResponse.status === 'FAILED') {
              this.error.set(statusResponse.error || 'Transformation failed');
              this.isTransforming.set(false);
              this.transformProgressPercent.set(0);
              return;
            }

            setTimeout(checkStatus, 1500);
          });
        },
        error: (err) => {
          this.zone.run(() => {
            this.error.set(`Failed to fetch transformation status: ${err.message || 'Unknown error'}`);
            this.isTransforming.set(false);
            this.transformProgressPercent.set(0);
          });
        }
      });
    };

    checkStatus();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadedFile.set(input.files[0]);
      this.parsedData.set(null);
      this.transformedData.set(null);
      this.error.set(null);
      this.dateDetection.set({});
      this.selectedColumnsForDisplay.set([]);
      this.transformedDateColumns.set([]);
      this.columnsFormArray.clear();
      this.refreshGeneratedIds();
    }
  }

  clearFile(): void {
    this.uploadedFile.set(null);
    this.parsedData.set(null);
    this.transformedData.set(null);
    this.error.set(null);
    this.dateDetection.set({});
    this.selectedColumnsForDisplay.set([]);
    this.transformedDateColumns.set([]);
    this.columnsFormArray.clear();
    this.refreshGeneratedIds();
  }

  async processFile(): Promise<void> {
    const file = this.uploadedFile();
    if (!file) {
      console.warn('No file selected');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let data: ParsedData | null = null;

      if (fileExtension === 'csv') {
        data = await this.parseCSV(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        data = await this.parseExcel(file);
      } else {
        this.error.set('Unsupported file format. Please upload a CSV or Excel file.');
        this.isLoading.set(false);
        return;
      }

      if (data) {
        this.zone.run(() => {
          this.parsedData.set(data);
          this.transformedData.set(null);
          this.selectedColumnsForDisplay.set([]);
          this.transformedDateColumns.set([]);
          this.initializeColumnForm(data);
          this.isLoading.set(false);
        });
      }
    } catch (err) {
      const errorMsg = `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`;
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
          const workbook = XLSX.read(data, { type: 'array', cellDates: false });

          if (!workbook.SheetNames.length) {
            throw new Error('Excel file has no sheets');
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: null });

          if (jsonData.length === 0) {
            throw new Error('Sheet is empty');
          }

          const columns = jsonData[0] as string[];
          const rows = jsonData.slice(1) as (string | number | boolean | null)[][];
          resolve({ columns, rows });
        } catch (err) {
          reject(new Error(`Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private initializeColumnForm(data: ParsedData): void {
    this.columnsFormArray.clear();
    const detectionMap: Record<string, DateDetectionResult> = {};

    data.columns.forEach((column, columnIndex) => {
      const values = data.rows.map((row) => row[columnIndex] ?? null);
      const detection = this.detectDateColumn(values);
      detectionMap[column] = detection;

      this.columnsFormArray.push(
        this.fb.group({
          source_column: [column],
          selected: [detection.isLikelyDate],
          prompt: [''],
          isNewColumn: [false],
          target_column: ['']
        })
      );
    });

    this.dateDetection.set(detectionMap);
  }

  private detectDateColumn(values: (string | number | boolean | null)[]): DateDetectionResult {
    const sampleValues = values
      .filter((value) => !this.isEmptyLikeValue(value))
      .slice(0, 30);

    if (sampleValues.length === 0) {
      return { isLikelyDate: false, score: 0, sampleCount: 0, matchedCount: 0 };
    }

    const matchedCount = sampleValues.filter((value) => this.looksLikeDateValue(value)).length;
    const hasStrongSignal = sampleValues.some((value) => this.hasStrongDateSignal(value));
    const score = matchedCount / sampleValues.length;
    const isLikelyDate = hasStrongSignal && sampleValues.length >= 3 && matchedCount >= 3 && score >= 0.6;

    return {
      isLikelyDate,
      score,
      sampleCount: sampleValues.length,
      matchedCount
    };
  }

  private isEmptyLikeValue(value: string | number | boolean | null): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === '' || ['n/a', 'na', 'null', 'none', '-', '--'].includes(normalized);
    }

    return false;
  }

  private looksLikeDateValue(value: string | number | boolean | null): boolean {
    if (value === null || typeof value === 'boolean') {
      return false;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return false;
      }

      if (Number.isInteger(value) && value >= 20000101 && value <= 21001231) {
        return true;
      }

      return false;
    }

    const text = String(value).trim();
    if (!text) {
      return false;
    }

    const patterns = [
      /^\d{4}-\d{1,2}-\d{1,2}$/, 
      /^\d{4}\/\d{1,2}\/\d{1,2}$/, 
      /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/, 
      /^\d{8}$/, 
      /^\d{4}-\d{1,2}-\d{1,2}[t\s]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?(z|[+-]\d{2}:?\d{2})?$/i,
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}$/i,
      /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{2,4}$/i
    ];

    if (patterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    const parsed = Date.parse(text);
    return !Number.isNaN(parsed) && /\d/.test(text);
  }

  private hasStrongDateSignal(value: string | number | boolean | null): boolean {
    if (value === null || typeof value === 'boolean') {
      return false;
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) && value >= 20000101 && value <= 21001231;
    }

    const text = String(value).trim();
    if (!text) {
      return false;
    }

    const strongPatterns = [
      /^\d{4}-\d{1,2}-\d{1,2}$/,
      /^\d{4}\/\d{1,2}\/\d{1,2}$/,
      /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/,
      /^\d{8}$/,
      /^\d{4}-\d{1,2}-\d{1,2}[t\s]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?(z|[+-]\d{2}:?\d{2})?$/i,
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}$/i,
      /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{2,4}$/i
    ];

    return strongPatterns.some((pattern) => pattern.test(text));
  }

  onColumnSelectionChange(index: number): void {
    const column = this.columnsFormArray.at(index);
    const isSelected = column.get('selected')?.value;
    const promptControl = column.get('prompt');

    if (!isSelected) {
      promptControl?.setValue('');
      column.get('isNewColumn')?.setValue(false);
      column.get('target_column')?.setValue('');
      column.get('target_column')?.clearValidators();
      column.get('target_column')?.updateValueAndValidity();
    }

    promptControl?.clearValidators();
    promptControl?.updateValueAndValidity();
  }

  onToggleCreateNewColumn(index: number): void {
    const column = this.columnsFormArray.at(index);
    const isNewColumn = column.get('isNewColumn')?.value;
    const targetControl = column.get('target_column');

    if (isNewColumn) {
      targetControl?.setValidators([Validators.required]);
    } else {
      targetControl?.clearValidators();
      targetControl?.setValue('');
    }
    targetControl?.updateValueAndValidity();
  }

  async startTransformation(): Promise<void> {
    const selectedColumns = this.columnsFormArray.value.filter((col: any) => col.selected);

    if (selectedColumns.length === 0) {
      this.error.set('Please select at least one column');
      return;
    }

    const dateColumnsToTransform = selectedColumns.filter((col: any) => !!col.prompt?.trim());

    const invalidTargetColumn = dateColumnsToTransform.find((col: any) => col.isNewColumn && !col.target_column?.trim());
    if (invalidTargetColumn) {
      this.error.set(`Please enter a new column name for ${invalidTargetColumn.source_column}`);
      return;
    }

    this.selectedColumnsForDisplay.set(selectedColumns.map((col: any) => col.source_column));
    this.transformedDateColumns.set(dateColumnsToTransform);

    const currentData = this.parsedData();
    if (!currentData) {
      this.error.set('No data to transform');
      return;
    }

    if (dateColumnsToTransform.length === 0) {
      const selectedData = this.buildSelectedData(selectedColumns, currentData);
      this.transformedData.set(selectedData);
      this.error.set(null);
      return;
    }

    this.isTransforming.set(true);
    this.transformProgressPercent.set(0);
    this.error.set(null);

    const pipelineId = this.pendingPipelineId();
    const batchId = this.pendingBatchId();
    const payload = {
      pipeline_id: pipelineId,
      batch_id: batchId,
      columns: dateColumnsToTransform.map((col: any) => {
        const columnIndex = currentData.columns.indexOf(col.source_column);
        const values = columnIndex >= 0
          ? currentData.rows.map((row: any) => row[columnIndex])
          : [];

        return {
          source_column: col.source_column,
          target_column: col.isNewColumn ? col.target_column : col.source_column,
          values,
          prompt: col.prompt
        };
      })
    };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (response) => {
        this.zone.run(() => {
          if (!response.job_id) {
            this.error.set('Transformation job was created without a job id');
            this.isTransforming.set(false);
            return;
          }

          this.pollTransformationStatus(response.job_id, currentData, selectedColumns);
        });
      },
      error: (err) => {
        this.error.set(`Transformation failed: ${err.message || 'Unknown error'}`);
        this.isTransforming.set(false);
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  downloadTransformedDataAsExcel(): void {
    const transformedDataValue = this.transformedData();

    if (!transformedDataValue) {
      this.error.set('No transformed data available to download');
      return;
    }

    this.error.set(null);

    const worksheetData = [
      transformedDataValue.columns,
      ...transformedDataValue.rows
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, this.getWorksheetName());
    XLSX.writeFile(workbook, this.getDownloadFileName());
  }

  private getDownloadFileName(): string {
    const originalName = this.uploadedFile()?.name ?? 'transformed-data';
    const sanitizedName = originalName.replace(/\.[^.]+$/, '');
    return `${sanitizedName}-transformed.xlsx`;
  }

  private getWorksheetName(): string {
    return 'TransformedData';
  }

  private refreshGeneratedIds(): void {
    this.pendingPipelineId.set(this.generatePipelineId());
    this.pendingBatchId.set(this.generateBatchId());
  }

  private generatePipelineId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `pipeline-${crypto.randomUUID()}`;
    }

    const fallback = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    return `pipeline-${fallback}`;
  }

  private generateBatchId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `batch-${crypto.randomUUID()}`;
    }

    const fallback = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    return `batch-${fallback}`;
  }
}

