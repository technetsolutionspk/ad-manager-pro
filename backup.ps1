# backup.ps1 - Complete AD Manager Pro backup (Frontend + Backend)
param(
    [string]$BackupDir = "C:\AD Pro\Backups"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $BackupDir $timestamp

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   AD Manager Pro - Full Backup"               -ForegroundColor Cyan
Write-Host "   Backing up Backend + Frontend"               -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# Create backup directory structure
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null
New-Item -ItemType Directory -Force -Path "$backupPath\backend"  | Out-Null
New-Item -ItemType Directory -Force -Path "$backupPath\frontend" | Out-Null

$itemsBackedUp = 0

# ═══════════════════════════════════════════════════════════
# BACKEND BACKUP
# ═══════════════════════════════════════════════════════════
Write-Host "[1/3] BACKING UP BACKEND..." -ForegroundColor Yellow
Write-Host ""

$backendItems = @(
    @{Name = "Database (audit.db)"; Source = "C:\AD Pro\public\backend\database\audit.db"; Dest = "backend\database\audit.db";    Required = $true}
    @{Name = "Settings (.env)";    Source = "C:\AD Pro\public\backend\.env";              Dest = "backend\.env";                  Required = $true}
    @{Name = "SSL Certificates";   Source = "C:\AD Pro\public\backend\certs";             Dest = "backend\certs";                 Required = $true}
    @{Name = "Application Code";   Source = "C:\AD Pro\public\backend\app.py";            Dest = "backend\app.py";                Required = $true}
    @{Name = "Static (built UI)";  Source = "C:\AD Pro\public\backend\static";            Dest = "backend\static";                Required = $false}
    @{Name = "Logs";               Source = "C:\AD Pro\public\backend\logs";              Dest = "backend\logs";                  Required = $false}
)

foreach ($item in $backendItems) {
    if (Test-Path $item.Source) {
        Write-Host "  [+] Backing up: $($item.Name)..." -ForegroundColor White
        $destPath = Join-Path $backupPath $item.Dest
        $destDir  = Split-Path $destPath -Parent
        
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
        }
        
        $isContainer = (Get-Item $item.Source -ErrorAction SilentlyContinue).PSIsContainer
        
        if ($isContainer) {
            Copy-Item -Path $item.Source -Destination $destPath -Recurse -Force
        } else {
            Copy-Item -Path $item.Source -Destination $destPath -Force
        }
        
        Write-Host "      OK: $($item.Name)" -ForegroundColor Green
        $itemsBackedUp++
    } elseif ($item.Required) {
        Write-Host "      WARNING: $($item.Name) not found" -ForegroundColor Yellow
    }
}

# Backup all .py files in backend
Write-Host "  [+] Backing up: Python scripts..." -ForegroundColor White
$pyFiles = Get-ChildItem "C:\AD Pro\public\backend\*.py" -ErrorAction SilentlyContinue
foreach ($file in $pyFiles) {
    Copy-Item -Path $file.FullName -Destination "$backupPath\backend\" -Force
}
Write-Host "      OK: Copied $($pyFiles.Count) .py files" -ForegroundColor Green

# Backup .bat files
Write-Host "  [+] Backing up: BAT files..." -ForegroundColor White
$batFiles = Get-ChildItem "C:\AD Pro\public\backend\*.bat" -ErrorAction SilentlyContinue
foreach ($file in $batFiles) {
    Copy-Item -Path $file.FullName -Destination "$backupPath\backend\" -Force
}
Write-Host "      OK: Copied $($batFiles.Count) .bat files" -ForegroundColor Green

# Backup requirements.txt
if (Test-Path "C:\AD Pro\public\backend\requirements.txt") {
    Copy-Item "C:\AD Pro\public\backend\requirements.txt" -Destination "$backupPath\backend\" -Force
    Write-Host "      OK: requirements.txt" -ForegroundColor Green
}

Write-Host ""

# ═══════════════════════════════════════════════════════════
# FRONTEND BACKUP
# ═══════════════════════════════════════════════════════════
Write-Host "[2/3] BACKING UP FRONTEND..." -ForegroundColor Yellow
Write-Host ""

