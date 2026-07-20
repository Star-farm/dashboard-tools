"""Compatibility entrypoint for Docker Compose and existing tooling."""

import os
import sys
from app.api import server as _implementation

sys.modules[__name__] = _implementation

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api.server:app", host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
