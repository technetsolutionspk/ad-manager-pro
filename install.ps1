param(
    [string]$InstallDir = "C:\Program Files\AD Manager Pro",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$Version = "2.2.2"
$AppPort = "8080"

function Write-Step([string]$N, [string]$T) {
    Write-Host "  [$N] " -ForegroundColor Yellow -NoNewline
    Write-Host $T
}

function Write-OK([string]$T) {
    Write-Host "  [OK] " -ForegroundColor Green -NoNewline
    Write-Host $T -ForegroundColor Gray
}

function Write-Fail([string]$T) {
    Write-Host "  [X] " -ForegroundColor Red -NoNewline
    Write-Host $T -ForegroundColor Gray
}

function Write-Info([string]$T) {
    Write-Host "  [i] " -ForegroundColor Blue -NoNewline
    Write-Host $T -ForegroundColor Gray
}

function Read-Input([string]$Prompt, [string]$Default, [switch]$Required, [switch]$Secure) {
    while ($true) {
        $dt = ""
        if ($Default) { $dt = " [$Default]" }
        Write-Host "  ${Prompt}${dt}: " -ForegroundColor Yellow -NoNewline
        if ($Secure) {
            $ss = Read-Host -AsSecureString
            $bp = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
            $val = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bp)
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bp)
        } else {
            $val = Read-Host
        }
        if (-not $val) { $val = "" }
        $val = $val.Trim()
        if ($val -eq "" -and $Default) { return $Default }
        if ($val -eq "" -and $Required) { Write-Fail "Required field"; continue }
        if ($val -eq "") { return $Default }
        return $val
    }
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $pr = New-Object Security.Principal.WindowsPrincipal($id)
    return $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Find-Python {
    $tries = @("python","python3","C:\Python312\python.exe","C:\Python311\python.exe")
    $tries += "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
    $tries += "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
    foreach ($p in $tries) {
        try {
            $o = & $p --version 2>&1
            if ($o -match "Python 3\.") { return $p }
        } catch {}
    }
    return $null
}

function Find-Node {
    try {
        $o = & node --version 2>&1
        if ($o -match "v\d+") { return "node" }
    } catch {}
    if (Test-Path "$env:ProgramFiles\nodejs\node.exe") { return "$env:ProgramFiles\nodejs\node.exe" }
    return $null
}

function Refresh-Path {
    $m = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $u = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:Path = "$m;$u"
}

function Add-FW([string]$Name, [int]$Port) {
    try { & netsh advfirewall firewall delete rule name="$Name" 2>&1 | Out-Null } catch {}
    try { & netsh advfirewall firewall add rule name="$Name" dir=in action=allow protocol=TCP localport=$Port profile=domain,private 2>&1 | Out-Null; return $true } catch {}
    return $false
}

function Remove-FW([string]$Name) {
    try { & netsh advfirewall firewall delete rule name="$Name" 2>&1 | Out-Null } catch {}
}

