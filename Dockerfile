# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS frontend
WORKDIR /build
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY features ./features
COPY public ./public
RUN pnpm build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    APP_MODE=demo \
    PORT=8000 \
    CORS_ORIGINS=http://localhost:8000 \
    TIKTOK_REDIRECT_URI=http://localhost:8000/api/tiktok/callback \
    CACHE_DB=/app/.cache/public-cache.sqlite3 \
    TIKTOK_SESSION_DB=/app/.cache/tiktok-sessions.sqlite3
WORKDIR /app
COPY dependencies.txt ./
RUN pip install --no-cache-dir -r dependencies.txt \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home app \
    && mkdir -p /app/.cache \
    && chown app:app /app/.cache
COPY backend/app ./backend/app
COPY backend/data ./backend/data
COPY scoring ./scoring
COPY --from=frontend /build/dist ./dist
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ['PORT'] + '/api/health', timeout=3)"
CMD ["sh", "-c", "exec python -m uvicorn app.container:app --app-dir backend --host 0.0.0.0 --port \"$PORT\""]
