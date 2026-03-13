# Frontend Handoff: File-Based Date Transformation Panel

## Purpose
This document explains exactly what needs to be built on the frontend side for the new file-based date transformation feature.

The backend already exists for date transformation. The frontend engineer should not build any transformation logic on the client. The frontend should work like a panel that:
- accepts a file
- reads the file
- lets the user choose date columns
- lets the user give prompts for those columns
- sends the extracted values and prompts to the backend
- tracks the job until it finishes
- merges the transformed values back into the file
- shows preview and download options

## What This Feature Should Do
Today, the project works by sending JSON payloads directly to the backend APIs.

Now we want an independent UI flow where a user can do the same thing through a panel.

The user flow should be:
1. Upload a CSV or Excel file.
2. The frontend reads the file and shows the columns.
3. The user selects one or more columns that contain dates.
4. After selecting a column, a prompt input should appear for that column.
5. The user gives the desired output date format in natural language.
6. When the user clicks `Start`, the frontend should build the backend payload using the selected column values and prompts.
7. The frontend should call the existing backend async API.
8. The backend returns a `job_id`.
9. The frontend should track the job until it finishes.
10. When the job succeeds, the frontend should take the transformed values and replace or add them into the original dataset.
11. The frontend should show a preview of the transformed file.
12. The frontend should allow downloading the transformed file.
13. If anything fails, the UI should show the failure reason clearly.

## Important Rule
The frontend is not responsible for converting dates.

The frontend must only:
- read files
- collect user input
- build payloads
- call backend APIs
- track job progress
- merge returned values into the file
- show preview/download

All actual date transformation must remain in the backend.

## Backend APIs That Already Exist
The frontend should use these existing APIs.

### 1. Submit transform job
`POST /api/v1/transform-dates`

Request body format:
```json
{
  "pipeline_id": "string",
  "batch_id": "string",
  "columns": [
    {
      "source_column": "string",
      "target_column": "string",
      "values": ["string", null],
      "prompt": "string"
    }
  ]
}
```

Response:
```json
{
  "job_id": "string",
  "status": "processing"
}
```

### 2. Poll job status
`GET /api/v1/transform-status/{job_id}`

This returns status and final result when complete.

Expected job statuses:
- `PENDING`
- `STARTED`
- `SUCCESS`
- `FAILED`

When the job is successful, the backend returns transformed values like:
```json
{
  "result": {
    "columns": [
      {
        "target_column": "order_date_normalized",
        "values": ["2024-01-15", "2024-01-16", null]
      }
    ]
  }
}
```

## Files the Frontend Must Support
The panel should support:
- `.csv`
- `.xlsx`
- `.xls`

If the file type is unsupported, show a clear error.

## Suggested Frontend Libraries
Recommended libraries:
- CSV parsing: `papaparse`
- Excel parsing and writing: `xlsx`

## Step-by-Step Frontend Flow

### Step 1. File Upload Section
Build a file upload section.

Requirements:
- allow drag/drop or file picker
- accept CSV and Excel files
- show selected file name
- show file type and size if possible
- show error if invalid file type

### Step 2. Parse File in Frontend
After file upload:
- parse the file in the browser
- extract:
  - column names
  - row values
  - preview rows

Important:
- do not upload the raw file to backend in version 1
- parsing should happen client-side

### Step 3. Show File Preview
Show a preview table after parsing.

Requirements:
- show first few rows only, not the entire file
- show total row count
- show total column count
- table should scroll if wide

### Step 4. Show All Columns
Display a list of all columns from the file.

Requirements:
- each column should be selectable
- user must be able to select multiple columns
- for each column, optionally show a few sample values

### Step 5. Date Column Selection
The user should choose which columns need date transformation.

Requirements:
- checkbox or multi-select control per column
- multi-column selection is required
- selecting a column should reveal configuration options for that column

### Step 6. Prompt Input Per Selected Column
For every selected column, show a prompt input box.

For each selected column, the UI should collect:
- `source_column`
- `target_column`
- `prompt`

Prompt example:
- `Convert to YYYY-MM-DD`
- `Convert these values into month day year format using slashes`

### Step 7. Target Column Behavior
User should choose whether to:
- overwrite the original column
- or write the transformed values into a new column

Recommended behavior:
- default to new column
- suggested target column name:
  - `<source_column>_transformed`

If overwrite is selected:
- `target_column` can be the same as `source_column`

### Step 8. Validation Before Submit
Before the user clicks `Start`, validate:
- a file is uploaded
- file parsed successfully
- at least one column is selected
- every selected column has a prompt
- target column names are valid
- no duplicate target column names

