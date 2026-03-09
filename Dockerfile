FROM python:3.14-alpine AS python-base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
RUN apk add --no-cache curl netcat-openbsd
RUN adduser -D -u 1000 -g 1000 -h /home/appuser appuser
WORKDIR /home/appuser

FROM python-base AS backend
ARG APP_VERSION=dev
ARG APP_ENVIRONMENT=development
ENV APP_VERSION=${APP_VERSION} \
    APP_ENVIRONMENT=${APP_ENVIRONMENT}
RUN apk add --no-cache postgresql-libs
COPY --chown=appuser:appuser apps/backend/requirements.txt ./
RUN apk add --no-cache --virtual .build-deps gcc g++ musl-dev postgresql-dev linux-headers \
    && pip install --no-cache-dir -r requirements.txt \
    && apk --purge del .build-deps

COPY --chown=appuser:appuser apps/backend/src/ ./
COPY --chown=appuser:appuser apps/backend/alembic/ ./alembic/
COPY --chown=appuser:appuser apps/backend/alembic.ini ./
COPY --chown=appuser:appuser apps/backend/alembic-words/ ./alembic-words/
COPY --chown=appuser:appuser apps/backend/alembic-words.ini ./
COPY --chown=appuser:appuser data/vocabularies/ ./data/vocabularies/
COPY --chown=appuser:appuser apps/backend/start.sh apps/backend/seed_test_data.py apps/backend/sync_vocabulary.py ./
RUN chmod +x ./start.sh
USER 1000
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9000/api/health || exit 1
CMD ["./start.sh"]

FROM node:24-slim AS frontend-builder
ARG APP_VERSION=dev
ARG APP_ENVIRONMENT=development
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/domain/ ./packages/domain/
COPY packages/core/package.json ./packages/core/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm ci
COPY packages/core/ ./packages/core/
COPY packages/api-client/ ./packages/api-client/
RUN npm run build --workspace @lingua-quiz/core
RUN npm run build --workspace @lingua-quiz/api-client
COPY apps/frontend/ ./apps/frontend/
RUN VITE_APP_VERSION=${APP_VERSION} \
    VITE_APP_ENVIRONMENT=${APP_ENVIRONMENT} \
    npm run build --workspace @lingua-quiz/frontend

FROM nginx:1.29-alpine AS frontend
RUN chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-builder /app/apps/frontend/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM mcr.microsoft.com/playwright/python:v1.58.0-noble AS integration-e2e-tests
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /home/pwuser
COPY tests/e2e/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=pwuser:pwuser apps/backend/src/ ./backend/src/
COPY --chown=pwuser:pwuser apps/backend/alembic/ ./backend/alembic/
COPY --chown=pwuser:pwuser apps/backend/alembic.ini ./backend/alembic.ini
COPY --chown=pwuser:pwuser apps/backend/alembic-words/ ./backend/alembic-words/
COPY --chown=pwuser:pwuser apps/backend/alembic-words.ini ./backend/alembic-words.ini

COPY --chown=pwuser:pwuser tests/e2e/ ./tests/
RUN mkdir -p tests/reports && chown -R pwuser:pwuser /home/pwuser
USER pwuser
WORKDIR /home/pwuser/tests
CMD ["python3", "test_runner.py"]