$frontendPath = "C:\AD Pro\public\frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "  WARNING: Frontend folder not found at $frontendPath" -ForegroundColor Yellow
} else {
    # Define what to backup from frontend
    $frontendItems = @(
        @{Name = "src/ folder (source code)";    Source = "$frontendPath\src";              Dest = "frontend\src";              Required = $true}
        @{Name = "public/ folder";                Source = "$frontendPath\public";           Dest = "frontend\public";           Required = $false}
        @{Name = "package.json";                  Source = "$frontendPath\package.json";     Dest = "frontend\package.json";     Required = $true}
        @{Name = "package-lock.json";             Source = "$frontendPath\package-lock.json"; Dest = "frontend\package-lock.json"; Required = $false}
        @{Name = "vite.config.js";                Source = "$frontendPath\vite.config.js";   Dest = "frontend\vite.config.js";   Required = $true}
        @{Name = "tailwind.config.js";            Source = "$frontendPath\tailwind.config.js"; Dest = "frontend\tailwind.config.js"; Required = $false}
        @{Name = "postcss.config.js";             Source = "$frontendPath\postcss.config.js"; Dest = "frontend\postcss.config.js"; Required = $false}
        @{Name = "index.html";                    Source = "$frontendPath\index.html";       Dest = "frontend\index.html";       Required = $true}
        @{Name = ".env.local";                    Source = "$frontendPath\.env.local";       Dest = "frontend\.env.local";       Required = $false}
        @{Name = ".env.production";               Source = "$frontendPath\.env.production";  Dest = "frontend\.env.production";  Required = $false}
    )
    
    foreach ($item in $frontendItems) {
        if (Test-Path $item.Source) {
            Write-Host "  [+] Backing up: $($item.Name)..." -ForegroundColor White
            $destPath = Join-Path $backupPath $item.Dest
            $destDir  = Split-Path $destPath -Parent
            
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Force -Path $destDir | Out-Null
            }
            
            $isContainer = (Get-Item $item.Source -ErrorAction SilentlyContinue).PSIsContainer
            
            if ($isContainer) {
                # For src/, exclude node_modules and dist
                if ($item.Name -like "*src*") {
                    Copy-Item -Path $item.Source -Destination $destPath -Recurse -Force `
                        -Exclude "node_modules", "dist", ".vite"
                } else {
                    Copy-Item -Path $item.Source -Destination $destPath -Recurse -Force
                }
            } else {
                Copy-Item -Path $item.Source -Destination $destPath -Force
            }
            
            Write-Host "      OK: $($item.Name)" -ForegroundColor Green
            $itemsBackedUp++
        } elseif ($item.Required) {
            Write-Host "      WARNING: $($item.Name) not found" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "  NOTE: node_modules and dist are excluded (regenerable)" -ForegroundColor Gray
}

Write-Host ""

# ═══════════════════════════════════════════════════════════
# SYSTEM CONFIG
# ═══════════════════════════════════════════════════════════
Write-Host "[3/3] BACKING UP SYSTEM CONFIG..." -ForegroundColor Yellow
Write-Host ""

# Export scheduled task
Write-Host "  [+] Scheduled Task Definition..." -ForegroundColor White
try {
    Export-ScheduledTask -TaskName "AD Manager Pro" -ErrorAction Stop |
        Out-File "$backupPath\scheduled-task.xml" -Encoding UTF8
    Write-Host "      OK: scheduled-task.xml" -ForegroundColor Green
} catch {
    Write-Host "      SKIP: No scheduled task found" -ForegroundColor Gray
}

# Save backup info
$info = @{
    BackupDate     = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Computer       = $env:COMPUTERNAME
    User           = $env:USERNAME
    AppVersion     = "v2.2"
    BackupVersion  = "2.0"
    Includes       = @("Backend", "Frontend", "Database", "Settings", "Certs", "Logs")
    Excludes       = @("node_modules", "dist", "venv", "__pycache__")
    ItemCount      = $itemsBackedUp
}
$info | ConvertTo-Json -Depth 5 | Out-File "$backupPath\backup-info.json" -Encoding UTF8

# Create README - using SINGLE quotes (literal string) to avoid escape issues
$readme = @'
# AD Manager Pro - Backup

Created: BACKUP_DATE_PLACEHOLDER
Computer: COMPUTER_PLACEHOLDER

## Contents
- backend/        - All Python backend files, database, certs, .env
- frontend/       - React source code, package.json, configs
- scheduled-task.xml - Windows Task Scheduler definition
- backup-info.json - Backup metadata

## To Restore on New Machine

### 1. Install Prerequisites
- Python 3.11+
- Node.js 18+ LTS
- PowerShell with AD Module (optional, for permission setup)

### 2. Extract this ZIP to:
   C:\AD Pro\public\

### 3. Setup Backend
   cd C:\AD Pro\public\backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt

### 4. Setup Frontend
   cd C:\AD Pro\public\frontend
   npm install
   npm run build
   Copy-Item -Path "dist\*" -Destination "C:\AD Pro\public\backend\static" -Recurse -Force

### 5. Restore Scheduled Task (optional)
   Register-ScheduledTask -Xml (Get-Content "scheduled-task.xml" | Out-String) -TaskName "AD Manager Pro"

### 6. Edit .env with environment-specific values
- AD server IP
- Service account password
- SECRET_KEY (generate new one)

### 7. Start the Service
   Start-ScheduledTask -TaskName "AD Manager Pro"

### 8. Access
   https://localhost:8443
   or
   https://your-server-hostname:8443
'@

# Replace placeholders with actual values
$readme = $readme -replace "BACKUP_DATE_PLACEHOLDER", (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
$readme = $readme -replace "COMPUTER_PLACEHOLDER", $env:COMPUTERNAME

$readme | Out-File "$backupPath\README.md" -Encoding UTF8

Write-Host "  OK: backup-info.json and README.md created" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════
# COMPRESS
# ═══════════════════════════════════════════════════════════
Write-Host "Compressing backup..." -ForegroundColor Yellow
$zipFile = "$backupPath.zip"

if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

Compress-Archive -Path "$backupPath\*" -DestinationPath $zipFile -CompressionLevel Optimal

# Remove uncompressed folder
Remove-Item $backupPath -Recurse -Force

# Get size info
$size      = (Get-Item $zipFile).Length / 1MB
$sizeStr   = "{0:N2} MB" -f $size

# ═══════════════════════════════════════════════════════════
# CLEANUP OLD BACKUPS
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "Cleaning old backups (keeping last 30 days)..." -ForegroundColor Yellow

$oldBackups = Get-ChildItem $BackupDir -Filter "*.zip" -ErrorAction SilentlyContinue | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }

$cleaned = 0
foreach ($old in $oldBackups) {
    Write-Host "  [-] Removing: $($old.Name)" -ForegroundColor Gray
    Remove-Item $old.FullName -Force
    $cleaned++
}

if ($cleaned -gt 0) {
    Write-Host "  OK: Removed $cleaned old backup(s)" -ForegroundColor Green
} else {
    Write-Host "  No old backups to remove" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   Backup Complete!"                            -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  File   : $zipFile"  -ForegroundColor White
Write-Host "  Size   : $sizeStr"  -ForegroundColor Gray
Write-Host "  Items  : $itemsBackedUp" -ForegroundColor Gray
Write-Host ""
Write-Host "  To restore:" -ForegroundColor Cyan
Write-Host "  1. Extract ZIP to C:\AD Pro\public\" -ForegroundColor Gray
Write-Host "  2. Read backup README.md for instructions" -ForegroundColor Gray
Write-Host ""

# Show recent backups
$allBackups = Get-ChildItem $BackupDir -Filter "*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
if ($allBackups) {
    Write-Host "  Recent backups in $BackupDir :" -ForegroundColor Cyan
    foreach ($b in ($allBackups | Select-Object -First 5)) {
        $bSize = "{0:N2} MB" -f ($b.Length / 1MB)
        Write-Host "    - $($b.Name)  ($bSize)" -ForegroundColor Gray
    }
    Write-Host ""
}