function Create-Task([string]$Name, [string]$Bat, [string]$Desc) {
    try { & schtasks /delete /tn $Name /f 2>&1 | Out-Null } catch {}
    try { & schtasks /create /tn $Name /tr "`"$Bat`"" /sc onstart /ru SYSTEM /rl highest /f 2>&1 | Out-Null; return $true } catch {}
    return $false
}

function Remove-Task([string]$Name) {
    try { & schtasks /end /tn $Name 2>&1 | Out-Null } catch {}
    try { & schtasks /delete /tn $Name /f 2>&1 | Out-Null } catch {}
}

function Start-Task([string]$Name) {
    try { & schtasks /run /tn $Name 2>&1 | Out-Null } catch {}
}

function Get-IPs {
    $ips = @()
    try {
        $adapters = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()
        foreach ($a in $adapters) {
            if ($a.OperationalStatus -eq "Up" -and $a.NetworkInterfaceType -ne "Loopback") {
                $props = $a.GetIPProperties()
                foreach ($addr in $props.UnicastAddresses) {
                    if ($addr.Address.AddressFamily -eq "InterNetwork" -and $addr.Address.ToString() -ne "127.0.0.1") {
                        $ips += $addr.Address.ToString()
                    }
                }
            }
        }
    } catch {}
    return $ips
}

# UNINSTALL
if ($Uninstall) {
    Clear-Host
    Write-Host ""
    Write-Host "  UNINSTALLING AD Manager Pro" -ForegroundColor Red
    Write-Host "  ============================================" -ForegroundColor DarkGray
    $c = Read-Input -Prompt "Remove all files and services (yes/no)" -Default "no"
    if ($c -ne "yes") { Write-Info "Cancelled"; exit 0 }

    Write-Step "1" "Stopping services..."
    Remove-Task "AD Manager Pro"
    Remove-Task "AD Manager Pro HTTP"
    Write-OK "Services removed"

    Write-Step "2" "Removing firewall rules..."
    Remove-FW "AD Manager Pro"
    Remove-FW "AD Manager Pro HTTPS"
    Remove-FW "AD Manager Pro HTTP"
    Write-OK "Firewall rules removed"

    Write-Step "3" "Stopping Python..."
    try { Get-Process | Where-Object { $_.ProcessName -like "*python*" } | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}
    Start-Sleep -Seconds 2
    Write-OK "Done"

    $kb = Read-Input -Prompt "Keep database/audit logs (yes/no)" -Default "yes"
    Write-Step "4" "Removing files..."
    if (Test-Path $InstallDir) {
        if ($kb -eq "yes") {
            $dbf = Join-Path $InstallDir "backend\database\audit.db"
            $dbk = Join-Path ([System.Environment]::GetFolderPath("Desktop")) "admanagerpro_audit.db.backup"
            if (Test-Path $dbf) { Copy-Item $dbf $dbk -Force; Write-OK "Database backed up to $dbk" }
        }
        Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-OK "Files removed"
    }

    Write-Host ""
    Write-Host "  Uninstall Complete" -ForegroundColor Green
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 0
}

# INSTALL
Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   AD Manager Pro v$Version Installer" -ForegroundColor Cyan
Write-Host "   Enterprise AD Management Platform" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Admin)) {
    Write-Fail "Must run as Administrator"
    Write-Host "  Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-OK "Running as Administrator"

Write-Host ""
Write-Host "  This installer will:" -ForegroundColor White
Write-Host "    1. Install Python 3.12 if needed"
Write-Host "    2. Install Node.js 20 if needed"
Write-Host "    3. Install AD Manager Pro"
Write-Host "    4. Configure AD settings"
Write-Host "    5. Build web frontend"
Write-Host "    6. Create Windows service"
Write-Host "    7. Configure firewall"
Write-Host "    8. Start application"
Write-Host ""
Write-Host "  Runs on HTTP port $AppPort" -ForegroundColor Green
Write-Host ""

$InstallDir = Read-Input -Prompt "Install directory" -Default $InstallDir

# STEP 1: AD Config
Write-Host ""
Write-Host "  -- STEP 1: AD Configuration --" -ForegroundColor Cyan

$adServer = Read-Input -Prompt "Primary DC IP or Hostname" -Required
$adServer2 = Read-Input -Prompt "Secondary DC (Enter to skip)" -Default ""
$adDomain = Read-Input -Prompt "Domain name (e.g. company.local)" -Required

$parts = $adDomain.Split(".")
$dnArr = @()
foreach ($p in $parts) { $dnArr += "DC=$p" }
$autoDn = $dnArr -join ","

$adBaseDn = Read-Input -Prompt "Base DN" -Default $autoDn
$adAccount = Read-Input -Prompt "Service account UPN" -Default "svc-admanager@$adDomain"
$adPassword = Read-Input -Prompt "Service account password" -Required -Secure
$useLdaps = Read-Input -Prompt "Use LDAPS (true/false)" -Default "true"

$adPort = "389"
if ($useLdaps -eq "true") { $adPort = "636" }

# STEP 2: Admin User
Write-Host ""
Write-Host "  -- STEP 2: First Admin User --" -ForegroundColor Cyan
Write-Info "Must have a valid AD account"

$adminUser = Read-Input -Prompt "AD username" -Required
$adminName = Read-Input -Prompt "Display name" -Default $adminUser
$adminEmail = Read-Input -Prompt "Email" -Default "$adminUser@$adDomain"

# Summary
Write-Host ""
Write-Host "  -- Summary --" -ForegroundColor Cyan
Write-Info "Install Dir : $InstallDir"
Write-Info "DC Server   : $adServer"
Write-Info "Domain      : $adDomain"
Write-Info "Base DN     : $adBaseDn"
Write-Info "Account     : $adAccount"
Write-Info "LDAPS       : $useLdaps (port $adPort)"
Write-Info "Admin       : $adminUser"
Write-Info "App Port    : $AppPort (HTTP)"
Write-Host ""

$go = Read-Input -Prompt "Proceed with install (yes/no)" -Default "yes"
if ($go -ne "yes") { Write-Info "Cancelled"; exit 0 }

# STEP 3: Prerequisites
Write-Host ""
Write-Host "  -- STEP 3: Prerequisites --" -ForegroundColor Cyan

Write-Step "3.1" "Checking Python..."
$pythonCmd = Find-Python

if (-not $pythonCmd) {
    Write-Info "Downloading Python 3.12.4..."
    $pyInst = Join-Path $env:TEMP "python-3.12.4-amd64.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile("https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe", $pyInst)
        Write-OK "Downloaded"
    } catch {
        Write-Fail "Download failed: $_"
        Write-Host "  Install Python manually from https://python.org" -ForegroundColor Yellow
        Write-Host "  Check Add Python to PATH" -ForegroundColor Yellow
        Read-Host "  Press Enter after installing"
    }
    if (Test-Path $pyInst) {
        Write-Info "Installing Python (2-3 min)..."
        Start-Process -FilePath $pyInst -ArgumentList "/quiet","InstallAllUsers=1","PrependPath=1","Include_test=0" -Wait -NoNewWindow
        Write-OK "Python installed"
        Refresh-Path
        Start-Sleep -Seconds 2
        Remove-Item $pyInst -Force -ErrorAction SilentlyContinue
    }
    $pythonCmd = Find-Python
    if (-not $pythonCmd) {
        Write-Fail "Python not found. Install manually."
        Read-Host "  Press Enter to exit"
        exit 1
    }
}
$pyV = & $pythonCmd --version 2>&1
Write-OK "Python: $pyV"

Write-Step "3.2" "Checking Node.js..."
$nodeCmd = Find-Node

if (-not $nodeCmd) {
    Write-Info "Downloading Node.js 20 LTS..."
    $ndInst = Join-Path $env:TEMP "node-v20.15.0-x64.msi"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile("https://nodejs.org/dist/v20.15.0/node-v20.15.0-x64.msi", $ndInst)
        Write-OK "Downloaded"
    } catch {
        Write-Fail "Download failed: $_"
        Write-Host "  Install Node.js manually from https://nodejs.org" -ForegroundColor Yellow
        Read-Host "  Press Enter after installing"
    }
    if (Test-Path $ndInst) {
        Write-Info "Installing Node.js (1-2 min)..."
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i","`"$ndInst`"","/quiet","/norestart" -Wait -NoNewWindow
        Write-OK "Node.js installed"
        Refresh-Path
        Start-Sleep -Seconds 2
        Remove-Item $ndInst -Force -ErrorAction SilentlyContinue
    }
    $nodeCmd = Find-Node
    if (-not $nodeCmd) {
        Write-Fail "Node.js not found. Install manually."
        Read-Host "  Press Enter to exit"
        exit 1
    }
}
$ndV = & $nodeCmd --version 2>&1
Write-OK "Node.js: $ndV"

