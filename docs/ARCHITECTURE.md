# Architecture

## Components

- `frontend/`: React dashboard; Vite serves development assets and proxies `/backend` to Flask on port 5000 and `/prometheus` to Prometheus on port 9090.
- `backend/`: Flask application factory, configuration, SQLAlchemy models, routes, and Prometheus metrics.
- `Jenkinsfile`: CI pipeline for tests, source/dependency security checks, image build, and image scan.
- `jenkins/`: Jenkins controller image definition and plugin list.
- `docker/`: multi-stage application image and entrypoint.
- `ansible/`: local Docker deployment playbooks for staging, production, and rollback.
- `monitoring/`: Prometheus scrape/alert configuration and Grafana provisioning/dashboard.
- `security/`: pinned Bandit/pip-audit dependencies and PowerShell scan runner.

## Data and request flow

The React UI calls Flask through the Vite `/backend` proxy. Flask stores deployment records through SQLAlchemy (SQLite by default), exposes health/readiness/status/deployment/Jenkins routes, and exports metrics at `/metrics`. Prometheus scrapes staging and production API instances plus host/container exporters. Grafana queries Prometheus.

## Deployment topology

Staging uses host port 5003 and persistent volume `secureflow-staging-data`; production uses port 5004 and `secureflow-production-data`. Current image tags are in the Ansible playbooks and must be updated deliberately when promoting a build.

## Platform assumptions

The supplied Compose and Ansible setup is oriented toward Windows Docker Desktop/WSL2. `host.docker.internal`, Docker socket mounts, cAdvisor privileges, and host path mounts require validation on other operating systems.
