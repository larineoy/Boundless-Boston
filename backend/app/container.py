"""Serve the built web UI alongside the API in the container."""
from fastapi.staticfiles import StaticFiles

from app.main import ROOT, app

# Register after API routes so that API endpoints take precedence.
app.mount("/", StaticFiles(directory=ROOT / "dist", html=True), name="web")
