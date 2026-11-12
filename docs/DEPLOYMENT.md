# Docker and Ansible Deployment

## Application image

From repository root:

```powershell
docker build -f docker/Dockerfile -t secureflow:local .
docker run -d --name secureflow-local -p 5000:5000 `
  -v secureflow-local-data:/app/backend/instance secureflow:local
Invoke-RestMethod http://127.0.0.1:5000/health
Invoke-RestMethod http://127.0.0.1:5000/ready
```

The Dockerfile uses a multi-stage Python 3.13.18 image and runs as non-root `appuser` UID 10001.

## Ansible runner

```powershell
docker build -f ansible/Dockerfile -t secureflow-ansible:1.0 ./ansible
```

Pinned dependencies: ansible-core 2.19.2, Docker SDK 7.1.0, community.docker 4.7.0.

## Current playbook defaults

| Target | Image | Container | Host port | Persistent volume |
|---|---|---|---:|---|
| Staging | `secureflow:1.1.3` | `secureflow-staging` | 5003 | `secureflow-staging-data` |
| Production | `secureflow:1.1.2` | `secureflow-production` | 5004 | `secureflow-production-data` |
| Rollback | `secureflow:1.0.7` | `secureflow-production` | 5004 | `secureflow-production-data` |

A fresh clone does not include locally built Docker images. Build or load the exact tag referenced by the playbook. Update tags deliberately before promoting a new image.

## Staging

Set Jenkins integration values in the host PowerShell session:

```powershell
$env:JENKINS_URL = "http://host.docker.internal:8080"
$env:JENKINS_USERNAME = "your-jenkins-username"
$env:JENKINS_JOB_NAME = "SecureFlow-CI-CD"
$secureToken = Read-Host "Jenkins API token" -AsSecureString
$env:JENKINS_API_TOKEN = [System.Net.NetworkCredential]::new("", $secureToken).Password
```

Run from repository root:

```powershell
docker run --rm --workdir /workspace/ansible `
  --mount "type=bind,source=$($PWD.Path),target=/workspace" `
  --mount "type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock" `
  --env JENKINS_URL --env JENKINS_USERNAME --env JENKINS_API_TOKEN --env JENKINS_JOB_NAME `
  secureflow-ansible:1.0 `
  ansible-playbook -i inventory.ini playbooks/deploy-staging.yml
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:5003/health
Invoke-RestMethod http://127.0.0.1:5003/ready
```

Production deployment and rollback are operational actions. Review playbook image tags, target Docker daemon, backups, and database compatibility first. The production playbook does not currently pass Jenkins variables. The rollback playbook expects `secureflow:1.0.7`; verify it exists and is compatible before use.

Named data volumes persist across container recreation. Do not delete volumes or use destructive prune commands without verified backups.