Write-Step "3.3" "Checking npm..."
try { $npmV = & npm --version 2>&1; Write-OK "npm: v$npmV" }
catch { Write-Fail "npm not found"; exit 1 }

# STEP 4: Directories
Write-Host ""
Write-Host "  -- STEP 4: Creating Directories --" -ForegroundColor Cyan

$backendDir = Join-Path $InstallDir "backend"
$frontendDir = Join-Path $InstallDir "frontend"

$dirs = @($InstallDir, $backendDir)
$dirs += Join-Path $backendDir "database"
$dirs += Join-Path $backendDir "logs"
$dirs += Join-Path $backendDir "static"
$dirs += $frontendDir

foreach ($d in $dirs) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}
Write-OK "Directories created"

# STEP 5: Copy Files
Write-Host ""
Write-Host "  -- STEP 5: Copying Files --" -ForegroundColor Cyan

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bSrc = Join-Path $sourceDir "backend"
$fSrc = Join-Path $sourceDir "frontend"

if (-not (Test-Path (Join-Path $bSrc "app.py"))) {
    Write-Fail "Backend source not found at $bSrc"
    Write-Host "  install.ps1 must be in the project root" -ForegroundColor Yellow
    Read-Host "  Press Enter to exit"
    exit 1
}

$skipDirs = @("venv","__pycache__","database","logs","static","certs")
$skipFiles = @(".env")
$items = Get-ChildItem -Path $bSrc
foreach ($item in $items) {
    $skip = $false
    foreach ($s in $skipDirs) { if ($item.Name -eq $s) { $skip = $true } }
    foreach ($s in $skipFiles) { if ($item.Name -eq $s) { $skip = $true } }
    if (-not $skip) { Copy-Item -Path $item.FullName -Destination $backendDir -Recurse -Force }
}
Write-OK "Backend files copied"

