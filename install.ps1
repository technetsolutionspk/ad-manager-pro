#Requires -RunAsAdministrator
<#
.SYNOPSIS
    AD Manager Pro v2.2.2 — Complete Installer
.DESCRIPTION
    Installs AD Manager Pro with all prerequisites, configuration,
    Windows services, and firewall rules. HTTP only — no SSL certificates needed.
    Must be run as Administrator.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File install.ps1
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall
#>

param(
    [string]$InstallDir = "C:\Program Files\AD Manager Pro",
    [switch]$Silent,
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$Version = "2.2.2"
$AppPort = "8080"

# ─── Colors and UI ────────────────────────────────────────
function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                  ║" -ForegroundColor Cyan
    Write-Host "  ║        AD Manager Pro v$Version Installer          ║" -ForegroundColor Cyan
    Write-Host "  ║        Enterprise AD Management Platform         ║" -ForegroundColor Cyan
    Write-Host "  ║                                                  ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$StepNum, [string]$Text)
    Write-Host "  [$StepNum] " -ForegroundColor Yellow -NoNewline
    Write-Host $Text -ForegroundColor White
}

function Write-OK {
    param([string]$Text)
    Write-Host "  [OK] " -ForegroundColor Green -NoNewline
    Write-Host $Text -ForegroundColor Gray
}

function Write-Fail {
    param([string]$Text)
    Write-Host "  [X] " -ForegroundColor Red -NoNewline
    Write-Host $Text -ForegroundColor Gray
}

function Write-Info {
    param([string]$Text)
    Write-Host "  [i] " -ForegroundColor Blue -NoNewline
    Write-Host $Text -ForegroundColor Gray
}

function Write-Separator {
    Write-Host "  ──────────────────────────────────────────────────" -ForegroundColor DarkGray
}

function Read-ValidInput {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [switch]$Required,
        [switch]$IsPassword
    )
    while ($true) {
        $defaultText = if ($Default) { " [$Default]" } else { "" }
        Write-Host "  $Prompt$defaultText`: " -ForegroundColor Yellow -NoNewline
        if ($IsPassword) {
            $input = Read-Host -AsSecureString
            $input = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($input)
            )
        } else {
            $input = Read-Host
        }
        if ([string]::IsNullOrWhiteSpace($input) -and $Default) { return $Default }
        if ([string]::IsNullOrWhiteSpace($input) -and $Required) {
            Write-Fail "This field is required"
            continue
        }
        if ([string]::IsNullOrWhiteSpace($input)) { return $Default }
        return $input.Trim()
    }
}

