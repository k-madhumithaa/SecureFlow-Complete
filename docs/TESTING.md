# Testing and Verification

## Backend

From repository root:

```powershell
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = "$PWD\backend"
python -m pytest backend\tests -v
```

## Frontend

```powershell
cd frontend
npm run lint
npm run build
cd ..
```

## API smoke checks

Local backend:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/health
Invoke-RestMethod http://127.0.0.1:5000/ready
Invoke-RestMethod http://127.0.0.1:5000/api/status
```

Staging and production use ports 5003 and 5004 respectively.

## Monitoring

```powershell
Invoke-RestMethod http://127.0.0.1:9090/-/healthy
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

In Prometheus, inspect Status → Targets and confirm expected scrape targets are UP.

## Docker

```powershell
docker ps
docker image ls
docker volume ls
docker logs --tail 100 secureflow-staging
```

Do not print environment variables or credentials while debugging.
