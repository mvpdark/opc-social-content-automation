#!/bin/bash
set -e

echo "Starting OMPC-SSB API Service..."

cd /app
exec python -m uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 60001 \
    --workers 1