# ─── Uninstall ────────────────────────────────────────────
if ($Uninstall) {
    Write-Banner
    Write-Host "  UNINSTALLING AD Manager Pro" -ForegroundColor Red
    Write-Separator

    $confirm = Read-ValidInput -Prompt "Remove all files, services, and firewall rules? (yes/no)" -Default "no"
    if ($confirm -ne "yes") {
        Write-Info "Uninstall cancelled"
        exit 0
    }

    Write-Step "1" "Stopping scheduled tasks..."
    try { Stop-ScheduledTask -TaskName "AD Manager Pro" -ErrorAction SilentlyContinue } catch {}
    try { Stop-ScheduledTask -TaskName "AD Manager Pro HTTP" -ErrorAction SilentlyContinue } catch {}
    Start-Sleep -Seconds 2

    Write-Step "2" "Removing scheduled tasks..."
    try { Unregister-ScheduledTask -TaskName "AD Manager Pro" -Confirm:$false -ErrorAction SilentlyContinue } catch {}
    try { Unregister-ScheduledTask -TaskName "AD Manager Pro HTTP" -Confirm:$false -ErrorAction SilentlyContinue } catch {}
    Write-OK "Tasks removed"

    Write-Step "3" "Removing firewall rules..."
    try { Remove-NetFirewallRule -DisplayName "AD Manager Pro" -ErrorAction SilentlyContinue } catch {}
    try { Remove-NetFirewallRule -DisplayName "AD Manager Pro HTTPS" -ErrorAction SilentlyContinue } catch {}
    try { Remove-NetFirewallRule -DisplayName "AD Manager Pro HTTP" -ErrorAction SilentlyContinue } catch {}
    Write-OK "Firewall rules removed"

    Write-Step "4" "Killing Python processes..."
    Get-Process | Where-Object { $_.ProcessName -like "*python*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-OK "Processes stopped"

    $keepDb = Read-ValidInput -Prompt "Keep database (audit logs, settings)? (yes/no)" -Default "yes"

    Write-Step "5" "Removing files..."
    if (Test-Path $InstallDir) {
        if ($keepDb -eq "yes") {
            $dbFile = Join-Path $InstallDir "backend\database\audit.db"
            $dbBackup = Join-Path $env:USERPROFILE "Desktop\admanagerpro_audit.db.backup"
            if (Test-Path $dbFile) {
                Copy-Item $dbFile $dbBackup -Force
                Write-OK "Database backed up to $dbBackup"
            }
        }
        Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-OK "Files removed from $InstallDir"
    } else {
        Write-Info "Install directory not found at $InstallDir"
    }

    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║        Uninstall Complete                        ║" -ForegroundColor Green
    Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 0
}

# ─── Installation ─────────────────────────────────────────
Write-Banner

# ── Check Admin ──
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole] "Administrator"
)
if (-not $isAdmin) {
    Write-Fail "This installer must be run as Administrator"
    Write-Host "  Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-OK "Running as Administrator"

# ── Welcome ──
Write-Host ""
Write-Host "  This installer will:" -ForegroundColor White
Write-Host "    1. Install Python 3.12 (if not present)" -ForegroundColor Gray
Write-Host "    2. Install Node.js 20 LTS (if not present)" -ForegroundColor Gray
Write-Host "    3. Install AD Manager Pro application" -ForegroundColor Gray
Write-Host "    4. Configure AD connection settings" -ForegroundColor Gray
Write-Host "    5. Build the web frontend" -ForegroundColor Gray
Write-Host "    6. Create Windows service (auto-start)" -ForegroundColor Gray
Write-Host "    7. Configure firewall rules" -ForegroundColor Gray
Write-Host "    8. Start the application" -ForegroundColor Gray
Write-Host ""
Write-Host "  The application runs on HTTP port $AppPort" -ForegroundColor White
Write-Host "  No SSL certificates needed" -ForegroundColor Green
Write-Host ""
Write-Separator

$installDir = Read-ValidInput -Prompt "Install directory" -Default $InstallDir
$InstallDir = $installDir

# ── AD Configuration ──
Write-Host ""
Write-Host "  ── STEP 1: Active Directory Configuration ──" -ForegroundColor Cyan
Write-Separator

$adServer     = Read-ValidInput -Prompt "Primary DC IP/Hostname" -Required
$adServer2    = Read-ValidInput -Prompt "Secondary DC (optional, Enter to skip)"
$adDomain     = Read-ValidInput -Prompt "Domain name (e.g., company.local)" -Required

# Auto-generate Base DN from domain
$domainParts  = $adDomain.Split('.')
$autoDn       = ($domainParts | ForEach-Object { "DC=$_" }) -join ","
$adBaseDn     = Read-ValidInput -Prompt "Base DN" -Default $autoDn

$adAccount    = Read-ValidInput -Prompt "Service account UPN" -Default "svc-admanager@$adDomain"
$adPassword   = Read-ValidInput -Prompt "Service account password" -Required -IsPassword
$useLdaps     = Read-ValidInput -Prompt "Use LDAPS encrypted? (true/false)" -Default "true"
$adPort       = if ($useLdaps -eq "true") { "636" } else { "389" }

# ── Admin User ──
Write-Host ""
Write-Host "  ── STEP 2: First Admin User ──" -ForegroundColor Cyan
Write-Separator
Write-Info "This user will be the first person who can login to AD Manager Pro"
Write-Info "They must have a valid AD account with a working password"
Write-Host ""

$adminUser    = Read-ValidInput -Prompt "AD username for first admin" -Required
$adminName    = Read-ValidInput -Prompt "Display name" -Default $adminUser
$adminEmail   = Read-ValidInput -Prompt "Email" -Default "$adminUser@$adDomain"

# ── Summary ──
Write-Host ""
Write-Host "  ── Configuration Summary ──" -ForegroundColor Cyan
Write-Separator
Write-Info "Install Dir    : $InstallDir"
Write-Info "DC Server      : $adServer"
Write-Info "Secondary DC   : $(if ($adServer2) { $adServer2 } else { '(none)' })"
Write-Info "Domain         : $adDomain"
Write-Info "Base DN        : $adBaseDn"
Write-Info "Service Account: $adAccount"
Write-Info "Protocol       : $(if ($useLdaps -eq 'true') {'LDAPS (636)'} else {'LDAP (389)'})"
Write-Info "App Port       : $AppPort (HTTP)"
Write-Info "Admin User     : $adminUser ($adminName)"
Write-Host ""

$proceed = Read-ValidInput -Prompt "Proceed with installation? (yes/no)" -Default "yes"
if ($proceed -ne "yes") {
    Write-Info "Installation cancelled"
    exit 0
}

# ══════════════════════════════════════════════════════════
# STEP 3: Prerequisites
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 3: Installing Prerequisites ──" -ForegroundColor Cyan
Write-Separator

# ── Check/Install Python ──
Write-Step "3.1" "Checking Python..."
$pythonCmd = $null
$pythonPaths = @(
    "python",
    "C:\Python312\python.exe",
    "C:\Python311\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
)
foreach ($p in $pythonPaths) {
    try {
        $ver = & $p --version 2>&1
        if ($ver -match "Python 3\.\d+") {
            $pythonCmd = $p
            Write-OK "Python found: $ver"
            break
        }
    } catch {}
}

if (-not $pythonCmd) {
    Write-Info "Python not found. Downloading Python 3.12.4..."
    $pythonInstaller = Join-Path $env:TEMP "python-3.12.4-amd64.exe"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe" `
            -OutFile $pythonInstaller -UseBasicParsing
        Write-OK "Download complete"
    } catch {
        Write-Fail "Download failed: $_"
        Write-Host ""
        Write-Host "  Please install Python manually from https://python.org" -ForegroundColor Yellow
        Write-Host "  IMPORTANT: Check 'Add Python to PATH' during installation" -ForegroundColor Yellow
        Read-Host "  Press Enter after installing Python manually"
    }

    if (Test-Path $pythonInstaller) {
        Write-Info "Installing Python (this takes 2-3 minutes)..."
        Start-Process -FilePath $pythonInstaller -ArgumentList `
            "/quiet", "InstallAllUsers=1", "PrependPath=1", "Include_test=0", "Include_launcher=1" `
            -Wait -NoNewWindow
        Write-OK "Python installed"

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path", "User")
        Remove-Item $pythonInstaller -Force -ErrorAction SilentlyContinue
    }

    # Verify
    try {
        $ver = & python --version 2>&1
        $pythonCmd = "python"
        Write-OK "Python verified: $ver"
    } catch {
        Write-Fail "Python installation failed"
        Write-Host "  Install Python 3.11+ manually from https://python.org" -ForegroundColor Yellow
        Write-Host "  Check 'Add Python to PATH' during installation" -ForegroundColor Yellow
        Read-Host "  Press Enter to exit"
        exit 1
    }
}

