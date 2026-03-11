import random
import time
from datetime import datetime, timedelta

import requests

API_URL = "http://127.0.0.1:8000/api/v1/transform-dates"
STATUS_URL = "http://127.0.0.1:8000/api/v1/transform-status"
TOTAL_ROWS = 25000
JOB_LABEL = "runner_5"

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
]

COLUMN_CONFIGS = [
    ("registered_at", "registered_at_fmt", "Convert registered_at to ISO format"),
    ("renewal_date", "renewal_date_fmt", "Convert renewal_date to DD-MM-YYYY"),
    ("terminated_at", "terminated_at_fmt", "Convert terminated_at to YYYY-MM-DD HH:mm:ss"),
]


def generate_dates(count: int) -> list[str]:
    base = datetime(2018, 11, 5)
    values: list[str] = []

    for _ in range(count):
        rand_days = random.randint(0, 2300)
        date = base + timedelta(days=rand_days)
        values.append(date.strftime(random.choice(FORMATS)))

    return values


def build_payload() -> dict:
    columns = []

    for source_column, target_column, prompt in COLUMN_CONFIGS:
        columns.append(
            {
                "source_column": source_column,
                "target_column": target_column,
                "values": generate_dates(TOTAL_ROWS),
                "prompt": prompt,
            }
        )

    return {
        "pipeline_id": f"hardcore_pipeline_{JOB_LABEL}",
        "batch_id": f"batch_{JOB_LABEL}",
        "columns": columns,
    }


def wait_for_result(job_id: str, timeout: int = 900) -> dict | None:
    start = time.time()

    while True:
        response = requests.get(f"{STATUS_URL}/{job_id}", timeout=30)
        if response.status_code != 200:
            print(f"[{JOB_LABEL}] Status API error: {response.text}")
            time.sleep(2)
            continue

        data = response.json()
        status = data.get("status")

        if status in SUCCESS_STATUSES:
            print(f"[{JOB_LABEL}] Completed in {round(time.time() - start, 2)} seconds")
            return data

        if status in FAILED_STATUSES:
            print(f"[{JOB_LABEL}] Failed: {data.get('error')}")
            return data

        if time.time() - start > timeout:
            print(f"[{JOB_LABEL}] Timed out waiting for completion")
            return None

        print(f"[{JOB_LABEL}] Still processing: {status}")
        time.sleep(2)


def main() -> None:
    payload = build_payload()
    total_values = TOTAL_ROWS * len(COLUMN_CONFIGS)
    print(f"[{JOB_LABEL}] Sending {len(COLUMN_CONFIGS)} columns and {total_values} values")

    start = time.time()
    response = requests.post(API_URL, json=payload, timeout=60)
    if response.status_code != 202:
        print(f"[{JOB_LABEL}] Submit failed: {response.text}")
        return

    job_id = response.json()["job_id"]
    print(f"[{JOB_LABEL}] Job ID: {job_id}")

    result = wait_for_result(job_id)
    if result is None:
        return

    total_time = time.time() - start
    print(f"[{JOB_LABEL}] Total elapsed: {round(total_time, 2)} seconds")


if __name__ == "__main__":
    main()
