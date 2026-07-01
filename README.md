# AD Manager Pro v2.2.2

Enterprise Active Directory management platform built with Python FastAPI and React.

## Features

- Full CRUD for Users, Groups, Computers, and OUs
- Bulk Import, Bulk Update, and Bulk Modify from CSV
- Service Account management with dual AD and database tracking
- Workflow approval system for sensitive operations
- GPO viewing and OU link reporting
- User photo management with automatic crop and resize
- Active session tracking with force logout
- Role-based access control with Admin, Helpdesk, and Viewer roles
- Complete audit logging with CSV export
- Reports and analytics with charts
- User Templates for standardized account creation
- HTTPS on port 8443 and HTTP on port 8080 dual protocol support
- Self-signed SSL certificate generation and distribution
- Built-in object filtering to hide default AD accounts and groups
- Dynamic settings stored in database with encrypted passwords

## Tech Stack

### Backend
- Python 3.11+
- FastAPI with Uvicorn ASGI server
- ldap3 for Active Directory integration
- SQLAlchemy with SQLite (zero configuration database)
- Fernet AES encryption for sensitive settings
- python-jose for JWT authentication
- cryptography for SSL certificate generation

### Frontend
- React 18
- Vite build tool
- Tailwind CSS v3 with dark slate theme
- Recharts for dashboard charts
- Axios HTTP client with JWT interceptors
- React Router DOM v6
- Lucide React icons

## Quick Start

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- Access to Active Directory Domain Controller
- Windows 10/11 or Windows Server 2016+

### Backend Setup

Navigate to backend directory and create virtual environment:

    cd backend
    python -m venv venv
    .\venv\Scripts\activate
    pip install -r requirements.txt

Copy the example environment file and edit with your AD settings:

    copy .env.example .env
    notepad .env

Generate a secret key and paste it into the .env file as SECRET_KEY:

    python -c "import secrets; print(secrets.token_hex(64))"

Generate SSL certificate:

    .\venv\Scripts\python.exe generate_cert.py

Create required directories:

    mkdir database, logs, static

Add first admin user (replace your-username and Your Name):

    .\venv\Scripts\python.exe -c "from app import AppUser, SessionLocal; db = SessionLocal(); db.add(AppUser(username='your-username', display_name='Your Name', email='you@company.local', role='Admin', active=True)); db.commit(); print('OK'); db.close()"

### Frontend Setup

Navigate to frontend directory, install dependencies, build, and deploy:

    cd frontend
    npm install
    npm run build
    Copy-Item -Path "dist\*" -Destination "..\backend\static" -Recurse -Force

### Start Application

    cd backend
    .\start.bat

Open https://localhost:8443 in your browser and accept the certificate warning.

## Production Deployment

Run as Windows Scheduled Task for auto-start on boot:

    schtasks /create /tn "AD Manager Pro" /tr "C:\AD Pro\public\backend\start_production.bat" /sc onstart /ru SYSTEM /rl highest /f
    schtasks /run /tn "AD Manager Pro"

Optional HTTP service on port 8080 for certificate-free access:

    schtasks /create /tn "AD Manager Pro HTTP" /tr "C:\AD Pro\public\backend\start_http.bat" /sc onstart /ru SYSTEM /rl highest /f
    schtasks /run /tn "AD Manager Pro HTTP"

Configure firewall rules:

    netsh advfirewall firewall add rule name="AD Manager Pro HTTPS" dir=in action=allow protocol=TCP localport=8443
    netsh advfirewall firewall add rule name="AD Manager Pro HTTP" dir=in action=allow protocol=TCP localport=8080

## Access URLs

| URL | Description |
|---|---|
| https://servername:8443 | HTTPS main access |
| http://servername:8080 | HTTP certificate-free access |
| https://servername:8443/cert-help | SSL certificate help page |
| https://servername:8443/docs | Swagger API documentation |
| https://servername:8443/redoc | ReDoc API documentation |
| https://servername:8443/api/health | Health check endpoint |

## Default Ports