# ── Check/Install Node.js ──
Write-Step "3.2" "Checking Node.js..."
$nodeCmd = $null
try {
    $nodeVersion = & node --version 2>&1
    if ($nodeVersion -match "v\d+") {
        $nodeCmd = "node"
        Write-OK "Node.js found: $nodeVersion"
    }
} catch {}

if (-not $nodeCmd) {
    Write-Info "Node.js not found. Downloading Node.js 20 LTS..."
    $nodeInstaller = Join-Path $env:TEMP "node-v20.15.0-x64.msi"

    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.15.0/node-v20.15.0-x64.msi" `
            -OutFile $nodeInstaller -UseBasicParsing
        Write-OK "Download complete"
    } catch {
        Write-Fail "Download failed: $_"
        Write-Host ""
        Write-Host "  Please install Node.js manually from https://nodejs.org" -ForegroundColor Yellow
        Read-Host "  Press Enter after installing Node.js manually"
    }

    if (Test-Path $nodeInstaller) {
        Write-Info "Installing Node.js (this takes 1-2 minutes)..."
        Start-Process -FilePath "msiexec.exe" -ArgumentList `
            "/i", "`"$nodeInstaller`"", "/quiet", "/norestart" `
            -Wait -NoNewWindow
        Write-OK "Node.js installed"

        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path", "User")
        Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
    }

    try {
        $nodeVersion = & node --version 2>&1
        $nodeCmd = "node"
        Write-OK "Node.js verified: $nodeVersion"
    } catch {
        Write-Fail "Node.js installation failed"
        Write-Host "  Install Node.js 18+ LTS manually from https://nodejs.org" -ForegroundColor Yellow
        Read-Host "  Press Enter to exit"
        exit 1
    }
}

