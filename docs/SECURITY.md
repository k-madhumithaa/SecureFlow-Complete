# Security Scanning and Secrets

Pinned tools: Bandit 1.9.4 and pip-audit 2.10.1 (`security/requirements-security.txt`); Jenkins runs Trivy 0.76.2 for HIGH and CRITICAL image findings.

Run locally:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r security\requirements-security.txt
.\security\run_security_scan.ps1
```

Reports are written to `security/reports/bandit.json` and `security/reports/pip-audit.json`. The scan script distinguishes findings/audit failures from scanner execution errors. Review reports; a successful scan is not a guarantee of security.

Never commit Jenkins tokens, Grafana passwords, Flask secret keys, `.env` files, private keys, or database files. Rotate credentials that have been exposed.

The app image runs as non-root `appuser`, uses a multi-stage build, and has a health check. The staging Ansible credential task uses `no_log: true`. Docker socket access and privileged cAdvisor are powerful host-level permissions; restrict them to trusted environments.
