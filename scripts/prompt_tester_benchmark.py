"""Benchmark the optimized prompt-tester flow through the real MCP API."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass

import requests

API_URL = "http://127.0.0.1:8000/api/v1/prompt-tester"
REQUEST_TIMEOUT_SECONDS = 240


@dataclass(slots=True)
class PromptCase:
    """Single prompt benchmark case."""

    name: str
    prompt: str
    values: list[str | None]


PROMPT_CASES: list[PromptCase] = [
    PromptCase(
        name="year_month_day",
        prompt="Format these dates as year month day",
        values=["15-01-2024", "2024/01/16", "Jan 17 2024"],
    ),
    # PromptCase(
    #     name="day_month_year",
    #     prompt="Convert this column into day month year format with dashes",
    #     values=["2024-01-15", "2024/01/16", "January 17, 2024"],
    # ),
    PromptCase(
        name="month_day_year",
        prompt="Convert these values into month day year format using slashes",
        values=["2024-01-15", "16-01-2024", "Jan 17 2024"],
    ),
    PromptCase(
        name="timestamp_strip",
        prompt="Normalize these timestamps into a compact database-friendly datetime format without timezone",
        values=["2024-01-15T10:30:00Z", "2024-01-16 11:45:30", "2024/01/17 09:15:10"],
    ),
    PromptCase(
        name="two_digit_year",
        prompt="Make these values look like short day-month-year with a two digit year",
        values=["2024-01-15", "16/01/2024", "Jan 17 2024"],
    ),
    PromptCase(
        name="slash_format",
        prompt="I want these dates represented as year slash month slash day",
        values=["15-01-2024", "20240116", "January 17, 2024"],
    ),
]


def run_case(case: PromptCase) -> dict[str, object]:
    """Execute one prompt benchmark case against the prompt tester endpoint."""

    payload = {
        "source_column": "benchmark_date",
        "target_column": "benchmark_date_transformed",
        "prompt": case.prompt,
        "values": case.values,
    }

    started_at = time.perf_counter()
    response = requests.post(API_URL, json=payload, timeout=REQUEST_TIMEOUT_SECONDS)
    elapsed = round(time.perf_counter() - started_at, 3)

    result: dict[str, object] = {
        "name": case.name,
        "prompt": case.prompt,
        "elapsed_seconds": elapsed,
        "status_code": response.status_code,
    }

    try:
        body = response.json()
    except json.JSONDecodeError:
        result["response_body"] = response.text
        result["success"] = False
        return result

    result["target_format"] = body.get("target_format")
    result["source_format_hint"] = body.get("source_format_hint")
    result["timezone_strategy"] = body.get("timezone_strategy")
    result["confidence"] = body.get("confidence")
    result["transformed_values"] = body.get("transformed_values")
    result["success"] = response.ok and body.get("target_format") is not None
    result["response_body"] = body
    return result


def main() -> None:
    """Run all configured benchmark cases and print a compact report."""

    print(f"Benchmarking {len(PROMPT_CASES)} prompt cases against {API_URL}")
    print(f"Request timeout: {REQUEST_TIMEOUT_SECONDS}s")
    print("Focus: current optimized AI planner (target_format + confidence) with deterministic execution metadata")
    print()

    results: list[dict[str, object]] = []
    for case in PROMPT_CASES:
        print(f"Running: {case.name}")
        result = run_case(case)
        results.append(result)
        print(
            json.dumps(
                {
                    "name": result["name"],
                    "elapsed_seconds": result["elapsed_seconds"],
                    "status_code": result["status_code"],
                    "target_format": result.get("target_format"),
                    "source_format_hint": result.get("source_format_hint"),
                    "timezone_strategy": result.get("timezone_strategy"),
                    "confidence": result.get("confidence"),
                    "sample_output": (result.get("transformed_values") or [])[:2],
                    "success": result["success"],
                },
                indent=2,
            )
        )
        print()

    success_count = sum(1 for result in results if result["success"])
    average_seconds = round(
        sum(float(result["elapsed_seconds"]) for result in results) / len(results),
        3,
    )
    slowest_case = max(results, key=lambda item: float(item["elapsed_seconds"]))
    fastest_case = min(results, key=lambda item: float(item["elapsed_seconds"]))

    print("Summary")
    print(
        json.dumps(
            {
                "cases": len(results),
                "successes": success_count,
                "average_seconds": average_seconds,
                "fastest_case": {
                    "name": fastest_case["name"],
                    "elapsed_seconds": fastest_case["elapsed_seconds"],
                },
                "slowest_case": {
                    "name": slowest_case["name"],
                    "elapsed_seconds": slowest_case["elapsed_seconds"],
                },
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
