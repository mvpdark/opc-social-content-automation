FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# Copy application code
COPY app/ ./app/
COPY prompts/ ./prompts/

# Create data directory
RUN mkdir -p /app/data /app/static/generated

EXPOSE 60001

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "60001"]
