"""Minimal JSON logging configuration for local and container runtimes."""

import json
import logging
import os
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    """Emit one JSON object per log record for log aggregation systems."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for field in ("event", "path", "cache_path", "cache_source", "gcs_uri"):
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    """Configure the root logger once without replacing host-provided handlers."""

    root = logging.getLogger()
    if not root.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        root.addHandler(handler)
    root.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())


configure_logging()
