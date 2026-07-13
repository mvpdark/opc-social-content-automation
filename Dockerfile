# ============================================================
# OMPC-SSB - Pure API Service
# FastAPI backend only (port 60001), no frontend
# ============================================================

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install backend Python dependencies
COPY backend/pyproject.toml ./
COPY backend/app/ ./app/
RUN pip install --no-cache-dir .

# Copy prompt templates (load_prompt expects them at parents[3]/prompts)
COPY prompts/ /prompts/

# Create directories
RUN mkdir -p /app/data /app/static/generated

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 60001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD curl -f http://127.0.0.1:60001/health || exit 1

CMD ["/app/entrypoint.sh"]
