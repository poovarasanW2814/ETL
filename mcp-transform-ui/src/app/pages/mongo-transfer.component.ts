import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { McpApiService } from '../core/mcp-api.service';
import { MongoCollectionItem, MongoDatabaseItem } from '../models';

interface TableData {
  columns: string[];
  rows: Record<string, string | number | boolean | object | null>[];
}

interface DateDetectionResult {
  isLikelyDate: boolean;
  score: number;
  sampleCount: number;
  matchedCount: number;
}

interface SelectedColumnConfig {
  source_column: string;
  selected?: boolean;
  prompt?: string;
  isNewColumn?: boolean;
  target_column?: string;
}

@Component({
  selector: 'app-mongo-transfer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <section class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">DB Transfer</p>
        <h2 class="mt-3 text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100">Database To Database Transfer</h2>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Choose a database type, connect to a source database, preview data, transform selected date columns, and write the result to a destination database.
        </p>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <div class="glass-panel px-6 py-8">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Source Database</h3>
          <form [formGroup]="sourceForm" class="mt-4 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Database Type</label>
              <select formControlName="db_type" (change)="onSourceDbTypeChanged()" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                <option value="mongodb">MongoDB</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Connection URI</label>
              <input formControlName="mongo_uri" type="text" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
            </div>
            <button type="button" (click)="loadSourceDatabases()" [disabled]="loadingSourceDatabases()" class="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-600">
              {{ loadingSourceDatabases() ? 'Connecting...' : 'Connect And Load Databases' }}
            </button>

            <div *ngIf="sourceDatabases().length">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Source Database</label>
              <select formControlName="database_name" (change)="onSourceDatabaseChanged($event)" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                <option value="">Select database</option>
                <option *ngFor="let database of sourceDatabases()" [value]="database.name">{{ database.name }}</option>
              </select>
            </div>
          </form>

          <div *ngIf="sourceCollections().length" class="mt-6">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Source Table / Collection</label>
            <div class="mt-1 flex gap-2">
              <select [value]="selectedSourceCollection()" (change)="onSourceCollectionSelected($event)" class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                <option value="">Select table / collection</option>
                <option *ngFor="let collection of sourceCollections()" [value]="collection.name">{{ collection.name }}</option>
              </select>
              <button type="button" (click)="previewSourceCollection()" [disabled]="!selectedSourceCollection() || loadingPreview()" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600">
                {{ loadingPreview() ? 'Loading...' : 'Load Data' }}
              </button>
            </div>
          </div>
        </div>

        <div class="glass-panel px-6 py-8">
          <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Destination Database</h3>
          <form [formGroup]="destinationForm" class="mt-4 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Database Type</label>
              <select formControlName="db_type" (change)="onDestinationDbTypeChanged()" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                <option value="mongodb">MongoDB</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Connection URI</label>
              <input formControlName="mongo_uri" type="text" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
            </div>
            <button type="button" (click)="loadDestinationDatabases()" [disabled]="loadingDestinationDatabases()" class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              {{ loadingDestinationDatabases() ? 'Loading...' : 'Connect And Load Databases' }}
            </button>
            <div *ngIf="destinationDatabases().length">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Destination Database</label>
              <select formControlName="database_name" (change)="onDestinationDatabaseChanged($event)" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                <option value="">Select database</option>
                <option *ngFor="let database of destinationDatabases()" [value]="database.name">{{ database.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Destination Mode</label>
              <select formControlName="destination_mode" (change)="onDestinationModeChanged()" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                <option value="create_new">Create new table / collection</option>
                <option value="use_existing">Use existing table / collection</option>
              </select>
            </div>

            <div *ngIf="destinationForm.get('destination_mode')?.value === 'create_new'">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">New Table / Collection Name</label>
              <input formControlName="collection_name" type="text" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
            </div>

            <div *ngIf="destinationForm.get('destination_mode')?.value === 'use_existing'" class="space-y-4">
              <p *ngIf="loadingDestinationCollections()" class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Loading existing tables / collections...
              </p>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Existing Table / Collection</label>
              <select formControlName="collection_name" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                <option value="">Select table / collection</option>
                <option *ngFor="let collection of destinationCollections()" [value]="collection.name">{{ collection.name }}</option>
              </select>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Existing Table / Collection Action</label>
                <select formControlName="existing_collection_action" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                  <option value="append">Append new data</option>
                  <option value="replace">Replace existing data</option>
                </select>
              </div>
            </div>

            <button type="button" (click)="writeToDestination()" [disabled]="!transformedData() || isWritingDestination()" class="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600">
              {{ isWritingDestination() ? 'Writing...' : 'Write To Destination' }}
            </button>
          </form>
        </div>
      </section>

      <section *ngIf="sourceData()" class="glass-panel px-6 py-8">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Source Data Preview</h3>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Showing preview rows from {{ selectedSourceCollection() }}. The actual transform and destination write use the full collection.
            </p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            <p class="font-semibold">Pipeline ID</p>
            <p class="mt-1 break-all font-mono">{{ pendingPipelineId() }}</p>
            <p class="mt-3 font-semibold">Batch ID</p>
            <p class="mt-1 break-all font-mono">{{ pendingBatchId() }}</p>
          </div>
        </div>

        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <th *ngFor="let column of sourceData()!.columns" class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {{ column }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of sourceData()!.rows.slice(0, 10)" class="border-b border-slate-100 dark:border-slate-800">
                  <td *ngFor="let column of sourceData()!.columns" class="max-w-xs truncate px-4 py-3 text-slate-700 dark:text-slate-300">
                    {{ formatCell(row[column]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 class="text-sm font-extrabold text-ink dark:text-slate-100">Select And Configure Columns</h4>
            <form [formGroup]="columnConfigForm" class="mt-4 space-y-3">
              <div formArrayName="columns" class="space-y-3 max-h-96 overflow-y-auto">
                <div *ngFor="let column of columnsFormArray.controls; let i = index" [formGroupName]="i" class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <div class="flex items-center gap-2">
                    <input type="checkbox" formControlName="selected" (change)="onColumnSelectionChange(i)" class="h-4 w-4 cursor-pointer accent-blue-600" />
                    <span class="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{{ column.get('source_column')?.value }}</span>
                    <span *ngIf="isLikelyDateColumn(column.get('source_column')?.value)" class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      Likely date
                    </span>
                  </div>

                  <div *ngIf="column.get('selected')?.value && isLikelyDateColumn(column.get('source_column')?.value)" class="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <input formControlName="prompt" type="text" placeholder="Convert to YYYY-MM-DD" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
                    <label class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input type="checkbox" formControlName="isNewColumn" (change)="onToggleCreateNewColumn(i)" class="h-3 w-3 cursor-pointer" />
                      Write result to new column
                    </label>
                    <input *ngIf="column.get('isNewColumn')?.value" formControlName="target_column" type="text" placeholder="New column name" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
                  </div>
                </div>
              </div>
            </form>

            <button type="button" (click)="startTransformation()" [disabled]="isTransforming() || !hasSelectedColumns()" class="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600">
              {{ isTransforming() ? 'Transforming...' : 'Transform Selected Columns' }}
            </button>
          </div>
        </div>
      </section>

      <section *ngIf="transformedData()" class="glass-panel px-6 py-8">
        <h3 class="text-lg font-extrabold text-ink dark:text-slate-100">Transformed Preview</h3>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Review preview rows before writing. The destination write uses the full transformed table or collection.
        </p>
        <div class="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                <th *ngFor="let column of transformedData()!.columns" class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {{ column }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of transformedData()!.rows.slice(0, 10)" class="border-b border-slate-100 dark:border-slate-800">
                <td *ngFor="let column of transformedData()!.columns" class="max-w-xs truncate px-4 py-3 text-slate-700 dark:text-slate-300">
                  {{ formatCell(row[column]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section *ngIf="isTransforming()" class="glass-panel px-6 py-8">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Transforming selected date columns...</p>
        <div class="mt-4">
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Progress</span>
            <span>{{ transformProgressPercent() }}%</span>
          </div>
          <div class="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
            <div class="h-2 rounded-full bg-blue-600 transition-all duration-500 dark:bg-blue-500" [style.width.%]="transformProgressPercent()"></div>
          </div>
        </div>
      </section>

      <section *ngIf="successMessage()" class="glass-panel border-emerald-200 px-6 py-8 text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300">
        <p class="text-sm font-semibold">{{ successMessage() }}</p>
      </section>

      <section *ngIf="error()" class="glass-panel border-rose-200 px-6 py-8 text-rose-700 dark:border-rose-900/70 dark:text-rose-300">
        <p class="text-sm font-semibold">Error</p>
        <p class="mt-1 text-xs">{{ error() }}</p>
      </section>
    </div>
  `,
})
export class MongoTransferComponent {
  readonly sourceForm: FormGroup;
  readonly destinationForm: FormGroup;
  readonly columnConfigForm: FormGroup;

  readonly sourceCollections = signal<MongoCollectionItem[]>([]);
  readonly sourceDatabases = signal<MongoDatabaseItem[]>([]);
  readonly destinationCollections = signal<MongoCollectionItem[]>([]);
  readonly destinationDatabases = signal<MongoDatabaseItem[]>([]);
  readonly selectedSourceCollection = signal('');
  readonly sourceData = signal<TableData | null>(null);
  readonly transformedData = signal<TableData | null>(null);
  readonly loadingSourceCollections = signal(false);
  readonly loadingSourceDatabases = signal(false);
  readonly loadingDestinationCollections = signal(false);
  readonly loadingDestinationDatabases = signal(false);
  readonly loadingPreview = signal(false);
  readonly isTransforming = signal(false);
  readonly isWritingDestination = signal(false);
  readonly transformProgressPercent = signal(0);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly pendingPipelineId = signal('');
  readonly pendingBatchId = signal('');
  readonly selectedOutputColumns = signal<string[]>([]);

  private readonly dateDetection = signal<Record<string, DateDetectionResult>>({});

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: McpApiService,
  ) {
    this.sourceForm = this.fb.group({
      db_type: ['mongodb', Validators.required],
      mongo_uri: ['', Validators.required],
      database_name: ['', Validators.required],
    });

    this.destinationForm = this.fb.group({
      db_type: ['mongodb', Validators.required],
      mongo_uri: ['', Validators.required],
      database_name: ['', Validators.required],
      destination_mode: ['create_new', Validators.required],
      existing_collection_action: ['append', Validators.required],
      collection_name: ['', Validators.required],
    });

    this.columnConfigForm = this.fb.group({
      columns: this.fb.array([]),
    });

    this.refreshGeneratedIds();
  }

  get columnsFormArray(): FormArray {
    return this.columnConfigForm.get('columns') as FormArray;
  }

  async loadSourceDatabases(): Promise<void> {
    if (!this.sourceForm.get('mongo_uri')?.value) {
      this.error.set('Please enter the source database connection URI.');
      return;
    }

    this.error.set(null);
    this.successMessage.set(null);
    this.loadingSourceDatabases.set(true);

    try {
      const response = await this.api.getDatabases({
        db_type: this.sourceForm.get('db_type')?.value,
        connection_uri: this.sourceForm.get('mongo_uri')?.value,
      });
      this.sourceDatabases.set(response.databases ?? []);
      this.sourceCollections.set([]);
      this.sourceForm.patchValue({ database_name: '' });
      this.sourceData.set(null);
      this.transformedData.set(null);
      this.columnsFormArray.clear();
      if (!response.databases?.length) {
        this.error.set('No databases were found for the source connection.');
      }
    } catch (error) {
      this.error.set(this.resolveError(error, 'Unable to connect to the source database.'));
    } finally {
      this.loadingSourceDatabases.set(false);
    }
  }

  onSourceDbTypeChanged(): void {
    this.sourceDatabases.set([]);
    this.sourceCollections.set([]);
    this.selectedSourceCollection.set('');
    this.sourceData.set(null);
    this.transformedData.set(null);
    this.columnsFormArray.clear();
    this.dateDetection.set({});
    this.selectedOutputColumns.set([]);
    this.error.set(null);
    this.successMessage.set(null);
    this.sourceForm.patchValue({
      database_name: '',
    });
    this.refreshGeneratedIds();
  }

  async onSourceDatabaseChanged(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    this.sourceForm.patchValue({ database_name: target.value });
    this.sourceCollections.set([]);
    this.selectedSourceCollection.set('');

    if (!target.value) {
      return;
    }

    await this.loadSourceCollections();
  }

  async loadSourceCollections(): Promise<void> {
    if (!this.sourceForm.get('database_name')?.value) {
      this.error.set('Please select a source database.');
      return;
    }

    this.error.set(null);
    this.loadingSourceCollections.set(true);

    try {
      const response = await this.api.getSourceTables({
        db_type: this.sourceForm.get('db_type')?.value,
        connection_uri: this.sourceForm.get('mongo_uri')?.value,
        database_name: this.sourceForm.get('database_name')?.value,
      });
      this.sourceCollections.set(response.tables ?? []);
      this.selectedSourceCollection.set('');
      if (!response.tables?.length) {
        this.error.set('No tables or collections were found in the selected source database.');
      }
    } catch (error) {
      this.error.set(this.resolveError(error, 'Unable to load source tables or collections.'));
    } finally {
      this.loadingSourceCollections.set(false);
    }
  }

  onSourceCollectionSelected(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedSourceCollection.set(target.value);
  }

  async previewSourceCollection(): Promise<void> {
    if (!this.selectedSourceCollection()) {
      this.error.set('Please select a source collection.');
      return;
    }

    this.error.set(null);
    this.successMessage.set(null);
    this.loadingPreview.set(true);

    try {
      const response = await this.api.previewSourceTable({
        db_type: this.sourceForm.get('db_type')?.value,
        connection_uri: this.sourceForm.get('mongo_uri')?.value,
        database_name: this.sourceForm.get('database_name')?.value,
        table_name: this.selectedSourceCollection(),
        limit: 100,
      });

      const tableData: TableData = {
        columns: response.columns ?? [],
        rows: (response.rows ?? []).map((row) => row.values ?? {}),
      };

      this.sourceData.set(tableData);
      this.transformedData.set(null);
      this.initializeColumnForm(tableData);
      this.refreshGeneratedIds();
    } catch (error) {
      this.error.set(this.resolveError(error, 'Unable to load the selected source collection.'));
    } finally {
      this.loadingPreview.set(false);
    }
  }

  async loadDestinationCollections(): Promise<void> {
    if (
      !this.destinationForm.get('mongo_uri')?.value ||
      !this.destinationForm.get('database_name')?.value
    ) {
      this.error.set('Please enter the destination database connection details.');
      return;
    }

    this.error.set(null);
    this.successMessage.set(null);
    this.loadingDestinationCollections.set(true);

    try {
      const response = await this.api.getDestinationTables({
        db_type: this.destinationForm.get('db_type')?.value,
        connection_uri: this.destinationForm.get('mongo_uri')?.value,
        database_name: this.destinationForm.get('database_name')?.value,
      });
      this.destinationCollections.set(response.tables ?? []);
    } catch (error) {
      this.error.set(this.resolveError(error, 'Unable to load destination tables or collections.'));
    } finally {
      this.loadingDestinationCollections.set(false);
    }
  }

  async loadDestinationDatabases(): Promise<void> {
    if (!this.destinationForm.get('mongo_uri')?.value) {
      this.error.set('Please enter the destination database connection URI.');
      return;
    }

    this.error.set(null);
    this.successMessage.set(null);
    this.loadingDestinationDatabases.set(true);

    try {
      const response = await this.api.getDatabases({
        db_type: this.destinationForm.get('db_type')?.value,
        connection_uri: this.destinationForm.get('mongo_uri')?.value,
      });
      this.destinationDatabases.set(response.databases ?? []);
      this.destinationCollections.set([]);
      this.destinationForm.patchValue({ database_name: '', collection_name: '' });
      if (!response.databases?.length) {
        this.error.set('No databases were found for the destination connection.');
      }
    } catch (error) {
      this.error.set(this.resolveError(error, 'Unable to load destination databases.'));
    } finally {
      this.loadingDestinationDatabases.set(false);
    }
  }

  onDestinationDbTypeChanged(): void {
    this.destinationDatabases.set([]);
    this.destinationCollections.set([]);
    this.error.set(null);
    this.successMessage.set(null);
    this.destinationForm.patchValue({
      database_name: '',
      destination_mode: 'create_new',
      existing_collection_action: 'append',
      collection_name: '',
    });
  }

  async onDestinationDatabaseChanged(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    this.destinationForm.patchValue({ database_name: target.value, collection_name: '' });
    this.destinationCollections.set([]);

    if (
      target.value &&
      this.destinationForm.get('destination_mode')?.value === 'use_existing'
    ) {
      await this.loadDestinationCollections();
    }
  }

  async onDestinationModeChanged(): Promise<void> {
    this.destinationForm.patchValue({
      collection_name: '',
      existing_collection_action: 'append',
    });

    if (
      this.destinationForm.get('destination_mode')?.value === 'use_existing' &&
      this.destinationForm.get('database_name')?.value
    ) {
      await this.loadDestinationCollections();
      return;
    }

    this.destinationCollections.set([]);
  }

  isLikelyDateColumn(columnName: string): boolean {
    return this.dateDetection()[columnName]?.isLikelyDate ?? false;
  }

  hasSelectedColumns(): boolean {
    return this.columnsFormArray.value.some((column: { selected?: boolean }) => column.selected);
  }

  onColumnSelectionChange(index: number): void {
    const column = this.columnsFormArray.at(index);
    if (!column.get('selected')?.value) {
      column.get('prompt')?.setValue('');
      column.get('isNewColumn')?.setValue(false);
      column.get('target_column')?.setValue('');
      column.get('target_column')?.clearValidators();
      column.get('target_column')?.updateValueAndValidity();
    }
  }

  onToggleCreateNewColumn(index: number): void {
    const column = this.columnsFormArray.at(index);
    const targetControl = column.get('target_column');

    if (column.get('isNewColumn')?.value) {
      targetControl?.setValidators([Validators.required]);
    } else {
      targetControl?.clearValidators();
      targetControl?.setValue('');
    }
    targetControl?.updateValueAndValidity();
  }

  async startTransformation(): Promise<void> {
    const previewData = this.sourceData();
    if (!previewData) {
      this.error.set('Load a source collection before transforming.');
      return;
    }

    const selectedColumns = this.columnsFormArray.value.filter(
      (column: SelectedColumnConfig) => column.selected,
    ) as SelectedColumnConfig[];

    if (!selectedColumns.length) {
      this.error.set('Please select at least one column.');
      return;
    }

    this.selectedOutputColumns.set(
      selectedColumns.map((column) => column.source_column),
    );

    const dateColumnsToTransform = selectedColumns.filter(
      (column: SelectedColumnConfig) => !!column.prompt?.trim(),
    );
    const invalidTargetColumn = dateColumnsToTransform.find(
      (column: SelectedColumnConfig) =>
        column.isNewColumn && !column.target_column?.trim(),
    );

    if (invalidTargetColumn) {
      this.error.set(`Please enter a new column name for ${invalidTargetColumn.source_column}.`);
      return;
    }

    this.error.set(null);
    this.successMessage.set(null);
    this.isTransforming.set(true);
    this.transformProgressPercent.set(0);

    let currentData: TableData;
    try {
      currentData = await this.loadFullSourceCollection();
    } catch (error) {
      this.error.set(this.resolveError(error, 'Unable to load the full source collection.'));
      this.isTransforming.set(false);
      this.transformProgressPercent.set(0);
      return;
    }

    if (!dateColumnsToTransform.length) {
      this.transformedData.set({
        columns: this.selectedOutputColumns(),
        rows: currentData.rows.map((row) => this.pickRowColumns(row, this.selectedOutputColumns())),
      });
      this.isTransforming.set(false);
      this.transformProgressPercent.set(100);
      this.error.set(null);
      return;
    }

    const payload = {
      pipeline_id: this.pendingPipelineId(),
      batch_id: this.pendingBatchId(),
      columns: dateColumnsToTransform.map(
        (column: SelectedColumnConfig) => ({
          source_column: column.source_column,
          target_column: column.isNewColumn ? String(column.target_column ?? '').trim() : column.source_column,
          values: currentData.rows.map((row) => this.toTransformValue(row[column.source_column])),
          prompt: String(column.prompt ?? ''),
        }),
      ),
    };

    try {
      const response = await this.api.submitTransformDatesJob(payload);
      if (!response?.job_id) {
        throw new Error('Transformation job was created without a job id.');
      }
      await this.pollTransformationStatus(response.job_id, currentData);
    } catch (error) {
      this.error.set(this.resolveError(error, 'Unable to start the transformation job.'));
      this.isTransforming.set(false);
      this.transformProgressPercent.set(0);
    }
  }

  async writeToDestination(): Promise<void> {
    const transformed = this.transformedData();
    if (!transformed) {
      this.error.set('Transform data before writing to the destination.');
      return;
    }

    if (this.destinationForm.invalid) {
      this.error.set('Please complete the destination database details.');
      return;
    }

    this.error.set(null);
    this.successMessage.set(null);
    this.isWritingDestination.set(true);

    try {
      const destinationMode = this.destinationForm.get('destination_mode')?.value;
      const writeMode =
        destinationMode === 'create_new'
          ? 'create'
          : this.destinationForm.get('existing_collection_action')?.value;

      const response = await this.api.writeDestinationTable({
        db_type: this.destinationForm.get('db_type')?.value,
        connection_uri: this.destinationForm.get('mongo_uri')?.value,
        database_name: this.destinationForm.get('database_name')?.value,
        table_name: this.destinationForm.get('collection_name')?.value,
        write_mode: writeMode,
        columns: transformed.columns,
        rows: transformed.rows,
      });
      this.successMessage.set(
        `Wrote ${response.rows_written} rows to ${response.database_name}.${response.table_name} using ${response.write_mode} mode.`,
      );
    } catch (error) {
      this.error.set(this.resolveError(error, 'Unable to write transformed data to the destination.'));
    } finally {
      this.isWritingDestination.set(false);
    }
  }

  formatCell(value: string | number | boolean | object | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private async loadFullSourceCollection(): Promise<TableData> {
    const response = await this.api.previewSourceTable({
      db_type: this.sourceForm.get('db_type')?.value,
      connection_uri: this.sourceForm.get('mongo_uri')?.value,
      database_name: this.sourceForm.get('database_name')?.value,
      table_name: this.selectedSourceCollection(),
      limit: null,
    });

    return {
      columns: response.columns ?? [],
      rows: (response.rows ?? []).map((row) => row.values ?? {}),
    };
  }

  private initializeColumnForm(data: TableData): void {
    this.columnsFormArray.clear();
    const detectionMap: Record<string, DateDetectionResult> = {};

    data.columns.forEach((column) => {
      const values = data.rows.map((row) => row[column] ?? null);
      const detection = this.detectDateColumn(values);
      detectionMap[column] = detection;

      this.columnsFormArray.push(
        this.fb.group({
          source_column: [column],
          selected: [detection.isLikelyDate],
          prompt: [''],
          isNewColumn: [false],
          target_column: [''],
        }),
      );
    });

    this.dateDetection.set(detectionMap);
  }

  private detectDateColumn(
    values: Array<string | number | boolean | object | null>,
  ): DateDetectionResult {
    const sampleValues = values.filter((value) => !this.isEmptyLikeValue(value)).slice(0, 30);
    if (!sampleValues.length) {
      return { isLikelyDate: false, score: 0, sampleCount: 0, matchedCount: 0 };
    }

    const matchedCount = sampleValues.filter((value) => this.looksLikeDateValue(value)).length;
    const hasStrongSignal = sampleValues.some((value) => this.hasStrongDateSignal(value));
    const score = matchedCount / sampleValues.length;

    return {
      isLikelyDate: hasStrongSignal && sampleValues.length >= 3 && matchedCount >= 3 && score >= 0.6,
      score,
      sampleCount: sampleValues.length,
      matchedCount,
    };
  }

  private isEmptyLikeValue(value: string | number | boolean | object | null): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === '' || ['n/a', 'na', 'null', 'none', '-', '--'].includes(normalized);
    }
    return false;
  }

  private looksLikeDateValue(value: string | number | boolean | object | null): boolean {
    if (value === null || typeof value === 'boolean' || typeof value === 'object') {
      return false;
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) && value >= 20000101 && value <= 21001231;
    }

    const text = value.trim();
    if (!text) {
      return false;
    }

    const patterns = [
      /^\d{4}-\d{1,2}-\d{1,2}$/,
      /^\d{4}\/\d{1,2}\/\d{1,2}$/,
      /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,
      /^\d{8}$/,
      /^\d{4}-\d{1,2}-\d{1,2}[t\s]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?(z|[+-]\d{2}:?\d{2})?$/i,
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}$/i,
      /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{2,4}$/i,
    ];

    return patterns.some((pattern) => pattern.test(text)) || (!Number.isNaN(Date.parse(text)) && /\d/.test(text));
  }

  private hasStrongDateSignal(value: string | number | boolean | object | null): boolean {
    if (value === null || typeof value === 'boolean' || typeof value === 'object') {
      return false;
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) && value >= 20000101 && value <= 21001231;
    }

    return this.looksLikeDateValue(value);
  }

  private async pollTransformationStatus(jobId: string, currentData: TableData): Promise<void> {
    while (true) {
      const statusResponse = await this.api.getJobStatus(jobId);
      const progressValue =
        typeof statusResponse?.progress?.progress === 'number'
          ? Math.max(0, Math.min(100, Math.round(statusResponse.progress.progress)))
          : null;

      if (progressValue !== null) {
        this.transformProgressPercent.set(progressValue);
      }

      if (statusResponse.status === 'SUCCESS' && statusResponse.result && typeof statusResponse.result === 'object') {
        const resultColumns = (statusResponse.result as { columns?: Array<{ target_column: string; values: Array<string | null> }> }).columns ?? [];
        this.transformedData.set(this.buildTransformedData(currentData, resultColumns));
        this.isTransforming.set(false);
        this.transformProgressPercent.set(100);
        return;
      }

      if (statusResponse.status === 'FAILED') {
        throw new Error(statusResponse.error || 'Transformation failed.');
      }

      await this.delay(1500);
    }
  }

  private buildTransformedData(
    currentData: TableData,
    transformedColumns: Array<{ target_column: string; values: Array<string | null> }>,
  ): TableData {
    const baseColumns = this.selectedOutputColumns();
    const columns = [...baseColumns];
    const rows = currentData.rows.map((row) => this.pickRowColumns(row, baseColumns));

    transformedColumns.forEach((transformedColumn) => {
      if (!columns.includes(transformedColumn.target_column)) {
        columns.push(transformedColumn.target_column);
      }

      rows.forEach((row, rowIndex) => {
        row[transformedColumn.target_column] = transformedColumn.values[rowIndex] ?? null;
      });
    });

    return { columns, rows };
  }

  private pickRowColumns(
    row: Record<string, string | number | boolean | object | null>,
    columns: string[],
  ): Record<string, string | number | boolean | object | null> {
    const picked: Record<string, string | number | boolean | object | null> = {};
    columns.forEach((column) => {
      picked[column] = row[column] ?? null;
    });
    return picked;
  }

  private toTransformValue(
    value: string | number | boolean | object | null | undefined,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private refreshGeneratedIds(): void {
    this.pendingPipelineId.set(this.generateId('pipeline'));
    this.pendingBatchId.set(this.generateId('batch'));
  }

  private generateId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }

  private resolveError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null) {
      const candidate = error as {
        status?: number;
        error?: { detail?: string };
        message?: string;
        statusText?: string;
      };

      const detail = candidate.error?.detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }

      if (detail && typeof detail === 'object') {
        try {
          return JSON.stringify(detail);
        } catch {
          return fallback;
        }
      }

      if (typeof candidate.message === 'string' && candidate.message.trim()) {
        return candidate.message;
      }

      if (candidate.status) {
        return candidate.statusText
          ? `${candidate.status}: ${candidate.statusText}`
          : `Request failed with status ${candidate.status}`;
      }
    }
    return fallback;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}
