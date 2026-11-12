# Prometheus and Grafana Monitoring

The root `docker-compose.yml` starts monitoring only; it does not start the Flask application or Jenkins.

| Service | Image | Port |
|---|---|---:|
| Prometheus | `prom/prometheus:v3.5.0` | 9090 |
| Grafana | `grafana/grafana:12.1.1` | 3000 |
| Node Exporter | `prom/node-exporter:v1.9.1` | internal 9100 |
| cAdvisor | `gcr.io/cadvisor/cadvisor:v0.52.1` | internal 8080 |

Set Grafana password and start:

```powershell
$secureGrafanaPassword = Read-Host "Grafana admin password" -AsSecureString
$env:GRAFANA_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $secureGrafanaPassword).Password
docker compose config
docker compose up -d
docker compose ps
```

URLs: Prometheus `http://127.0.0.1:9090`; Grafana `http://127.0.0.1:3000`. Grafana username is `admin`.

Prometheus scrapes itself, staging at `host.docker.internal:5003`, production at `host.docker.internal:5004`, Node Exporter, and cAdvisor. Scrape/evaluation interval is 15 seconds.

Alerts in `monitoring/prometheus/rules/alerts.yml`:
- API unavailable for 1 minute.
- 5xx error ratio above 5% for 2 minutes.
- p95 request latency above 1 second for 2 minutes.

Grafana datasource, dashboard provisioning, and dashboard JSON are under `monitoring/grafana/`. Compose defines persistent `prometheus-data` and `grafana-data` volumes. `docker compose down` preserves volumes; `docker compose down -v` deletes them.

cAdvisor is privileged and mounts host paths read-only. On Docker Desktop, some container metrics/labels may differ from native Linux.
