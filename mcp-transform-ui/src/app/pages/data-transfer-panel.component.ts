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
            Upload Excel or CSV files to transfer and process data across your ETL pipelines.
          </p>
        </div>
      </div>

      <!-- File Upload and Column Selection -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- File Upload Section (Left) -->
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

        <!-- Column Selection Section (Right) -->
        <div *ngIf="parsedData()" class="glass-panel px-6 py-8">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Select & Configure Columns</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Found {{ parsedData()!.columns.length }} columns
          </p>
          
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
                </div>

                <div *ngIf="column.get('selected')!.value && isDateColumn(column.get('source_column')!.value)" class="ml-6 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Output Format
                    </label>
                    <input
                      type="text"
                      formControlName="prompt"
                      placeholder="e.g., 'YYYY-MM-DD'"
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
                      New Column
                    </label>
                  </div>

                  <div *ngIf="column.get('isNewColumn')!.value">
                    <input
                      type="text"
                      formControlName="target_column"
                      placeholder="Name"
                      class="w-full px-2 py-1 border border-slate-300 rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>

          <!-- Select Columns Button -->
          <div class="mt-4">
            <button
              (click)="startTransformation()"
              [disabled]="isTransforming() || columnsFormArray.value.filter((c: any) => c.selected).length === 0"
              class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {{ isTransforming() ? 'Processing...' : 'Confirm Selection' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Original Data Preview -->
      <div *ngIf="parsedData()" class="glass-panel px-6 py-8">
        <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Original Data</h3>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Showing first {{ Math.min(10, parsedData()!.rows.length) }} of {{ parsedData()!.rows.length }} rows
        </p>

        <div class="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                <th class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">#</th>
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

      <!-- Transformation Loading State -->
      <div *ngIf="isTransforming()" class="glass-panel px-6 py-8">
        <div class="flex items-center gap-3">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-500"></div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Transforming data...</p>
        </div>
      </div>

      <!-- Database Transfer Loading State -->
      <div *ngIf="isTransferingToDb()" class="glass-panel px-6 py-8">
        <div class="flex items-center gap-3">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-green-600 border-t-transparent dark:border-green-500"></div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Transferring to database...</p>
        </div>
      </div>

      <!-- Start Transformation Button -->
      <div *ngIf="parsedData() && columnsFormArray.length > 0" class="glass-panel px-6 py-8">
        <button
          (click)="startTransformation()"
          [disabled]="isTransforming()"
          class="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {{ isTransforming() ? 'Processing...' : 'Select Columns' }}
        </button>
      </div>

      <!-- Transformation Results Section -->
      <div *ngIf="selectedColumnsForDisplay().length > 0 && transformedDateColumns().length > 0" class="glass-panel px-6 py-8">
        <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Transformation Results</h3>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Selected Columns: {{ selectedColumnsForDisplay().join(', ') }}
        </p>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Transformed Date Columns: {{ getTransformedColumnsDisplay() }}
        </p>
      </div>

      <!-- Selected Columns Display (no transformation) -->
      <div *ngIf="selectedColumnsForDisplay().length > 0 && transformedDateColumns().length === 0" class="glass-panel px-6 py-8">
        <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Selected Columns</h3>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Selected: {{ selectedColumnsForDisplay().join(', ') }}
        </p>
      </div>

      <!-- Error State -->
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
  isTransferingToDb = signal(false);
  Math = Math;

  columnConfigForm: FormGroup;
  transferForm: FormGroup;
  pipelineId = 'default-pipeline';
  batchId = 'default-batch';
  private apiUrl = 'http://127.0.0.1:8000/api/v1/transform-dates';
  private dbTransferUrl = 'http://127.0.0.1:8000/api/v1/transfer-to-db';
  selectedColumnsForDisplay = signal<string[]>([]);
  transformedDateColumns = signal<any[]>([]);

  constructor(private zone: NgZone, private fb: FormBuilder, private http: HttpClient) {
    this.columnConfigForm = this.fb.group({
      columns: this.fb.array([])
    });
    this.transferForm = this.fb.group({
      columns: this.fb.array([])
    });
  }

  get columnsFormArray(): FormArray {
    return this.columnConfigForm.get('columns') as FormArray;
  }

  get transferColumnsFormArray(): FormArray {
    return this.transferForm.get('columns') as FormArray;
  }

  isDateColumn(columnName: string): boolean {
    const lowerName = columnName.toLowerCase();
    return lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('timestamp');
  }

  getSelectedDateColumns(): any[] {
    return this.columnsFormArray.value.filter((col: any) => col.selected && this.isDateColumn(col.source_column));
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

  getTransformedColumnsDisplay(): string {
    return this.transformedDateColumns()
      .map((d: any) => d.isNewColumn ? `${d.target_column} (new)` : d.source_column)
      .join(', ');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadedFile.set(input.files[0]);
      this.parsedData.set(null);
      this.error.set(null);
      this.columnsFormArray.clear();
    }
  }

  clearFile(): void {
    this.uploadedFile.set(null);
    this.parsedData.set(null);
    this.error.set(null);
    this.columnsFormArray.clear();
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
          this.initializeColumnForm(data.columns);
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

  private initializeColumnForm(columns: string[]): void {
    this.columnsFormArray.clear();
    columns.forEach(column => {
      this.columnsFormArray.push(
        this.fb.group({
          source_column: [column],
          selected: [false],
          prompt: [''],
          isNewColumn: [false],
          target_column: ['']
        })
      );
    });
  }

  onColumnSelectionChange(index: number): void {
    const column = this.columnsFormArray.at(index);
    const isSelected = column.get('selected')?.value;
    const promptControl = column.get('prompt');
    
    if (isSelected) {
      promptControl?.setValidators([Validators.required]);
    } else {
      promptControl?.clearValidators();
    }
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
    }
    targetControl?.updateValueAndValidity();
  }

  async startTransformation(): Promise<void> {
    const selectedColumns = this.columnsFormArray.value.filter((col: any) => col.selected);

    if (selectedColumns.length === 0) {
      this.error.set('Please select at least one column');
      return;
    }

    const dateColumnsToTransform = selectedColumns.filter((col: any) => this.isDateColumn(col.source_column));

    // Store selected columns for display
    const selectedColumnNames = selectedColumns.map((col: any) => col.source_column);
    this.selectedColumnsForDisplay.set(selectedColumnNames);
    this.transformedDateColumns.set(dateColumnsToTransform);

    // If no date columns, just display the selected columns
    if (dateColumnsToTransform.length === 0) {
      console.log('No date columns selected, displaying selected columns only');
      this.error.set(null);
      return;
    }

    // If date columns exist, call the API
    this.isTransforming.set(true);
    this.error.set(null);

    const currentData = this.parsedData();
    if (!currentData) {
      this.error.set('No data to transform');
      this.isTransforming.set(false);
      return;
    }

    const payload = {
      pipeline_id: this.pipelineId,
      batch_id: this.batchId,
      columns: dateColumnsToTransform.map((col: any) => {
        const columnIndex = currentData ? currentData.columns.indexOf(col.source_column) : -1;
        const values = columnIndex >= 0 && currentData
          ? currentData.rows.map((row: any) => row[columnIndex])
          : [];
        
        return {
          source_column: col.source_column,
          target_column: col.isNewColumn ? col.target_column : col.source_column,
          values: values,
          prompt: col.prompt
        };
      })
    };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (response) => {
        this.isTransforming.set(false);
        this.zone.run(() => {
          console.log('Transformation completed:', response);
          
          if (response.data && response.data.transformed_rows) {
            const currentData = this.parsedData();
            if (currentData) {
              const newColumns = [...currentData.columns];
              
              // Add new transformed columns if they don't exist
              dateColumnsToTransform.forEach((col: any) => {
                if (col.isNewColumn && !newColumns.includes(col.target_column)) {
                  newColumns.push(col.target_column);
                }
              });

              // Set transformed data (keep original data unchanged)
              this.transformedData.set({
                columns: newColumns,
                rows: response.data.transformed_rows
              });

              // Initialize transfer form with transformed columns
              this.initializeTransferForm(newColumns);
            }
          }
        });
      },
      error: (err) => {
        this.error.set(`Transformation failed: ${err.message || 'Unknown error'}`);
        this.isTransforming.set(false);
      }
    });
  }

  private initializeTransferForm(columns: string[]): void {
    this.transferColumnsFormArray.clear();
    columns.forEach(column => {
      this.transferColumnsFormArray.push(
        this.fb.group({
          column_name: [column],
          selected: [false]
        })
      );
    });
  }

  async transferToDatabase(): Promise<void> {
    const selectedColumns = this.transferColumnsFormArray.value.filter((col: any) => col.selected);

    if (selectedColumns.length === 0) {
      this.error.set('Please select at least one column to transfer');
      return;
    }

    const transformedDataValue = this.transformedData();
    if (!transformedDataValue) {
      this.error.set('No transformed data to transfer');
      return;
    }

    this.isTransferingToDb.set(true);
    this.error.set(null);

    const payload = {
      pipeline_id: this.pipelineId,
      batch_id: this.batchId,
      columns: selectedColumns.map((col: any) => col.column_name),
      data: transformedDataValue.rows
    };

    this.http.post(this.dbTransferUrl, payload).subscribe({
      next: (response) => {
        this.isTransferingToDb.set(false);
        this.zone.run(() => {
          console.log('Database transfer completed:', response);
          this.error.set(null);
        });
      },
      error: (err) => {
        this.error.set(`Database transfer failed: ${err.message || 'Unknown error'}`);
        this.isTransferingToDb.set(false);
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
}
