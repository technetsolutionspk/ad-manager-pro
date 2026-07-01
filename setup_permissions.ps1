# AD Manager Pro - Service Account Permission Setup
# Run this on the Domain Controller as Domain Admin
# This grants the service account full CRUD permissions on all OUs

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   AD Manager Pro - Permission Setup" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$pr = New-Object Security.Principal.WindowsPrincipal($id)
if (-not $pr.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "  [X] Must run as Administrator / Domain Admin" -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

# Check if dsacls is available
try {
    $dsaclsTest = & dsacls /? 2>&1
    Write-Host "  [OK] dsacls found" -ForegroundColor Green
} catch {
    Write-Host "  [X] dsacls not found. Install RSAT:" -ForegroundColor Red
    Write-Host "      Add-WindowsCapability -Online -Name Rsat.ActiveDirectory.DS-LDS.Tools~~~~0.0.1.0" -ForegroundColor Yellow
    Read-Host "  Press Enter to exit"
    exit 1
}

# Get domain info
try {
    $domain = [System.DirectoryServices.ActiveDirectory.Domain]::GetCurrentDomain()
    $domainDN = ($domain.Name.Split(".") | ForEach-Object { "DC=$_" }) -join ","
    $domainName = $domain.Name
    $netbios = $domain.Name.Split(".")[0].ToUpper()
    Write-Host "  [OK] Domain: $domainName" -ForegroundColor Green
    Write-Host "  [OK] Base DN: $domainDN" -ForegroundColor Green
} catch {
    Write-Host "  [X] Cannot detect domain. Are you on a Domain Controller?" -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

# Ask for service account name
Write-Host ""
Write-Host "  Enter the service account name used by AD Manager Pro" -ForegroundColor White
Write-Host "  Example: svc-admanager" -ForegroundColor Gray
Write-Host ""
Write-Host "  Service account name: " -ForegroundColor Yellow -NoNewline
$svcAccount = Read-Host
if (-not $svcAccount) { $svcAccount = "svc-admanager" }
$svcAccount = $svcAccount.Trim()
$fullAccount = "$netbios\$svcAccount"

# Verify account exists
try {
    $searcher = New-Object System.DirectoryServices.DirectorySearcher
    $searcher.Filter = "(&(objectClass=user)(sAMAccountName=$svcAccount))"
    $result = $searcher.FindOne()
    if ($result) {
        Write-Host "  [OK] Account found: $($result.Properties['distinguishedname'][0])" -ForegroundColor Green
    } else {
        Write-Host "  [X] Account '$svcAccount' not found in AD" -ForegroundColor Red
        Write-Host "  Create it first or check the spelling" -ForegroundColor Yellow
        Read-Host "  Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "  [i] Could not verify account, continuing anyway..." -ForegroundColor Blue
}

# Summary
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "  Permission Summary" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Account : $fullAccount" -ForegroundColor White
Write-Host "  Domain  : $domainName" -ForegroundColor White
Write-Host "  Base DN : $domainDN" -ForegroundColor White
Write-Host ""
Write-Host "  Permissions to be granted:" -ForegroundColor White
Write-Host "    - Read all objects (Generic Read)" -ForegroundColor Gray
Write-Host "    - Create/Delete users, groups, computers, OUs" -ForegroundColor Gray
Write-Host "    - Write all user properties" -ForegroundColor Gray
Write-Host "    - Reset passwords (unicodePwd + pwdLastSet)" -ForegroundColor Gray
Write-Host "    - Enable/Disable accounts (userAccountControl)" -ForegroundColor Gray
Write-Host "    - Unlock accounts (lockoutTime)" -ForegroundColor Gray
Write-Host "    - Manage group membership (member)" -ForegroundColor Gray
Write-Host "    - Manage user photos (thumbnailPhoto)" -ForegroundColor Gray
Write-Host "    - Manage computer accounts" -ForegroundColor Gray
Write-Host "    - Read GPO objects and links" -ForegroundColor Gray
Write-Host ""

Write-Host "  Apply these permissions? (yes/no) [yes]: " -ForegroundColor Yellow -NoNewline
$confirm = Read-Host
if (-not $confirm) { $confirm = "yes" }
if ($confirm -ne "yes") { Write-Host "  Cancelled" -ForegroundColor Yellow; exit 0 }

Write-Host ""
$success = 0
$failed = 0

function Run-Dsacls([string]$Target, [string]$Params, [string]$Desc) {
    Write-Host "  Setting: $Desc..." -ForegroundColor Gray -NoNewline
    try {
        $cmd = "dsacls `"$Target`" $Params"
        $output = & cmd /c $cmd 2>&1
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0 -or $output -match "successfully") {
            Write-Host " OK" -ForegroundColor Green
            $script:success++
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            $script:failed++
        }
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
        $script:failed++
    }
}

# ================================================================
# DOMAIN ROOT PERMISSIONS
# ================================================================
Write-Host ""
Write-Host "  -- Domain Root Permissions --" -ForegroundColor Cyan

# Generic Read on entire domain
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:GR`"" "Generic Read (entire domain)"

# Read gPLink attribute for GPO link detection
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:RP;gPLink;`"" "Read GPO Links"

# ================================================================
# USER PERMISSIONS (inherited to all sub-OUs)
# ================================================================
Write-Host ""
Write-Host "  -- User Permissions --" -ForegroundColor Cyan

# Create and Delete user objects
Run-Dsacls $domainDN "/I:T /G `"${fullAccount}:CC;user;`"" "Create User objects"
Run-Dsacls $domainDN "/I:T /G `"${fullAccount}:DC;user;`"" "Delete Child users"
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:SD;;user`"" "Standard Delete users"

# Write all user properties
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:WP;;user`"" "Write all user properties"

# Password operations
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:CA;Reset Password;user`"" "Reset Password (extended right)"
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:WP;pwdLastSet;user`"" "Write pwdLastSet"
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:WP;unicodePwd;user`"" "Write unicodePwd"

# Account control
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:WP;userAccountControl;user`"" "Write userAccountControl"
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:WP;lockoutTime;user`"" "Write lockoutTime (unlock)"

# User photos
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:WP;thumbnailPhoto;user`"" "Write thumbnailPhoto"

# ================================================================
# GROUP PERMISSIONS
# ================================================================
Write-Host ""
Write-Host "  -- Group Permissions --" -ForegroundColor Cyan

# Create and Delete group objects
Run-Dsacls $domainDN "/I:T /G `"${fullAccount}:CC;group;`"" "Create Group objects"
Run-Dsacls $domainDN "/I:T /G `"${fullAccount}:DC;group;`"" "Delete Child groups"
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:SD;;group`"" "Standard Delete groups"

# Group membership management
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:WP;member;group`"" "Write member attribute"

# ================================================================
# COMPUTER PERMISSIONS
# ================================================================
Write-Host ""
Write-Host "  -- Computer Permissions --" -ForegroundColor Cyan

# Create and Delete computer objects
Run-Dsacls $domainDN "/I:T /G `"${fullAccount}:CC;computer;`"" "Create Computer objects"
Run-Dsacls $domainDN "/I:T /G `"${fullAccount}:DC;computer;`"" "Delete Child computers"
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:SD;;computer`"" "Standard Delete computers"

# Computer account control (enable/disable)
Run-Dsacls $domainDN "/I:S /G `"${fullAccount}:WP;userAccountControl;computer`"" "Write computer UAC"

# ================================================================
# OU PERMISSIONS
# ================================================================
Write-Host ""
Write-Host "  -- OU Permissions --" -ForegroundColor Cyan

# Create and Delete OU objects
Run-Dsacls $domainDN "/I:T /G `"${fullAccount}:CC;organizationalUnit;`"" "Create OU objects"
Run-Dsacls $domainDN "/I:T /G `"${fullAccount}:DC;organizationalUnit;`"" "Delete Child OUs"

# ================================================================
# GPO READ PERMISSIONS
# ================================================================
Write-Host ""
Write-Host "  -- GPO Permissions --" -ForegroundColor Cyan

# Read System container
Run-Dsacls "CN=System,$domainDN" "/I:T /G `"${fullAccount}:GR`"" "Read CN=System"

# Read Policies container
Run-Dsacls "CN=Policies,CN=System,$domainDN" "/I:T /G `"${fullAccount}:GR`"" "Read CN=Policies"

# ================================================================
# BUILTIN CONTAINERS (CN=Users, CN=Computers, CN=Builtin)
# ================================================================
Write-Host ""
Write-Host "  -- Built-in Container Permissions --" -ForegroundColor Cyan

# CN=Users container
Run-Dsacls "CN=Users,$domainDN" "/I:S /G `"${fullAccount}:GR`"" "Read CN=Users"
Run-Dsacls "CN=Users,$domainDN" "/I:T /G `"${fullAccount}:CC;user;`"" "Create users in CN=Users"
Run-Dsacls "CN=Users,$domainDN" "/I:T /G `"${fullAccount}:DC;user;`"" "Delete users in CN=Users"
Run-Dsacls "CN=Users,$domainDN" "/I:T /G `"${fullAccount}:CC;group;`"" "Create groups in CN=Users"
Run-Dsacls "CN=Users,$domainDN" "/I:T /G `"${fullAccount}:DC;group;`"" "Delete groups in CN=Users"

# CN=Computers container
Run-Dsacls "CN=Computers,$domainDN" "/I:S /G `"${fullAccount}:GR`"" "Read CN=Computers"
Run-Dsacls "CN=Computers,$domainDN" "/I:T /G `"${fullAccount}:CC;computer;`"" "Create computers in CN=Computers"
Run-Dsacls "CN=Computers,$domainDN" "/I:T /G `"${fullAccount}:DC;computer;`"" "Delete computers in CN=Computers"

# ================================================================
# RESULTS
# ================================================================
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "  Results" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Successful : $success" -ForegroundColor Green
Write-Host "  Failed     : $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host "   All Permissions Applied Successfully!" -ForegroundColor Green
    Write-Host "  ============================================" -ForegroundColor Green
} else {
    Write-Host "  ============================================" -ForegroundColor Yellow
    Write-Host "   Some Permissions Failed" -ForegroundColor Yellow
    Write-Host "  ============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Common causes:" -ForegroundColor White
    Write-Host "    - Not running as Domain Admin" -ForegroundColor Gray
    Write-Host "    - Service account name spelled wrong" -ForegroundColor Gray
    Write-Host "    - RSAT tools not installed" -ForegroundColor Gray
    Write-Host "    - Protected OUs with inheritance blocked" -ForegroundColor Gray
}

Write-Host ""
Write-Host "  The service account can now:" -ForegroundColor Cyan
Write-Host "    - Create, read, update, delete Users" -ForegroundColor Gray
Write-Host "    - Create, read, update, delete Groups" -ForegroundColor Gray
Write-Host "    - Create, read, update, delete Computers" -ForegroundColor Gray
Write-Host "    - Create, read, delete OUs" -ForegroundColor Gray
Write-Host "    - Reset passwords and unlock accounts" -ForegroundColor Gray
Write-Host "    - Enable/disable accounts" -ForegroundColor Gray
Write-Host "    - Manage group memberships" -ForegroundColor Gray
Write-Host "    - Upload/delete user photos" -ForegroundColor Gray
Write-Host "    - View GPOs and GPO links" -ForegroundColor Gray
Write-Host ""
Write-Host "  IMPORTANT: Password operations (reset/change)" -ForegroundColor Yellow
Write-Host "  require LDAPS (port 636) to be enabled on the DC." -ForegroundColor Yellow
Write-Host ""

Read-Host "  Press Enter to exit"