if (-not (Test-Path (Join-Path $fSrc "package.json"))) {
    Write-Fail "Frontend source not found at $fSrc"
    Read-Host "  Press Enter to exit"
    exit 1
}

$skipDirs2 = @("node_modules","dist",".vite")
$items2 = Get-ChildItem -Path $fSrc
foreach ($item in $items2) {
    $skip = $false
    foreach ($s in $skipDirs2) { if ($item.Name -eq $s) { $skip = $true } }
    if (-not $skip) { Copy-Item -Path $item.FullName -Destination $frontendDir -Recurse -Force }
}
Write-OK "Frontend files copied"

# STEP 6: Configuration
Write-Host ""
Write-Host "  -- STEP 6: Configuration --" -ForegroundColor Cyan

Write-Step "6.1" "Generating secret key..."
$secretKey = ""
try {
    $secretKey = & $pythonCmd -c "import secrets; print(secrets.token_hex(64))" 2>&1
    if (-not $secretKey) { throw "empty" }
} catch {
    $g1 = [System.Guid]::NewGuid().ToString("N")
    $g2 = [System.Guid]::NewGuid().ToString("N")
    $g3 = [System.Guid]::NewGuid().ToString("N")
    $g4 = [System.Guid]::NewGuid().ToString("N")
    $secretKey = "$g1$g2$g3$g4"
}
Write-OK "Secret key generated"

Write-Step "6.2" "Writing .env..."
$envLines = @()
$envLines += "AD_SERVER_PRIMARY=$adServer"
$envLines += "AD_SERVER_SECONDARY=$adServer2"
$envLines += "AD_DOMAIN=$adDomain"
$envLines += "AD_BASE_DN=$adBaseDn"
$envLines += "AD_TARGET_OU=$adBaseDn"
$envLines += "AD_SERVICE_ACCOUNT=$adAccount"
$envLines += "AD_SERVICE_PASSWORD=$adPassword"
$envLines += "AD_USE_LDAPS=$useLdaps"
$envLines += "AD_PORT=$adPort"
$envLines += "SECRET_KEY=$secretKey"
$envLines += "APP_HOST=0.0.0.0"
$envLines += "APP_PORT=$AppPort"

$envFile = Join-Path $backendDir ".env"
$envLines | Out-File -FilePath $envFile -Encoding ASCII
Write-OK "Configuration saved"

# STEP 7: Python Environment
Write-Host ""
Write-Host "  -- STEP 7: Python Environment --" -ForegroundColor Cyan

$savedLoc = Get-Location
Set-Location $backendDir

