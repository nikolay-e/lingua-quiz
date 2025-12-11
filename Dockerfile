FROM python:3.15.0a2-alpine AS python-base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
RUN apk add --no-cache curl netcat-openbsd
RUN adduser -D -h /home/appuser appuser
WORKDIR /home/appuser

FROM python-base AS backend
RUN apk add --no-cache postgresql-libs
COPY --chown=appuser:appuser packages/backend/requirements.txt ./
RUN apk add --no-cache --virtual .build-deps gcc musl-dev postgresql-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apk --purge del .build-deps

COPY --chown=appuser:appuser packages/backend/src/core/base_model.py ./core/
COPY lingua-quiz-schema.json /tmp/lingua-quiz-schema.json
RUN pip install --no-cache-dir datamodel-code-generator==0.41.0 \
    && mkdir -p ./generated \
    && PYTHONPATH=/home/appuser python -m datamodel_code_generator \
        --input /tmp/lingua-quiz-schema.json \
        --output ./generated/schemas.py \
        --output-model-type pydantic_v2.BaseModel \
        --base-class core.base_model.APIBaseModel \
        --field-constraints \
        --use-standard-collections \
        --use-annotated \
        --use-double-quotes \
        --target-python-version 3.14 \
        --capitalise-enum-members \
        --enum-field-as-literal one \
        --snake-case-field \
        --use-schema-description \
    && pip uninstall -y datamodel-code-generator \
    && rm /tmp/lingua-quiz-schema.json

COPY --chown=appuser:appuser packages/backend/src/ ./
COPY --chown=appuser:appuser packages/backend/alembic/ ./alembic/
COPY --chown=appuser:appuser packages/backend/alembic.ini ./
COPY --chown=appuser:appuser packages/backend/start.sh packages/backend/seed_test_data.py ./
RUN chmod +x ./start.sh
USER appuser
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9000/api/health || exit 1
CMD ["./start.sh"]

FROM node:24-slim AS frontend-builder
ARG APP_VERSION=dev
ARG APP_ENVIRONMENT=development
WORKDIR /app
COPY package.json package-lock.json lingua-quiz-schema.json ./
COPY packages/domain/ ./packages/domain/
COPY packages/core/package.json ./packages/core/
COPY packages/frontend/package.json ./packages/frontend/
RUN npm ci
COPY packages/core/ ./packages/core/
RUN npm run build --workspace @lingua-quiz/core
COPY packages/frontend/ ./packages/frontend/
RUN npm run generate:api && \
    VITE_APP_VERSION=${APP_VERSION} \
    VITE_APP_ENVIRONMENT=${APP_ENVIRONMENT} \
    npm run build --workspace @lingua-quiz/frontend

FROM nginx:1.29.4-alpine AS frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/packages/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM mcr.microsoft.com/playwright/python:v1.55.0-noble AS integration-e2e-tests
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /home/pwuser
COPY packages/tests/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=pwuser:pwuser packages/backend/src/core/base_model.py ./backend/src/core/
COPY --chown=pwuser:pwuser packages/backend/alembic/ ./backend/alembic/
COPY --chown=pwuser:pwuser packages/backend/alembic.ini ./backend/alembic.ini
COPY lingua-quiz-schema.json /tmp/lingua-quiz-schema.json
RUN pip install --no-cache-dir datamodel-code-generator==0.41.0 \
    && mkdir -p ./backend/src/generated \
    && PYTHONPATH=/home/pwuser/backend/src python -m datamodel_code_generator \
        --input /tmp/lingua-quiz-schema.json \
        --output ./backend/src/generated/schemas.py \
        --output-model-type pydantic_v2.BaseModel \
        --base-class core.base_model.APIBaseModel \
        --field-constraints \
        --use-standard-collections \
        --use-annotated \
        --use-double-quotes \
        --target-python-version 3.12 \
        --capitalise-enum-members \
        --enum-field-as-literal one \
        --snake-case-field \
        --use-schema-description \
    && pip uninstall -y datamodel-code-generator \
    && rm /tmp/lingua-quiz-schema.json

COPY --chown=pwuser:pwuser packages/tests/ ./
RUN mkdir -p reports && chown -R pwuser:pwuser /home/pwuser
USER pwuser
CMD ["python3", "run_tests.py"]
