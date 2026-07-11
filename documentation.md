# AD Manager Pro — Complete Documentation v2.4.0

## Enterprise Active Directory Management Platform
## Complete Setup Guide | API Reference | Architecture | Features | Troubleshooting

---

# TABLE OF CONTENTS

1. Project Overview
2. Architecture
3. Technology Stack
4. Folder Structure
5. Database Schema
6. Complete Features List
7. Complete API Reference
8. Frontend Pages Reference
9. Role-Based Access Control
10. Active Directory Permissions
11. Windows LAPS Integration
12. Complete Setup Guide
13. Production Deployment Guide
14. Installer Script Guide
15. Backup and Restore
16. Troubleshooting Guide
17. Maintenance Schedule
18. GitHub Deployment
19. Changelog

---

# 1. PROJECT OVERVIEW

AD Manager Pro is a web-based Active Directory management platform built with Python FastAPI backend and React Vite Tailwind CSS frontend. It provides a modern dark-themed UI for managing AD users, groups, computers, OUs, GPOs, service accounts, user photos, workflow approvals, Windows LAPS passwords, and more with role-based access control and comprehensive audit logging.

The application connects to Active Directory via the LDAP3 library, authenticates users against AD, and provides a web interface for common AD administration tasks. All operations are logged to a SQLite database. Settings are stored in the database with Fernet AES encryption for sensitive values like passwords.

The backend code is split into three Python files for maintainability: models.py for database models and configuration, ad_service.py for all LDAP operations and Windows LAPS integration, and app.py for API routes and FastAPI setup.

The built React frontend is served as static files from the backend enabling single-port deployment without a separate web server. The application runs on HTTP port 8080 without SSL certificates, making it accessible from any browser on any device without certificate installation.

## Key Highlights

Full CRUD operations for Users, Groups, Computers, and OUs with bulk operations including multi-select, bulk import from CSV, bulk update from CSV, bulk modify, bulk move, and bulk enable/disable/unlock/delete/reset-password.

Windows LAPS integration allows Admins to view local admin passwords managed by Windows LAPS with mandatory reason logging, auto-hide password after 30 seconds, password history (last 5 passwords), and force rotation capability. Supports encrypted LAPS passwords via PowerShell subprocess.

Home folder network path and drive letter support when creating and editing users. The path supports %username% placeholder which is automatically replaced with the actual username.

Service Accounts that create in BOTH Active Directory AND the application database simultaneously as an atomic operation with automatic rollback if the database save fails after AD creation.

Accurate lockout detection that reads the domain lockoutDuration policy from AD, caches it for one hour, and compares with each user's lockoutTime attribute to determine if they are actually still locked or were auto-unlocked by the policy.

Hide and show built-in AD objects via settings toggles controlling visibility of built-in users like Administrator and Guest, built-in groups like Domain Admins and Domain Users, and built-in containers like CN=Users and CN=Builtin.

ManageEngine ADManager Plus style dashboard with Recharts library providing vertical bar charts, horizontal bar charts, and pie charts for department and OS distribution plus domain login activity cards.

User templates for standardized account creation where templates define OU, department, title, company, groups, and password policy.

Approval workflow system supporting six request types: create user, modify user, delete user, reset password, enable user, and disable user.

GPO viewing and link reporting showing all Group Policy Objects with status, version, SYSVOL path, and which OUs have which GPOs linked.

User photo management with automatic client-side processing using HTML Canvas to center-crop to square, resize to 200x200 pixels, and compress as JPEG to fit the AD thumbnailPhoto 100KB limit.

Active session tracking showing which users are currently logged into the AD Manager Pro web interface with active/idle status, device detection, IP address tracking, and force-logout capability.

Domain login activity showing counts of users who logged into the Windows domain in the last 15 minutes, 1 hour, 24 hours, 7 days, and 30 days based on AD lastLogonTimestamp attribute.

Dynamic settings stored in the database with Fernet-encrypted passwords that persist across restarts and auto-reload on save without requiring restart.

Role-based access control with three roles: Admin with full access, Helpdesk with user and group management, and Viewer with read-only access.

Sortable table columns for User, Email, Department, and Status with ascending/descending toggle and visual sort indicators.

Password management with show/hide toggle, generate strong random password button, force change at next logon option, and unlock account option during password reset.

Complete audit trail with every action logged including operator username, role, action performed, object type, object name, details, success or failure status, client IP address, and timestamp with CSV export. LAPS password views additionally log the mandatory reason field.

JWT authentication against Active Directory where users authenticate with their AD credentials via LDAP bind and receive a JWT token valid for 8 hours.

Automated PowerShell installer that installs Python, Node.js, configures everything, creates Windows scheduled tasks, and sets up firewall rules.

Automated uninstaller that cleanly removes all files, scheduled tasks, and firewall rules with optional database backup.

DC permission setup script that grants the service account all required LDAP permissions on the domain.

---

# 2. ARCHITECTURE

## System Design

The browser loads a React Single Page Application served from the FastAPI backend. All page routing is handled client-side by React Router. The frontend communicates with the backend exclusively through REST API calls using Axios with JWT Bearer token authentication on every request except the login endpoint and health check.

The FastAPI backend consists of three Python files. models.py contains all database models, configuration, encryption, authentication helpers, and utility functions. ad_service.py contains the ADService class with all LDAP operations plus Windows LAPS integration via PowerShell subprocess. app.py contains all API route handlers and the FastAPI application setup. The backend connects to Active Directory via the ldap3 Python library using either LDAP on port 389 or LDAPS on port 636.

Application data is stored in a local SQLite database file (audit.db) using SQLAlchemy ORM. The database contains seven tables for audit logs, authorized app users, dynamic settings, user templates, workflow requests, active sessions, and service account metadata.

## Connection Flow

