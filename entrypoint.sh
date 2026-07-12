#!/bin/bash
set -e

echo "Starting OMPC-SSB..."

# Start Next.js frontend (port 60000)
cd /app/frontend
PORT=60000 NODE_ENV=production node server.js &
FRONTEND_PID=$!
echo "Frontend started on port 60000 (PID: $FRONTEND_PID)"

# Start FastAPI backend (port 60001)
cd /app
python -m uvicorn app.main:app --host 0.0.0.0 --port 60001 &
BACKEND_PID=$!
echo "Backend started on port 60001 (PID: $BACKEND_PID)"

# Wait for either process to exit
wait -n $FRONTEND_PID $BACKEND_PID
EXIT_CODE=$?

echo "A process exited with code $EXIT_CODE, shutting down..."
kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
exit $EXIT_CODE
