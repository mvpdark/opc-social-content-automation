# ============================================================
# OMPC-SSB All-in-One Docker Image
# Runs both FastAPI backend (port 60001) and Next.js frontend (port 60000)
# ============================================================

# ---------- Stage 1: Build Next.js frontend ----------
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Build backend + runtime ----------
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js runtime for Next.js standalone
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install backend Python dependencies
COPY backend/pyproject.toml ./
COPY backend/app/ ./app/
COPY backend/prompts/ ./prompts/
RUN pip install --no-cache-dir .

# Copy frontend standalone build
COPY --from=frontend-builder /frontend/.next/standalone /app/frontend/
COPY --from=frontend-builder /frontend/.next/static /app/frontend/.next/static
COPY --from=frontend-builder /frontend/public /app/frontend/public

# Create directories
RUN mkdir -p /app/data /app/static/generated

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 60000 60001

CMD ["/app/entrypoint.sh"]
