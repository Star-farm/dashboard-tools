"""Compatibility alias for the packaged MCP implementation."""

import sys
from app.mcp import server as _implementation

sys.modules[__name__] = _implementation
