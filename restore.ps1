# restore.ps1 - Restore from backup
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$RestoreTo = "C:\AD Pro\public\backend"
)

if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   AD Manager Pro - Restore"                    -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# Stop the service first
Write-Host "  Stopping service..." -ForegroundColor Yellow
Stop-ScheduledTask -TaskName "AD Manager Pro" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Extract backup
Write-Host "  Extracting backup..." -ForegroundColor Yellow
$tempDir = "$env:TEMP\admanager-restore-$(Get-Random)"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
Expand-Archive -Path $BackupFile -DestinationPath $tempDir -Force

# Show backup info
if (Test-Path "$tempDir\backup-info.json") {
    $info = Get-Content "$tempDir\backup-info.json" | ConvertFrom-Json
    Write-Host "  Backup Date    : $($info.BackupDate)" -ForegroundColor Gray
    Write-Host "  Source Computer: $($info.Computer)"    -ForegroundColor Gray
}

# Restore files
Write-Host ""
Write-Host "  Restoring files..." -ForegroundColor Yellow

$mappings = @{
    "audit.db" = "database\audit.db"
    ".env"     = ".env"
    "certs"    = "certs"
    "app.py"   = "app.py"
    "static"   = "static"
}

foreach ($source in $mappings.Keys) {
    $src = Join-Path $tempDir $source
    $dst = Join-Path $RestoreTo $mappings[$source]
    
    if (Test-Path $src) {
        # Backup current file before overwriting
        if (Test-Path $dst) {
            $backup = "$dst.before-restore-$(Get-Date -Format 'yyyyMMddHHmmss')"
            Move-Item $dst $backup -Force
        }
        
        # Make sure destination directory exists
        $dstDir = Split-Path $dst -Parent
        if (-not (Test-Path $dstDir)) {
            New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
        }
        
        Copy-Item -Path $src -Destination $dst -Recurse -Force
        Write-Host "  OK: $source" -ForegroundColor Green
    }
}

# Cleanup
Remove-Item $tempDir -Recurse -Force

# Restart service
Write-Host ""
Write-Host "  Starting service..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName "AD Manager Pro" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   Restore Complete!"                           -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Test at: https://admanager.abasyn.local:8443" -ForegroundColor White
Write-Host ""