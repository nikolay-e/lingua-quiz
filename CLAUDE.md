# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LinguaQuiz is a language learning web application that helps users master vocabulary through a spaced repetition system. The application tracks word
mastery in both directions (source → target language and vice versa) and intelligently selects words to practice based on error frequency and mastery
level.

## Repository Structure

The project is structured as a monorepo with workspaces:

- `packages/frontend`: Vanilla JavaScript (ES6+) UI
- `packages/backend`: Node.js/Express.js API with PostgreSQL database
- `packages/e2e-tests`: End-to-end tests with Playwright
- `helm/`: Kubernetes deployment configuration using Helm charts

## Development Commands

### Root-level Commands

```bash
# Install dependencies
npm install

# Linting
npm run lint

# Formatting
npm run format

# Check for unused dependencies
npm run depcheck
```

### Backend Commands

```bash
# Start the backend server
npm start --workspace=@linguaquiz/backend

# Run database migrations
npm run migrate --workspace=@linguaquiz/backend
```

### Frontend Commands

```bash
# Start the frontend development server
npm start --workspace=@linguaquiz/frontend

# Run frontend tests
npm test --workspace=@linguaquiz/frontend
```

### E2E Tests

```bash
# Run e2e tests
npm test --workspace=@linguaquiz/e2e-tests
```

## Docker Development Environment

The project includes Docker Compose configuration for local development:

```bash
# Start the entire stack (database, backend, frontend)
docker compose up --build -d db backend frontend

# Run E2E tests in Docker
docker compose up --build e2e-tests
```

Once running:

- Frontend: http://localhost:8080
- Backend API: http://localhost:9000

## Deployment Architecture

The application is deployed to Kubernetes using a unified Helm chart in `./helm/lingua-quiz-app/`. This chart manages:

- Frontend deployment (Nginx serving static files)
- Backend API deployment
- PostgreSQL database (StatefulSet)
- Ingress configuration
- Secret management

There's also a backup Helm chart in `./helm/lingua-quiz-backup/` for database backups.