1. Browser sends HTTP request to FastAPI backend on port 8080
2. For login: FastAPI checks app_users table for authorization, then authenticates against AD via LDAP bind
3. On success: JWT token returned to browser, stored in localStorage
4. For API calls: JWT token sent in Authorization header, FastAPI validates and extracts username
5. For AD operations: FastAPI connects to Domain Controller via LDAP using service account credentials
6. For LAPS operations: FastAPI invokes PowerShell subprocess as the SYSTEM account (which authenticates as the server's computer account)
7. Results returned to browser as JSON
8. Frontend renders the data in React components

## Key Design Decisions

Three-file backend approach chosen for maintainability. models.py handles data layer, ad_service.py handles AD operations and LAPS, app.py handles HTTP routes. Each file can be edited independently without risk of breaking the others.

SQLite chosen for zero-configuration deployment. No need to install, configure, or maintain a separate database server.

JWT tokens expire after 8 hours matching a typical work day. This balances security with usability.

Active sessions tracked via SHA-256 hash of the JWT token stored in the active_sessions table. The hash is updated with the current timestamp on every authenticated API request.

Settings stored in the database rather than just the .env file. This allows runtime changes through the Settings UI without requiring application restart.

Service account password read fresh from the database on every LDAP connection call. This ensures that when the service account password is changed via the Settings UI, the change takes effect immediately without restarting.

Windows LAPS integration uses PowerShell subprocess because the ldap3 Python library cannot decrypt Windows LAPS encrypted passwords. This requires Windows-only APIs. The backend service (running as SYSTEM = server computer account) must be added to a group authorized to decrypt LAPS passwords via the LAPS GPO.

Frontend uses empty API_URL configuration. When VITE_API_URL is set to an empty string, all API requests use relative URLs. This means the browser sends requests to the same hostname and port that the page was loaded from.

Two-step user creation process avoids LDAP errors. Instead of including all attributes including userAccountControl in the initial LDAP add operation, the application first creates the user with minimal attributes, then sets the password, then enables the account.

Empty attribute prevention using clean_value helper. Active Directory rejects LDAP add operations that include attributes with empty string values. The clean_value function returns None for empty or whitespace-only strings.

HTTP-only deployment eliminates SSL certificate management. No certificates to generate, install, or distribute across client machines.

---

# 3. TECHNOLOGY STACK

## Backend Technologies

Python 3.11 or higher is required.

FastAPI is the web framework providing automatic OpenAPI documentation at /docs and /redoc.

Uvicorn is the ASGI server. In production it runs with --workers 4.

ldap3 is the pure Python LDAP library used for all Active Directory operations.

SQLAlchemy is the ORM used with SQLite for the local database.

python-jose with cryptography backend provides JWT token creation and validation using HS256 algorithm.

passlib with bcrypt provides password hashing capabilities.

cryptography library provides Fernet symmetric encryption for sensitive settings.

python-dotenv loads environment variables from the .env file.

python-multipart is required by FastAPI for handling form data and file uploads.

subprocess (Python built-in) is used to invoke PowerShell for Windows LAPS decryption.

Windows PowerShell 5.1 or higher (built into Windows) with the LAPS module. Required on the AD Manager Pro server for LAPS password retrieval.

## Frontend Technologies

React 18 provides the component-based UI framework.

Vite is the build tool providing fast development server and optimized production builds.

Tailwind CSS version 3 provides utility-first CSS styling with a dark theme based on the slate color palette.

Axios is the HTTP client for all API communication with JWT interceptors.

React Router DOM version 6 provides client-side routing with route guards.

Lucide React provides the icon library.

Recharts provides the charting library for dashboard charts.

## Infrastructure

Windows 10/11 or Windows Server 2016+ is required.

Windows Task Scheduler is used to run the application as a service.

SQLite provides the database as a single file.

For LAPS features: Windows Server 2019+ or Windows 10 21H2+ with Windows LAPS installed on the domain and RSAT LAPS module on the AD Manager Pro server.

## Python Package List (requirements.txt)

fastapi
uvicorn[standard]
python-jose[cryptography]
passlib[bcrypt]
python-multipart
sqlalchemy
ldap3
python-dotenv
cryptography

## NPM Package List

react-router-dom
axios
lucide-react
recharts
tailwindcss version 3
postcss
autoprefixer
esbuild

---

# 4. FOLDER STRUCTURE

ad-manager-pro/
    backend/
        app.py                    - FastAPI routes and application setup (approximately 900 lines)
        models.py                 - Config, database models, auth, encryption (400 lines)
        ad_service.py             - ADService class, all LDAP operations, LAPS integration (750 lines)
        requirements.txt          - Python package dependencies
        generate_cert.py          - SSL certificate generator (optional)
        .env                      - Environment configuration (not in git)
        .env.example              - Template for .env file
        start.bat                 - Development start script
        start_production.bat      - Production start script
        service.cmd               - Windows scheduled task wrapper
        venv/                     - Python virtual environment (not in git)
        database/
            audit.db              - SQLite database (not in git)
        logs/
            app.log               - Application log
            service.log           - Service output log
        static/                   - Built React frontend (not in git)
            index.html
            assets/
                index-xxxxx.js
                index-xxxxx.css
    frontend/
        package.json              - NPM dependencies
        package-lock.json
        vite.config.js            - Vite build configuration
        tailwind.config.js        - Tailwind CSS configuration
        postcss.config.js         - PostCSS configuration
        index.html                - HTML template
        .env.production           - Frontend env (VITE_API_URL=)
        src/
            main.jsx              - React entry point
            App.jsx               - React Router setup
            api.js                - Axios API client and all API functions
            index.css             - Tailwind directives and dark theme CSS
            components/
                Layout.jsx        - Sidebar and navigation layout
            pages/
                Login.jsx
                Dashboard.jsx
                Users.jsx
                Groups.jsx
                Computers.jsx     - Includes LapsPasswordModal component
                OUs.jsx
                ServiceAccounts.jsx
                GPO.jsx
                Photos.jsx
                Templates.jsx
                Workflows.jsx
                Sessions.jsx
                Reports.jsx
                AuditLogs.jsx
                Settings.jsx
        public/
            favicon.svg
    install.ps1                   - Automated installer script
    uninstall.ps1                 - Automated uninstaller script
    setup_permissions.ps1         - DC permission setup script
    slides.html                   - Feature presentation slideshow
    README.md                     - Project readme
    LICENSE                       - MIT License
    .gitignore                    - Git ignore rules

## Files Excluded from Git

backend/.env                      - Contains real passwords
backend/venv/                     - Python virtual environment
backend/database/                 - SQLite database
backend/logs/                     - Application logs
backend/static/                   - Built frontend (regenerable)
backend/certs/                    - SSL certificates (if used)
backend/__pycache__/              - Python cache
frontend/node_modules/            - NPM packages
frontend/dist/                    - Built frontend
frontend/.vite/                   - Vite cache

---

# 5. DATABASE SCHEMA

Seven SQLite tables stored in backend/database/audit.db. Tables are automatically created on first application startup using SQLAlchemy Base.metadata.create_all.

## Table: audit_logs

Purpose: Stores every action performed in the application for compliance and troubleshooting including LAPS password views.

Columns:
- id: INTEGER PRIMARY KEY auto-increment
- timestamp: DATETIME defaulting to current UTC time
- operator: VARCHAR(100) storing the username who performed the action
- operator_role: VARCHAR(20) storing Admin, Helpdesk, or Viewer
- action: VARCHAR(100) describing what was done (includes LAPS Password Viewed, LAPS History Viewed, LAPS Password Rotation Requested)
- object_type: VARCHAR(50) for the category such as User, Group, Computer, OU
- object_name: VARCHAR(200) for the specific object affected
- details: TEXT for additional information (for LAPS includes the reason provided)
- status: VARCHAR(20) storing either Success or Failed
- ip_address: VARCHAR(50) for the client IP address

## Table: app_users

Purpose: Stores which AD users are authorized to log into AD Manager Pro.

Columns:
- id: INTEGER PRIMARY KEY
- username: VARCHAR(100) UNIQUE INDEXED matching the AD sAMAccountName
- display_name: VARCHAR(200)
- email: VARCHAR(200)
- role: VARCHAR(20) defaulting to Viewer with values Admin, Helpdesk, or Viewer
- active: BOOLEAN defaulting to TRUE
- last_login: DATETIME updated on each successful login

## Table: app_settings

Purpose: Stores dynamic application settings as key-value pairs with optional encryption.

Columns:
- id: INTEGER PRIMARY KEY
- key: VARCHAR(100) UNIQUE INDEXED
- value: TEXT which may be Fernet AES encrypted for sensitive values
- category: VARCHAR(50) with values ad, password, notification, or general
- updated_at: DATETIME auto-updated on modification
- updated_by: VARCHAR(100)

Encrypted keys: ad_service_password and notify_smtp_password are encrypted using Fernet derived from the SECRET_KEY.

## Table: user_templates

Purpose: Stores templates for standardized user creation.

Columns:
- id: INTEGER PRIMARY KEY
- name: VARCHAR(100) UNIQUE INDEXED
- description: TEXT
- ou: VARCHAR(500) for the target OU DN
- department: VARCHAR(200)
- title: VARCHAR(200)
- company: VARCHAR(200)
- office: VARCHAR(200)
- phone: VARCHAR(50)
- manager: VARCHAR(500)
- groups: TEXT storing a JSON array of group Distinguished Names
- password_never_expires: BOOLEAN defaulting to FALSE
- must_change_password: BOOLEAN defaulting to TRUE
- enabled: BOOLEAN defaulting to TRUE
- created_at: DATETIME
- created_by: VARCHAR(100)

## Table: workflow_requests

Purpose: Stores approval workflow requests for sensitive AD operations.

Columns:
- id: INTEGER PRIMARY KEY
- request_type: VARCHAR(50) with values create-user, modify-user, delete-user, reset-password, disable-user, enable-user
- requested_by: VARCHAR(100)
- target_object: VARCHAR(200)
- payload: TEXT storing a JSON object of the requested changes
- status: VARCHAR(20) defaulting to pending with values pending, approved, completed, rejected
- reason: TEXT
- rejection_reason: TEXT
- approved_by: VARCHAR(100)
- approved_at: DATETIME
- completed_at: DATETIME
- created_at: DATETIME

## Table: active_sessions

Purpose: Tracks currently logged-in browser sessions.

Columns:
- id: INTEGER PRIMARY KEY
- username: VARCHAR(100) INDEXED
- display_name: VARCHAR(200)
- role: VARCHAR(20)
- ip_address: VARCHAR(50)
- user_agent: VARCHAR(500)
- login_time: DATETIME
- last_activity: DATETIME updated on every authenticated API request
- token_hash: VARCHAR(100) INDEXED storing SHA-256 hash of the JWT token

## Table: service_accounts

Purpose: Tracks service accounts managed in both AD and the application.

Columns:
- id: INTEGER PRIMARY KEY
- username: VARCHAR(100) UNIQUE INDEXED
- display_name: VARCHAR(200)
- email: VARCHAR(200)
- description: TEXT
- purpose: TEXT
- owner: VARCHAR(100)
- department: VARCHAR(100)
- ad_dn: VARCHAR(500)
- ou: VARCHAR(500)
- password_never_expires: BOOLEAN defaulting to TRUE
- cannot_change_password: BOOLEAN defaulting to TRUE
- is_system_critical: BOOLEAN defaulting to FALSE
- has_app_access: BOOLEAN defaulting to FALSE
- app_role: VARCHAR(20) defaulting to Viewer
- created_at: DATETIME
- created_by: VARCHAR(100)
- last_password_change: DATETIME
- notes: TEXT

---

# 6. COMPLETE FEATURES LIST

## 6.1 User Management

View all AD users with real-time search by name, username, email, or department. Filter by status using dropdown with options for All, Active, Disabled, and Locked. Sortable columns for User, Email, Department, and Status with ascending/descending toggle and visual sort indicators showing up/down arrows for active column and faded double arrow for inactive columns.

Create single user with fields for username, first name, last name, display name (auto-filled from first and last name if left blank), email, department, job title, password with show/hide toggle and generate button (16-character random password), target OU dropdown, home folder network path with %username% placeholder support, home drive letter dropdown (H: through Z:), must change password at next logon checkbox (default checked), and password never expires checkbox (default unchecked). Two-step LDAP creation process: create with minimal attributes, set password, then set userAccountControl.

Edit user attributes through a modal organized in five sections. Personal Information: first name, last name, display name, email, UPN. Job Information: title, department, company, office, phone. Home Folder: network path with %username% placeholder hint and drive letter dropdown. Additional: description and manager DN. Account Options: password never expires toggle and account disabled toggle.

Delete user restricted to Admin role only. Built-in accounts like Administrator, Guest, and krbtgt are protected from deletion.

Move user between OUs. Enable and disable accounts by modifying the userAccountControl attribute. Unlock locked accounts with accurate lockout detection using domain lockoutDuration policy comparison.

Reset passwords with show/hide toggle, generate strong password button, force change at next logon checkbox (default checked), and unlock account checkbox (appears only for locked users with orange styling).

Bulk import users from CSV with file upload, text paste, template download, and preview table showing first 10 rows. Template includes columns for username, firstName, lastName, displayName, email, password, department, title, homeDirectory, homeDrive.

Bulk update existing users from CSV with case-insensitive column names, alias support (e.g., jobtitle maps to title), empty cell skipping, preview, and results report. Supports homeDirectory and homeDrive columns.

Bulk modify same value for multiple selected users with checkbox-enabled fields including department, title, company, office, phone, description, manager, home folder path with %username% hint, and home drive dropdown.

Bulk move, enable, disable, unlock, delete, and reset password through the purple Bulk Actions dropdown menu.

Multi-select with checkboxes on each row, header checkbox for select all, blue highlight on selected rows, and selected count display.

## 6.2 Group Management

View all groups displayed as responsive grid cards with group name, description, type badge (blue for security, purple for distribution), member count, scope label, and delete button on hover. Click any card to open group details modal.

Create new groups with fields for group name, description, target OU dropdown, type selection (security or distribution), and scope selection (global, domain-local, or universal).

Delete groups restricted to Admin role. 35+ built-in Windows groups are protected from deletion.

View group members in detail modal with stat boxes for member count, type, and scope. Scrollable member list showing display name, username, email, and remove button.

Add members by searching AD users. Remove members with one click. Search groups by name.

## 6.3 Computer Management

View all computer accounts in a table with computer name, description, OS and version, DNS name, last logon, status badge (green active, yellow inactive 90+ days, red disabled), and action buttons including LAPS Password key icon (Admin only).

Create computer accounts restricted to Admin role with name validation (max 15 chars, alphanumeric plus hyphens, auto-uppercase). Delete computers (Admin only). Enable/disable computers. Move computers between OUs with detailed error reporting and target OU validation.

Bulk operations with progress bar: Enable, Disable, Move to OU, Delete. Status filter for All, Active, Inactive, Disabled. CSV export. Multi-select with checkboxes.

## 6.4 Windows LAPS Password Management (NEW in v2.4.0)

View Windows LAPS local admin passwords through a secure three-step modal accessed via a gold key icon on each computer row (Admin only).

Step 1: Reason Prompt - User must enter a reason of at least 5 characters (max 200). The reason is permanently logged with the operator username, timestamp, IP address, and computer name.

Step 2: Password Display - Shows local admin account name, current password with show/hide toggle, source (encrypted or plain text), last updated timestamp, expiration timestamp with time-until-rotation indicator, and authorized decryptor. Password auto-hides after 30 seconds with visible countdown timer. One-click copy to clipboard.

Step 3: Password History - View last 5 previous passwords with individual copy buttons. Useful for accessing older recovery passwords when a computer has been rebuilt.

Force Password Rotation - Admin can trigger immediate LAPS password rotation which sets msLAPS-PasswordExpirationTime to 0. The computer will generate a new password on its next AD check-in (usually within 1 hour).

Encryption Support - Uses PowerShell subprocess (Get-LapsADPassword cmdlet) to decrypt Windows LAPS encrypted passwords which cannot be handled by the ldap3 Python library. Supports both encrypted and plain text LAPS passwords automatically.

Audit Compliance - Every password view attempt is logged whether successful or failed. Log entries include: operator username, operator role, action type (LAPS Password Viewed, LAPS History Viewed, LAPS Password Rotation Requested), computer name, reason provided, IP address, timestamp, and success/failed status.

Security Layers:
- Admin role required (backend and frontend enforced)
- Reason required (minimum 5 characters validated on both ends)
- Every view audit-logged
- Password auto-hides after 30 seconds
- Password not returned in listing endpoints, only per-computer fetch
- Computer name sanitized to prevent PowerShell injection
- No caching, fresh fetch every time

## 6.5 OU Management

Browse all OUs in searchable list with folder icon, OU name, and full DN. Create new OUs with parent picker and DN preview. Delete empty OUs (Admin only). Update OU descriptions (Admin only).

Click any OU to browse contents with four stat cards (Users blue, Groups green, Computers purple, Sub-OUs orange) and tabbed interface showing All, OUs, Users, Groups, and Computers. Empty OU indicator for safe deletion.

## 6.6 Service Accounts

Create service accounts with atomic dual tracking in AD and database. Sections: Basic Information (username with svc- prefix recommendation, display name, email), Password (minimum 12 chars, show/hide toggle, 20-char generator), Documentation (purpose, owner, department), AD Settings (target OU, password never expires, cannot change password, system critical flag), AD Manager Pro Access (toggle with role selector), and Notes.

Automatic rollback: if database save fails after AD creation, the AD account is deleted to maintain consistency.

Import existing AD users as service accounts. Edit with AD sync for display name, email, description, department. Reset passwords (minimum 12 chars, no force change). Delete with system critical protection.

Grid cards color-coded: red for system critical, purple for app access, indigo for regular. Filter stat cards for Total, System Critical, App Access, and Regular.

## 6.7 User Templates

Create templates with sections for Basic Info (name, description), Location (target OU), Job Information (department, title, company, office, phone, manager), Groups (searchable checkbox list), and Account Options (must change password, password never expires, account enabled).

Create users from templates needing only username, name, email, and password. Template values auto-fill all other fields. User automatically added to all template groups.

Template cards showing name, creator, department, title, office, group count badge, and password policy badges. Search and delete (Admin only).

## 6.8 Workflow Approvals

Six request types with emoji icons: Modify User, Create User, Delete User, Reset Password, Disable User, Enable User. Dynamic detail fields per type. Reason textarea.

Request cards with type emoji, target username, status badge (yellow Pending, green Approved, blue Completed, red Rejected), reason, requester, timestamp, and action buttons.

Approve (Admin only) immediately executes in AD. Reject with reason. Status filter tabs with counts. Pending count badge in sidebar with 30-second auto-refresh. Non-admin users see only their own requests.

## 6.9 GPO Management (Read-Only)

View all GPOs in card grid with name, GUID, status badge, user/computer settings dots, linked OU count, version, and modified date. Detail modal with full info including SYSVOL path, DN, dates, and linked OUs with enforced/enabled badges.

OU Links tab showing OUs with linked GPOs. Stats cards for Total, Enabled, Disabled, Partial, and Linked. Search by name or GUID. Filter by status. CSV export. Fallback search trying CN=Policies,CN=System first, then CN=System, then base DN.

## 6.10 User Photos

Upload with automatic Canvas processing: center-crop to square, resize to 200x200, JPEG compression with progressive quality reduction until under 95KB. Side-by-side preview. Responsive grid (2-6 columns). Zoom on hover. Delete with one click. Filter All/With Photo/Without Photo. Stats cards. Cache busting on updates. Photos appear in Outlook, Teams, SharePoint.

## 6.11 Active Sessions

Session cards with role-colored avatars (red Admin, yellow Helpdesk, blue Viewer), Active/Idle indicators (5-minute threshold), device detection from User-Agent, IP address, login time, last activity. Force logout with confirmation. Auto-refresh every 30 seconds. Auto-expire after 8 hours. Stats cards for Total, Active, Idle, Admin. Search by username, display name, or IP. Admin only via AdminRoute.

## 6.12 Domain Login Activity

Dashboard section with 6 stat cards: Last 15 minutes (green), Last 1 hour (cyan), Last 24 hours (blue), Last 7 days (purple), Last 30 days (orange), Never Logged In (red). Each card is clickable.

Reports page has same cards plus View Active Users button opening a detailed modal. Modal shows table with User, Email, Department, Last Logon timestamp, and Activity badge (color-coded by recency). Time period filter buttons: Last 15 min, Last 1 hour, Last 24 hours, Last 7 days, Last 30 days. CSV export from modal. Auto-sorted by most recent first.

Note: Based on AD lastLogonTimestamp attribute which is updated approximately every 14 days by AD replication. Not truly real-time.

## 6.13 Reports and Analytics

Dashboard layout inspired by ManageEngine ADManager Plus. Domain indicator at top. 4 QuickStatCards: Locked Out Users, Passwords Never Expire, Must Change Password, Inactive Users (30+ days). Clicking each card opens a UserListModal showing filtered users matching that criteria with search, CSV export, and per-user Manage button.

User Reports vertical bar chart with colored bars and legend. System Reports bar chart for computers. Logged On User horizontal bar chart. Groups and OU horizontal bar chart. Users by Department pie chart (top 8). Computers by OS pie chart.

Quick Export section with 8 one-click CSV download buttons: All Users, Active Users, Disabled Users, Locked Users, Never Logged In, Inactive (90+ days), All Groups, All Computers.

## 6.14 Audit Logging

Table with Time, Operator, Role, Action, Object Type, Object Name, Details, Status (green Success or red Failed badge), and IP Address. CSV export with date-stamped filename. Paginated with 500 per page. All users can view for transparency.

LAPS-specific audit entries include the reason field in the Details column, making it easy to review who accessed which LAPS password and why.

## 6.15 Settings

Four tabs with icons. Active Directory tab: Primary DC, Secondary DC, Domain, Service Account, Base DN, Default User OU, Password with show/hide, Protocol radio (LDAPS/LDAP) auto-updating port, Test Connection button, Change Service Account Password expandable section with current/new/confirm fields and generate button.

Visibility tab: Three toggle switches for built-in users, groups, and containers with example objects and SHOWING/HIDDEN badges.

Password Policy tab: Minimum length, max age, history count, complexity checkboxes.

Email SMTP tab: Server, port, username, password, from email, admin email, notification toggles, test email button.

All settings stored encrypted and auto-reload on save without restart.

## 6.16 App User Management

Table of authorized users with ID, Username, Display Name, Email, Role, Active, Last Login. Add user with username, display name, email, and role dropdown. Delete with self-protection. Login requires BOTH app_users entry AND valid AD LDAP bind.

## 6.17 Built-in Object Filtering

Three maintained Python lists: BUILTIN_USERS (7 accounts), BUILTIN_GROUPS (35+ groups), BUILTIN_CONTAINERS (6 paths). Helper functions check membership. Settings toggles control visibility independently.

## 6.18 Bulk Update from CSV

Dedicated orange Bulk Update button on Users page. Upload CSV or paste text. Template download. Preview table. Case-insensitive column names with aliases. Empty cells skipped. Results with success/fail counts and error details.

Supported columns: username (required), firstname, lastname, displayname, email, department, title, company, office, phone, description, manager, homeDirectory (with aliases homedir, homefolder, home_directory), homeDrive (with aliases home_drive, drive).

## 6.19 Home Folder Support

Network path field with %username% placeholder auto-substitution in Create User modal, Edit User modal, Bulk Import CSV, Bulk Modify form, and Bulk Update CSV. Drive letter dropdown (H: through Z:) in all forms. AD attributes: homeDirectory and homeDrive.

---

# 7. COMPLETE API REFERENCE

## Authentication Endpoints

GET /api/health - Health check, no auth required. Returns status, ldap availability, domain, server, timestamp.
GET /api/ad/test - Test AD connection. Requires authentication.
POST /api/auth/login - Login with AD credentials. Accepts OAuth2 form with username and password. Returns JWT token, role, display_name, username.
GET /api/auth/me - Get current authenticated user info. Returns username, display_name, email, role.
POST /api/auth/logout - Logout and remove active session record.

## Settings Endpoints

GET /api/settings - Get all settings. Encrypted values shown as ********. Requires authentication.
PUT /api/settings - Update settings. Admin only. Skips encrypted keys if value is ********. Auto-reloads config.
POST /api/settings/test-connection - Test AD connection with custom settings before saving. Admin only.
POST /api/settings/change-service-password - Change service account password in both AD and database. Admin only. Requires 12+ character password.

## User Endpoints

GET /api/users - List users. Optional params: search, ou, status_filter, show_builtin. Returns users array, count, domain, ou, showBuiltin.
GET /api/users/{username} - Get single user details.
POST /api/users - Create new user. Admin or Helpdesk. Accepts JSON with username, firstName, lastName, displayName, email, department, title, password, ou, homeDirectory, homeDrive, passwordNeverExpires, mustChangePassword.
PUT /api/users/{username} - Update user attributes. Admin or Helpdesk.
DELETE /api/users/{username} - Delete user. Admin only.
POST /api/users/{username}/move - Move user to different OU. Requires target_ou in body.
POST /api/users/{username}/disable - Disable user account.
POST /api/users/{username}/enable - Enable user account.
POST /api/users/{username}/unlock - Unlock locked account.
POST /api/users/{username}/reset-password - Reset password. Requires password (min 8 chars) and optional forceChange boolean.
POST /api/users/bulk-import - Bulk create users from JSON array. Each item has username, firstName, lastName, email, password, etc.
POST /api/users/bulk-modify - Bulk update same values for multiple users. Body: { updates: [{ username, field1, field2 }] }.
POST /api/users/bulk-update-csv - Bulk update different values per user from CSV rows. Body: { rows: [{ username, department, title, ... }] }.
POST /api/users/bulk-move - Move multiple users. Body: { usernames: [], target_ou: "" }.
POST /api/users/bulk-action - Bulk enable/disable/unlock/delete/reset-password. Body: { usernames: [], action: "", extra: {} }.

## Photo Endpoints

GET /api/users/{username}/photo - Get user photo as JPEG binary.
POST /api/users/{username}/photo - Upload user photo as multipart form. Max 100KB.
DELETE /api/users/{username}/photo - Delete user photo.

## Group Endpoints

GET /api/groups - List groups. Optional: search, show_builtin.
POST /api/groups - Create group. Body: { name, description, ou, type, scope }.
DELETE /api/groups/{group_name} - Delete group. Admin only.
GET /api/groups/{group_name}/members - Get group members with details.
POST /api/groups/{group_name}/members/{username} - Add member to group.
DELETE /api/groups/{group_name}/members/{username} - Remove member from group.

## Computer Endpoints

GET /api/computers - List computers. Optional: search.
POST /api/computers - Create computer. Admin only. Body: { name, ou, description }.
DELETE /api/computers/{name} - Delete computer. Admin only.
POST /api/computers/{name}/enable - Enable computer.
POST /api/computers/{name}/disable - Disable computer.
POST /api/computers/{name}/move - Move computer. Body: { target_ou }. Includes target OU validation.

## Windows LAPS Endpoints (NEW in v2.4.0)

GET /api/computers/{name}/laps - Retrieve current LAPS password. Admin only. Query param reason required (min 5 chars). Returns computerName, account, password, updated, expires, source, status, authorizedDecryptor, dn. Every view logged to audit trail.

GET /api/computers/{name}/laps/history - Retrieve LAPS password history. Admin only. Query param reason required. Returns history array with password, updated, status, source, account for each historical password.

POST /api/computers/{name}/laps/rotate - Force LAPS password rotation. Admin only. Sets msLAPS-PasswordExpirationTime to 0. Password rotates on next computer check-in.

## OU Endpoints

GET /api/ous - List all OUs with name, dn, description, parent.
POST /api/ous - Create OU. Body: { name, parent, description }.
PUT /api/ous - Update OU description. Admin only. Body: { dn, description }.
DELETE /api/ous - Delete empty OU. Admin only. Query param: dn.
GET /api/ous/contents - Browse OU contents. Query param: dn. Returns users, groups, computers, ous with counts.

## GPO Endpoints

GET /api/gpos - List all GPOs with name, guid, path, version, status, userEnabled, computerEnabled, dn, dates.
GET /api/gpos/links - Get GPO OU links with ou name, dn, and linked gpos with guid, enabled, enforced.

## Session Endpoints

GET /api/sessions - List active sessions. Admin only. Auto-cleans expired (8hr). Returns session details.
DELETE /api/sessions/{session_id} - Terminate session. Admin only.

## Service Account Endpoints

GET /api/service-accounts - List all service accounts with full metadata.
POST /api/service-accounts - Create service account. Admin only. Atomic AD+DB creation with rollback.
GET /api/service-accounts/{id} - Get service account details including AD status.
PUT /api/service-accounts/{id} - Update service account. Admin only. Syncs selected fields to AD.
DELETE /api/service-accounts/{id} - Delete service account. Admin only. Optional delete_ad param.
POST /api/service-accounts/{id}/reset-password - Reset password. Admin only. Min 12 chars, no force change.
POST /api/service-accounts/import-existing - Import existing AD user as service account. Admin only.

## Template Endpoints

GET /api/templates - List all templates with full details.
POST /api/templates - Create template. Admin only. Includes groups as JSON array.
DELETE /api/templates/{id} - Delete template. Admin only.
POST /api/templates/{id}/create-user - Create user from template. Admin or Helpdesk. Auto-adds to template groups.

## Workflow Endpoints

GET /api/workflows/requests - List requests. Optional: status_filter. Non-admin sees only own requests.
POST /api/workflows/requests - Submit new request. Body: { type, target, changes, reason }.
POST /api/workflows/requests/{id}/approve - Approve and auto-execute. Admin only.
POST /api/workflows/requests/{id}/reject - Reject with reason. Admin only. Body: { reason }.

## Audit Log Endpoints

GET /api/audit-logs - List logs. Optional: skip, limit (default 500). Returns logs, count, total.
GET /api/audit-logs/export - Export all logs as CSV download.

## App User Endpoints

GET /api/app-users - List authorized users. Admin only.
POST /api/app-users - Add authorized user. Admin only. Body: { username, display_name, email, role }.
DELETE /api/app-users/{username} - Remove authorized user. Admin only. Cannot delete self.

## Notification Endpoints

POST /api/notifications/test-email - Send test email. Admin only. Body: { to }.

## Report Endpoints

GET /api/reports/summary - Complete summary with user/group/computer/OU statistics.
GET /api/reports/users/by-department - User count by department with status breakdown.
GET /api/reports/computers/by-os - Computer count by operating system.
GET /api/reports/users/recently-active - Recently active domain users. Optional: minutes param (default 15).
GET /api/reports/users/domain-logins-summary - Login activity counts across time periods.
GET /api/reports/users/never-logged-in - Users who never logged in.
GET /api/reports/users/inactive - Inactive users. Optional: days param (default 90).
GET /api/reports/users/locked - Currently locked users.
GET /api/reports/users/disabled - Disabled users.
GET /api/reports/export/{report_type} - Export report as CSV. Types: all-users, all-groups, active-users, disabled-users, locked-users, never-logged-in, inactive-users, all-computers.

---

# 8. FRONTEND PAGES REFERENCE

14 pages total, each a self-contained React component in src/pages/.

Login.jsx - Full-screen dark themed login with server icon, username/password inputs with icons, error messages, loading state.

Dashboard.jsx - Domain login activity cards (6 clickable stat cards), quick stat cards (4), user reports bar chart, system reports bar chart, logged on user report, groups and OU report, department pie chart, OS pie chart. Refresh button.

Users.jsx - Sortable table with checkboxes. Header with New User, Bulk Import, Bulk Update, Refresh buttons. Bulk Actions dropdown (enable/disable/unlock/reset/move/modify/delete). Status filter dropdown. Modals: CreateUser with home folder section, EditUser with home folder section, MoveUser, ResetPassword with show/hide/generate/force-change/unlock, BulkImport, BulkUpdateCsv, BulkModify with home folder fields, BulkMove, BulkResetPassword.

Groups.jsx - Grid cards with create, click for member detail modal with add/remove, delete.

Computers.jsx - Table with checkboxes, search, status filter, create modal, enable/disable/move/delete, bulk operations, CSV export. Gold key icon on each row for Admin users opens LapsPasswordModal for viewing/rotating LAPS passwords.

OUs.jsx - List with search, create with parent picker, delete, click for contents modal with tabbed view and stat cards.

ServiceAccounts.jsx - Grid cards color-coded. Stats filter cards. Create modal with sections. Import. Edit. Reset password. Delete.

GPO.jsx - Two tabs (GPO grid, OU links). Stats cards. Search and status filter. Detail modal. CSV export.

Photos.jsx - Grid of avatars. Upload with Canvas processing. Preview. Delete. Filter. Stats.

Templates.jsx - Grid cards. Create with group selector. Use template modal. Delete.

Workflows.jsx - Status filter tabs with counts. Request cards. Create with dynamic fields. Approve/reject. View details.

Sessions.jsx - Stats cards. Auto-refresh. Session cards. Force logout. Detail modal. Admin only.

Reports.jsx - Domain login activity cards with View Active Users button and ActiveUsersModal. Stat cards with UserListModal for drill-down. Charts. CSV export.

AuditLogs.jsx - Table with pagination and CSV export.

Settings.jsx - Four tabs: AD connection, Visibility, Password Policy, Email SMTP.

---

# 9. ROLE-BASED ACCESS CONTROL

## Admin Role

Full access to all features. Can manage settings, app users, service accounts, templates. Can approve/reject workflow requests. Can delete any object type. Can view active sessions and force logout. Can change service account password. Exclusive access to Windows LAPS password viewing, history, and rotation.

## Helpdesk Role

Can create, edit, enable, disable, unlock, and move users. Can reset passwords. Can manage group membership. Can enable/disable computers. Can create OUs. Can use templates to create users. Can submit workflow requests. Cannot delete users, groups, computers, or OUs. Cannot access settings, app user management, service accounts, session monitoring, or LAPS passwords. Cannot approve or reject workflows.

## Viewer Role

Read-only access to all data. Can view users, groups, computers, OUs, GPOs, reports, dashboard, and audit logs. Can submit workflow requests for approval. Cannot create, modify, or delete any AD objects. Cannot reset passwords. Cannot view LAPS passwords.

## Permission Matrix

Feature | Admin | Helpdesk | Viewer
View all data | Yes | Yes | Yes
Create users/groups | Yes | Yes | No
Edit users/groups | Yes | Yes | No
Delete any object | Yes | No | No
Reset passwords | Yes | Yes | No
Bulk operations | Yes | Yes | No
Manage settings | Yes | No | No
Approve workflows | Yes | No | No
View sessions | Yes | No | No
Manage app users | Yes | No | No
Create computers | Yes | No | No
Delete computers | Yes | No | No
Create service accounts | Yes | No | No
Create/delete templates | Yes | No | No
Use templates | Yes | Yes | No
Submit workflows | Yes | Yes | Yes
View reports | Yes | Yes | Yes
Export CSVs | Yes | Yes | Yes
View LAPS passwords | Yes | No | No
Rotate LAPS passwords | Yes | No | No

## Enforcement

Backend: Every API endpoint explicitly checks the user role using either require_admin dependency (Admin only) or role list check (Admin + Helpdesk).

Frontend: Sidebar hides menu items based on role. Pages hide action buttons and forms based on role. Route guards (PrivateRoute, AdminRoute) prevent unauthorized page access.

---

# 10. ACTIVE DIRECTORY PERMISSIONS

## Automated Setup

Run setup_permissions.ps1 on the Domain Controller as Domain Admin:

    powershell -ExecutionPolicy Bypass -File setup_permissions.ps1

The script auto-detects domain name and Base DN, asks for service account name, verifies the account exists, shows permission summary, and applies all dsacls commands.

## Permissions Applied

Domain Root Level:
- Generic Read (GR) with subject inheritance - read all objects
- Read gPLink attribute (RP) - GPO link detection

User Object Permissions:
- Create Child (CC;user) - create user accounts
- Delete Child (DC;user) - delete from OUs
- Standard Delete (SD;;user) - delete the object
- Write All Properties (WP;;user) - edit any attribute
- Write DACL (WD;;user) - allows moves
- Reset Password (CA;Reset Password;user) - extended right
- Write pwdLastSet (WP;pwdLastSet;user) - force password change
- Write unicodePwd (WP;unicodePwd;user) - set passwords via LDAP
- Write userAccountControl (WP;userAccountControl;user) - enable/disable
- Write lockoutTime (WP;lockoutTime;user) - unlock accounts
- Write thumbnailPhoto (WP;thumbnailPhoto;user) - user photos

Group Object Permissions:
- Create Child (CC;group)
- Delete Child (DC;group)
- Standard Delete (SD;;group)
- Write All Properties (WP;;group)
- Write member (WP;member;group) - manage membership

Computer Object Permissions:
- Create Child (CC;computer)
- Delete Child (DC;computer)
- Standard Delete (SD;;computer)
- Write All Properties (WP;;computer) - required for MOVE
- Write DACL (WD;;computer) - required for MOVE
- Write userAccountControl (WP;userAccountControl;computer)
- Write description (WP;description;computer)

OU Object Permissions:
- Create Child (CC;organizationalUnit)
- Delete Child (DC;organizationalUnit)
- Standard Delete (SD;;organizationalUnit)
- Write All Properties (WP;;organizationalUnit)
- Write description (WP;description;organizationalUnit)

Cross-OU Move Permissions:
- CCDC;user;organizationalUnit - move users between OUs
- CCDC;computer;organizationalUnit - move computers between OUs
- CCDC;group;organizationalUnit - move groups between OUs

GPO Read Permissions:
- Generic Read on CN=System
- Generic Read on CN=Policies,CN=System

Built-in Container Permissions:
- Read and Create/Delete in CN=Users and CN=Computers

## dsacls Flag Reference

/I:S - Apply to subobjects (subject inheritance, required for object-class-specific ACEs)
/I:T - Apply to child objects (tree inheritance, cannot specify object type)
GR - Generic Read
CC - Create Child
DC - Delete Child
SD - Standard Delete
WP - Write Property
WD - Write DACL
CA - Control Access (extended rights)
RP - Read Property

## Important Note

Password operations (unicodePwd) require LDAPS (port 636). Without LDAPS, password resets will fail with WILL_NOT_PERFORM error. Configure LDAPS by installing AD Certificate Services on the DC or importing a certificate.

---

# 11. WINDOWS LAPS INTEGRATION (NEW in v2.4.0)

## Overview

Windows LAPS (Local Administrator Password Solution) is Microsoft's built-in solution for managing local administrator passwords on domain-joined computers. Passwords rotate automatically at configured intervals and are stored in Active Directory in encrypted or plain text form.

AD Manager Pro integrates with Windows LAPS to provide a secure web interface for Admins to retrieve local admin passwords for support and recovery purposes, with full audit compliance.

## Prerequisites

Windows LAPS must be configured on your domain. This requires:
- Windows Server 2019+ Domain Controllers with LAPS schema extension (built into current AD DS)
- Group Policy configured for LAPS
- Client computers running Windows 10 21H2+ or Windows 11 with LAPS enabled
- LAPS PowerShell module installed on the AD Manager Pro server

## Two LAPS Modes Supported

Plain Text Mode: Passwords stored in msLAPS-Password attribute readable via LDAP. Simpler but less secure.

Encrypted Mode: Passwords stored in msLAPS-EncryptedPassword attribute encrypted with a specific security principal's key. More secure but requires that principal to decrypt. AD Manager Pro handles this via PowerShell subprocess.

## Server Authorization Setup

The AD Manager Pro backend runs as SYSTEM which authenticates to AD as the server's computer account (e.g., MESRV$). For the backend to decrypt LAPS passwords, the server computer account must be authorized as a LAPS password decryptor.

Steps to authorize the AD Manager Pro server:

On Domain Controller as Domain Admin:

    # Option A: Add server to an existing decryption group (e.g., "IT Admins")
    Add-ADGroupMember -Identity "IT Admins" -Members "SERVERNAME$"

    # Option B: Create a dedicated LAPS-Readers group (recommended)
    New-ADGroup -Name "LAPS-Readers" -GroupScope Global -GroupCategory Security
    Add-ADGroupMember -Identity "LAPS-Readers" -Members "SERVERNAME$"
    # Then update the LAPS GPO to authorize LAPS-Readers as decryptor

Replace SERVERNAME with your AD Manager Pro server hostname. Note the dollar sign suffix which indicates a computer account.

On AD Manager Pro server:

    # MANDATORY: Reboot to activate the new group membership
    # Computer account tokens only refresh at boot time
    Restart-Computer -Force

## LAPS PowerShell Module Requirement

The AD Manager Pro server must have the LAPS PowerShell module installed:

    # Check if installed
    Get-Module -ListAvailable LAPS

    # Install if missing (Windows Server 2019+)
    # LAPS module is built-in on Server 2019+
    # For Windows 10/11 client OS:
    Add-WindowsCapability -Online -Name "Rsat.ActiveDirectory.DS-LDS.Tools~~~~0.0.1.0"

## Verification

After setup and reboot, verify the backend can decrypt LAPS:

    # On AD Manager Pro server, using PsExec to test as SYSTEM
    # Download PsExec from https://download.sysinternals.com/files/PSTools.zip

    & "$env:TEMP\PsExec.exe" -accepteula -s powershell -Command "Get-LapsADPassword -Identity 'TEST-PC' -AsPlainText"

Expected: Status: Success with password shown.

If Status: Unauthorized appears, the server computer account is not in the LAPS decryption group. Verify group membership and ensure server has been rebooted.

## Feature Usage

1. Navigate to Computers page in AD Manager Pro
2. Admins see a gold key icon on each computer row
3. Click the key icon to open the LAPS Password Modal
4. Enter a reason (minimum 5 characters) describing why the password is needed
5. Click Reveal Password
6. Password displays with 30-second auto-hide countdown
7. Click Copy button to copy to clipboard
8. Click History button to view previous passwords
9. Click Force Rotation to trigger immediate password rotation

## Audit Trail

Every LAPS password access is permanently logged with:
- Operator username
- Operator role (Admin)
- Action (LAPS Password Viewed, LAPS History Viewed, LAPS Password Rotation Requested)
- Computer name
- Reason provided by operator
- IP address
- Timestamp
- Success or Failed status

View LAPS audit entries on the Audit Logs page. Filter by Action to see only LAPS-related events. Export to CSV for compliance reporting.

## Security Model

- Backend endpoint requires Admin role (enforced via FastAPI Depends(require_admin))
- Frontend hides LAPS key icon from Helpdesk and Viewer roles
- Reason field required with minimum 5 characters (validated both client and server side)
- Every view attempt logged whether successful or failed
- Password not returned in the standard computers listing endpoint
- Only per-computer fetch endpoint returns password
- Password auto-hides after 30 seconds
- Computer name sanitized before passing to PowerShell (only alphanumeric and hyphens allowed)
- No caching - fresh fetch every time
- No bulk export - one-at-a-time only
- HTTP-only deployment - use HTTPS reverse proxy for production if LAPS is used

## Troubleshooting

Error: Decryption failed: Unauthorized
Cause: Server computer account not in LAPS decryption group, or reboot has not occurred after adding to group
Fix: Verify group membership, reboot server, confirm LAPS GPO includes the group as authorized decryptor

Error: PowerShell error: The term Get-LapsADPassword is not recognized
Cause: LAPS PowerShell module not installed on the server
Fix: Install RSAT LAPS module

Error: Reason required (min 5 chars)
Cause: Reason field left empty or too short
Fix: Provide meaningful reason like "Ticket #12345 - User needs local admin recovery"

Error: PowerShell timeout (30 seconds)
Cause: Network issues or LAPS query hanging
Fix: Test manually from server, check DC connectivity, check LAPS module version

---

# 12. COMPLETE SETUP GUIDE

## Prerequisites

Python 3.11 or higher. Download from https://python.org. Check Add Python to PATH during installation.

Node.js 18 or higher LTS. Download from https://nodejs.org.

Network access to Active Directory Domain Controller on port 389 (LDAP) or 636 (LDAPS).

AD service account with permissions (see Section 10).

Administrator access on the Windows server.

For LAPS features: Windows LAPS configured on domain, LAPS PowerShell module on server, server computer account added to LAPS decryption group, server rebooted after group change.

## Automated Installation (Recommended)

    powershell -ExecutionPolicy Bypass -File install.ps1

The wizard asks for: install directory, DC IP, secondary DC, domain name, base DN, service account UPN, service account password, LDAPS setting, admin username, admin display name, admin email.

It then automatically: installs Python 3.12 and Node.js 20 if missing, creates directory structure, copies application files, generates secret key, creates .env file, creates Python virtual environment, installs Python packages with verification, configures frontend, installs npm packages and esbuild, builds production frontend, deploys to backend static folder, creates admin user, creates service.cmd and start scripts, creates Windows scheduled task via XML, configures firewall rule for port 8080, starts the service, and verifies health endpoint.

## Manual Installation

### Backend Setup

    cd backend
    python -m venv venv
    .\venv\Scripts\activate
    pip install -r requirements.txt

Create .env file with these values:

    AD_SERVER_PRIMARY=192.168.100.10
    AD_SERVER_SECONDARY=
    AD_DOMAIN=abasyn.local
    AD_BASE_DN=DC=abasyn,DC=local
    AD_TARGET_OU=DC=abasyn,DC=local
    AD_SERVICE_ACCOUNT=svc-admanager@abasyn.local
    AD_SERVICE_PASSWORD=YourPassword
    AD_USE_LDAPS=true
    AD_PORT=636
    SECRET_KEY=generate_with_python_secrets
    APP_HOST=0.0.0.0
    APP_PORT=8080

Generate secret key:

    python -c "import secrets; print(secrets.token_hex(64))"

Create required directories:

    mkdir database, logs, static

Add first admin user:

    .\venv\Scripts\python.exe -c "from models import AppUser, SessionLocal; db = SessionLocal(); db.add(AppUser(username='your-username', display_name='Your Name', email='you@domain.local', role='Admin', active=True)); db.commit(); print('OK'); db.close()"

### Frontend Setup

    cd frontend
    npm install
    npm install esbuild --save-dev

Create .env.production with:

    VITE_API_URL=

Build and deploy:

    npm run build
    Copy-Item -Path "dist\*" -Destination "..\backend\static" -Recurse -Force

### Start Application

    cd backend
    .\start.bat

Open http://localhost:8080 in browser. Login with AD credentials.

---

# 13. PRODUCTION DEPLOYMENT GUIDE

## Create service.cmd

    @echo off
    cd /d "C:\AD Pro\public\backend"
    "C:\AD Pro\public\backend\venv\Scripts\python.exe" -m uvicorn app:app --host 0.0.0.0 --port 8080 --workers 4 --log-level info >> "C:\AD Pro\public\backend\logs\service.log" 2>&1

## Create Windows Scheduled Task

Use XML-based task creation with schtasks pointing to service.cmd. Task runs as NT AUTHORITY\SYSTEM at system startup with HighestAvailable run level, auto-restart on failure (5 retries at 1 minute intervals), and 365-day execution time limit.

## Configure Firewall

    netsh advfirewall firewall add rule name="AD Manager Pro" dir=in action=allow protocol=TCP localport=8080 profile=domain,private

## Service Management Commands

Start: schtasks /run /tn "AD Manager Pro"
Stop: schtasks /end /tn "AD Manager Pro"
Status: schtasks /query /tn "AD Manager Pro"
View logs: type "backend\logs\service.log"
Kill orphans: Get-Process | Where-Object { $_.ProcessName -like "*python*" } | Stop-Process -Force

## Access URLs

Main: http://servername:8080
Swagger: http://servername:8080/docs
ReDoc: http://servername:8080/redoc
Health: http://servername:8080/api/health

---

# 14. INSTALLER SCRIPT GUIDE

## install.ps1

Automated installer compatible with PowerShell 2.0+. Performs 13 steps with visual progress and error handling.

Features: Python and Node.js auto-download and install, domain auto-detection for Base DN, secure password input, configuration summary before proceeding, package verification with retry, frontend build with esbuild dependency, admin user creation via temp Python script, XML-based scheduled task creation, health check verification, uninstall script copy.

Uses System.IO.File.WriteAllLines for encoding safety. Falls back to schtasks.exe and netsh for older PowerShell versions. Uses System.Net.WebClient for downloads instead of Invoke-WebRequest for compatibility.

## uninstall.ps1

Standalone uninstaller (no -Uninstall flag needed). Changes directory to C:\ before deletion. Kills Python processes with retry. Backs up database to Desktop if requested. Falls back to cmd /c rmdir for stubborn files. Reports partial uninstall if files remain.

## setup_permissions.ps1

DC permission script. Auto-detects domain via System.DirectoryServices. Verifies service account exists via DirectorySearcher. Applies permissions using dsacls via cmd /c for proper escaping. Reports success/failure count for each permission. Uses /I:S flag for object-class-specific ACEs. Includes cross-OU move permissions for user/computer/group.

---

# 15. BACKUP AND RESTORE

## What to Back Up

Critical: SQLite database (audit.db), environment file (.env), Python source files (app.py, models.py, ad_service.py).

Important: All batch scripts, requirements.txt, static folder with built frontend.

Frontend source: src/ directory, package.json, build configs.

Not needed (regenerable): venv/ (recreate with pip install), node_modules/ (recreate with npm install), dist/ (recreate with npm run build), __pycache__/.

## Backup Script

    Copy-Item "backend\database\audit.db" "backup\audit-$(Get-Date -Format 'yyyyMMdd').db"
    Copy-Item "backend\.env" "backup\.env.backup"
    Copy-Item "backend\app.py" "backup\app.py.backup"
    Copy-Item "backend\models.py" "backup\models.py.backup"
    Copy-Item "backend\ad_service.py" "backup\ad_service.py.backup"

## Restore

1. Extract backup files to backend directory
2. Create Python virtual environment: python -m venv venv
3. Activate and install: pip install -r requirements.txt
4. Restore database file to backend/database/audit.db
5. Restore .env file
6. Rebuild frontend: cd frontend && npm install && npm run build
7. Deploy: Copy-Item dist/* to backend/static/
8. Start service

---

# 16. TROUBLESHOOTING GUIDE

## User creation fails with invalidAttributeSyntax

Root Cause: Empty string attributes or userAccountControl in initial LDAP add. Solution: Two-step creation with clean_value helper filtering empty values.

## Users show as locked when they are not

Root Cause: AD keeps lockoutTime after auto-unlock. Solution: Compare lockoutTime with lockoutDuration policy cached for 1 hour.

## GPO page shows no objects

Root Cause: No read permission on CN=Policies. Solution: Run setup_permissions.ps1 on DC. Fallback search tries three locations.

## Password reset fails with WILL_NOT_PERFORM

Root Cause: Plain LDAP rejects unicodePwd changes. Solution: Enable LDAPS on DC, set AD_USE_LDAPS=true, AD_PORT=636.

## Service account password change not taking effect

Root Cause: Old password cached. Solution: get_fresh_password reads from database on every LDAP connection call.

## Frontend API requests go to wrong URL

Root Cause: VITE_API_URL set to specific URL. Solution: Set VITE_API_URL= (empty) for relative URLs. Rebuild frontend.

## Multiple backend instances running

Root Cause: Multiple tasks or orphan processes. Solution: Kill all Python, verify port free, start single instance.

## Delete removes from app but not AD

Root Cause: Missing DC/SD permissions. Solution: Run setup_permissions.ps1 on DC.

## Computer move fails

Root Cause: Missing WP;;computer or WD;;computer permissions. Solution: Run updated setup_permissions.ps1 v2.4.0 which includes all move permissions with correct /I:S flag.

## UPN constraint violation in bulk operations

Root Cause: Empty or invalid UPN sent to AD. Solution: Skip UPN if empty (continue), auto-append @domain if missing @.

## Windows service not starting

Root Cause: service.cmd missing or path issues with spaces. Solution: Create service.cmd with full quoted paths, register task via XML method.

## pwdLastSet type conversion error

Root Cause: Attribute returned as different Python types (int, datetime, None). Solution: safe_int helper with type checking.

## ConnectionResetError in logs

Root Cause: Normal Windows SSL behavior on disconnect. Solution: Safe to ignore. Not applicable for HTTP-only deployment.

## IndentationError in app.py or ad_service.py

Root Cause: Incorrect indentation when editing large files. Solution: Backend split into 3 files. When adding methods, verify all existing methods are still present. Use: python -c "from module import Class; print(dir(Class))" to check.

## LAPS: Decryption failed Unauthorized

Root Cause: Server computer account not in LAPS decryption group, or reboot not performed after adding to group. Solution: Add server computer account to LAPS decryption group, reboot server, verify with PsExec running as SYSTEM.

## LAPS: Get-LapsADPassword not recognized

Root Cause: LAPS PowerShell module not installed on AD Manager Pro server. Solution: Install RSAT LAPS module or run on Windows Server 2019+ which includes it built-in.

## LAPS: Reason required error

Root Cause: Reason field empty or less than 5 characters. Solution: Provide meaningful reason like ticket number and description.

---

# 17. MAINTENANCE SCHEDULE

## Weekly

Review audit logs for unusual activity such as failed logins, unexpected deletions, or permission changes. Pay special attention to LAPS password views to ensure they align with legitimate support activities. Check that backup files exist and have reasonable size.

## Monthly

Review app_users list and remove or deactivate users who no longer need access. Check service account password ages. Review pending workflow requests. Check log file sizes and archive old logs. Review LAPS decryption group membership to ensure it stays minimal.

## Quarterly

Test backup restore on a test system. Rotate AD service account password via Settings UI. Update Python packages: pip install -U -r requirements.txt. Update Node packages: npm update. Review AD permissions. Rotate LAPS decryption group membership - remove service accounts no longer needed.

## Yearly

Review security audit of permissions and access patterns. Archive old audit logs for compliance. Update documentation with changes. Consider feature updates. Full audit of who accessed LAPS passwords and for what reasons.

---

# 18. GITHUB DEPLOYMENT

## .gitignore

Excludes: backend/.env, backend/venv/, backend/database/, backend/logs/, backend/certs/, backend/static/, backend/__pycache__/, frontend/node_modules/, frontend/dist/, frontend/.vite/, .DS_Store, Thumbs.db, .vscode/, .idea/

## Initial Push

    git init
    git config user.name "Your Name"
    git config user.email "you@domain.local"
    git add .
    git status
    git commit -m "Initial commit: AD Manager Pro v2.4.0"
    git remote add origin https://github.com/username/ad-manager-pro.git
    git branch -M main
    git push -u origin main

## Updating

    git add .
    git commit -m "Description of changes"
    git push

## Deploy on New Machine

    git clone https://github.com/username/ad-manager-pro.git
    cd ad-manager-pro
    powershell -ExecutionPolicy Bypass -File install.ps1

---

# 19. CHANGELOG

## v2.4.0 (Current)

- Added Windows LAPS integration for viewing local admin passwords
- Added LapsPasswordModal component with three-step flow: reason prompt, password view, history
- Added 3 new API endpoints: /api/computers/{name}/laps, /laps/history, /laps/rotate
- Added 4 new methods to ADService: get_laps_password, get_laps_password_history, reset_laps_password, check_laps_enabled
- LAPS uses PowerShell subprocess to handle encrypted passwords that ldap3 cannot decrypt
- LAPS password auto-hides after 30 seconds with visible countdown
- LAPS requires mandatory reason (min 5 chars) logged to audit trail
- LAPS restricted to Admin role at both backend and frontend
- Added force password rotation feature (sets msLAPS-PasswordExpirationTime to 0)
- Added password history viewing (last 5 passwords)
- Added gold key icon on Computers page for Admin users
- Fixed computer move operation with detailed error reporting and target OU validation
- Fixed Reports page card links to open UserListModal instead of navigating to same page
- Updated setup_permissions.ps1 to v2.3.0 with cross-OU move permissions
- Added CCDC permissions for user, computer, and group on organizationalUnit
- Added WP;;computer and WD;;computer permissions required for computer move
- Fixed /I:S flag usage for object-class-specific ACEs

## v2.3.0

- Refactored backend into 3 files: models.py, ad_service.py, app.py for maintainability
- Added home folder network path (homeDirectory) and drive letter (homeDrive) support
- Home folder fields added to Create User, Edit User, Bulk Import, Bulk Modify, Bulk Update CSV
- Home folder supports %username% placeholder auto-substitution
- Added domain login activity cards on Dashboard (6 time-period cards)
- Added domain login activity section on Reports page with clickable cards
- Added recently active users modal with time period filters and CSV export
- Added sortable columns on Users table (User, Email, Department, Status)
- Added visual sort indicators (arrows) on column headers
- Added password show/hide toggle to Reset Password, Create User, Bulk Reset modals
- Added Generate password button (16-char random) to all password fields
- Added unlock account checkbox during password reset (for locked users)
- Added force change password at next logon checkbox to reset modal
- Added Bulk Update from CSV feature with dedicated orange button
- Added dark theme styling for select dropdown options globally
- Added custom scrollbar styling for dark theme
- Added autofill dark theme styling for inputs
- Fixed dropdown options invisible on white background
- Removed SSL requirement for simpler deployment (HTTP-only on port 8080)
- Removed cert-help page (no longer needed)
- Removed dual-protocol support (single HTTP port)

## v2.2.2

- Fresh password read from DB on every LDAP connection
- Password change verification after update
- GPO error handling with fallback search strategy
- Empty attribute handling for LDAP operations
- Two-step user creation avoiding invalidAttributeSyntax
- Accurate lockout detection using domain policy comparison
- Fixed missing delete_user method in ADService
- Fixed self.config.AD_DOMAIN reference to config.AD_DOMAIN
- Fixed log_audit function name to log_action
- Case-insensitive login matching with ilike
- Added bulk operations: import, modify, move, action
- Added service account management with dual tracking
- Added user templates with group auto-assignment
- Added workflow approval system with 6 request types
- Added GPO viewing with OU link reporting
- Added user photo management with Canvas processing
- Added active session tracking with force logout
- Added ManageEngine-style reports dashboard with Recharts
- Added complete audit logging with CSV export
- Added dynamic settings with encrypted password storage
- Added built-in object filtering with visibility toggles

---

# DOCUMENT METADATA

Document Version: 2.4.0
Application Version: 2.4.0
Backend Files: 3 (app.py, models.py, ad_service.py)
Total API Endpoints: 88+
Total Frontend Pages: 14
Total Database Tables: 7
Total Backend Lines: approximately 2050
Python Packages: 9
NPM Packages: 8
Supported Protocol: HTTP (port 8080)
Authentication: JWT with AD LDAP bind
Encryption: Fernet AES for stored passwords
Database: SQLite (zero configuration)
Deployment: Windows Task Scheduler
LAPS Support: Windows LAPS with encryption
License: MIT