If validation fails, show clear UI error.

### Step 9. Build Payload
When the user clicks `Start`, the frontend must build the backend request payload.

For each selected column:
- collect all values from that column in row order
- include the prompt entered by the user
- include source and target column names

The frontend should generate:
- `pipeline_id`
- `batch_id`

Simple acceptable values for this UI feature:
- `pipeline_id = file_transform_ui`
- `batch_id = timestamp or uuid`

### Step 10. Submit Async Job
Call:
- `POST /api/v1/transform-dates`

After success:
- store `job_id`
- move UI into processing state

### Step 11. Track Job Until Completion
Poll:
- `GET /api/v1/transform-status/{job_id}`

Show progress in UI:
- current status
- processed rows
- total rows
- percent complete
- estimated time remaining if backend gives it

UI states should be clear:
- submitted
- processing
- completed
- failed

### Step 12. Handle Failure Properly
If backend returns job failure:
- show `Transformation failed`
- also show exact backend reason if available

Examples:
- `Unable to resolve target date format from prompt`
- `Output row count mismatch`

Do not hide backend errors behind generic frontend messages.

### Step 13. Merge Returned Values Into Original Data
When job status becomes `SUCCESS`:
- read transformed values from `result.columns`
- map them back into the file rows using row order

Rules:
- row order must stay exactly the same
- transformed value count must equal original row count
- if counts do not match, stop and show error

If overwrite mode:
- replace original column values

If new-column mode:
- append or insert new target column values

### Step 14. Show Transformed Preview
After merging:
- show a preview of the transformed output
- highlight or clearly show transformed columns

The preview should help user confirm result before download.

### Step 15. Download Output File
Allow user to download transformed result as:
- CSV
- XLSX

Requirements:
- preserve all original non-transformed columns
- preserve row order
- include transformed columns correctly

## What Frontend Components Are Needed
Suggested page and components:

### Page
- `FileTransform.jsx`

### Components
- `FileUploadPanel.jsx`
- `FilePreviewTable.jsx`
- `ColumnSelector.jsx`
- `ColumnPromptConfig.jsx`
- `TransformJobStatus.jsx`
- `TransformedPreviewTable.jsx`
- `DownloadActions.jsx`
- `ErrorBanner.jsx`

These names are only suggestions. The engineer can change names if needed.

## State That Frontend Needs to Manage
The frontend will likely need state for:
- uploaded file
- parsed rows
- parsed columns
- preview rows
- selected columns
- prompt per selected column
- overwrite/new-column mode per column
- target column names
- submit loading state
- `job_id`
- current backend status
- current progress
- final transformed dataset
- error message

## Important UX Requirements
1. While file is parsing:
- show loader

2. While job is being submitted:
- disable submit button
- show submitting state

3. While job is running:
- show progress loader
- do not allow duplicate submissions

4. On failure:
- show exact reason clearly

5. On success:
- show transformed preview and download buttons

## Edge Cases the Frontend Must Handle
1. Empty file
2. Invalid file type
3. File parsing failure
4. No rows
5. No selected columns
6. Missing prompt for a selected column
7. Duplicate target column names
8. Backend submit failure
9. Job status failure
10. Result missing expected column
11. Result row count mismatch
12. Download generation failure

## Things Frontend Engineer Should NOT Do
Do not do these in frontend:
- do not implement date conversion logic
- do not guess date formats client-side for transformation
- do not directly modify backend API contracts
- do not create a separate transformation engine in UI

## Phase 1 Scope Recommendation
The first version should include only:
1. upload CSV/XLSX/XLS
2. parse file client-side
3. preview table
4. multi-column selection
5. prompt input per selected column
6. overwrite or new-column option
7. submit to existing backend API
8. poll job status
9. merge returned transformed values
10. preview transformed output
11. download CSV/XLSX
12. show clear errors

This is enough for version 1.

## Nice-to-Have Later
These are optional later improvements:
- auto-suggest likely date columns
- remember recent prompts
- saved prompt templates
- better diff preview between original and transformed columns
- chunked file processing for huge files
- backend file upload mode for very large files

## Final Summary for Frontend Engineer
The frontend feature is basically a smart file upload panel that acts as a client for the existing MCP backend.

The frontend engineer must build a UI that:
- accepts files
- reads file columns
- lets user select one or more date columns
- lets user write prompts for those columns
- sends values + prompts to backend
- tracks backend job status
- receives transformed values
- merges them back into file rows
- lets user preview and download the transformed file

The backend already handles the actual date transformation.
The frontend should only manage file handling, UI flow, payload generation, status tracking, and output reconstruction.