| Port | Protocol | Purpose |
|---|---|---|
| 8443 | HTTPS | Main encrypted access |
| 8080 | HTTP | Certificate-free access |
| 636 | LDAPS | Active Directory connection |

## Application Pages

| Page | Description | Access |
|---|---|---|
| Dashboard | Charts and statistics overview | All roles |
| Users | User management with bulk operations | All roles |
| Groups | Group management with member control | All roles |
| Computers | Computer account management | All roles |
| OUs | Organizational Unit browsing | All roles |
| Service Accounts | Dual-tracked service account management | All roles |
| User Templates | Standardized user creation templates | All roles |
| GPO | Group Policy Object viewing | All roles |
| User Photos | AD photo management | All roles |
| Workflows | Approval workflow system | All roles |
| Sessions | Active session monitoring | Admin only |
| Audit Logs | Complete action audit trail | All roles |
| Settings | AD connection and app configuration | Admin only |
| App Users | Authorized user management | Admin only |

## Role Permissions

| Feature | Admin | Helpdesk | Viewer |
|---|---|---|---|
| View all data | Yes | Yes | Yes |
| Create users and groups | Yes | Yes | No |
| Edit users and groups | Yes | Yes | No |
| Delete users and groups | Yes | No | No |
| Bulk operations | Yes | Yes | No |
| Manage settings | Yes | No | No |
| Approve workflows | Yes | No | No |
| View sessions | Yes | No | No |
| Manage app users | Yes | No | No |

## Deploy on New Machine from GitHub

Clone the repository:

    git clone https://github.com/yourusername/ad-manager-pro.git "C:\AD Pro\public"
    cd "C:\AD Pro\public"

Setup backend:

    cd backend
    python -m venv venv
    .\venv\Scripts\activate
    pip install -r requirements.txt
    copy .env.example .env
    notepad .env

Setup frontend:

    cd ..\frontend
    npm install
    npm run build
    Copy-Item -Path "dist\*" -Destination "..\backend\static" -Recurse -Force

Generate certificate and start:

    cd ..\backend
    .\venv\Scripts\python.exe generate_cert.py
    .\start.bat

## Service Management

Start HTTPS service:

    Start-ScheduledTask -TaskName "AD Manager Pro"

Stop HTTPS service:

    Stop-ScheduledTask -TaskName "AD Manager Pro"

Check service status:

    Get-ScheduledTask -TaskName "AD Manager Pro"

View live logs:

    Get-Content "C:\AD Pro\public\backend\logs\app.log" -Tail 50 -Wait

Kill orphan processes:

    Get-Process | Where-Object { $_.ProcessName -like "*python*" } | Stop-Process -Force

## Active Directory Permissions Setup

Before using AD Manager Pro, the service account must be granted permissions on your domain.
Run the included permission setup script on your Domain Controller.

### Quick Setup

Copy `setup_permissions.ps1` to your Domain Controller and run as Domain Admin:

    powershell -ExecutionPolicy Bypass -File setup_permissions.ps1

The script will automatically detect your domain, verify the service account exists,
and apply all required permissions.

### What Permissions Are Granted

| Object | Create | Read | Update | Delete |
|---|---|---|---|---|
| Users | Yes | Yes | Yes (all attributes) | Yes |
| Groups | Yes | Yes | Yes (membership) | Yes |
| Computers | Yes | Yes | Yes (enable/disable) | Yes |
| OUs | Yes | Yes | Yes (description) | Yes (empty only) |
| GPOs | No | Yes | No | No |

### Important Note on Passwords

Password reset and change operations require LDAPS (port 636) to be enabled
on the Domain Controller. Without LDAPS, password operations will fail with
WILL_NOT_PERFORM error. Configure AD Manager Pro to use LDAPS in Settings.

## Documentation

See DOCUMENTATION.md for the complete 85-page documentation including full API reference with 80+ endpoints, database schema, AD permissions guide, troubleshooting guide, maintenance schedule, and AI regeneration prompt.

## License

MIT License. See LICENSE file for details.
