"""Gemini-backed AI provider implementation for prompt analysis."""

from __future__ import annotations

from dataclasses import dataclass
import time
from collections.abc import Iterator
from typing import Protocol

import requests

from app.logging.logger import logger


class PromptAnalysisProvider(Protocol):
    """Provider contract for resolving date formats from prompts."""

    def iter_candidate_responses(self, instruction_prompt: str) -> Iterator[tuple[str, str]]:
        """Yield raw provider outputs paired with the model name used for each attempt."""


@dataclass(slots=True)
class GeminiPromptAnalysisProvider:
    """Gemini-backed prompt analysis provider."""

    base_url: str
    model: str
    api_key: str
    timeout_seconds: int

    def _call_model(self, instruction_prompt: str) -> str:
        """Call Gemini and return the raw candidate text."""

        response = requests.post(
            f"{self.base_url.rstrip('/')}/models/{self.model}:generateContent",
            params={"key": self.api_key},
            json={
                "contents": [
                    {
                        "parts": [
                            {
                                "text": instruction_prompt,
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0,
                    "responseMimeType": "application/json",
                },
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        candidates = payload.get("candidates") or []
        if not candidates:
            return ""

        content = candidates[0].get("content") or {}
        parts = content.get("parts") or []
        if not parts:
            return ""

        return str(parts[0].get("text", ""))

    def iter_candidate_responses(self, instruction_prompt: str) -> Iterator[tuple[str, str]]:
        """Yield a single Gemini response paired with the model used."""

        started_at = time.perf_counter()
        logger.info("Starting AI model attempt", ai_model=self.model, timeout_seconds=self.timeout_seconds)
        try:
            raw_response = self._call_model(instruction_prompt)
            elapsed = round(time.perf_counter() - started_at, 3)
            logger.info("Completed AI model attempt", ai_model=self.model, elapsed_seconds=elapsed)
            yield raw_response, self.model
        except requests.RequestException as exc:
            elapsed = round(time.perf_counter() - started_at, 3)
            logger.warning(
                "AI model attempt failed",
                ai_model=self.model,
                elapsed_seconds=elapsed,
                error=str(exc),
            )
            raise
