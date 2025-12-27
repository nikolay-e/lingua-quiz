# GitHub Actions Workflows

This directory contains CI/CD workflows for the Lingua Quiz application.

## Workflows

### CI (`ci.yml`)

Main CI workflow that runs on push and pull requests:

- Runs pre-commit hooks
- Builds Docker images for backend, frontend, and integration tests
- Tags images with:
  - `main-<SHA>` for main branch
  - `v<SEMVER>` for release tags
- Runs integration tests

### Dependabot Auto-merge (`dependabot-automerge.yml`)

Automatically merges Dependabot PRs that pass CI checks.

## Deployment

Deployments are managed via GitOps (ArgoCD):

- **Staging**: Auto-deploys on push to main (`main-<sha>` tags)
- **Production**: Auto-deploys on semver tags (`v1.0.0`)

See [gitops repository](https://github.com/nikolay-e/gitops) for deployment configuration.
