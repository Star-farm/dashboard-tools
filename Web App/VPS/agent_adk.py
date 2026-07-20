"""Compatibility alias for the packaged agent implementation."""

import sys
from app.agents import orchestrator as _implementation

sys.modules[__name__] = _implementation
