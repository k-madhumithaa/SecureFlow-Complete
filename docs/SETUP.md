# Clean Setup (Windows PowerShell)

## Prerequisites

Install Python 3.13 64-bit, Node.js 22.x, Git, and Docker Desktop with WSL2. Jenkins is required only for CI/CD reproduction.

Official downloads:
- https://www.python.org/downloads/
- https://nodejs.org/en/download
- https://git-scm.com/downloads
- https://www.docker.com/products/docker-desktop/

Verify:

```powershell
python --version
py -0p
node --version
npm --version
git --version
docker --version
docker compose version
```

## Clone and backend setup

```powershell
git clone https://github.com/k-madhumithaa/SecureFlow-Complete.git
cd SecureFlow-Complete
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
python -m pip install -r security\requirements-security.txt
```

If script activation is blocked for this terminal only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Frontend setup

```powershell
cd frontend
npm ci
npm run lint
npm run build
cd ..
```

`npm ci` requires a committed package-lock file. If none is present in the cloned repository, use `npm install` once and commit the resulting lockfile for reproducible future installs.

## Local run

Terminal 1, from project root:

```powershell
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = "$PWD\backend"
python backend\run.py
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Dashboard URL: `http://127.0.0.1:5173`. Backend target: `http://127.0.0.1:5000`.

## Configuration

Backend variables: `SECRET_KEY`, `DATABASE_URL`, `JENKINS_URL`, `JENKINS_USERNAME`, `JENKINS_API_TOKEN`, and `JENKINS_JOB_NAME`. Compose additionally requires `GRAFANA_ADMIN_PASSWORD`. Set values in the shell or local ignored environment file. Never commit secrets.