# ── Check npm ──
Write-Step "3.3" "Checking npm..."
try {
    $npmVersion = & npm --version 2>&1
    Write-OK "npm found: v$npmVersion"
} catch {
    Write-Fail "npm not found. It should be included with Node.js"
    Read-Host "  Press Enter to exit"
    exit 1
}

# ══════════════════════════════════════════════════════════
# STEP 4: Create Directory Structure
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 4: Creating Application Structure ──" -ForegroundColor Cyan
Write-Separator

$backendDir  = Join-Path $InstallDir "backend"
$frontendDir = Join-Path $InstallDir "frontend"

$dirs = @(
    $InstallDir,
    $backendDir,
    (Join-Path $backendDir "database"),
    (Join-Path $backendDir "logs"),
    (Join-Path $backendDir "static"),
    $frontendDir
)
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}
Write-OK "Directory structure created at $InstallDir"

# ══════════════════════════════════════════════════════════
# STEP 5: Copy Application Files
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 5: Copying Application Files ──" -ForegroundColor Cyan
Write-Separator

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Copy backend files
$backendSource = Join-Path $sourceDir "backend"
if (Test-Path (Join-Path $backendSource "app.py")) {
    # Copy all backend files except generated/runtime directories
    Get-ChildItem -Path $backendSource -Exclude @("venv", "__pycache__", "database", "logs", "static", ".env", "certs") |
        Copy-Item -Destination $backendDir -Recurse -Force
    Write-OK "Backend files copied"
} else {
    Write-Fail "Backend source files not found at $backendSource"
    Write-Host "  Make sure install.ps1 is in the project root directory" -ForegroundColor Yellow
    Write-Host "  Expected structure: project/backend/app.py" -ForegroundColor Yellow
    Read-Host "  Press Enter to exit"
    exit 1
}

# Copy frontend files
$frontendSource = Join-Path $sourceDir "frontend"
if (Test-Path (Join-Path $frontendSource "package.json")) {
    Get-ChildItem -Path $frontendSource -Exclude @("node_modules", "dist", ".vite") |
        Copy-Item -Destination $frontendDir -Recurse -Force
    Write-OK "Frontend files copied"
} else {
    Write-Fail "Frontend source files not found at $frontendSource"
    Read-Host "  Press Enter to exit"
    exit 1
}

# ══════════════════════════════════════════════════════════
# STEP 6: Generate Secret Key and Create .env
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 6: Creating Configuration ──" -ForegroundColor Cyan
Write-Separator

