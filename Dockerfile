# Stage 1: Build Frontend SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend
FROM python:3.12-slim

# Avoid writing bytecode and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend application
COPY backend /app/backend

# Copy compiled frontend from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set workdir to backend directory so 'app.main:app' imports correctly
WORKDIR /app/backend

EXPOSE 8000

# Run FastAPI via Uvicorn (binds to $PORT or default 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