Write-Step "7.1" "Creating virtual environment..."
& $pythonCmd -m venv venv 2>&1 | Out-Null
Write-OK "Virtual environment created"

Write-Step "7.2" "Installing packages (2-3 min)..."
$pipExe = Join-Path $backendDir "venv\Scripts\pip.exe"
$pythonExe = Join-Path $backendDir "venv\Scripts\python.exe"
$reqFile = Join-Path $backendDir "requirements.txt"

$ErrorActionPreference = "Continue"
try { & $pipExe install --upgrade pip --quiet 2>&1 | Out-Null } catch {}
try { & $pipExe install -r $reqFile --quiet 2>&1 | Out-Null } catch {}
$ErrorActionPreference = "Stop"
Write-OK "Packages installed"

Set-Location $savedLoc

# STEP 8: Build Frontend
Write-Host ""
Write-Host "  -- STEP 8: Building Frontend --" -ForegroundColor Cyan

$savedLoc = Get-Location
Set-Location $frontendDir

Write-Step "8.1" "Configuring..."
"VITE_API_URL=" | Out-File -FilePath (Join-Path $frontendDir ".env.production") -Encoding ASCII
Write-OK "Configured"

Write-Step "8.2" "Installing npm packages (3-5 min)..."
& npm install --silent 2>&1 | Out-Null
Write-OK "npm packages installed"

Write-Step "8.3" "Building production frontend..."
& npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Write-OK "Frontend built" }
else { Write-Fail "Build failed - app may not have UI" }

Set-Location $savedLoc

$distDir = Join-Path $frontendDir "dist"
$staticDir = Join-Path $backendDir "static"
if (Test-Path $distDir) {
    Copy-Item -Path (Join-Path $distDir "*") -Destination $staticDir -Recurse -Force
    Write-OK "Frontend deployed"
}

# STEP 9: Admin User
Write-Host ""
Write-Host "  -- STEP 9: Creating Admin User --" -ForegroundColor Cyan

$pyScript = "import sys; sys.path.insert(0,r'$backendDir')"
$pyScript += "`nfrom app import AppUser, SessionLocal"
$pyScript += "`ndb = SessionLocal()"
$pyScript += "`nex = db.query(AppUser).filter(AppUser.username=='$adminUser').first()"
$pyScript += "`nif not ex:"
$pyScript += "`n    db.add(AppUser(username='$adminUser',display_name='$adminName',email='$adminEmail',role='Admin',active=True))"
$pyScript += "`n    db.commit(); print('CREATED')"
$pyScript += "`nelse: print('EXISTS')"
$pyScript += "`ndb.close()"

$savedLoc = Get-Location
Set-Location $backendDir
try {
    $r = & $pythonExe -c $pyScript 2>&1
    $rs = [string]$r
    if ($rs -match "CREATED") { Write-OK "Admin user '$adminUser' created" }
    elseif ($rs -match "EXISTS") { Write-OK "Admin user '$adminUser' exists" }
    else { Write-Fail "Could not create admin: $rs" }
} catch { Write-Fail "Admin creation failed: $_" }
Set-Location $savedLoc

# STEP 10: Start Scripts
Write-Host ""
Write-Host "  -- STEP 10: Creating Scripts --" -ForegroundColor Cyan

$prodBat = "@echo off`r`ntitle AD Manager Pro - Production`r`ncd /d `"$backendDir`"`r`n"
$prodBat += "if not exist `"venv\Scripts\python.exe`" (echo ERROR: No venv & exit /b 1)`r`n"
$prodBat += "if not exist `"app.py`" (echo ERROR: No app.py & exit /b 1)`r`n"
$prodBat += "if not exist `".env`" (echo ERROR: No .env & exit /b 1)`r`n"
$prodBat += "venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port $AppPort --workers 4 --log-level info >> logs\service.log 2>&1"

[System.IO.File]::WriteAllText((Join-Path $backendDir "start_production.bat"), $prodBat)

