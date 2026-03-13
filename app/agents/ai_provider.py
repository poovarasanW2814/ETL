"""Configurable AI provider implementations for prompt analysis."""

from __future__ import annotations

from dataclasses import dataclass
import time
from collections.abc import Iterator
from typing import Protocol

import requests

from app.core.settings import settings
from app.logging.logger import logger


class PromptAnalysisProvider(Protocol):
    """Provider contract for resolving date formats from prompts."""

    def iter_candidate_responses(self, instruction_prompt: str) -> Iterator[tuple[str, str]]:
        """Yield raw provider outputs paired with the model name used for each attempt."""


@dataclass(slots=True)
class OllamaPromptAnalysisProvider:
    """Ollama-backed prompt analysis provider."""

    base_url: str
    primary_model: str
    fallback_model: str | None
    timeout_seconds: int

    def _call_model(self, model: str, instruction_prompt: str) -> str:
        """Call a specific Ollama model and return the raw response text."""
        response = requests.post(
            f"{self.base_url.rstrip('/')}/api/generate",
            json={
                "model": model,
                "prompt": instruction_prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0,
                },
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("response", "")

    def iter_candidate_responses(self, instruction_prompt: str) -> Iterator[tuple[str, str]]:
        """Yield candidate responses from the configured model chain one at a time."""

        models_to_try = [self.primary_model]
        if self.fallback_model and self.fallback_model != self.primary_model:
            models_to_try.append(self.fallback_model)

        last_error: requests.RequestException | None = None
        for model in models_to_try:
            started_at = time.perf_counter()
            logger.info("Starting AI model attempt", ai_model=model, timeout_seconds=self.timeout_seconds)
            try:
                raw_response = self._call_model(model, instruction_prompt)
                elapsed = round(time.perf_counter() - started_at, 3)
                logger.info("Completed AI model attempt", ai_model=model, elapsed_seconds=elapsed)
                yield raw_response, model
            except requests.RequestException as exc:
                elapsed = round(time.perf_counter() - started_at, 3)
                logger.warning(
                    "AI model attempt failed",
                    ai_model=model,
                    elapsed_seconds=elapsed,
                    error=str(exc),
                )
                last_error = exc
                continue

        if last_error is not None:
            raise last_error

        raise ValueError("No Ollama models configured")


def get_prompt_analysis_provider() -> PromptAnalysisProvider:
    """Return the configured AI provider implementation."""

    provider_name = settings.ai_provider.lower()
    if provider_name == "ollama":
        return OllamaPromptAnalysisProvider(
            base_url=settings.ollama_base_url,
            primary_model=settings.ai_primary_model,
            fallback_model=settings.ai_fallback_model,
            timeout_seconds=settings.ai_timeout_seconds,
        )

    raise ValueError(f"Unsupported AI provider: {settings.ai_provider}")