Write-Step "6.1" "Generating secret key..."
try {
    $secretKey = & $pythonCmd -c "import secrets; print(secrets.token_hex(64))" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($secretKey)) {
        throw "Python command failed"
    }
} catch {
    $secretKey = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N") +
                 [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N")
}
Write-OK "Secret key generated"

Write-Step "6.2" "Writing .env configuration..."
$envContent = @"
AD_SERVER_PRIMARY=$adServer
AD_SERVER_SECONDARY=$adServer2
AD_DOMAIN=$adDomain
AD_BASE_DN=$adBaseDn
AD_TARGET_OU=$adBaseDn
AD_SERVICE_ACCOUNT=$adAccount
AD_SERVICE_PASSWORD=$adPassword
AD_USE_LDAPS=$useLdaps
AD_PORT=$adPort
SECRET_KEY=$secretKey
APP_HOST=0.0.0.0
APP_PORT=$AppPort
"@
$envFile = Join-Path $backendDir ".env"
Set-Content -Path $envFile -Value $envContent -Encoding UTF8
Write-OK "Configuration saved"

# ══════════════════════════════════════════════════════════
# STEP 7: Setup Python Virtual Environment
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 7: Setting Up Python Environment ──" -ForegroundColor Cyan
Write-Separator

Write-Step "7.1" "Creating virtual environment..."
Push-Location $backendDir
try {
    & $pythonCmd -m venv venv 2>&1 | Out-Null
    Write-OK "Virtual environment created"
} catch {
    Write-Fail "Failed to create virtual environment: $_"
    Pop-Location
    Read-Host "  Press Enter to exit"
    exit 1
}

Write-Step "7.2" "Installing Python packages (2-3 minutes)..."
$pipExe = Join-Path $backendDir "venv\Scripts\pip.exe"
$pythonExe = Join-Path $backendDir "venv\Scripts\python.exe"
$reqFile = Join-Path $backendDir "requirements.txt"

& $pipExe install --upgrade pip --quiet 2>&1 | Out-Null
& $pipExe install -r $reqFile --quiet 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-OK "Python packages installed"
} else {
    Write-Fail "Some packages may have failed, continuing..."
}
Pop-Location

# ══════════════════════════════════════════════════════════
# STEP 8: Build Frontend
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 8: Building Frontend ──" -ForegroundColor Cyan
Write-Separator

Push-Location $frontendDir

# Create .env.production with empty API URL for relative URLs
Write-Step "8.1" "Configuring frontend..."
Set-Content -Path (Join-Path $frontendDir ".env.production") -Value "VITE_API_URL=" -Encoding UTF8
Write-OK "Frontend configured for relative URLs"

Write-Step "8.2" "Installing npm packages (3-5 minutes)..."
& npm install --silent 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-OK "npm packages installed"
} else {
    Write-Fail "npm install had warnings, attempting build..."
}

Write-Step "8.3" "Building production frontend..."
& npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-OK "Frontend built successfully"
} else {
    Write-Fail "Frontend build failed — check Node.js version"
    Write-Host "  The application will start but may not have a UI" -ForegroundColor Yellow
}
Pop-Location

# Deploy built frontend to backend static folder
$distDir   = Join-Path $frontendDir "dist"
$staticDir = Join-Path $backendDir "static"
if (Test-Path $distDir) {
    Copy-Item -Path "$distDir\*" -Destination $staticDir -Recurse -Force
    Write-OK "Frontend deployed to backend"
} else {
    Write-Fail "No dist folder found — frontend may not have built"
}

# ══════════════════════════════════════════════════════════
# STEP 9: Create First Admin User
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 9: Creating Admin User ──" -ForegroundColor Cyan
Write-Separator

$escapedBackendDir = $backendDir.Replace('\', '\\')
$createUserScript = @"
import sys
sys.path.insert(0, r'$backendDir')
from app import AppUser, SessionLocal
db = SessionLocal()
existing = db.query(AppUser).filter(AppUser.username == '$adminUser').first()
if not existing:
    db.add(AppUser(
        username='$adminUser',
        display_name='$adminName',
        email='$adminEmail',
        role='Admin',
        active=True
    ))
    db.commit()
    print('CREATED')
else:
    print('EXISTS')
db.close()
"@

Push-Location $backendDir
try {
    $result = & $pythonExe -c $createUserScript 2>&1
    if ($result -match "CREATED") {
        Write-OK "Admin user '$adminUser' created"
    } elseif ($result -match "EXISTS") {
        Write-OK "Admin user '$adminUser' already exists"
    } else {
        Write-Fail "Could not create admin user: $result"
        Write-Info "You can add manually later using the app"
    }
} catch {
    Write-Fail "Admin user creation failed: $_"
    Write-Info "You can add manually later"
}
Pop-Location

# ══════════════════════════════════════════════════════════
# STEP 10: Create Start Scripts
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 10: Creating Service Scripts ──" -ForegroundColor Cyan
Write-Separator

# Production start script (HTTP only)
$prodScript = @"
@echo off
REM AD Manager Pro - Production Server (HTTP)
title AD Manager Pro - Production
cd /d "$backendDir"
if not exist "venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found.
    exit /b 1
)
if not exist "app.py" (
    echo ERROR: app.py not found.
    exit /b 1
)
if not exist ".env" (
    echo ERROR: .env file not found.
    exit /b 1
)
venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port $AppPort --workers 4 --log-level info >> logs\service.log 2>&1
"@
Set-Content -Path (Join-Path $backendDir "start_production.bat") -Value $prodScript -Encoding ASCII