$devBat = "@echo off`r`ntitle AD Manager Pro - Development`r`ncd /d `"$backendDir`"`r`n"
$devBat += "if not exist `"venv\Scripts\activate.bat`" (echo ERROR: No venv & pause & exit /b 1)`r`n"
$devBat += "echo.`r`necho  AD Manager Pro - Development`r`necho  URL: http://localhost:$AppPort`r`necho  Press CTRL+C to stop`r`necho.`r`n"
$devBat += "call venv\Scripts\activate.bat`r`n"
$devBat += "python -m uvicorn app:app --host 0.0.0.0 --port $AppPort --reload --log-level info`r`npause"

[System.IO.File]::WriteAllText((Join-Path $backendDir "start.bat"), $devBat)

Write-OK "Scripts created"

# STEP 11: Windows Service
Write-Host ""
Write-Host "  -- STEP 11: Windows Service --" -ForegroundColor Cyan

Remove-Task "AD Manager Pro"
Remove-Task "AD Manager Pro HTTP"

try { Get-Process | Where-Object { $_.ProcessName -like "*python*" } | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Seconds 2

$batPath = Join-Path $backendDir "start_production.bat"
$ok = Create-Task -Name "AD Manager Pro" -Bat $batPath -Desc "AD Manager Pro HTTP Service (Port $AppPort)"
if ($ok) { Write-OK "Service created (auto-starts on boot)" }
else { Write-Fail "Could not create service. Start manually: $batPath" }

# STEP 12: Firewall
Write-Host ""
Write-Host "  -- STEP 12: Firewall --" -ForegroundColor Cyan

$fwOk = Add-FW -Name "AD Manager Pro" -Port ([int]$AppPort)
if ($fwOk) { Write-OK "Firewall rule: TCP port $AppPort" }
else { Write-Fail "Could not create rule. Allow port $AppPort manually." }

# STEP 13: Start
Write-Host ""
Write-Host "  -- STEP 13: Starting Application --" -ForegroundColor Cyan

Start-Task "AD Manager Pro"
Write-OK "Start command sent"

Write-Info "Waiting for startup..."
$started = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    Write-Host "`r  [i] Waiting $i/30 sec..." -ForegroundColor Blue -NoNewline
    try {
        $wc = New-Object System.Net.WebClient
        $resp = $wc.DownloadString("http://localhost:${AppPort}/api/health")
        if ($resp -match "healthy") { $started = $true; break }
    } catch {}
}
Write-Host ""

if ($started) { Write-OK "Application is running!" }
else { Write-Info "May still be starting. Try http://localhost:${AppPort}" }

# Copy for uninstall
try { Copy-Item $MyInvocation.MyCommand.Path (Join-Path $InstallDir "uninstall.ps1") -Force } catch {}

# DONE
$hn = $env:COMPUTERNAME
$ips = Get-IPs

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "   Installation Complete!" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Access URLs:" -ForegroundColor Cyan
Write-Host "    http://${hn}:$AppPort"
foreach ($ip in $ips) { Write-Host "    http://${ip}:$AppPort" -ForegroundColor Gray }
Write-Host "    http://localhost:$AppPort" -ForegroundColor Gray
Write-Host ""
Write-Host "  Login:" -ForegroundColor Cyan
Write-Host "    Username: $adminUser"
Write-Host "    Password: Your AD password"
Write-Host ""
Write-Host "  Install Path:" -ForegroundColor Cyan
Write-Host "    $InstallDir"
Write-Host ""
Write-Host "  Commands:" -ForegroundColor Cyan
Write-Host "    Start : schtasks /run /tn `"AD Manager Pro`"" -ForegroundColor Gray
Write-Host "    Stop  : schtasks /end /tn `"AD Manager Pro`"" -ForegroundColor Gray
Write-Host "    Logs  : type `"$backendDir\logs\service.log`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  Uninstall:" -ForegroundColor Cyan
Write-Host "    powershell -ExecutionPolicy Bypass -File `"$InstallDir\uninstall.ps1`" -Uninstall" -ForegroundColor Gray
Write-Host ""
Write-Host "  API Docs: http://${hn}:$AppPort/docs" -ForegroundColor Gray
Write-Host ""
Read-Host "  Press Enter to finish"
