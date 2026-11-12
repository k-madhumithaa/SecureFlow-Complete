# Jenkins CI/CD

The root `Jenkinsfile` defines:
1. Checkout from SCM.
2. Install backend and security requirements in a Python 3.13.18 container.
3. Run pytest and publish JUnit XML.
4. Run Bandit and pip-audit.
5. Build `secureflow:<BUILD_NUMBER>`.
6. Scan the image with Trivy 0.76.2 for HIGH and CRITICAL issues (unfixed findings ignored).
7. Archive JSON reports.

The Jenkins image definition (`jenkins/Dockerfile`) uses `jenkins/jenkins:2.580.2-jdk21` and copies Docker CLI 29.9.3. Plugins are listed in `jenkins/plugins.txt`.

Create a Pipeline job named `SecureFlow-CI-CD` and configure Pipeline script from SCM to load this repository's `Jenkinsfile`. The Jenkins execution environment needs Docker CLI and Docker daemon access. Docker socket access is highly privileged and should be restricted to trusted jobs/users.

Artifacts: `backend/test-results.xml`, `security/reports/bandit.json`, `security/reports/pip-audit.json`, and `security/reports/trivy-<BUILD_NUMBER>.json`.