# Development start script
$devScript = @"
@echo off
REM AD Manager Pro - Development Server
title AD Manager Pro - Development
cd /d "$backendDir"
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found.
    pause
    exit /b 1
)
if not exist ".env" (
    echo ERROR: .env file not found.
    pause
    exit /b 1
)
if not exist "app.py" (
    echo ERROR: app.py not found.
    pause
    exit /b 1
)
echo.
echo  ==========================================
echo   AD Manager Pro - Starting Development
echo  ==========================================
echo.
echo   URL:      http://localhost:$AppPort
echo   API Docs: http://localhost:$AppPort/docs
echo   Press CTRL+C to stop
echo  ==========================================
echo.
call venv\Scripts\activate.bat
python -m uvicorn app:app --host 0.0.0.0 --port $AppPort --reload --log-level info
pause
"@
Set-Content -Path (Join-Path $backendDir "start.bat") -Value $devScript -Encoding ASCII

Write-OK "Start scripts created"

# ══════════════════════════════════════════════════════════
# STEP 11: Create Windows Scheduled Task
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 11: Creating Windows Service ──" -ForegroundColor Cyan
Write-Separator

# Remove any existing tasks
try { Stop-ScheduledTask -TaskName "AD Manager Pro" -ErrorAction SilentlyContinue } catch {}
try { Unregister-ScheduledTask -TaskName "AD Manager Pro" -Confirm:$false -ErrorAction SilentlyContinue } catch {}
try { Stop-ScheduledTask -TaskName "AD Manager Pro HTTP" -ErrorAction SilentlyContinue } catch {}
try { Unregister-ScheduledTask -TaskName "AD Manager Pro HTTP" -Confirm:$false -ErrorAction SilentlyContinue } catch {}

# Kill any running Python processes from old installations
Get-Process | Where-Object { $_.ProcessName -like "*python*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Create single HTTP service task
$taskAction    = New-ScheduledTaskAction -Execute (Join-Path $backendDir "start_production.bat")
$taskTrigger   = New-ScheduledTaskTrigger -AtStartup
$taskPrincipal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$taskSettings  = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 365)

Register-ScheduledTask `
    -TaskName "AD Manager Pro" `
    -Action $taskAction `
    -Trigger $taskTrigger `
    -Principal $taskPrincipal `
    -Settings $taskSettings `
    -Description "AD Manager Pro HTTP Service (Port $AppPort) - Enterprise AD Management" `
    -Force | Out-Null

Write-OK "Windows service created (auto-starts on boot)"

# ══════════════════════════════════════════════════════════
# STEP 12: Configure Firewall
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 12: Configuring Firewall ──" -ForegroundColor Cyan
Write-Separator

# Remove old rules
try { Remove-NetFirewallRule -DisplayName "AD Manager Pro" -ErrorAction SilentlyContinue } catch {}
try { Remove-NetFirewallRule -DisplayName "AD Manager Pro HTTPS" -ErrorAction SilentlyContinue } catch {}
try { Remove-NetFirewallRule -DisplayName "AD Manager Pro HTTP" -ErrorAction SilentlyContinue } catch {}

# Create single HTTP rule
New-NetFirewallRule `
    -DisplayName "AD Manager Pro" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $AppPort `
    -Action Allow `
    -Profile Domain,Private `
    -Description "AD Manager Pro HTTP access on port $AppPort" | Out-Null

Write-OK "Firewall rule created: TCP port $AppPort (Domain and Private networks)"

# ══════════════════════════════════════════════════════════
# STEP 13: Start the Service
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "  ── STEP 13: Starting AD Manager Pro ──" -ForegroundColor Cyan
Write-Separator

Write-Step "13.1" "Starting service..."
Start-ScheduledTask -TaskName "AD Manager Pro"
Write-OK "Service start command sent"

Write-Step "13.2" "Waiting for application to initialize..."
$maxWait = 30
$started = $false
for ($i = 1; $i -le $maxWait; $i++) {
    Start-Sleep -Seconds 1
    Write-Host "`r  [i] Waiting... ($i/$maxWait seconds)" -ForegroundColor Blue -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$AppPort/api/health" -Method Get -TimeoutSec 3 2>&1
        if ($response.status -eq "healthy") {
            $started = $true
            break
        }
    } catch {}
}
Write-Host ""

