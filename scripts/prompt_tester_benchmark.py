"""Run one end-to-end transform workflow and report total elapsed time."""

from __future__ import annotations

import json
import time

import requests

SUBMIT_URL = "http://127.0.0.1:8000/api/v1/transform-dates"
STATUS_URL_TEMPLATE = "http://127.0.0.1:8000/api/v1/transform-status/{job_id}"
SUBMIT_TIMEOUT_SECONDS = 240
POLL_TIMEOUT_SECONDS = 60
POLL_INTERVAL_SECONDS = 5
TOTAL_VALUES = 1_000_000


def build_values(total_values: int) -> list[str | None]:
    """Generate a large mixed-format date column."""

    values: list[str | None] = []
    for index in range(total_values):
        match index % 12:
            case 0:
                values.append("15-01-2024")
            case 1:
                values.append("2024/01/16")
            case 2:
                values.append("Jan 17 2024")
            case 3:
                values.append("January 18, 2024")
            case 4:
                values.append("20240119")
            case 5:
                values.append("2024-01-20")
            case 6:
                values.append("2024-01-21 10:30:00")
            case 7:
                values.append("2024-01-22T11:45:30Z")
            case 8:
                values.append("23/01/2024")
            case 9:
                values.append("01-24-2024")
            case 10:
                values.append("")
            case _:
                values.append(None)
    return values


def build_payload() -> dict[str, object]:
    """Build one large async transform request."""

    return {
        "pipeline_id": "pipeline_mcp_async_stress_1m",
        "batch_id": "batch_async_1m_single_prompt",
        "columns": [
            {
                "source_column": "order_date_raw",
                "target_column": "order_date_normalized",
                "values": build_values(TOTAL_VALUES),
                "prompt": (
                    "Interpret every incoming value as a possible calendar date or timestamp regardless "
                    "of whether it appears in compact numeric form, slash-separated form, dash-separated "
                    "form, textual month-name form, or ISO datetime form with timezone, then normalize "
                    "the full column into a canonical month/day/year representation using slashes only, "
                    "preserving row order exactly, dropping any time portion, ignoring timezone offsets "
                    "in the final output, and returning null only for values that are empty, null, "
                    "malformed, ambiguous, or impossible to parse."
                ),
            }
        ],
    }


def submit_job(payload: dict[str, object]) -> tuple[str, dict[str, object]]:
    """Submit the transform job and return the job id."""

    response = requests.post(SUBMIT_URL, json=payload, timeout=SUBMIT_TIMEOUT_SECONDS)
    response.raise_for_status()
    body = response.json()
    job_id = body["job_id"]
    return job_id, body


def poll_job(job_id: str) -> dict[str, object]:
    """Poll transform status until the job reaches a terminal state."""

    status_url = STATUS_URL_TEMPLATE.format(job_id=job_id)

    while True:
        response = requests.get(status_url, timeout=POLL_TIMEOUT_SECONDS)
        response.raise_for_status()
        body = response.json()
        status = str(body.get("status"))

        print(
            json.dumps(
                {
                    "job_id": job_id,
                    "status": status,
                    "progress": body.get("progress"),
                    "metrics": body.get("metrics"),
                },
                indent=2,
            )
        )

        if status in {"SUCCESS", "FAILED", "completed", "failed"}:
            return body

        time.sleep(POLL_INTERVAL_SECONDS)


def main() -> None:
    """Submit one large async transform job and report total runtime."""

    print("Building payload...")
    payload = build_payload()

    print(
        json.dumps(
            {
                "submit_url": SUBMIT_URL,
                "total_values": TOTAL_VALUES,
                "poll_interval_seconds": POLL_INTERVAL_SECONDS,
                "submit_timeout_seconds": SUBMIT_TIMEOUT_SECONDS,
                "poll_timeout_seconds": POLL_TIMEOUT_SECONDS,
            },
            indent=2,
        )
    )

    started_at = time.perf_counter()
    job_id, submit_response = submit_job(payload)
    submitted_at = time.perf_counter()

    print("Job submitted")
    print(json.dumps({"job_id": job_id, "submit_response": submit_response}, indent=2))

    final_status = poll_job(job_id)
    completed_at = time.perf_counter()

    print("Final result")
    print(
        json.dumps(
            {
                "job_id": job_id,
                "submit_seconds": round(submitted_at - started_at, 3),
                "processing_seconds": round(completed_at - submitted_at, 3),
                "total_elapsed_seconds": round(completed_at - started_at, 3),
                "final_status": final_status.get("status"),
                "metrics": final_status.get("metrics"),
                "progress": final_status.get("progress"),
                "error": final_status.get("error"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
