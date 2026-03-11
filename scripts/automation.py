import random
import time
from datetime import datetime, timedelta

import requests

API_URL = "http://127.0.0.1:8000/api/v1/transform-dates"
STATUS_URL = "http://127.0.0.1:8000/api/v1/transform-status"

TOTAL_ROWS = 100000
IN_PROGRESS_STATUSES = {"processing", "PENDING", "STARTED", "RETRY", "RECEIVED"}
SUCCESS_STATUSES = {"completed", "SUCCESS"}
FAILED_STATUSES = {"failed", "FAILED"}

FORMATS = [
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%m/%d/%Y",
    "%Y/%m/%d",
    "%d %b %Y",
    "%B %d, %Y",
    "%Y%m%d",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%SZ",
    "%d.%m.%Y",
    "%d/%m/%Y",
    "%Y.%m.%d",
    "%d-%b-%Y",
    "%b %d %Y",
]

COLUMN_CONFIGS = [
    {
        "source_column": "created_at",
        "target_column": "created_at_formatted",
        "prompt": "Convert created_at to ISO format",
    },
    {
        "source_column": "join_date",
        "target_column": "join_date_formatted",
        "prompt": "Convert join_date to DD-MM-YYYY",
    },
    {
        "source_column": "last_login",
        "target_column": "last_login_formatted",
        "prompt": "Convert last_login to YYYY-MM-DD HH:mm:ss",
    },
]


def generate_dates(count: int) -> list[str]:
    base = datetime(2020, 1, 1)
    values: list[str] = []

    for _ in range(count):
        rand_days = random.randint(0, 2000)
        date = base + timedelta(days=rand_days)
        values.append(date.strftime(random.choice(FORMATS)))

    return values


def build_payload(count: int) -> dict:
    columns = []

    for config in COLUMN_CONFIGS:
        columns.append(
            {
                "source_column": config["source_column"],
                "target_column": config["target_column"],
                "values": generate_dates(count),
                "prompt": config["prompt"],
            }
        )

    return {
        "pipeline_id": "stress_pipeline",
        "batch_id": "sumanth_records",
        "columns": columns,
    }


def wait_for_result(job_id: str, timeout: int = 300) -> dict | None:
    start = time.time()

    while True:
        response = requests.get(f"{STATUS_URL}/{job_id}", timeout=30)

        if response.status_code != 200:
            print("Status API returned error:", response.text)
            time.sleep(2)
            continue

        data = response.json()
        status = data.get("status")

        if status in SUCCESS_STATUSES:
            end = time.time()
            print("\nJob completed successfully")
            print(f"Processing time: {round(end - start, 2)} seconds")
            return data

        if status in FAILED_STATUSES:
            print("Job failed")
            error = data.get("error")
            if error:
                print(f"Error: {error}")
            return data

        if time.time() - start > timeout:
            print("Timeout waiting for job completion")
            return None

        if status not in IN_PROGRESS_STATUSES:
            print(f"Unexpected status received: {status}")
            return data

        print(f"Job still processing... current status: {status}")
        time.sleep(2)


def main() -> None:
    total_values = TOTAL_ROWS * len(COLUMN_CONFIGS)
    print(f"Generating {TOTAL_ROWS} rows across {len(COLUMN_CONFIGS)} date columns...")

    payload = build_payload(TOTAL_ROWS)

    print("Submitting job to MCP service...")

    start_time = time.time()
    response = requests.post(API_URL, json=payload, timeout=60)

    if response.status_code != 202:
        print("Failed to submit job:", response.text)
        return

    job_id = response.json()["job_id"]
    print(f"Job ID: {job_id}")

    result = wait_for_result(job_id)
    if result is None:
        return

    end_time = time.time()
    total_time = end_time - start_time

    print("\n===== BENCHMARK RESULT =====")
    print(f"Columns sent   : {len(COLUMN_CONFIGS)}")
    print(f"Rows/column    : {TOTAL_ROWS}")
    print(f"Total values   : {total_values}")
    print(f"Total time     : {total_time:.2f} seconds")

    if total_time > 0:
        print(f"Values/sec     : {total_values / total_time:.2f}")

    print("============================")


if __name__ == "__main__":
    main()
