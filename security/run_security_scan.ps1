$ErrorActionPreference = "Stop"

# Move to the project root.
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Ensure the reports directory exists.
$ReportDirectory = Join-Path $PSScriptRoot "reports"
New-Item -ItemType Directory -Force -Path $ReportDirectory | Out-Null

$BanditReport = Join-Path $ReportDirectory "bandit.json"
$AuditReport = Join-Path $ReportDirectory "pip-audit.json"

Write-Host ""
Write-Host "========================================"
Write-Host "       SECUREFLOW SECURITY SCAN"
Write-Host "========================================"

# ----------------------------------------
# 1. Bandit: Python static security scan
# ----------------------------------------

Write-Host ""
Write-Host "[1/2] Running Bandit..."

python -m bandit `
    -r backend/app `
    -c security/bandit.yaml `
    -f json `
    -o $BanditReport

$BanditExitCode = $LASTEXITCODE

if ($BanditExitCode -eq 0) {
    Write-Host "[PASS] Bandit completed without findings." -ForegroundColor Green
}
elseif ($BanditExitCode -eq 1) {
    Write-Host "[WARN] Bandit found security issues. Review its report." -ForegroundColor Yellow
}
else {
    Write-Host "[ERROR] Bandit encountered a scanner error." -ForegroundColor Red
}

# ----------------------------------------
# 2. pip-audit: Dependency vulnerability scan
# ----------------------------------------

Write-Host ""
Write-Host "[2/2] Running pip-audit..."

pip-audit `
    -r backend/requirements.txt `
    --format json `
    --output $AuditReport

$AuditExitCode = $LASTEXITCODE

if ($AuditExitCode -eq 0) {
    Write-Host "[PASS] pip-audit completed without known vulnerabilities." -ForegroundColor Green
}
elseif ($AuditExitCode -eq 1) {
    Write-Host "[WARN] pip-audit reported vulnerabilities or an audit failure. Review its output." -ForegroundColor Yellow
}
else {
    Write-Host "[ERROR] pip-audit encountered a scanner error." -ForegroundColor Red
}

# ----------------------------------------
# Final result
# ----------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host "             SCAN SUMMARY"
Write-Host "========================================"

Write-Host "Bandit exit code: $BanditExitCode"
Write-Host "pip-audit exit code: $AuditExitCode"

Write-Host ""
Write-Host "Reports:"
Write-Host $BanditReport
Write-Host $AuditReport

if ($BanditExitCode -gt 1 -or $AuditExitCode -gt 1) {
    Write-Host ""
    Write-Host "[ERROR] One or more scanners failed to execute correctly." -ForegroundColor Red
    exit 2
}

if ($BanditExitCode -eq 1 -or $AuditExitCode -eq 1) {
    Write-Host ""
    Write-Host "[FAIL] Security findings or audit failure detected." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[PASS] All security scans completed successfully." -ForegroundColor Green
exit 0