if ($started) {
    Write-OK "Application is running and healthy!"
    Write-OK "Domain: $($response.domain)"
    Write-OK "Server: $($response.server)"
} else {
    Write-Info "Application may still be starting..."
    Write-Info "Check logs at: $backendDir\logs\service.log"
    Write-Info "Or try accessing http://localhost:$AppPort in a browser"
}

# ══════════════════════════════════════════════════════════
# STEP 14: Copy Installer for Future Uninstall
# ══════════════════════════════════════════════════════════
try {
    Copy-Item $MyInvocation.MyCommand.Path (Join-Path $InstallDir "uninstall.ps1") -Force -ErrorAction SilentlyContinue
} catch {}

# ══════════════════════════════════════════════════════════
# Installation Complete
# ══════════════════════════════════════════════════════════
$hostname = $env:COMPUTERNAME
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -ne "127.0.0.1" } |
    Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║                                                  ║" -ForegroundColor Green
Write-Host "  ║      Installation Complete!                      ║" -ForegroundColor Green
Write-Host "  ║                                                  ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  ── Access URLs ──" -ForegroundColor Cyan
Write-Host "    http://${hostname}:$AppPort" -ForegroundColor White
foreach ($ip in $ipAddresses) {
    Write-Host "    http://${ip}:$AppPort" -ForegroundColor Gray
}
Write-Host "    http://localhost:$AppPort" -ForegroundColor Gray
Write-Host ""
Write-Host "  ── Login Credentials ──" -ForegroundColor Cyan
Write-Host "    Username : $adminUser" -ForegroundColor White
Write-Host "    Password : Your Active Directory password" -ForegroundColor White
Write-Host ""
Write-Host "  ── Installed To ──" -ForegroundColor Cyan
Write-Host "    $InstallDir" -ForegroundColor White
Write-Host ""
Write-Host "  ── Service Management ──" -ForegroundColor Cyan
Write-Host "    Start   : Start-ScheduledTask -TaskName 'AD Manager Pro'" -ForegroundColor Gray
Write-Host "    Stop    : Stop-ScheduledTask -TaskName 'AD Manager Pro'" -ForegroundColor Gray
Write-Host "    Status  : Get-ScheduledTask -TaskName 'AD Manager Pro'" -ForegroundColor Gray
Write-Host "    Logs    : Get-Content '$backendDir\logs\service.log' -Tail 50" -ForegroundColor Gray
Write-Host "    App Log : Get-Content '$backendDir\logs\app.log' -Tail 50" -ForegroundColor Gray
Write-Host ""
Write-Host "  ── Uninstall ──" -ForegroundColor Cyan
Write-Host "    powershell -ExecutionPolicy Bypass -File '$InstallDir\uninstall.ps1' -Uninstall" -ForegroundColor Gray
Write-Host ""
Write-Host "  ── API Documentation ──" -ForegroundColor Cyan
Write-Host "    Swagger  : http://${hostname}:$AppPort/docs" -ForegroundColor Gray
Write-Host "    ReDoc    : http://${hostname}:$AppPort/redoc" -ForegroundColor Gray
Write-Host ""
Write-Separator
Write-Host ""
Write-Host "  Press Enter to finish..." -ForegroundColor DarkGray
Read-Host