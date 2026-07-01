# AD Manager Pro — Complete Documentation v2.2.2

## Enterprise Active Directory Management Platform
## Complete Setup Guide | API Reference | Troubleshooting | AI Regeneration Prompt

---

# TABLE OF CONTENTS

1. Project Overview
2. Architecture
3. Technology Stack
4. Complete Features List
5. Database Schema
6. Complete API Reference
7. Frontend Pages Reference
8. File Structure
9. Complete Setup Guide Step by Step
10. Production Deployment Guide
11. Backup and Restore
12. AD Permissions Complete Reference
13. SSL Certificate Management
14. Troubleshooting Guide
15. Maintenance Schedule
16. GitHub Deployment
17. AI Regeneration Prompt

---

# 1. PROJECT OVERVIEW

AD Manager Pro is a web-based Active Directory management platform built with Python FastAPI backend and React Vite Tailwind CSS frontend. It provides a modern dark-themed UI for managing AD users, groups, computers, OUs, GPOs, service accounts, user photos, workflow approvals, and more with role-based access control and comprehensive audit logging.

The application connects to Active Directory via the LDAP3 library, authenticates users against AD, and provides a web interface for common AD administration tasks. All operations are logged to a SQLite database. Settings are stored in the database with Fernet AES encryption for sensitive values like passwords. The entire application runs as a single-port or dual-port service on Windows. The built React frontend is served as static files from the backend enabling single-port deployment without a separate web server.

## Key Highlights

Full CRUD operations for Users, Groups, Computers, and OUs with bulk operations including multi-select, bulk import from CSV, bulk modify, bulk move, and bulk enable/disable/unlock/delete/reset-password.

Service Accounts that create in BOTH Active Directory AND the application database simultaneously as an atomic operation with automatic rollback if the database save fails after AD creation.

Accurate lockout detection that reads the domain lockoutDuration policy from AD, caches it for one hour, and compares with each user's lockoutTime attribute to determine if they are actually still locked or were auto-unlocked by the policy.

Hide and show built-in AD objects via settings toggles controlling visibility of built-in users like Administrator and Guest, built-in groups like Domain Admins and Domain Users, and built-in containers like CN=Users and CN=Builtin.

ManageEngine ADManager Plus style dashboard with Recharts library providing vertical bar charts, horizontal bar charts, and pie charts for department and OS distribution.

User templates for standardized account creation where templates define OU, department, title, company, groups, and password policy, and users can be created from templates needing only username, name, and password.

Approval workflow system supporting six request types: create user, modify user, delete user, reset password, enable user, and disable user, with pending count badge in sidebar, auto-execution on approval, and rejection with reason.

GPO viewing and link reporting showing all Group Policy Objects with status, version, SYSVOL path, and which OUs have which GPOs linked with enforced and enabled status per link.

User photo management with automatic client-side processing using HTML Canvas to center-crop to square, resize to 200x200 pixels, and compress as JPEG with quality adjustment to fit the AD thumbnailPhoto 100KB limit.

Active session tracking showing which users are currently logged into the AD Manager Pro web interface with active/idle status, device detection from User-Agent, IP address tracking, force-logout capability for admins, and auto-expire after 8 hours.

Dynamic settings stored in the database with Fernet-encrypted passwords that persist across restarts, auto-reload on save without requiring restart, and fresh password read from database on every LDAP connection to handle password changes.

Role-based access control with three roles: Admin with full access, Helpdesk with user and group management, and Viewer with read-only access. Roles control which menu items are visible, which actions are available, and which API endpoints can be called.

Dual protocol support with HTTPS on port 8443 using self-signed SSL certificates and HTTP on port 8080 without SSL for certificate-free access from non-domain PCs or guest machines.

Self-service certificate help page at /cert-help providing three options for users experiencing SSL issues: quick fix by accepting the certificate via /api/health, permanent fix by downloading and installing the certificate, and alternative access via HTTP.

Complete audit trail with every action logged including operator username, role, action performed, object type, object name, details, success or failure status, client IP address, and timestamp, with CSV export.

JWT authentication against Active Directory where users authenticate with their AD credentials via LDAP bind and receive a JWT token valid for 8 hours.

Self-signed SSL certificate generation with 4096-bit RSA key, 5-year validity, and Subject Alternative Names for hostname, FQDN, localhost, and IP addresses.

Static frontend serving from backend where the built React application is served from the backend/static folder, enabling single-port deployment without nginx or apache.

---

# 2. ARCHITECTURE

## System Design

The browser loads a React Single Page Application served from the FastAPI backend. All page routing is handled client-side by React Router. The frontend communicates with the backend exclusively through REST API calls using Axios with JWT Bearer token authentication on every request except the login endpoint and health check.

The FastAPI backend is a single Python file (app.py) containing all database models, the AD service class with all LDAP operations, authentication helpers, audit logging, email sending, and all API route handlers. It connects to Active Directory via the ldap3 Python library using either LDAP on port 389 or LDAPS on port 636.

Application data is stored in a local SQLite database file (audit.db) using SQLAlchemy ORM. The database contains seven tables for audit logs, authorized app users, dynamic settings, user templates, workflow requests, active sessions, and service account metadata. No separate database server is required.

## Connection Flow

1. Browser sends HTTPS request to FastAPI backend on port 8443 (or HTTP on port 8080)
2. For login: FastAPI checks app_users table for authorization, then authenticates against AD via LDAP bind
3. On success: JWT token returned to browser, stored in localStorage
4. For API calls: JWT token sent in Authorization header, FastAPI validates and extracts username
5. For AD operations: FastAPI connects to Domain Controller via LDAP using service account credentials
6. Results returned to browser as JSON
7. Frontend renders the data in React components

## Key Design Decisions

Single backend file approach chosen for simplicity of deployment and maintenance. All code in one file means easy backup, easy version control, and no complex module dependencies.

SQLite chosen for zero-configuration deployment. No need to install, configure, or maintain a separate database server. The database file is simply created on first run and backed up as a regular file.

JWT tokens expire after 8 hours matching a typical work day. This balances security with usability so users do not need to re-authenticate frequently during their work session.

Active sessions tracked via SHA-256 hash of the JWT token stored in the active_sessions table. The hash is updated with the current timestamp on every authenticated API request, providing accurate last-activity tracking without storing the actual token.

Settings stored in the database rather than just the .env file. This allows runtime changes through the Settings UI without requiring application restart. The .env file provides initial defaults that are loaded on first startup, after which the database settings take precedence.

Service account password read fresh from the database on every LDAP connection call. This critical design decision ensures that when the service account password is changed via the Settings UI, the change takes effect immediately without restarting the application. A helper function get_fresh_password reads and decrypts the password from the app_settings table before every connection.

Frontend uses empty API_URL configuration. When VITE_API_URL is set to an empty string, the Axios base URL becomes empty, causing all API requests to use relative URLs. This means the browser sends requests to the same hostname and port that the page was loaded from. This approach works correctly regardless of whether the user accesses the application via https://servername:8443, http://servername:8080, https://192.168.1.10:8443, or any other URL, without needing to rebuild the frontend.

Two-step user creation process avoids LDAP errors. Instead of including all attributes including userAccountControl in the initial LDAP add operation, the application first creates the user with minimal attributes (objectClass, sAMAccountName, displayName), then sets the password via a modify operation on the unicodePwd attribute, then enables the account by setting userAccountControl via another modify operation. This avoids the invalidAttributeSyntax error that occurs in some AD configurations when userAccountControl is included in the initial add.

Empty attribute prevention using clean_value helper. Active Directory rejects LDAP add operations that include attributes with empty string values. The clean_value function returns None for empty or whitespace-only strings, and the create_user method only includes attributes in the LDAP add operation if clean_value returns a non-None value.

---

# 3. TECHNOLOGY STACK

## Backend Technologies

Python 3.11 or higher is required. The application uses modern Python features and type hints.

FastAPI is the web framework providing automatic OpenAPI documentation at /docs and /redoc, dependency injection for authentication and database sessions, and high performance with async support.

Uvicorn is the ASGI server running the FastAPI application. In development it runs with --reload flag for auto-restart on code changes. In production it runs with --workers 4 for multiple worker processes.

ldap3 is the pure Python LDAP library used for all Active Directory operations. It supports LDAP and LDAPS connections, ServerPool for failover, and all LDAP operations including add, modify, delete, search, and modify_dn for moving objects.

SQLAlchemy is the ORM used with SQLite for the local database. It provides the declarative base for model definitions and session management for database operations.

python-jose with cryptography backend provides JWT token creation and validation using HS256 algorithm.

passlib with bcrypt provides password hashing capabilities although in this application passwords are validated against AD rather than stored locally.

cryptography library provides Fernet symmetric encryption used to encrypt sensitive settings like the AD service account password and SMTP password when stored in the database.

python-dotenv loads environment variables from the .env file on application startup.

python-multipart is required by FastAPI for handling form data submissions including the login form and file uploads for user photos.

smtplib from the Python standard library is used for sending notification emails and test emails.

hashlib from the standard library provides SHA-256 hashing for JWT token hashes stored in the active_sessions table.

## Frontend Technologies

React 18 or higher provides the component-based UI framework with hooks for state management and effects.

Vite is the build tool providing fast development server with hot module replacement and optimized production builds with code splitting and minification.

Tailwind CSS version 3 provides utility-first CSS styling. The application uses a dark theme based on the slate color palette with bg-slate-900 for the body background, bg-slate-800 for cards and panels, bg-slate-700 for hover states, and border-slate-700 for borders.

Axios is the HTTP client used for all API communication. It is configured with request interceptors that automatically attach the JWT token from localStorage to every request, and response interceptors that detect 401 Unauthorized responses and redirect to the login page.

React Router DOM version 6 provides client-side routing with nested routes, route guards for authentication (PrivateRoute) and admin access (AdminRoute), and catch-all redirect for unknown paths.

Lucide React provides the icon library with consistent, clean SVG icons used throughout the interface for menu items, action buttons, status indicators, and decorative elements.

Recharts provides the charting library used on the Dashboard page for vertical bar charts, horizontal bar charts, and pie charts with interactive tooltips and responsive containers.

## Infrastructure

Windows 10/11 or Windows Server 2016+ is required as the host operating system. The application is designed specifically for Windows deployment.

Self-signed SSL certificates are generated using the Python cryptography library with 4096-bit RSA keys, 5-year validity, and Subject Alternative Names for the server hostname, FQDN, localhost, and configured IP addresses.

Windows Task Scheduler is used to run the application as a service that starts automatically on system boot with auto-restart on failure.

SQLite provides the database as a single file (audit.db) in the backend/database directory. No separate database server installation or configuration is required.

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

---

# 4. COMPLETE FEATURES LIST

## 4.1 User Management

View all AD users with real-time search by name, username, email, or department as you type. Filter by status using a dropdown with options for All, Active, Disabled, and Locked. Users are displayed in a table with columns for User (showing display name and username), Email, Department, Status badge, and Actions.

Create single user with a comprehensive modal form including fields for username (sAMAccountName), first name, last name, display name (auto-filled from first and last name if left blank), email, department, job title, password (minimum 8 characters), target OU with dropdown listing all OUs from AD, checkbox for must change password at next logon (default checked), and checkbox for password never expires (default unchecked). The user is created using a two-step LDAP process: first creating the account with minimal attributes (no empty strings, no userAccountControl), then setting the password via unicodePwd modify, then enabling the account by setting userAccountControl to 512 or 66048 via modify.

Edit user attributes through a modal organized in four sections. Personal Information section contains first name, last name, display name, email, and UPN fields. Job Information section contains title, department, company, office, and phone fields. Additional section contains description and manager DN fields. Account Options section contains checkbox toggles for password never expires and account disabled with descriptive labels and sublabels.

Delete user is restricted to Admin role only. Built-in accounts like Administrator, Guest, and krbtgt are protected from deletion with a specific error message. A confirmation dialog is shown before deletion.

Move user between OUs by clicking the cyan move icon on any user row. A modal shows the current OU and provides a dropdown to select the target OU. The LDAP modify_dn operation is used with the relative DN (CN=username) and the new superior (target OU).

Enable and disable accounts by clicking the green enable or red disable icon. The userAccountControl attribute is modified by setting or clearing the 0x0002 (ACCOUNTDISABLE) bit.

Unlock locked accounts by clicking the orange unlock icon which only appears when the user is detected as locked. The lockoutTime attribute is set to 0 via LDAP modify. Lockout detection uses the domain lockoutDuration policy (cached for 1 hour) compared against the user's lockoutTime to determine if they are actually still locked or were auto-unlocked by the policy expiring.

Reset passwords by clicking the blue key icon. A modal asks for the new password (minimum 8 characters). The password is encoded as UTF-16-LE with surrounding quotes and set via the unicodePwd attribute using LDAP modify. An option to force the user to change password at next logon sets pwdLastSet to 0.

Bulk import users from CSV by clicking the green Bulk Import button. A modal provides three options: upload a CSV file, paste CSV text directly, or download a template CSV file. The template contains columns for username, firstName, lastName, displayName, email, password, department, and title. A preview table shows the first 10 rows before import. Import results show total, created count, failed count, and a list of errors with username and error message for each failure.

Bulk modify users by selecting multiple users with checkboxes, clicking the purple Bulk Actions dropdown, and selecting Bulk Modify. A modal shows checkboxes next to each modifiable field (department, title, company, office, phone, description, manager). Only checked fields are updated. The value entered in each checked field is applied to all selected users.

Bulk move users by selecting multiple and choosing Move to OU from the bulk actions menu. A modal shows the selected usernames and provides an OU dropdown. All selected users are moved to the chosen OU.

Bulk enable, disable, unlock, delete, and reset password operations are available through the bulk actions dropdown. For reset password, all selected users receive the same new password. For delete, Admin role is required and a confirmation warns that the action cannot be undone.

Multi-select is implemented with checkboxes on each row and a header checkbox for select all. When one or more users are selected, the purple Bulk Actions button appears showing the count of selected users. Selected rows are highlighted with a blue background tint.

Status filter dropdown allows filtering the displayed users by Active, Disabled, or Locked status, or showing All.

## 4.2 Group Management

View all groups displayed as responsive grid cards. Each card shows the group name, description (or "No description"), type badge colored blue for security or purple for distribution, member count with users icon, scope label, and a delete button that appears on hover. Clicking any card opens the group details modal.

Create new groups through a modal with fields for group name (required), description, target OU with dropdown, type selection dropdown for security or distribution, and scope selection dropdown for global, domain-local, or universal. The group is created with the appropriate groupType value calculated from the type and scope selections, handling the signed integer conversion for security groups.

Delete groups is restricted to Admin role. Built-in groups like Domain Admins, Domain Users, Enterprise Admins, Schema Admins, and over 30 other default Windows groups are protected from deletion with a specific error message. A confirmation dialog is shown.

View group members by clicking any group card. The detail modal shows three stat boxes for member count, group type, and scope. Below is a scrollable list of all members showing display name, username, email, and a remove button. Members are fetched by reading the member attribute of the group and then looking up each member's details via their Distinguished Name.

Add members by clicking the Add Member button in the group detail modal. A search modal appears where you can search for AD users by name or username. Results show display name, username, and email with an Add button next to each. Clicking Add immediately adds the user to the group via LDAP modify adding their DN to the member attribute.

Remove members by clicking the remove button (minus user icon) next to any member in the group detail modal. A confirmation is shown. The member is removed via LDAP modify deleting their DN from the member attribute.

Search groups by name using the search input above the grid.

## 4.3 Computer Management

View all computer accounts in a table with columns for checkbox, Computer (name with monitor icon and optional description), OS (operating system name and version), DNS Name (in monospace font), Last Logon (formatted date), Status (badge colored green for active, yellow for inactive meaning no logon in 90+ days, or red for disabled), and Actions.

Create computer accounts restricted to Admin role. The modal has fields for computer name (auto-uppercases input, validates for maximum 15 characters and alphanumeric plus hyphens only, shows the sAMAccountName that will be created with $ suffix), description, and target OU dropdown (defaults to CN=Computers). An info note explains that the actual computer must be joined to the domain using the corresponding name.

Delete computers restricted to Admin role with confirmation dialog.

Enable and disable computers by clicking the green or red monitor icons. The userAccountControl attribute is modified similar to user accounts.

Move computers between OUs by clicking the cyan move icon. A modal shows the current OU and provides a dropdown for the target OU.

Bulk operations available through the purple Bulk Actions dropdown when computers are selected: Enable Selected, Disable Selected, Move to OU (with progress bar showing completion), and Delete Selected (Admin only).

Status filter dropdown for All, Active, Inactive (no logon in 90+ days), and Disabled.

CSV export button downloads the currently filtered computer list as a CSV file with columns for Name, DNS Name, Operating System, OS Version, Status, Last Logon, and OU.

Multi-select with checkboxes, select all, and blue highlight on selected rows.

## 4.4 OU Management

Browse all Organizational Units in a searchable list. Each OU shows a folder icon, the OU name, and the full Distinguished Name in smaller text. On hover, a chevron right button and a delete (trash) button appear.

Create new OUs through a modal with fields for OU name (required), parent OU dropdown (selecting from all existing OUs with "Domain Root" as default), and description. A preview text shows the full DN that will be created based on the selected parent.

Delete empty OUs restricted to Admin role. A confirmation dialog warns that the OU must be empty (no users, groups, computers, or sub-OUs). If the OU contains objects, AD will reject the delete operation and the error is displayed.

Update OU description restricted to Admin role.

Click any OU to browse its contents. A modal opens showing four stat cards with counts for Users, Groups, Computers, and Sub-OUs, each with a colored icon (blue for users, green for groups, purple for computers, orange for sub-OUs). Below the stats, a tabbed interface shows tabs for All, OUs, Users, Groups, and Computers. Only tabs with content are displayed. Each item in the list shows its name, type-specific details (like enabled/disabled status for users and computers), and the appropriate icon. If the OU is empty, a message with a folder icon indicates it can be safely deleted.

Filter OUs by name using the search input that filters the main list as you type.

## 4.5 Service Accounts

Service accounts are special AD accounts used by applications and services. The Service Accounts feature creates and tracks these accounts in BOTH Active Directory AND the AD Manager Pro database simultaneously, providing centralized management and accountability.

Create service accounts through a comprehensive modal with multiple sections. Basic Information section has username field with recommendation for svc- prefix, display name (auto-fills as "Service: username" if left blank), and email (auto-fills as username@domain). Password section has a password field with minimum 12 characters (stricter than regular users), show/hide toggle, Generate button that creates a 20-character random password, and character count indicator. Documentation section has a purpose textarea describing what the account is used for, owner field for the responsible person, and department field defaulting to "Service Accounts". AD Settings section has target OU dropdown with recommendation to use a dedicated Service Accounts OU, checkbox for password never expires (default checked), checkbox for cannot change password (default checked), and system critical checkbox with red styling and star icon that prevents the account from being deleted through the application. AD Manager Pro Access section (optional, with purple styling) has a toggle to grant the service account access to the AD Manager Pro web interface, and when enabled, a role dropdown to select Admin, Helpdesk, or Viewer. When app access is granted, an entry is automatically created in the app_users table. Notes section has a textarea for additional information. A warning banner at the top of the modal explains that the account will be created in both AD and the database.

The creation process is atomic: Step 1 creates the user in AD using the two-step process (minimal attributes, then password, then UAC). Step 2 saves the metadata to the service_accounts table. Step 3 optionally adds to the app_users table if app access is granted. If Step 2 or 3 fails, the AD account created in Step 1 is rolled back by deleting it, ensuring consistency.

Import existing AD users as service accounts through a modal with two phases. Phase 1 shows a search input to find AD users. Search results display each user's display name, username, email, and a Plus button. Phase 2 (after selecting a user) shows the selected user's info with a Change button, and fields for purpose, owner, department, app access toggle, and role. Clicking Import adds the service account metadata to the database without modifying the AD user.

Edit service accounts through a modal showing the username and DN (not editable) and fields for display name, email, owner, department, purpose, description (synced to AD), system critical toggle, app access toggle with role selector, and notes. Changes to display name, email, description, and department are also applied to the AD user via LDAP modify.

Reset service account passwords through a modal with a password field (minimum 12 characters), show/hide toggle, Generate button, and character count. A warning explains that the password will be changed in AD and that other services using the account should be updated. The password is reset without force-change (service accounts should not be forced to change passwords). The last_password_change timestamp is updated in the database.

Delete service accounts with a confirmation dialog. System critical accounts are protected and cannot be deleted (the delete button is hidden and the API returns a 400 error). The deletion removes the account from the service_accounts table, the app_users table if it had app access, and optionally from Active Directory (controlled by the delete_ad parameter). If AD deletion fails, the database records are NOT removed and the error is displayed.

View service accounts in a responsive grid of cards. Each card has a color-coded icon (red for system critical, purple for app access, indigo for regular). Cards show badges for role (if app access), critical status (red star), password never expires, and cannot change password. Details include purpose text, owner, department, email, and last password change date. Action buttons at the bottom of each card provide Edit, Password reset, and Delete (hidden for critical accounts).

Filter stat cards at the top show Total (blue), System Critical (red), App Access (purple), and Regular (green) counts. Clicking any stat card filters the grid to show only that category. The currently active filter has a ring highlight.

Search by username, purpose, owner, or department using the search input.

## 4.6 User Templates

Create templates through a modal with sections for Basic Info (template name required and unique, description), Location (target OU dropdown with note about where users will be placed), Job Information (department, title, company, office, phone, manager DN), Groups (searchable checkbox list showing all AD groups with security/distribution type badges, selected count shown in section header), and Account Options (must change password at next logon toggle, password never expires toggle, account enabled toggle).

Create users from templates through a streamlined modal. The top section shows a preview of the template with the template name, description, and badges for department, title, OU, group count, and password policy. Below, only the unique user information is requested: username, email, first name, last name, display name (auto-fills from first+last), and password. A section at the bottom shows all settings that will be applied from the template. On submission, the user is created with template values for all pre-filled fields, and then automatically added to all groups specified in the template.

Template cards in the grid show the template name, creator, description, department with building icon, title with briefcase icon, office with map pin icon, first part of OU, group count badge in purple, password policy badges (password never expires in yellow, force change in orange), and a Create User from Template button at the bottom.

Search templates by name, description, or department.

Delete templates restricted to Admin role.

Info banner at the top of the page explains how templates work.

## 4.7 Workflow Approvals

Submit requests through a modal with a type selection grid showing six options with emoji icons and descriptions: Modify User (edit icon, update attributes), Create User (plus icon, create new account), Delete User (trash icon, delete account), Reset Password (key icon, reset password), Disable User (x icon, disable account), Enable User (check icon, enable account). Below the type grid, a target username field with context-sensitive placeholder text (e.g., "New username" for create, "Existing username" for others). Below that, dynamic detail fields that change based on the selected type: modify-user shows department, title, email, phone inputs; reset-password shows password input with force change toggle; create-user shows first name, last name, email, password inputs; other types show a note that no additional details are needed. A reason textarea at the bottom asks why the change is needed.

Request cards show a type emoji, type label, target username in monospace, status badge (yellow Pending, green Approved, blue Completed, red Rejected), reason text in a dark box, meta information including requester name with "you" indicator, timestamp, and approver if applicable. Rejection reason shown in a red-bordered box when rejected. Action buttons on the right: View for all requests, Approve (green) and Reject (red) for pending requests visible only to admins.

View request details through a modal showing info blocks for type, status (color-coded), target, request ID, requested by, created timestamp, approved/rejected by and timestamp if applicable. Reason section. Rejection reason section in red if rejected. Payload section showing the full JSON of requested changes in a pre-formatted code block.

Approve requests (Admin only) immediately executes the requested action in AD. The system calls the appropriate AD service method based on the request type. If execution succeeds, status is set to "completed". If it fails, status is set to "approved" (approved but not completed).

Reject requests (Admin only) through a modal requiring a rejection reason in a textarea. The requester sees this reason in their request card.

Status filter with clickable stat cards at the top: Pending (yellow), Approved (green), Completed (blue), Rejected (red). Clicking a card filters the list. A dropdown also provides the same filter options plus "All Requests". Each card shows the count and has a ring highlight when active.

Pending count badge shown as an orange number on the Workflows menu item in the sidebar. This count auto-refreshes every 30 seconds.

Non-admin users see only their own submitted requests. Admin users see all requests from all users.

## 4.8 GPO Management (Read-Only)

View all GPOs in a responsive grid of cards. Each card shows a purple shield icon, GPO name, GUID in monospace font, status badge (green Enabled, red Disabled, yellow User Disabled, orange Computer Disabled), user settings status dot (green or red), computer settings status dot (green or red), linked OU count, version number, and last modified date. Clicking any card opens the detail modal.

GPO detail modal shows the GPO name and GUID with a large purple shield icon. Four info boxes show Status, Version, User Settings (green Enabled or red Disabled), and Computer Settings. Below are boxes for SYSVOL Path and Distinguished Name in monospace. Date boxes show Created and Modified timestamps. A Linked OUs section lists all OUs that have this GPO linked, each showing the OU name, enforced badge if applicable, and enabled/disabled badge. A blue info note at the bottom explains that editing GPOs requires the Group Policy Management Console (gpmc.msc) on the Domain Controller.

OU Links tab shows a list of OUs that have GPOs linked. Each OU card shows a blue folder icon, OU name, Distinguished Name, and a count badge showing how many GPOs are linked. Below the header, each linked GPO is listed showing a purple shield icon, the resolved GPO name (looked up from the GUID), enforced badge (orange) if applicable, and enabled/disabled badge (green or red).

Stats cards at the top show Total GPOs (purple), Enabled (green), Disabled (red), Partial (yellow, meaning one setting disabled), and Linked to OUs (blue).

Search GPOs by name or GUID.

Filter by status dropdown: All Status, Enabled, Disabled, User Disabled, Computer Disabled.

CSV export button downloads the GPO list.

Two tabs: All GPOs (grid view) and OU Links (list view).

The get_gpos method uses a fallback search strategy, trying three locations in order: CN=Policies,CN=System,BaseDN, then CN=System,BaseDN, then BaseDN. This handles cases where the service account may not have read access to the specific Policies container.

## 4.9 User Photos

Upload photos through a modal with a file picker area (click to browse or drag and drop). When an image is selected, automatic client-side processing begins: the image is loaded into an HTML Image element, drawn onto a Canvas element with center-crop to square (using the minimum dimension and centering the crop area), resized to 200x200 pixels, then compressed as JPEG with quality starting at 0.85 and decreasing by 0.1 in a loop until the resulting blob is under 95KB (leaving room for the AD 100KB limit). The modal shows a side-by-side preview with the original image on the left and the cropped/resized version on the right, with the resulting file size displayed below. Buttons for Cancel, Change Image, and Upload Photo. The processed image is sent to the backend as multipart/form-data and stored in AD as the thumbnailPhoto attribute.

View photos in a responsive grid (2 to 6 columns depending on screen width). Each user card shows their photo in an aspect-square container (or a large person icon placeholder if no photo), display name, username, department if available, and action buttons. A zoom icon appears on hover over photos. Clicking the zoom opens a preview modal showing the photo at full size.

Delete photos by clicking the trash button on the user card. Confirmation is not required (immediate deletion). The thumbnailPhoto attribute is set to an empty value via LDAP modify.

Filter by dropdown: All Users, With Photo, Without Photo.

Stats cards show Total Users (blue), With Photo (green), Without Photo (yellow).

Info banner explains AD requirements: photos stored as thumbnailPhoto attribute, max 100KB, recommended 96x96 pixels in JPEG format, photos appear in Outlook, Teams, and SharePoint.

Cache busting: a refresh key (integer) is incremented after every upload or delete. This key is appended as a query parameter to all image URLs (e.g., /api/users/john/photo?t=5) forcing the browser to fetch the updated image instead of using a cached version.

getUserPhotoUrl function in api.js constructs the photo URL using window.location.origin as the base (since the API_URL may be empty for relative URLs), ensuring photos load correctly regardless of how the application is accessed.

## 4.10 Active Sessions

Session cards displayed in a list format. Each card shows a colored avatar circle with the first letter of the display name (red background for Admin, yellow for Helpdesk, blue for Viewer), display name with YOU badge if it is the current user's session, Active badge (green with pulsing dot) or Idle badge (yellow with clock icon), role badge, and username. Detail section shows four items: IP Address (with map pin icon, monospace), Device info (parsed from User-Agent showing browser and OS with device icon), Login Time (relative like "5m ago" with full timestamp on hover), and Last Activity (relative, highlighted green if active).

Active/Idle determination: a session is considered Active if the last_activity timestamp is within 5 minutes of the current time, otherwise Idle. The last_activity is updated on every authenticated API request by the get_current_user dependency.

Device detection parses the User-Agent header string to identify: browser (Chrome, Firefox, Safari, Edge), OS (Windows, macOS, Linux, Android, iOS), and selects an appropriate icon (Monitor for desktop, Smartphone for mobile).

Auto-refresh toggle with a green button showing spinning refresh icon when enabled. When on, the session list is reloaded every 30 seconds. Default is enabled.

Force logout by clicking the red Force Out button on any session card (Admin only). A confirmation dialog warns when terminating your own session. The session record is deleted from the active_sessions table, effectively invalidating the user's JWT token since it will no longer match any session hash.

Session detail modal shows a large avatar, display name with YOU badge, username, and sections for User info (username, display name, role, session ID) and Connection info (IP address, login time, last activity, duration calculation) and Device Info (complete User-Agent string in monospace).

Auto-expire: sessions older than 8 hours (based on last_activity) are automatically cleaned up on every page load via a database query that deletes expired records.

Stats cards: Total Sessions (blue), Currently Active (green), Idle (yellow), Admin Sessions (red).

Search by username, display name, or IP address.

Green badge on Sessions menu item in sidebar showing active session count, visible only to Admin users.

Sessions page is restricted to Admin role via AdminRoute wrapper.

## 4.11 Reports and Analytics

Dashboard layout inspired by ManageEngine ADManager Plus with multiple chart sections.

Domain indicator at the top showing the domain name with a building icon.

Top row: 4 QuickStatCards with gradient backgrounds (blue-to-dark-blue). Each shows a large icon, count number, label, and an action link. Cards: Locked Out Users with lock icon and Unlock link, Passwords Never Expire with key icon and View Details link, Must Change Password with key icon and Options link, Inactive Users (30+ days total) with clock icon and Options link.

User Reports card: Vertical BarChart using Recharts with CartesianGrid, XAxis, YAxis, Tooltip (dark themed), and Bar with individual Cell colors. Data points: Total Users (cyan #06b6d4), Inactive 30 days (green #22c55e), Disabled Users (pink #ec4899), Locked Users (blue #3b82f6), Password Expired (purple #a855f7). Below the chart, a LegendRow table repeats each metric with a colored square swatch, label, and right-aligned count.

System Reports card: Similar vertical BarChart for computers showing Total Computers (cyan), Inactive Computers (green), Disabled Computers (pink), Active Workstations (blue), with legend table.

Logged On User Report card: Horizontal BarChart (layout="vertical") showing Users Never Logged On (cyan), Recently Logged 30 days (green), Recently Bad Logged 30 days (pink), Password Expiring 7 days (blue).

Groups and OU Reports card: Horizontal BarChart showing Number of Groups (cyan), Security Groups (green), Distribution Groups (blue), Groups Without Members (purple), Number of OUs (orange).

Users by Department: PieChart showing top 8 departments with percentage labels on slices, using a color palette of cyan, green, blue, purple, orange, pink, emerald, and violet. Data loaded from getUsersByDepartment API endpoint.

Computers by Operating System: PieChart showing OS distribution with percentage labels. Data loaded from getComputersByOS API endpoint.

Quick Export section at the bottom with a Download icon header and description. Grid of export buttons for: All Users, Inactive Users, Never Logged In, Disabled Users, Locked Users, All Groups, All Computers. Each button downloads a CSV file.

All charts use Recharts ResponsiveContainer for automatic sizing, dark-themed Tooltip with slate background, and consistent color coding.

## 4.12 Audit Logging

Table with columns: Time (formatted locale string), Operator (username), Action, Target (object name), Status (green Success or red Failed badge), and IP address.

Header shows entry count with Export CSV button (download icon) and Refresh button.

All data fetched from GET /api/audit-logs with pagination support (skip and limit parameters).

CSV export downloads the complete audit log as a file named audit-YYYYMMDD.csv.

## 4.13 Settings

Four tabs with icons and colored indicators.

Active Directory tab (blue Database icon): Fields for Primary DC IP/Hostname (required), Secondary DC (optional failover), Domain Name (required), Service Account UPN (required), Base DN (required, full width), Default User OU (full width), Service Account Password with show/hide eye toggle (required), Protocol radio buttons for LDAPS port 636 with lock icon labeled "Encrypted" and LDAP port 389 labeled "Plain" where selecting either auto-updates the port field, Port number field. Test Connection button (flask icon) validates settings without saving. Save Settings button (save icon). Below the main form, a yellow-bordered section for Change Service Account Password with expandable UI: when collapsed shows a yellow button "Change Service Account Password" with key icon; when expanded shows fields for current password (optional verification), new password with show/hide toggle and Generate button creating 24-character random password, confirm password with match/mismatch indicator, warning about updating other services, and Change Password button that simultaneously updates both AD and database settings with verification.

Visibility tab (cyan Eye icon, NEW green badge): Info banner explaining the feature. Three ToggleRow components displayed as clickable cards. Each shows a label, SHOWING (cyan) or HIDDEN (gray) badge, description, example objects in code tags, and a large toggle icon (ToggleRight when on, ToggleLeft when off). Toggles: Show Built-in Users (Administrator, Guest, krbtgt, DefaultAccount), Show Built-in Groups (Domain Admins, Domain Users, Enterprise Admins, Schema Admins), Show Built-in Containers (CN=Users, CN=Builtin, CN=Computers, CN=System). Yellow warning banner recommending keeping hidden in production. Save Visibility Settings button.

Password Policy tab (yellow Lock icon): Note explaining these are display-only settings. Fields for Minimum Length (number), Max Password Age in days (number), Password History Count (number, full width). Checkbox grid with Require Uppercase Letter, Require Lowercase Letter, Require Number, Require Special Character. Save Password Policy button.

Email SMTP tab (green Mail icon): Fields for SMTP Server, SMTP Port (default 587), SMTP Username, SMTP Password with show/hide toggle, From Email, Admin Email for test and alerts. Notification Options section with checkboxes for Notify on Account Lockout and Notify on Password Expiry. Send Test Email button (send icon). Save Email Settings button.

All settings stored in app_settings table. Encrypted keys masked as "********" in API responses. Settings auto-reload on save without restart. Password change verifies connection after update.

## 4.14 App User Management

Table showing all authorized users with columns for ID, Username, Display Name, Email, Role, Active status, and Last Login timestamp.

Add user form with username, display name, email, and role dropdown (Admin, Helpdesk, Viewer).

Delete user with protection against deleting your own account.

Login requires BOTH: an active entry in app_users AND valid AD credentials via LDAP bind. Case-insensitive username matching using ilike.

## 4.15 Built-in Object Filtering

Three maintained Python lists: BUILTIN_USERS with 7 default account names, BUILTIN_GROUPS with 35+ default group names, BUILTIN_CONTAINERS with 6 default container paths.

Helper functions is_builtin_user, is_builtin_group, and is_in_builtin_container check membership.

When show_builtin settings are false, get_users and get_groups methods skip objects matching these lists. Reports also use show_builtin=False to exclude built-in objects from statistics.

Settings toggles in the Visibility tab control these independently for users, groups, and containers.

## 4.16 Dual Protocol Access

HTTPS on port 8443 using self-signed SSL certificates for encrypted communication. HTTP on port 8080 without any SSL for certificate-free access.

Both services can run simultaneously as separate Windows Scheduled Tasks using separate batch files (start_production.bat for HTTPS and start_http.bat for HTTP).

The frontend uses empty VITE_API_URL configuration so Axios sends API requests using relative URLs. This means when a user accesses http://server:8080, all API calls go to http://server:8080/api/... and when a user accesses https://server:8443, all API calls go to https://server:8443/api/... without any configuration change or rebuild.

## 4.17 Certificate Help Page

Accessible at /cert-help, this is a styled HTML page served directly from the backend (not React). It uses inline CSS with a dark theme matching the application.

Option 1 Quick Fix: A button linking to /api/health. Clicking opens the health endpoint in a new tab. If the browser shows a certificate warning, accepting it trusts the certificate for the session. After seeing the JSON response, a link sends the user back to the login page.

Option 2 Install Certificate: A green button to download the certificate file via /api/download-cert (served with content type application/x-x509-ca-cert and filename ADManagerPro.crt). Step-by-step numbered instructions for installing: double-click the file, Install Certificate, Local Machine, Place in Trusted Root Certification Authorities, finish, close all browsers, reopen.

Option 3 Use HTTP: A purple button linking to the HTTP version of the application. A note explains that HTTP is less secure but works without certificates and should only be used on trusted internal networks.

IT Administrator note at the bottom recommends deploying the certificate via Group Policy for automatic trust on all domain computers.

---

# 4. COMPLETE FEATURES LIST

## 4.1 User Management

View all AD users with real-time search by name, username, email, or department as you type. Filter by status using a dropdown with options for All, Active, Disabled, and Locked. Users are displayed in a table with columns for User (showing display name and username), Email, Department, Status badge, and Actions.

Create single user with a comprehensive modal form including fields for username (sAMAccountName), first name, last name, display name (auto-filled from first and last name if left blank), email, department, job title, password (minimum 8 characters), target OU with dropdown listing all OUs from AD, checkbox for must change password at next logon (default checked), and checkbox for password never expires (default unchecked). The user is created using a two-step LDAP process: first creating the account with minimal attributes (no empty strings, no userAccountControl), then setting the password via unicodePwd modify, then enabling the account by setting userAccountControl to 512 or 66048 via modify.

Edit user attributes through a modal organized in four sections. Personal Information section contains first name, last name, display name, email, and UPN fields. Job Information section contains title, department, company, office, and phone fields. Additional section contains description and manager DN fields. Account Options section contains checkbox toggles for password never expires and account disabled with descriptive labels and sublabels.

Delete user is restricted to Admin role only. Built-in accounts like Administrator, Guest, and krbtgt are protected from deletion with a specific error message. A confirmation dialog is shown before deletion.

Move user between OUs by clicking the cyan move icon on any user row. A modal shows the current OU and provides a dropdown to select the target OU. The LDAP modify_dn operation is used with the relative DN (CN=username) and the new superior (target OU).

Enable and disable accounts by clicking the green enable or red disable icon. The userAccountControl attribute is modified by setting or clearing the 0x0002 (ACCOUNTDISABLE) bit.

Unlock locked accounts by clicking the orange unlock icon which only appears when the user is detected as locked. The lockoutTime attribute is set to 0 via LDAP modify. Lockout detection uses the domain lockoutDuration policy (cached for 1 hour) compared against the user's lockoutTime to determine if they are actually still locked or were auto-unlocked by the policy expiring.

Reset passwords by clicking the blue key icon. A modal asks for the new password (minimum 8 characters). The password is encoded as UTF-16-LE with surrounding quotes and set via the unicodePwd attribute using LDAP modify. An option to force the user to change password at next logon sets pwdLastSet to 0.

Bulk import users from CSV by clicking the green Bulk Import button. A modal provides three options: upload a CSV file, paste CSV text directly, or download a template CSV file. The template contains columns for username, firstName, lastName, displayName, email, password, department, and title. A preview table shows the first 10 rows before import. Import results show total, created count, failed count, and a list of errors with username and error message for each failure.

Bulk modify users by selecting multiple users with checkboxes, clicking the purple Bulk Actions dropdown, and selecting Bulk Modify. A modal shows checkboxes next to each modifiable field (department, title, company, office, phone, description, manager). Only checked fields are updated. The value entered in each checked field is applied to all selected users.

Bulk move users by selecting multiple and choosing Move to OU from the bulk actions menu. A modal shows the selected usernames and provides an OU dropdown. All selected users are moved to the chosen OU.

Bulk enable, disable, unlock, delete, and reset password operations are available through the bulk actions dropdown. For reset password, all selected users receive the same new password. For delete, Admin role is required and a confirmation warns that the action cannot be undone.

Multi-select is implemented with checkboxes on each row and a header checkbox for select all. When one or more users are selected, the purple Bulk Actions button appears showing the count of selected users. Selected rows are highlighted with a blue background tint.

Status filter dropdown allows filtering the displayed users by Active, Disabled, or Locked status, or showing All.

## 4.2 Group Management

View all groups displayed as responsive grid cards. Each card shows the group name, description (or "No description"), type badge colored blue for security or purple for distribution, member count with users icon, scope label, and a delete button that appears on hover. Clicking any card opens the group details modal.

Create new groups through a modal with fields for group name (required), description, target OU with dropdown, type selection dropdown for security or distribution, and scope selection dropdown for global, domain-local, or universal. The group is created with the appropriate groupType value calculated from the type and scope selections, handling the signed integer conversion for security groups.

Delete groups is restricted to Admin role. Built-in groups like Domain Admins, Domain Users, Enterprise Admins, Schema Admins, and over 30 other default Windows groups are protected from deletion with a specific error message. A confirmation dialog is shown.

View group members by clicking any group card. The detail modal shows three stat boxes for member count, group type, and scope. Below is a scrollable list of all members showing display name, username, email, and a remove button. Members are fetched by reading the member attribute of the group and then looking up each member's details via their Distinguished Name.

Add members by clicking the Add Member button in the group detail modal. A search modal appears where you can search for AD users by name or username. Results show display name, username, and email with an Add button next to each. Clicking Add immediately adds the user to the group via LDAP modify adding their DN to the member attribute.

Remove members by clicking the remove button (minus user icon) next to any member in the group detail modal. A confirmation is shown. The member is removed via LDAP modify deleting their DN from the member attribute.

Search groups by name using the search input above the grid.

## 4.3 Computer Management

View all computer accounts in a table with columns for checkbox, Computer (name with monitor icon and optional description), OS (operating system name and version), DNS Name (in monospace font), Last Logon (formatted date), Status (badge colored green for active, yellow for inactive meaning no logon in 90+ days, or red for disabled), and Actions.

Create computer accounts restricted to Admin role. The modal has fields for computer name (auto-uppercases input, validates for maximum 15 characters and alphanumeric plus hyphens only, shows the sAMAccountName that will be created with $ suffix), description, and target OU dropdown (defaults to CN=Computers). An info note explains that the actual computer must be joined to the domain using the corresponding name.

Delete computers restricted to Admin role with confirmation dialog.

Enable and disable computers by clicking the green or red monitor icons. The userAccountControl attribute is modified similar to user accounts.

Move computers between OUs by clicking the cyan move icon. A modal shows the current OU and provides a dropdown for the target OU.

Bulk operations available through the purple Bulk Actions dropdown when computers are selected: Enable Selected, Disable Selected, Move to OU (with progress bar showing completion), and Delete Selected (Admin only).

Status filter dropdown for All, Active, Inactive (no logon in 90+ days), and Disabled.

CSV export button downloads the currently filtered computer list as a CSV file with columns for Name, DNS Name, Operating System, OS Version, Status, Last Logon, and OU.

Multi-select with checkboxes, select all, and blue highlight on selected rows.

## 4.4 OU Management

Browse all Organizational Units in a searchable list. Each OU shows a folder icon, the OU name, and the full Distinguished Name in smaller text. On hover, a chevron right button and a delete (trash) button appear.

Create new OUs through a modal with fields for OU name (required), parent OU dropdown (selecting from all existing OUs with "Domain Root" as default), and description. A preview text shows the full DN that will be created based on the selected parent.

Delete empty OUs restricted to Admin role. A confirmation dialog warns that the OU must be empty (no users, groups, computers, or sub-OUs). If the OU contains objects, AD will reject the delete operation and the error is displayed.

Update OU description restricted to Admin role.

Click any OU to browse its contents. A modal opens showing four stat cards with counts for Users, Groups, Computers, and Sub-OUs, each with a colored icon (blue for users, green for groups, purple for computers, orange for sub-OUs). Below the stats, a tabbed interface shows tabs for All, OUs, Users, Groups, and Computers. Only tabs with content are displayed. Each item in the list shows its name, type-specific details (like enabled/disabled status for users and computers), and the appropriate icon. If the OU is empty, a message with a folder icon indicates it can be safely deleted.

Filter OUs by name using the search input that filters the main list as you type.

## 4.5 Service Accounts

Service accounts are special AD accounts used by applications and services. The Service Accounts feature creates and tracks these accounts in BOTH Active Directory AND the AD Manager Pro database simultaneously, providing centralized management and accountability.

Create service accounts through a comprehensive modal with multiple sections. Basic Information section has username field with recommendation for svc- prefix, display name (auto-fills as "Service: username" if left blank), and email (auto-fills as username@domain). Password section has a password field with minimum 12 characters (stricter than regular users), show/hide toggle, Generate button that creates a 20-character random password, and character count indicator. Documentation section has a purpose textarea describing what the account is used for, owner field for the responsible person, and department field defaulting to "Service Accounts". AD Settings section has target OU dropdown with recommendation to use a dedicated Service Accounts OU, checkbox for password never expires (default checked), checkbox for cannot change password (default checked), and system critical checkbox with red styling and star icon that prevents the account from being deleted through the application. AD Manager Pro Access section (optional, with purple styling) has a toggle to grant the service account access to the AD Manager Pro web interface, and when enabled, a role dropdown to select Admin, Helpdesk, or Viewer. When app access is granted, an entry is automatically created in the app_users table. Notes section has a textarea for additional information. A warning banner at the top of the modal explains that the account will be created in both AD and the database.

The creation process is atomic: Step 1 creates the user in AD using the two-step process (minimal attributes, then password, then UAC). Step 2 saves the metadata to the service_accounts table. Step 3 optionally adds to the app_users table if app access is granted. If Step 2 or 3 fails, the AD account created in Step 1 is rolled back by deleting it, ensuring consistency.

Import existing AD users as service accounts through a modal with two phases. Phase 1 shows a search input to find AD users. Search results display each user's display name, username, email, and a Plus button. Phase 2 (after selecting a user) shows the selected user's info with a Change button, and fields for purpose, owner, department, app access toggle, and role. Clicking Import adds the service account metadata to the database without modifying the AD user.

Edit service accounts through a modal showing the username and DN (not editable) and fields for display name, email, owner, department, purpose, description (synced to AD), system critical toggle, app access toggle with role selector, and notes. Changes to display name, email, description, and department are also applied to the AD user via LDAP modify.

Reset service account passwords through a modal with a password field (minimum 12 characters), show/hide toggle, Generate button, and character count. A warning explains that the password will be changed in AD and that other services using the account should be updated. The password is reset without force-change (service accounts should not be forced to change passwords). The last_password_change timestamp is updated in the database.

Delete service accounts with a confirmation dialog. System critical accounts are protected and cannot be deleted (the delete button is hidden and the API returns a 400 error). The deletion removes the account from the service_accounts table, the app_users table if it had app access, and optionally from Active Directory (controlled by the delete_ad parameter). If AD deletion fails, the database records are NOT removed and the error is displayed.

View service accounts in a responsive grid of cards. Each card has a color-coded icon (red for system critical, purple for app access, indigo for regular). Cards show badges for role (if app access), critical status (red star), password never expires, and cannot change password. Details include purpose text, owner, department, email, and last password change date. Action buttons at the bottom of each card provide Edit, Password reset, and Delete (hidden for critical accounts).

Filter stat cards at the top show Total (blue), System Critical (red), App Access (purple), and Regular (green) counts. Clicking any stat card filters the grid to show only that category. The currently active filter has a ring highlight.

Search by username, purpose, owner, or department using the search input.

## 4.6 User Templates

Create templates through a modal with sections for Basic Info (template name required and unique, description), Location (target OU dropdown with note about where users will be placed), Job Information (department, title, company, office, phone, manager DN), Groups (searchable checkbox list showing all AD groups with security/distribution type badges, selected count shown in section header), and Account Options (must change password at next logon toggle, password never expires toggle, account enabled toggle).

Create users from templates through a streamlined modal. The top section shows a preview of the template with the template name, description, and badges for department, title, OU, group count, and password policy. Below, only the unique user information is requested: username, email, first name, last name, display name (auto-fills from first+last), and password. A section at the bottom shows all settings that will be applied from the template. On submission, the user is created with template values for all pre-filled fields, and then automatically added to all groups specified in the template.

Template cards in the grid show the template name, creator, description, department with building icon, title with briefcase icon, office with map pin icon, first part of OU, group count badge in purple, password policy badges (password never expires in yellow, force change in orange), and a Create User from Template button at the bottom.

Search templates by name, description, or department.

Delete templates restricted to Admin role.

Info banner at the top of the page explains how templates work.

## 4.7 Workflow Approvals

Submit requests through a modal with a type selection grid showing six options with emoji icons and descriptions: Modify User (edit icon, update attributes), Create User (plus icon, create new account), Delete User (trash icon, delete account), Reset Password (key icon, reset password), Disable User (x icon, disable account), Enable User (check icon, enable account). Below the type grid, a target username field with context-sensitive placeholder text (e.g., "New username" for create, "Existing username" for others). Below that, dynamic detail fields that change based on the selected type: modify-user shows department, title, email, phone inputs; reset-password shows password input with force change toggle; create-user shows first name, last name, email, password inputs; other types show a note that no additional details are needed. A reason textarea at the bottom asks why the change is needed.

Request cards show a type emoji, type label, target username in monospace, status badge (yellow Pending, green Approved, blue Completed, red Rejected), reason text in a dark box, meta information including requester name with "you" indicator, timestamp, and approver if applicable. Rejection reason shown in a red-bordered box when rejected. Action buttons on the right: View for all requests, Approve (green) and Reject (red) for pending requests visible only to admins.

View request details through a modal showing info blocks for type, status (color-coded), target, request ID, requested by, created timestamp, approved/rejected by and timestamp if applicable. Reason section. Rejection reason section in red if rejected. Payload section showing the full JSON of requested changes in a pre-formatted code block.

Approve requests (Admin only) immediately executes the requested action in AD. The system calls the appropriate AD service method based on the request type. If execution succeeds, status is set to "completed". If it fails, status is set to "approved" (approved but not completed).

Reject requests (Admin only) through a modal requiring a rejection reason in a textarea. The requester sees this reason in their request card.

Status filter with clickable stat cards at the top: Pending (yellow), Approved (green), Completed (blue), Rejected (red). Clicking a card filters the list. A dropdown also provides the same filter options plus "All Requests". Each card shows the count and has a ring highlight when active.

Pending count badge shown as an orange number on the Workflows menu item in the sidebar. This count auto-refreshes every 30 seconds.

Non-admin users see only their own submitted requests. Admin users see all requests from all users.

## 4.8 GPO Management (Read-Only)

View all GPOs in a responsive grid of cards. Each card shows a purple shield icon, GPO name, GUID in monospace font, status badge (green Enabled, red Disabled, yellow User Disabled, orange Computer Disabled), user settings status dot (green or red), computer settings status dot (green or red), linked OU count, version number, and last modified date. Clicking any card opens the detail modal.

GPO detail modal shows the GPO name and GUID with a large purple shield icon. Four info boxes show Status, Version, User Settings (green Enabled or red Disabled), and Computer Settings. Below are boxes for SYSVOL Path and Distinguished Name in monospace. Date boxes show Created and Modified timestamps. A Linked OUs section lists all OUs that have this GPO linked, each showing the OU name, enforced badge if applicable, and enabled/disabled badge. A blue info note at the bottom explains that editing GPOs requires the Group Policy Management Console (gpmc.msc) on the Domain Controller.

OU Links tab shows a list of OUs that have GPOs linked. Each OU card shows a blue folder icon, OU name, Distinguished Name, and a count badge showing how many GPOs are linked. Below the header, each linked GPO is listed showing a purple shield icon, the resolved GPO name (looked up from the GUID), enforced badge (orange) if applicable, and enabled/disabled badge (green or red).

Stats cards at the top show Total GPOs (purple), Enabled (green), Disabled (red), Partial (yellow, meaning one setting disabled), and Linked to OUs (blue).

Search GPOs by name or GUID.

Filter by status dropdown: All Status, Enabled, Disabled, User Disabled, Computer Disabled.

CSV export button downloads the GPO list.

Two tabs: All GPOs (grid view) and OU Links (list view).

The get_gpos method uses a fallback search strategy, trying three locations in order: CN=Policies,CN=System,BaseDN, then CN=System,BaseDN, then BaseDN. This handles cases where the service account may not have read access to the specific Policies container.

## 4.9 User Photos

Upload photos through a modal with a file picker area (click to browse or drag and drop). When an image is selected, automatic client-side processing begins: the image is loaded into an HTML Image element, drawn onto a Canvas element with center-crop to square (using the minimum dimension and centering the crop area), resized to 200x200 pixels, then compressed as JPEG with quality starting at 0.85 and decreasing by 0.1 in a loop until the resulting blob is under 95KB (leaving room for the AD 100KB limit). The modal shows a side-by-side preview with the original image on the left and the cropped/resized version on the right, with the resulting file size displayed below. Buttons for Cancel, Change Image, and Upload Photo. The processed image is sent to the backend as multipart/form-data and stored in AD as the thumbnailPhoto attribute.

View photos in a responsive grid (2 to 6 columns depending on screen width). Each user card shows their photo in an aspect-square container (or a large person icon placeholder if no photo), display name, username, department if available, and action buttons. A zoom icon appears on hover over photos. Clicking the zoom opens a preview modal showing the photo at full size.

Delete photos by clicking the trash button on the user card. Confirmation is not required (immediate deletion). The thumbnailPhoto attribute is set to an empty value via LDAP modify.

Filter by dropdown: All Users, With Photo, Without Photo.

Stats cards show Total Users (blue), With Photo (green), Without Photo (yellow).

Info banner explains AD requirements: photos stored as thumbnailPhoto attribute, max 100KB, recommended 96x96 pixels in JPEG format, photos appear in Outlook, Teams, and SharePoint.

Cache busting: a refresh key (integer) is incremented after every upload or delete. This key is appended as a query parameter to all image URLs (e.g., /api/users/john/photo?t=5) forcing the browser to fetch the updated image instead of using a cached version.

getUserPhotoUrl function in api.js constructs the photo URL using window.location.origin as the base (since the API_URL may be empty for relative URLs), ensuring photos load correctly regardless of how the application is accessed.

## 4.10 Active Sessions

Session cards displayed in a list format. Each card shows a colored avatar circle with the first letter of the display name (red background for Admin, yellow for Helpdesk, blue for Viewer), display name with YOU badge if it is the current user's session, Active badge (green with pulsing dot) or Idle badge (yellow with clock icon), role badge, and username. Detail section shows four items: IP Address (with map pin icon, monospace), Device info (parsed from User-Agent showing browser and OS with device icon), Login Time (relative like "5m ago" with full timestamp on hover), and Last Activity (relative, highlighted green if active).

Active/Idle determination: a session is considered Active if the last_activity timestamp is within 5 minutes of the current time, otherwise Idle. The last_activity is updated on every authenticated API request by the get_current_user dependency.

Device detection parses the User-Agent header string to identify: browser (Chrome, Firefox, Safari, Edge), OS (Windows, macOS, Linux, Android, iOS), and selects an appropriate icon (Monitor for desktop, Smartphone for mobile).

Auto-refresh toggle with a green button showing spinning refresh icon when enabled. When on, the session list is reloaded every 30 seconds. Default is enabled.

Force logout by clicking the red Force Out button on any session card (Admin only). A confirmation dialog warns when terminating your own session. The session record is deleted from the active_sessions table, effectively invalidating the user's JWT token since it will no longer match any session hash.

Session detail modal shows a large avatar, display name with YOU badge, username, and sections for User info (username, display name, role, session ID) and Connection info (IP address, login time, last activity, duration calculation) and Device Info (complete User-Agent string in monospace).

Auto-expire: sessions older than 8 hours (based on last_activity) are automatically cleaned up on every page load via a database query that deletes expired records.

Stats cards: Total Sessions (blue), Currently Active (green), Idle (yellow), Admin Sessions (red).

Search by username, display name, or IP address.

Green badge on Sessions menu item in sidebar showing active session count, visible only to Admin users.

Sessions page is restricted to Admin role via AdminRoute wrapper.

## 4.11 Reports and Analytics

Dashboard layout inspired by ManageEngine ADManager Plus with multiple chart sections.

Domain indicator at the top showing the domain name with a building icon.

Top row: 4 QuickStatCards with gradient backgrounds (blue-to-dark-blue). Each shows a large icon, count number, label, and an action link. Cards: Locked Out Users with lock icon and Unlock link, Passwords Never Expire with key icon and View Details link, Must Change Password with key icon and Options link, Inactive Users (30+ days total) with clock icon and Options link.

User Reports card: Vertical BarChart using Recharts with CartesianGrid, XAxis, YAxis, Tooltip (dark themed), and Bar with individual Cell colors. Data points: Total Users (cyan #06b6d4), Inactive 30 days (green #22c55e), Disabled Users (pink #ec4899), Locked Users (blue #3b82f6), Password Expired (purple #a855f7). Below the chart, a LegendRow table repeats each metric with a colored square swatch, label, and right-aligned count.

System Reports card: Similar vertical BarChart for computers showing Total Computers (cyan), Inactive Computers (green), Disabled Computers (pink), Active Workstations (blue), with legend table.

Logged On User Report card: Horizontal BarChart (layout="vertical") showing Users Never Logged On (cyan), Recently Logged 30 days (green), Recently Bad Logged 30 days (pink), Password Expiring 7 days (blue).

Groups and OU Reports card: Horizontal BarChart showing Number of Groups (cyan), Security Groups (green), Distribution Groups (blue), Groups Without Members (purple), Number of OUs (orange).

Users by Department: PieChart showing top 8 departments with percentage labels on slices, using a color palette of cyan, green, blue, purple, orange, pink, emerald, and violet. Data loaded from getUsersByDepartment API endpoint.

Computers by Operating System: PieChart showing OS distribution with percentage labels. Data loaded from getComputersByOS API endpoint.

Quick Export section at the bottom with a Download icon header and description. Grid of export buttons for: All Users, Inactive Users, Never Logged In, Disabled Users, Locked Users, All Groups, All Computers. Each button downloads a CSV file.

All charts use Recharts ResponsiveContainer for automatic sizing, dark-themed Tooltip with slate background, and consistent color coding.

## 4.12 Audit Logging

Table with columns: Time (formatted locale string), Operator (username), Action, Target (object name), Status (green Success or red Failed badge), and IP address.

Header shows entry count with Export CSV button (download icon) and Refresh button.

All data fetched from GET /api/audit-logs with pagination support (skip and limit parameters).

CSV export downloads the complete audit log as a file named audit-YYYYMMDD.csv.

## 4.13 Settings

Four tabs with icons and colored indicators.

Active Directory tab (blue Database icon): Fields for Primary DC IP/Hostname (required), Secondary DC (optional failover), Domain Name (required), Service Account UPN (required), Base DN (required, full width), Default User OU (full width), Service Account Password with show/hide eye toggle (required), Protocol radio buttons for LDAPS port 636 with lock icon labeled "Encrypted" and LDAP port 389 labeled "Plain" where selecting either auto-updates the port field, Port number field. Test Connection button (flask icon) validates settings without saving. Save Settings button (save icon). Below the main form, a yellow-bordered section for Change Service Account Password with expandable UI: when collapsed shows a yellow button "Change Service Account Password" with key icon; when expanded shows fields for current password (optional verification), new password with show/hide toggle and Generate button creating 24-character random password, confirm password with match/mismatch indicator, warning about updating other services, and Change Password button that simultaneously updates both AD and database settings with verification.

Visibility tab (cyan Eye icon, NEW green badge): Info banner explaining the feature. Three ToggleRow components displayed as clickable cards. Each shows a label, SHOWING (cyan) or HIDDEN (gray) badge, description, example objects in code tags, and a large toggle icon (ToggleRight when on, ToggleLeft when off). Toggles: Show Built-in Users (Administrator, Guest, krbtgt, DefaultAccount), Show Built-in Groups (Domain Admins, Domain Users, Enterprise Admins, Schema Admins), Show Built-in Containers (CN=Users, CN=Builtin, CN=Computers, CN=System). Yellow warning banner recommending keeping hidden in production. Save Visibility Settings button.

Password Policy tab (yellow Lock icon): Note explaining these are display-only settings. Fields for Minimum Length (number), Max Password Age in days (number), Password History Count (number, full width). Checkbox grid with Require Uppercase Letter, Require Lowercase Letter, Require Number, Require Special Character. Save Password Policy button.

Email SMTP tab (green Mail icon): Fields for SMTP Server, SMTP Port (default 587), SMTP Username, SMTP Password with show/hide toggle, From Email, Admin Email for test and alerts. Notification Options section with checkboxes for Notify on Account Lockout and Notify on Password Expiry. Send Test Email button (send icon). Save Email Settings button.

All settings stored in app_settings table. Encrypted keys masked as "********" in API responses. Settings auto-reload on save without restart. Password change verifies connection after update.

## 4.14 App User Management

Table showing all authorized users with columns for ID, Username, Display Name, Email, Role, Active status, and Last Login timestamp.

Add user form with username, display name, email, and role dropdown (Admin, Helpdesk, Viewer).

Delete user with protection against deleting your own account.

Login requires BOTH: an active entry in app_users AND valid AD credentials via LDAP bind. Case-insensitive username matching using ilike.

## 4.15 Built-in Object Filtering

Three maintained Python lists: BUILTIN_USERS with 7 default account names, BUILTIN_GROUPS with 35+ default group names, BUILTIN_CONTAINERS with 6 default container paths.

Helper functions is_builtin_user, is_builtin_group, and is_in_builtin_container check membership.

When show_builtin settings are false, get_users and get_groups methods skip objects matching these lists. Reports also use show_builtin=False to exclude built-in objects from statistics.

Settings toggles in the Visibility tab control these independently for users, groups, and containers.

## 4.16 Dual Protocol Access

HTTPS on port 8443 using self-signed SSL certificates for encrypted communication. HTTP on port 8080 without any SSL for certificate-free access.

Both services can run simultaneously as separate Windows Scheduled Tasks using separate batch files (start_production.bat for HTTPS and start_http.bat for HTTP).

The frontend uses empty VITE_API_URL configuration so Axios sends API requests using relative URLs. This means when a user accesses http://server:8080, all API calls go to http://server:8080/api/... and when a user accesses https://server:8443, all API calls go to https://server:8443/api/... without any configuration change or rebuild.

## 4.17 Certificate Help Page

Accessible at /cert-help, this is a styled HTML page served directly from the backend (not React). It uses inline CSS with a dark theme matching the application.

Option 1 Quick Fix: A button linking to /api/health. Clicking opens the health endpoint in a new tab. If the browser shows a certificate warning, accepting it trusts the certificate for the session. After seeing the JSON response, a link sends the user back to the login page.

Option 2 Install Certificate: A green button to download the certificate file via /api/download-cert (served with content type application/x-x509-ca-cert and filename ADManagerPro.crt). Step-by-step numbered instructions for installing: double-click the file, Install Certificate, Local Machine, Place in Trusted Root Certification Authorities, finish, close all browsers, reopen.

Option 3 Use HTTP: A purple button linking to the HTTP version of the application. A note explains that HTTP is less secure but works without certificates and should only be used on trusted internal networks.

IT Administrator note at the bottom recommends deploying the certificate via Group Policy for automatic trust on all domain computers.



---

# 5. DATABASE SCHEMA

Seven SQLite tables stored in backend/database/audit.db. Tables are automatically created on first application startup using SQLAlchemy Base.metadata.create_all.

## Table: audit_logs
Purpose: Stores every action performed in the application for compliance and troubleshooting.
Columns: id as INTEGER PRIMARY KEY auto-increment. timestamp as DATETIME defaulting to current UTC time. operator as VARCHAR 100 storing the username who performed the action. operator_role as VARCHAR 20 storing Admin, Helpdesk, or Viewer. action as VARCHAR 100 describing what was done such as User Created, Password Reset, Login Success, Login Failed, Settings Updated, Service Account Created, etc. object_type as VARCHAR 50 for the category such as User, Group, Computer, OU, ServiceAccount, Auth, Settings, Session, Template, Workflow. object_name as VARCHAR 200 for the specific object affected such as a username or group name. details as TEXT for additional information about the action. status as VARCHAR 20 storing either Success or Failed. ip_address as VARCHAR 50 for the client IP address obtained from X-Forwarded-For header or direct connection.

## Table: app_users
Purpose: Stores which AD users are authorized to log into AD Manager Pro. Login requires both an entry in this table AND valid AD credentials.
Columns: id as INTEGER PRIMARY KEY. username as VARCHAR 100 UNIQUE INDEXED matching the AD sAMAccountName. display_name as VARCHAR 200. email as VARCHAR 200. role as VARCHAR 20 defaulting to Viewer with valid values of Admin, Helpdesk, or Viewer. active as BOOLEAN defaulting to TRUE. last_login as DATETIME updated on each successful login.

## Table: app_settings
Purpose: Stores dynamic application settings as key-value pairs with optional encryption for sensitive values.
Columns: id as INTEGER PRIMARY KEY. key as VARCHAR 100 UNIQUE INDEXED. value as TEXT which may be Fernet AES encrypted for sensitive values. category as VARCHAR 50 with values of ad, password, notification, or general. updated_at as DATETIME auto-updated on modification. updated_by as VARCHAR 100.
Encrypted keys: ad_service_password and notify_smtp_password are encrypted using Fernet derived from the SECRET_KEY.
Default settings created on first startup include: ad_server_primary, ad_server_secondary, ad_domain, ad_base_dn, ad_service_account, ad_service_password, ad_use_ldaps, ad_port, ad_default_user_ou, show_builtin_users, show_builtin_groups, show_builtin_containers, pwd_min_length, pwd_require_upper, pwd_require_lower, pwd_require_number, pwd_require_special, pwd_history_count, pwd_max_age_days, notify_smtp_server, notify_smtp_port, notify_smtp_user, notify_smtp_password, notify_from_email, notify_admin_email, notify_on_lockout, notify_on_password_expiry.

## Table: user_templates
Purpose: Stores templates for standardized user creation with predefined attributes and group memberships.
Columns: id as INTEGER PRIMARY KEY. name as VARCHAR 100 UNIQUE INDEXED. description as TEXT. ou as VARCHAR 500 for the target OU DN. department as VARCHAR 200. title as VARCHAR 200. company as VARCHAR 200. office as VARCHAR 200. phone as VARCHAR 50. manager as VARCHAR 500 for the manager DN. groups as TEXT storing a JSON array of group Distinguished Names. password_never_expires as BOOLEAN defaulting to FALSE. must_change_password as BOOLEAN defaulting to TRUE. enabled as BOOLEAN defaulting to TRUE. created_at as DATETIME. created_by as VARCHAR 100.

## Table: workflow_requests
Purpose: Stores approval workflow requests for sensitive AD operations.
Columns: id as INTEGER PRIMARY KEY. request_type as VARCHAR 50 with values of create-user, modify-user, delete-user, reset-password, disable-user, or enable-user. requested_by as VARCHAR 100 storing the username who submitted the request. target_object as VARCHAR 200 storing the target username. payload as TEXT storing a JSON object of the requested changes. status as VARCHAR 20 defaulting to pending with values of pending, approved, completed, or rejected. reason as TEXT storing why the change was requested. rejection_reason as TEXT storing why the request was rejected. approved_by as VARCHAR 100. approved_at as DATETIME. completed_at as DATETIME. created_at as DATETIME.

## Table: active_sessions
Purpose: Tracks currently logged-in browser sessions for the AD Manager Pro web interface.
Columns: id as INTEGER PRIMARY KEY. username as VARCHAR 100 INDEXED. display_name as VARCHAR 200. role as VARCHAR 20. ip_address as VARCHAR 50. user_agent as VARCHAR 500 storing the browser User-Agent header. login_time as DATETIME. last_activity as DATETIME updated on every authenticated API request. token_hash as VARCHAR 100 INDEXED storing the first 32 characters of the SHA-256 hash of the JWT token.
Session lifecycle: Created on successful login (old sessions for the same username are deleted first). Updated on every authenticated request (last_activity timestamp). Deleted on logout, force-logout, or auto-expiry after 8 hours.

## Table: service_accounts
Purpose: Tracks service accounts managed in both AD and the application with metadata for accountability.
Columns: id as INTEGER PRIMARY KEY. username as VARCHAR 100 UNIQUE INDEXED. display_name as VARCHAR 200. email as VARCHAR 200. description as TEXT synced with AD description attribute. purpose as TEXT describing what the account is used for. owner as VARCHAR 100 for the responsible person. department as VARCHAR 100. ad_dn as VARCHAR 500 for the full AD Distinguished Name. ou as VARCHAR 500 for the OU where the account was created. password_never_expires as BOOLEAN defaulting to TRUE. cannot_change_password as BOOLEAN defaulting to TRUE. is_system_critical as BOOLEAN defaulting to FALSE, when TRUE prevents deletion. has_app_access as BOOLEAN defaulting to FALSE, when TRUE creates a corresponding app_users entry. app_role as VARCHAR 20 defaulting to Viewer. created_at as DATETIME. created_by as VARCHAR 100. last_password_change as DATETIME updated when password is reset. notes as TEXT for additional information.

---

# 9. COMPLETE SETUP GUIDE STEP BY STEP

## 9.1 Prerequisites

### Required Software

Python 3.11 or higher. Download from https://python.org. During installation, check the box labeled "Add Python to PATH". This is critical. Without it, the python command will not work from the command line.

Node.js 18 or higher LTS version. Download from https://nodejs.org. Choose the LTS (Long Term Support) version. The installer includes npm (Node Package Manager).

Git (optional but recommended). Download from https://git-scm.com. Used for version control and GitHub deployment.

### Required Access

Network access from the server machine to your Active Directory Domain Controller on port 389 (LDAP) or port 636 (LDAPS).

An Active Directory service account with appropriate permissions. This account is used by the application to perform all AD operations. See Section 12 for the complete list of required permissions.

Administrator access on the Windows server machine where the application will be installed.

### Verify Prerequisites

Open PowerShell and run these commands:

python --version should show Python 3.11 or higher.
node --version should show v18 or higher.
npm --version should show 9 or higher.

If any command is not recognized, the software was not installed correctly or not added to PATH.

## 9.2 Create Project Directory

Open PowerShell and run:

mkdir "C:\AD Pro\public" -Force
mkdir "C:\AD Pro\public\backend" -Force
mkdir "C:\AD Pro\public\frontend" -Force
cd "C:\AD Pro\public"

## 9.3 Backend Setup

### Step 1: Navigate to Backend Directory
cd "C:\AD Pro\public\backend"

### Step 2: Create Python Virtual Environment
python -m venv venv

This creates an isolated Python environment in the venv folder. This takes about 30 seconds.

### Step 3: Activate Virtual Environment
.\venv\Scripts\activate

Your prompt should now show (venv) at the beginning. All subsequent pip commands install packages into this isolated environment.

### Step 4: Create requirements.txt
Create the file C:\AD Pro\public\backend\requirements.txt with these exact contents:

fastapi
uvicorn[standard]
python-jose[cryptography]
passlib[bcrypt]
python-multipart
sqlalchemy
ldap3
python-dotenv
cryptography

### Step 5: Install Python Packages
python -m pip install --upgrade pip
pip install -r requirements.txt

This downloads and installs all required Python packages. Takes 2-3 minutes depending on internet speed.

### Step 6: Create Environment Configuration
Create the file C:\AD Pro\public\backend\.env with these contents, replacing all placeholder values with your actual environment settings:

AD_SERVER_PRIMARY=192.168.1.10
AD_SERVER_SECONDARY=
AD_DOMAIN=company.local
AD_BASE_DN=DC=company,DC=local
AD_TARGET_OU=DC=company,DC=local
AD_SERVICE_ACCOUNT=svc-admanager@company.local
AD_SERVICE_PASSWORD=YourServiceAccountPassword
AD_USE_LDAPS=false
AD_PORT=389
SECRET_KEY=REPLACE_WITH_GENERATED_KEY
APP_HOST=0.0.0.0
APP_PORT=8443

AD_SERVER_PRIMARY: The IP address or hostname of your primary Domain Controller.
AD_SERVER_SECONDARY: Optional. IP or hostname of a secondary DC for failover. Leave empty if you only have one DC.
AD_DOMAIN: Your AD domain name like company.local.
AD_BASE_DN: The LDAP base Distinguished Name of your domain like DC=company,DC=local.
AD_TARGET_OU: The default OU where new users will be created. Set to the base DN to search the entire domain, or a specific OU like OU=Users,DC=company,DC=local.
AD_SERVICE_ACCOUNT: The UPN (User Principal Name) of your service account.
AD_SERVICE_PASSWORD: The password for the service account.
AD_USE_LDAPS: Set to true to use LDAPS (encrypted, port 636) or false for LDAP (plain, port 389).
AD_PORT: 389 for LDAP or 636 for LDAPS.
SECRET_KEY: A random string used for JWT token signing and encryption. Generate it in the next step.
APP_HOST: Leave as 0.0.0.0 to listen on all network interfaces.
APP_PORT: The HTTPS port, default 8443.

### Step 7: Generate Secret Key
Run this command to generate a cryptographically secure random key:

python -c "import secrets; print(secrets.token_hex(64))"

Copy the entire output string and paste it as the SECRET_KEY value in your .env file, replacing REPLACE_WITH_GENERATED_KEY.

### Step 8: Place the app.py File
The complete app.py file is provided separately (it is approximately 2000+ lines). Place it in C:\AD Pro\public\backend\app.py. This single file contains the entire backend application including all database models, the AD service class, authentication helpers, and all API route handlers.

### Step 9: Create SSL Certificate Generator
Create the file C:\AD Pro\public\backend\generate_cert.py with the certificate generation code that creates a 4096-bit RSA key, 5-year validity certificate with Subject Alternative Names for the server hostname, localhost, 127.0.0.1, and the server IP address.

### Step 10: Generate SSL Certificate
.\venv\Scripts\python.exe generate_cert.py

This creates three files in the certs directory: cert.pem (the certificate), key.pem (the private key), and cert.crt (same as cert.pem but with .crt extension for Windows double-click installation).

### Step 11: Create Required Directories
mkdir database -Force
mkdir logs -Force
mkdir static -Force

### Step 12: Create Start Scripts

Create C:\AD Pro\public\backend\start.bat for development:
@echo off
title AD Manager Pro - Development
cd /d "C:\AD Pro\public\backend"
call venv\Scripts\activate.bat
python -m uvicorn app:app --host 0.0.0.0 --port 8443 --ssl-keyfile certs\key.pem --ssl-certfile certs\cert.pem --reload --log-level info
pause

Create C:\AD Pro\public\backend\start_production.bat for HTTPS production:
@echo off
title AD Manager Pro - HTTPS Production
cd /d "C:\AD Pro\public\backend"
venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8443 --ssl-keyfile certs\key.pem --ssl-certfile certs\cert.pem --workers 4 --log-level info >> logs\service.log 2>&1

Create C:\AD Pro\public\backend\start_http.bat for HTTP production (no SSL):
@echo off
title AD Manager Pro - HTTP No SSL
cd /d "C:\AD Pro\public\backend"
venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8080 --workers 2 --log-level info >> logs\http.log 2>&1

### Step 13: Add First Admin User
This command creates the first user who can log into AD Manager Pro. Replace your-ad-username with your actual AD sAMAccountName, your display name, and your email:

cd "C:\AD Pro\public\backend"
.\venv\Scripts\python.exe -c "from app import AppUser, SessionLocal; db = SessionLocal(); db.add(AppUser(username='your-ad-username', display_name='Your Name', email='you@company.local', role='Admin', active=True)); db.commit(); print('OK: Admin user created'); db.close()"

### Step 14: Test Backend
Start the backend in development mode:
.\start.bat

Open a browser and navigate to https://localhost:8443. You should see either the API info JSON (if no frontend is built yet) or the login page (if the frontend has been built and deployed to the static folder). Accept any SSL certificate warnings.

Navigate to https://localhost:8443/docs to see the Swagger API documentation.

## 9.4 Frontend Setup

### Step 1: Create Vite React Project
cd "C:\AD Pro\public"
npm create vite@latest frontend -- --template react
cd frontend

### Step 2: Install All Dependencies
npm install
npm install react-router-dom axios lucide-react recharts
npm install -D tailwindcss@3 postcss autoprefixer

This installs all required packages. Takes 3-5 minutes.

### Step 3: Create Tailwind Configuration
Create C:\AD Pro\public\frontend\tailwind.config.js:
This file configures Tailwind to scan all JSX files for class names, enables dark mode with the class strategy, and extends the default theme.

### Step 4: Create PostCSS Configuration
Create C:\AD Pro\public\frontend\postcss.config.js:
This file configures PostCSS to use tailwindcss and autoprefixer plugins.

### Step 5: Create Vite Configuration
Create C:\AD Pro\public\frontend\vite.config.js:
This file configures Vite with the React plugin, sets the dev server to listen on all interfaces (host: true), uses port 5173, and allows all hostnames (allowedHosts: 'all') to prevent hostname-based blocking.

### Step 6: Update index.html
Replace the default index.html with one that sets the title to "AD Manager Pro" and includes a shield emoji favicon.

### Step 7: Create index.css
Replace the default CSS file with one that imports Tailwind base, components, and utilities directives, sets box-sizing to border-box globally, and sets the body background to the dark theme color #0f172a with light text.

### Step 8: Create main.jsx
Replace with the standard React 18 entry point that renders the App component wrapped in StrictMode.

### Step 9: Create Production Environment File
Create C:\AD Pro\public\frontend\.env.production with:
VITE_API_URL=

IMPORTANT: The value MUST be empty (nothing after the equals sign). This causes the frontend to use relative URLs, which means API requests automatically go to the same hostname and port that the page was loaded from. This is essential for the dual-protocol support (HTTPS 8443 and HTTP 8080) to work correctly.

### Step 10: Place All Source Files
Create the src/api.js file with the Axios configuration and all API function exports. The API_URL fallback must be an empty string, not a URL. The getUserPhotoUrl function must use window.location.origin as the base URL fallback.

Create the src/App.jsx file with React Router configuration including PrivateRoute and AdminRoute wrappers, and routes for all 14 pages.

Create the src/components/Layout.jsx file with the collapsible sidebar containing all 14 menu items with icons, badges, and role-based visibility.

Create all 14 page files in src/pages/ directory: Login.jsx, Dashboard.jsx, Users.jsx, Groups.jsx, Computers.jsx, OUs.jsx, ServiceAccounts.jsx, GPO.jsx, Photos.jsx, Templates.jsx, Workflows.jsx, Sessions.jsx, Reports.jsx, AuditLogs.jsx, and Settings.jsx.

Each file must be complete and self-contained with all inline modal components, helper functions, and sub-components included in the same file.

### Step 11: Build Production Frontend
cd "C:\AD Pro\public\frontend"
npm run build

This creates optimized production files in the dist directory. The build should complete in 5-15 seconds with output showing the generated files and their sizes.

### Step 12: Deploy Frontend to Backend
Copy-Item -Path "dist\*" -Destination "C:\AD Pro\public\backend\static" -Recurse -Force

This copies the built React application to the backend's static folder where it will be served by FastAPI.

### Step 13: Verify Full Installation
Start the backend:
cd "C:\AD Pro\public\backend"
.\start.bat

Open https://localhost:8443 in a browser. You should see the AD Manager Pro login page with the dark theme. Login with your AD credentials (the username you added as admin in Step 13 of backend setup).

After login, you should see the Dashboard with charts loading data from AD. Navigate to Users to verify AD users are displayed. Navigate to Groups, Computers, and OUs to verify those load correctly.

## 9.5 Create AD Service Account

If you do not already have a service account, create one on the Domain Controller. Open PowerShell as Domain Admin and run:

New-ADUser -Name "svc-admanager" -SamAccountName "svc-admanager" -UserPrincipalName "svc-admanager@company.local" -AccountPassword (ConvertTo-SecureString "YourServicePassword!" -AsPlainText -Force) -Enabled $true -PasswordNeverExpires $true -Description "AD Manager Pro Service Account"

Then grant all required permissions as detailed in Section 12 of this document.

---

# 10. PRODUCTION DEPLOYMENT GUIDE

## 10.1 Build and Deploy Frontend

Navigate to the frontend directory. Set VITE_API_URL to empty in .env.production (critical for dual-protocol support). Run npm run build. Remove old static files from backend/static. Copy new dist contents to backend/static.

## 10.2 Create Windows Scheduled Task for HTTPS Service

Create a scheduled task named "AD Manager Pro" that runs start_production.bat at system startup as NT AUTHORITY\SYSTEM with highest privileges. Configure auto-restart with 5 retries at 1-minute intervals. Set execution time limit to 365 days (effectively unlimited). Start the task immediately after creation.

## 10.3 Create Windows Scheduled Task for HTTP Service (Optional)

Create a second scheduled task named "AD Manager Pro HTTP" that runs start_http.bat at system startup with the same SYSTEM privileges and restart settings. This provides certificate-free access on port 8080 for non-domain PCs.

## 10.4 Configure Firewall Rules

Create inbound firewall rules allowing TCP traffic on port 8443 for HTTPS and port 8080 for HTTP. Name the rules descriptively for easy identification.

## 10.5 Create DNS Record (Optional)

On the Domain Controller, create an A record in your DNS zone pointing a friendly name like "admanager" to the server IP address. This allows users to access the application via https://admanager.company.local:8443 instead of the server hostname or IP.

## 10.6 Deploy SSL Certificate via Group Policy

For domain-joined PCs, deploy the SSL certificate to all machines automatically. Copy the cert.pem or cert.crt file to the SYSVOL scripts share. Open Group Policy Management Console (gpmc.msc). Create a new GPO named "Trust AD Manager Pro Certificate". Edit the GPO and navigate to Computer Configuration, Policies, Windows Settings, Security Settings, Public Key Policies, Trusted Root Certification Authorities. Right-click and Import the certificate file. Link the GPO to your domain or desired OU. Run gpupdate /force on client machines or wait for automatic policy refresh.

## 10.7 Service Management Commands

Start HTTPS: Start-ScheduledTask -TaskName "AD Manager Pro"
Stop HTTPS: Stop-ScheduledTask -TaskName "AD Manager Pro"
Start HTTP: Start-ScheduledTask -TaskName "AD Manager Pro HTTP"
Stop HTTP: Stop-ScheduledTask -TaskName "AD Manager Pro HTTP"
Check status: Get-ScheduledTask -TaskName "AD Manager Pro"
View logs: Get-Content "C:\AD Pro\public\backend\logs\app.log" -Tail 50
Kill orphan processes: Get-Process | Where-Object { $_.ProcessName -like "*python*" } | Stop-Process -Force

## 10.8 Access URLs

HTTPS for domain PCs with trusted certificate: https://servername:8443
HTTP for non-domain PCs without certificate: http://servername:8080
Certificate help page: https://servername:8443/cert-help
API documentation Swagger: https://servername:8443/docs
API documentation ReDoc: https://servername:8443/redoc
Health check: https://servername:8443/api/health

---

# 11. BACKUP AND RESTORE

## 11.1 What Is Backed Up

Backend items: SQLite database file (audit.db) containing all audit logs, app users, settings, templates, workflow requests, active sessions, and service account metadata. Environment configuration file (.env) with AD connection settings. SSL certificate files (cert.pem, key.pem, cert.crt). Main application file (app.py). All Python script files (.py). All batch script files (.bat). Requirements file (requirements.txt). Static folder containing the built React frontend. Log files.

Frontend items: Source code directory (src/) with all React components, pages, API client, and CSS. Package configuration files (package.json, package-lock.json). Build tool configurations (vite.config.js, tailwind.config.js, postcss.config.js). HTML template (index.html). Environment configuration files (.env.local, .env.production).

System items: Windows Scheduled Task definition exported as XML.

Excluded items (regenerable): node_modules directory (restored with npm install). Python virtual environment venv directory (restored with python -m venv venv and pip install). Built frontend dist directory (restored with npm run build). Python cache __pycache__ directories. Vite cache .vite directory.

## 11.2 Running Backups

Run the backup script manually: cd "C:\AD Pro\public" then .\backup.ps1

Run with a custom backup location: .\backup.ps1 -BackupDir "\\fileserver\Backups\ADManagerPro"

The script creates a timestamped ZIP file containing all backed-up items, a backup-info.json metadata file, and a README.md with restore instructions. It automatically cleans up backup files older than 30 days.

## 11.3 Scheduling Automatic Backups

Create a scheduled task that runs the backup script daily at 2:00 AM as NT AUTHORITY\SYSTEM. The backup script handles everything including compression and cleanup.

## 11.4 Restore Procedure

Extract the backup ZIP file to the project directory. For the backend: create a new Python virtual environment, activate it, install packages from requirements.txt. For the frontend: run npm install to restore node_modules, then npm run build to create the dist folder, then copy dist contents to backend/static. Edit the .env file with any environment-specific values that may have changed (server IP, passwords). Import the scheduled task from the exported XML file. Start the scheduled task. The application should be fully restored and operational.

---

# 12. AD PERMISSIONS COMPLETE REFERENCE

All permissions are granted using dsacls commands run on the Domain Controller as Domain Admin. Replace DOMAIN\svc-admanager with your actual domain name and service account name. Replace the OU DN with your actual target OU Distinguished Name.

## Read All Objects
dsacls "OU=TargetOU,DC=company,DC=local" /I:S /G "DOMAIN\svc-admanager:GR"

## Create Child Objects
dsacls "OU" /I:T /G "DOMAIN\svc-admanager:CC;user;"
dsacls "OU" /I:T /G "DOMAIN\svc-admanager:CC;group;"
dsacls "OU" /I:T /G "DOMAIN\svc-admanager:CC;computer;"
dsacls "OU" /I:T /G "DOMAIN\svc-admanager:CC;organizationalUnit;"

## Delete Child Objects
dsacls "OU" /I:T /G "DOMAIN\svc-admanager:DC;user;"
dsacls "OU" /I:T /G "DOMAIN\svc-admanager:DC;group;"
dsacls "OU" /I:T /G "DOMAIN\svc-admanager:DC;computer;"
dsacls "OU" /I:T /G "DOMAIN\svc-admanager:DC;organizationalUnit;"

## Standard Delete on Objects
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:SD;;user"
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:SD;;group"
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:SD;;computer"

## Write All User Properties
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:WP;;user"

## Password Operations
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:CA;Reset Password;user"
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:WP;pwdLastSet;user"
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:WP;unicodePwd;user"

## Account Control
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:WP;userAccountControl;user"
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:WP;lockoutTime;user"

## Group Membership
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:WP;member;group"

## User Photos
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:WP;thumbnailPhoto;user"

## Computer Account Control
dsacls "OU" /I:S /G "DOMAIN\svc-admanager:WP;userAccountControl;computer"

## GPO Read Access
dsacls "CN=System,DC=company,DC=local" /I:T /G "DOMAIN\svc-admanager:GR"
dsacls "CN=Policies,CN=System,DC=company,DC=local" /I:T /G "DOMAIN\svc-admanager:GR"

## GPO Link Read Access
dsacls "DC=company,DC=local" /I:S /G "DOMAIN\svc-admanager:RP;gPLink;"

## Important Notes on Permissions

Password reset and set operations (unicodePwd) require an encrypted LDAP connection. This means either LDAPS on port 636 must be enabled on the Domain Controller, or the password must be reset using other AD tools. Without LDAPS, the application will return a WILL_NOT_PERFORM error when attempting password operations.

The /I:T flag means the permission is inherited to child objects. The /I:S flag means the permission is applied to subobjects. CC means Create Child. DC means Delete Child. SD means Standard Delete. GR means Generic Read. WP means Write Property. CA means Control Access (extended rights). RP means Read Property.

dsacls is only available on Domain Controllers or machines with RSAT (Remote Server Administration Tools) installed. If dsacls is not available, install RSAT with: Add-WindowsCapability -Online -Name "Rsat.ActiveDirectory.DS-LDS.Tools~~~~0.0.1.0"

---

# 13. SSL CERTIFICATE MANAGEMENT

## Generate New Certificate
Navigate to the backend directory and run: .\venv\Scripts\python.exe generate_cert.py
This creates cert.pem, key.pem, and cert.crt in the certs directory with a 4096-bit RSA key valid for 5 years.

## Trust Certificate on a Single PC
Run PowerShell as Administrator on the target PC:
Import-Certificate -FilePath "path\to\cert.pem" -CertStoreLocation "Cert:\LocalMachine\Root"
Close all browser windows and reopen. The "Not Secure" warning should be gone.

## Deploy Certificate via Group Policy for All Domain PCs
Copy the certificate to the SYSVOL scripts folder on the Domain Controller. Open Group Policy Management Console. Create a new GPO. Edit it and navigate to Computer Configuration then Policies then Windows Settings then Security Settings then Public Key Policies then Trusted Root Certification Authorities. Import the certificate. Link the GPO to the domain or desired OU. Run gpupdate /force on client PCs or wait for automatic refresh.

## Certificate Help Page for End Users
Direct users to https://servername:8443/cert-help for a self-service page with three options: quick fix (accept cert by visiting /api/health), permanent fix (download and install certificate), and HTTP alternative (use port 8080 without certificate).

## Dual Protocol for Certificate-Free Access
Run both HTTPS on port 8443 and HTTP on port 8080 simultaneously using separate scheduled tasks. Users who cannot install certificates use http://servername:8080. The frontend uses relative URLs so it works on either protocol without rebuilding.

## Renewing Certificates
Delete the existing cert.pem and key.pem files. Run generate_cert.py again. Restart the backend service. Redistribute the new certificate to clients via GPO or manual installation.


---

# 14. TROUBLESHOOTING GUIDE

## Problem: User creation fails with invalidAttributeSyntax error
Symptom: When creating a user through the UI or API, the error "LDAPInvalidAttributeSyntaxResult - 21 - invalidAttributeSyntax" is returned.
Root Cause: Active Directory rejects LDAP add operations that include attributes with empty string values. Also, some AD configurations reject the inclusion of userAccountControl in the initial add operation.
Solution: The application uses a clean_value() helper function that returns None for empty or whitespace-only strings. The create_user method only includes attributes in the LDAP add operation if clean_value returns a non-None value. Additionally, user creation uses a two-step process: Step 1 creates the account with minimal attributes (objectClass, sAMAccountName, displayName, and only non-empty optional attributes) without userAccountControl. Step 2 sets the password via unicodePwd LDAP modify. Step 3 sets userAccountControl via LDAP modify to enable the account. If this error occurs, verify that the create_user method in app.py uses the two-step process and the clean_value helper.

## Problem: Users show as locked when they are not actually locked
Symptom: The Users page shows some users with "locked" status and orange badge, but checking in Active Directory Users and Computers or PowerShell shows they are not locked.
Root Cause: Active Directory does not reset the lockoutTime attribute to zero when a lockout expires. The attribute retains the timestamp of when the lockout occurred even after the lockout duration has passed and the account was auto-unlocked.
Solution: The application reads the domain lockoutDuration policy via LDAP query (cached for 1 hour for performance), then compares each user's lockoutTime with the policy duration. A user is only marked as locked if the time since lockout is LESS than the lockout duration, meaning the lockout has not yet expired. If the time since lockout is greater than or equal to the lockout duration, the user is considered auto-unlocked and shown as active. Verify that the _is_user_locked method and _get_lockout_duration method are present in the ADService class.

## Problem: GPO page shows no objects
Symptom: The GPO page loads but shows zero GPOs and zero links.
Root Cause: The service account does not have read permission on the CN=Policies,CN=System container in AD, or the GPOs are stored in an unexpected location.
Solution: Grant Generic Read permission on the System container and Policies sub-container using dsacls on the Domain Controller: dsacls "CN=System,DC=company,DC=local" /I:T /G "DOMAIN\svc-admanager:GR" and dsacls "CN=Policies,CN=System,DC=company,DC=local" /I:T /G "DOMAIN\svc-admanager:GR". The application also includes a fallback search strategy that tries three locations: CN=Policies,CN=System,BaseDN, then CN=System,BaseDN, then BaseDN, logging which location succeeded or failed.

## Problem: Password reset fails with WILL_NOT_PERFORM error
Symptom: When resetting a user password through the UI, the error "LDAPUnwillingToPerformResult - 53 - unwillingToPerform - WILL_NOT_PERFORM" is returned.
Root Cause: Microsoft Active Directory requires an encrypted LDAP connection (LDAPS on port 636 or StartTLS) for any operation that modifies the unicodePwd attribute. Plain LDAP on port 389 is not allowed for password operations.
Solution: Enable LDAPS on your Domain Controller by installing Active Directory Certificate Services or importing a server certificate. Then update the AD Manager Pro settings to use LDAPS (set AD_USE_LDAPS to true and AD_PORT to 636). If LDAPS cannot be enabled, password resets must be performed using other AD tools such as Active Directory Users and Computers, PowerShell Set-ADAccountPassword, or the Domain Controller directly.

## Problem: Service account password change does not take effect
Symptom: After changing the service account password through the Settings UI, subsequent AD operations fail with bind errors.
Root Cause: The running Python process caches the old password in the config object, and the new password from the database is not being read.
Solution: The _get_connection method in the ADService class must read the fresh password from the database on every call using the get_fresh_password helper function. This function queries the app_settings table for the ad_service_password key, decrypts it, and returns the value. If the decrypted value is valid and different from the cached password, it updates config.AD_SERVICE_PASSWORD. The password change endpoint also clears the lockout duration cache and verifies the new password works by calling test_connection after the update. Verify that _get_connection starts with a call to get_fresh_password.

## Problem: Login works from backend test but fails in browser
Symptom: Running a Python script that calls ad_service.authenticate_user returns success, but logging in through the browser shows "Login failed" and no POST request appears in the backend logs.
Root Cause: The browser's JavaScript fetch API silently blocks API requests when the SSL certificate is not trusted. Unlike page navigation (where the browser shows a warning and lets the user click through), programmatic fetch and XMLHttpRequest calls are blocked without any user-visible prompt. The login page HTML loads (because it is a page navigation) but the POST /api/auth/login call (which is a JavaScript fetch) is silently blocked.
Solution: Three options. Option 1: On the affected PC, navigate to https://servername:8443/api/health in the browser, accept the certificate warning, then return to the login page. Option 2: Import the certificate on the PC using Import-Certificate to the Trusted Root CA store, then close and reopen all browser windows. Option 3: Use the HTTP version at http://servername:8080 which does not use SSL.

## Problem: Frontend sends API requests to wrong URL
Symptom: The browser Network tab shows API requests going to https://admanager.company.local:8443 or https://localhost:8443 instead of the server the user is accessing.
Root Cause: The VITE_API_URL environment variable in .env.production is set to a specific URL, or the fallback in api.js is set to a specific URL instead of an empty string.
Solution: Set VITE_API_URL to empty (nothing after the equals sign) in .env.production. In api.js, change the fallback to an empty string: const API_URL = import.meta.env.VITE_API_URL || '' instead of const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:8443'. Rebuild the frontend with npm run build and copy the dist to backend/static. Empty API_URL causes Axios to use relative URLs which automatically match whatever hostname and port the user is accessing.

## Problem: Multiple backend instances running causing duplicate log entries
Symptom: Log entries appear duplicated 2-4 times. Multiple "AD Manager Pro Starting" messages on startup.
Root Cause: Multiple Python processes are running, either from multiple scheduled tasks, orphan processes from previous runs, or the --reload flag creating a watcher process.
Solution: Stop all scheduled tasks, kill all Python processes, verify the port is free, then start a single instance. Commands: Stop-ScheduledTask -TaskName "AD Manager Pro". Get-Process | Where-Object { $_.ProcessName -like "*python*" } | Stop-Process -Force. Wait 5 seconds. netstat -ano | findstr :8443 should show nothing. Then start: Start-ScheduledTask -TaskName "AD Manager Pro". For production, do not use the --reload flag which creates an additional watcher process.

## Problem: Delete removes user from app but not from Active Directory
Symptom: When deleting a service account or user, the record disappears from the application but the user still exists in AD.
Root Cause: The service account does not have Delete Child (DC) and Standard Delete (SD) permissions on the target OU.
Solution: Grant delete permissions on the Domain Controller: dsacls "OU" /I:T /G "DOMAIN\svc-admanager:DC;user;" and dsacls "OU" /I:S /G "DOMAIN\svc-admanager:SD;;user". The delete_service_account endpoint has been updated to check AD deletion success BEFORE removing database records, and raises an error if AD deletion fails, keeping database records intact.

## Problem: Service account created in AD but user cannot login to AD Manager Pro
Symptom: A service account is created successfully with hasAppAccess enabled, but the user gets "Login failed" when trying to sign in.
Root Cause: Multiple possible causes. The username in the database may not match exactly what the user types (case sensitivity). The AD account may be disabled. The password may be incorrect.
Solution: Verify the username exists in the app_users table with the correct spelling using a database query. Verify the account is enabled in AD. Reset the password through AD tools if LDAPS is not available. The login endpoint has been updated to use case-insensitive matching (ilike) and to strip whitespace from the submitted username. Also verify the AD authentication works by running a test script that calls ad_service.authenticate_user with the username and password.

## Problem: pwdLastSet causes errors when processing user list
Symptom: Some users are skipped with warning messages about "int() argument must be a string, a bytes-like object or a real number, not datetime.datetime".
Root Cause: The pwdLastSet attribute in AD can be returned as different Python types depending on the user and the ldap3 version: sometimes as an integer (Windows FileTime), sometimes as a datetime object, and sometimes as None.
Solution: The code uses safe_int() helper that checks the type before conversion. If the value has a 'year' attribute (is a datetime), it returns the default value instead of trying to convert. The password expiry calculation handles both int (converted from Windows FileTime) and datetime (used directly) types.

## Problem: ConnectionResetError in logs
Symptom: Frequent ERROR entries showing "ConnectionResetError: [WinError 10054] An existing connection was forcibly closed by the remote host" in the backend terminal.
Root Cause: This is normal Windows SSL behavior when clients disconnect without properly closing the TLS connection. It occurs with every HTTPS request on Windows and is harmless.
Solution: These errors can be safely ignored. They do not affect application functionality. They are caused by the Windows Proactor event loop handling of SSL connections and occur even with well-behaved clients. To reduce log noise, you can set the log level to WARNING instead of INFO, but this will also hide useful request logs.

---

# 15. MAINTENANCE SCHEDULE

## Weekly Tasks
Review audit logs for unusual activity such as failed logins, unexpected deletions, or permission changes. Check that the most recent backup file exists and has a reasonable size.

## Monthly Tasks
Review the app_users list and remove or deactivate users who no longer need access. Check service account password ages and plan rotations for accounts with old passwords. Review pending workflow requests and follow up on stale requests. Check log file sizes and archive or delete old logs if they are growing too large.

## Quarterly Tasks
Test the backup restore process by extracting a backup on a test system, setting up the environment, and verifying the application works. Rotate the AD service account password using the Change Service Account Password feature in Settings. Update Python packages by running pip install -U -r requirements.txt in the virtual environment. Update Node packages by running npm update in the frontend directory. Review AD permissions to ensure the service account has only the necessary access.

## Yearly Tasks
Regenerate the SSL certificate even though it is valid for 5 years, reviewing is good practice. Consider major version updates if new features have been developed. Conduct a security audit of service account permissions, app user roles, and access patterns. Review and archive old audit logs for compliance. Update this documentation with any changes made during the year.

---

# 16. GITHUB DEPLOYMENT

## Prepare Repository

Create a .gitignore file in the project root excluding: backend/.env and all .env files with real values, backend/certs/ directory with all .pem and .crt files, backend/database/ directory with .db files, backend/logs/ directory with .log files, backend/venv/ directory, backend/static/ directory (auto-generated from frontend build), backend/__pycache__/ directories, frontend/node_modules/ directory, frontend/dist/ directory, frontend/.env.local and .env.production files.

Create .env.example template files for both backend and frontend showing placeholder values that indicate what needs to be configured.

Create a README.md file with project description, feature highlights, quick start instructions, technology stack, and links to full documentation.

Create a LICENSE file with your chosen license (MIT recommended for open source).

## Initial Push to GitHub

Create a new repository on GitHub (private recommended for organizational use). Initialize git in the project directory with git init. Add all files with git add . (the .gitignore ensures sensitive files are excluded). Verify with git status that no sensitive files are staged. Create initial commit with git commit -m "Initial commit: AD Manager Pro v2.2.2". Add remote with git remote add origin followed by your repository URL. Rename branch to main with git branch -M main. Push with git push -u origin main. You will be prompted for GitHub credentials; use a Personal Access Token as the password.

## Updating the Repository

After making changes: git add . to stage changes, git commit -m "Description of changes" to commit, git push to push to GitHub.

## Creating Releases

Tag a release: git tag -a v2.2.2 -m "AD Manager Pro v2.2.2" then git push origin v2.2.2. On GitHub, go to Releases, create a new release from the tag, add release notes, and publish.

## Deploying on a New Machine from GitHub

Install prerequisites (Python, Node.js, Git). Clone the repository: git clone followed by the repository URL and target directory. Navigate to the project directory. Run the install.ps1 script if available, or follow the manual setup steps from Section 9. Edit the backend .env file with environment-specific values. Start the application.

Quick deployment command sequence: git clone URL "C:\AD Pro" then cd "C:\AD Pro" then .\install.ps1 then notepad backend\.env then cd backend then .\start.bat.

---

# 17. AI REGENERATION PROMPT

Use the following prompt to regenerate the entire project from scratch with any AI assistant. This prompt contains all critical implementation details learned during development including bug fixes and design decisions.

---

Build a complete Active Directory management web application called AD Manager Pro.

BACKEND: Single Python FastAPI file called app.py. Uses ldap3 for AD integration, SQLAlchemy with SQLite database stored in database/audit.db, JWT authentication with python-jose using HS256 algorithm and 8-hour token expiry, Fernet AES encryption from cryptography library for sensitive settings, python-dotenv for .env file loading, built-in smtplib for SMTP email, hashlib for SHA-256 token hashing. Serves the built React frontend as static files from a /static directory. Supports self-signed SSL certificates for HTTPS on port 8443 and optional plain HTTP on port 8080 simultaneously.

FRONTEND: React 18 with Vite build tool. Tailwind CSS version 3 with dark theme using slate-900 body background, slate-800 card backgrounds, slate-700 hover states and borders. Axios HTTP client with request interceptor adding JWT Bearer token from localStorage and response interceptor redirecting to /login on 401. React Router DOM version 6 with PrivateRoute and AdminRoute wrappers. Lucide React for all icons. Recharts library for Dashboard charts including BarChart, PieChart with responsive containers and dark-themed tooltips.

DATABASE: 7 SQLite tables. audit_logs for complete action tracking with operator, role, action, object_type, object_name, details, status, ip_address, timestamp. app_users for authorized login users with username, display_name, email, role (Admin/Helpdesk/Viewer), active boolean, last_login. app_settings for dynamic key-value settings with category, encrypted values for passwords using Fernet, updated_at, updated_by. user_templates for user creation templates with OU, department, title, company, office, phone, manager, groups as JSON array of group DNs, password policy booleans. workflow_requests for approval workflows with request_type, requested_by, target_object, payload as JSON, status (pending/approved/completed/rejected), reason, rejection_reason, approved_by, timestamps. active_sessions for browser session tracking with username, display_name, role, ip_address, user_agent, login_time, last_activity, token_hash (SHA-256 of JWT). service_accounts for dual-tracked service accounts with username, display_name, email, description, purpose, owner, department, ad_dn, ou, password_never_expires, cannot_change_password, is_system_critical boolean preventing deletion, has_app_access boolean auto-creating app_users entry, app_role, created_by, last_password_change, notes.

AD SERVICE CLASS: Uses ldap3 with ServerPool and ROUND_ROBIN for failover. Connection with SIMPLE authentication, auto_bind=True, raise_exceptions=True. Do NOT use SAFE_SYNC client strategy as it does not populate conn.entries. The _get_connection method must read the service account password fresh from the database on every call using a get_fresh_password helper function that queries app_settings, decrypts, and returns the current password. This ensures password changes take effect without restart.

CRITICAL IMPLEMENTATION DETAILS:

1. User creation must use a TWO-STEP process. Step 1: LDAP add with minimal attributes (objectClass, sAMAccountName, displayName, and only non-empty optional attributes). Do NOT include userAccountControl in the initial add. Do NOT include any attribute with an empty string value. Step 2: Set password via LDAP modify on unicodePwd attribute (UTF-16-LE encoded with surrounding quotes). Step 3: Set userAccountControl via LDAP modify to 512 (normal account) or 66048 (normal + password never expires). This avoids invalidAttributeSyntax errors.

2. Use a clean_value(value) helper function that returns None for None, empty string, or whitespace-only string values. In create_user, only include optional attributes (givenName, sn, mail, department, title, company, description, physicalDeliveryOfficeName, telephoneNumber) if clean_value returns a non-None value. Apply the same pattern in create_group, create_computer, and create_ou for the description attribute.

3. Lockout detection must read the domain lockoutDuration policy from AD by searching with filter (objectClass=domain) and reading the lockoutDuration attribute. Cache this value for 1 hour. For each user, compare their lockoutTime with the current time. If lockoutTime is a datetime, use it directly. If it is an integer greater than zero, convert from Windows FileTime (100-nanosecond intervals since 1601-01-01) to datetime. A user is locked only if the time since lockout is positive AND less than the lockout duration. Otherwise they are considered auto-unlocked.

4. The pwdLastSet attribute can be an integer (Windows FileTime), a datetime object, or None. Use a safe_int helper that returns a default value for datetime objects instead of trying to convert them. Handle all three types when calculating password expiry dates.

5. Service account creation is an atomic operation. Create in AD first. If AD creation succeeds, save metadata to service_accounts table and optionally add to app_users table. If the database save fails, roll back by deleting the AD account. If AD deletion also fails during rollback, log the error.

6. The delete_service_account endpoint must verify AD deletion succeeds BEFORE removing database records. If AD deletion fails, keep database records intact and return the error to the user.

7. Built-in AD objects are filtered using maintained Python lists: BUILTIN_USERS (Administrator, Guest, krbtgt, DefaultAccount, WDAGUtilityAccount, HelpAssistant, SUPPORT_388945a0), BUILTIN_GROUPS (35+ default Windows groups), BUILTIN_CONTAINERS (CN=Users, CN=Builtin, CN=Computers, CN=ForeignSecurityPrincipals, CN=Managed Service Accounts, CN=System). Helper functions check membership. get_users and get_groups accept show_builtin parameter. Settings toggles control visibility independently for users, groups, and containers.

8. Frontend API_URL must default to empty string: const API_URL = import.meta.env.VITE_API_URL || '' and VITE_API_URL= (empty) in .env.production. This makes Axios use relative URLs that automatically match whatever hostname and port the user is accessing. The getUserPhotoUrl function must use window.location.origin as the base URL fallback since photo URLs are used in img src attributes which need absolute URLs.

9. Login endpoint must use case-insensitive username matching (ilike) and strip whitespace from submitted username. Login requires BOTH an active app_users entry AND successful AD LDAP bind authentication.

10. The Settings change-service-password endpoint must update the password in AD first, then update the encrypted value in the database, then clear cached values (_lockout_cache, _lockout_cached_at), then reload config, then verify the new password works via test_connection.

11. GPO search uses fallback strategy trying CN=Policies,CN=System,BaseDN first, then CN=System,BaseDN, then BaseDN, logging each attempt.

12. Include /cert-help endpoint serving a styled HTML page with three options for SSL certificate issues: quick fix via /api/health, permanent fix via /api/download-cert with installation instructions, and HTTP alternative.

13. Include /api/download-cert endpoint serving the certificate file with content type application/x-x509-ca-cert for browser download.

PAGES (14 total):

Login.jsx: Dark themed full-screen with server icon, username/password inputs with icons, error message with help links to /cert-help and HTTP version, loading state.

Dashboard.jsx: ManageEngine-style with Recharts. 4 QuickStatCards with gradients. User Reports vertical BarChart with colored bars and legend table. System Reports BarChart. Logged On horizontal BarChart. Groups/OU horizontal BarChart. Department PieChart top 8. OS PieChart. Uses getReportSummary, getUsersByDepartment, getComputersByOS.

Users.jsx: Table with checkboxes, search, status filter. Bulk Actions dropdown (enable/disable/unlock/reset-password/move/modify/delete). Per-row actions: Edit (purple), Move (cyan), Reset Password (blue), Unlock (orange), Disable/Enable, Delete (Admin). Modals: CreateUser, EditUser with 4 sections, MoveUser, BulkImport with CSV, BulkMove, BulkModify with field checkboxes, BulkResetPassword.

Groups.jsx: Grid cards with create, click for member detail modal with add/remove member, delete.

Computers.jsx: Table with checkboxes, search, status filter, create modal with validation, enable/disable/move/delete, bulk ops with progress bar, CSV export.

OUs.jsx: List with search, create with parent picker, delete empty, click for contents modal with tabbed view and stat cards.

ServiceAccounts.jsx: Grid cards color-coded (red critical, purple app-access, indigo regular). Stats filter cards. Create modal with sections: Basic Info, Password with generator, Documentation, AD Settings with checkboxes, App Access toggle with role, Notes. Import existing with user search. Edit modal. Reset password modal with generator. Delete with AD option.

GPO.jsx: Two tabs (All GPOs grid, OU Links list). Stats cards. Search and status filter. Detail modal with full info. CSV export. Fallback search.

Photos.jsx: Grid of avatars. Upload with Canvas auto-crop/resize/compress. Preview modal. Delete. Filter all/with/without. Stats. Cache busting.

Templates.jsx: Grid cards. Create with group selector. Use template modal needing only username/name/password. Delete.

Workflows.jsx: Status filter tabs with counts. Request cards with type emoji, approve/reject buttons. Create with dynamic fields per type. Reject with reason. View details with JSON payload.

Sessions.jsx: Stats cards. Auto-refresh 30s toggle. Session cards with active/idle dots, device detection, IP. Force logout. Detail modal. Admin only.

Reports.jsx: Stat cards, chart cards, clickable report cards opening detail modals, CSV export buttons.

AuditLogs.jsx: Table with time, operator, action, target, status badge, IP. CSV export.

Settings.jsx: 4 tabs. AD Connection with service password change section. Visibility with toggle switches. Password Policy. Email SMTP with test email.

LAYOUT: Collapsible sidebar with 14 items. Workflow orange badge, Sessions green badge (Admin only). Notification bell. Role indicator dot (red Admin, yellow Helpdesk, blue Viewer). Auto-refresh badges 30 seconds. Logout calls API.

Generate each file complete and ready to use. Start with app.py (may need 2 parts due to size), then api.js, then each page one at a time. Every file must be complete and self-contained. Do not provide partial code or instructions to modify existing files.

---


---

# APPENDIX A: REPORT EXPORT TYPES

## Overview

The Reports page provides one-click CSV export buttons for downloading filtered user, group, and computer data. All exports exclude built-in AD objects (Administrator, Guest, krbtgt, Domain Admins, etc.) unless the Show Built-in Objects setting is enabled.

## Available Export Types

### User Reports

| Export Button | API Endpoint | Description | CSV Columns |
|---|---|---|---|
| All Users | /api/reports/export/all-users | Every user excluding built-in | Username, Display Name, Email, Department, Title, Status, Last Logon, OU |
| Active Users | /api/reports/export/active-users | Only enabled and not locked users | Username, Display Name, Email, Department, Title, Last Logon, OU |
| Disabled Users | /api/reports/export/disabled-users | Only disabled accounts | Username, Display Name, Email, Department, Title, Last Logon, OU |
| Locked Users | /api/reports/export/locked-users | Only currently locked accounts | Username, Display Name, Email, Department, Title, OU |
| Never Logged In | /api/reports/export/never-logged-in | Users who have never logged in | Username, Display Name, Email, Department, Created, OU |
| Inactive (90+ days) | /api/reports/export/inactive-users | Users with no login in 90+ days | Username, Display Name, Email, Department, Last Logon, OU |

### Group Reports

| Export Button | API Endpoint | Description | CSV Columns |
|---|---|---|---|
| All Groups | /api/reports/export/all-groups | Every group excluding built-in | Name, Description, Type, Scope, Members |

### Computer Reports

| Export Button | API Endpoint | Description | CSV Columns |
|---|---|---|---|
| All Computers | /api/reports/export/all-computers | Every computer account | Name, DNS Name, OS, Status, Last Logon, OU |

## API Usage

All export endpoints require JWT authentication. The response is a CSV file download with appropriate Content-Disposition header.

Direct browser access (when logged in): https://servername:8443/api/reports/export/active-users

The inactive-users endpoint accepts an optional days query parameter defaulting to 90: /api/reports/export/inactive-users?days=30

## Frontend Export Buttons

The Reports page Quick Export section contains 8 buttons in a responsive 2x4 grid. Each button calls the handleExport function which uses the exportReport API function with responseType blob to download the file. The downloaded CSV filename includes the report type and a timestamp for uniqueness.

## Bulk Update Workflow

A common workflow is to export users, modify their attributes in Excel, and re-import via the bulk update script:

Step 1: Export current users from the Reports page or via the command line bulk export script.

Step 2: Open the CSV in Excel and modify the desired columns (e.g., change department for selected users).

Step 3: Save the CSV file ensuring the username column is preserved.

Step 4: Run the bulk update script: python bulk_update.py modified_users.csv

The bulk update script (bulk_update.py) reads the CSV, maps column names to AD attributes (supporting aliases like jobtitle for title, mail for email, etc.), and updates each user via the AD service. It provides a preview of changes, asks for confirmation, and shows a summary of successes and failures.

## Supported CSV Column Names for Bulk Update

| CSV Column Name | AD Attribute | Aliases |
|---|---|---|
| username | sAMAccountName | (required, used to find user) |
| department | department | |
| title | title | jobtitle, job_title |
| company | company | |
| office | physicalDeliveryOfficeName | |
| phone | telephoneNumber | telephone |
| email | mail | |
| description | description | |
| manager | manager | (must be full Distinguished Name) |
| firstname | givenName | first_name, givenname |
| lastname | sn | last_name, surname, sn |
| displayname | displayName | display_name |
| upn | userPrincipalName | userprincipalname |

## Command Line Export (Without Web UI)

Export all usernames only:
cd C:\AD Pro\public\backend
.\venv\Scripts\python.exe -c "from app import ad_service; users = ad_service.get_users(show_builtin=False); [print(u['username']) for u in users]"

Export to CSV file:
.\venv\Scripts\python.exe -c "import csv; from app import ad_service; users = ad_service.get_users(show_builtin=False); f=open('export.csv','w',newline=''); w=csv.writer(f); w.writerow(['username','displayName','email','department','status']); [w.writerow([u['username'],u['displayName'],u['email'],u['department'],u['status']]) for u in users]; f.close(); print(f'Exported {len(users)} users')"

Export active users only:
.\venv\Scripts\python.exe -c "import csv; from app import ad_service; users = [u for u in ad_service.get_users(show_builtin=False) if u['status']=='active']; f=open('active.csv','w',newline=''); w=csv.writer(f); w.writerow(['username','displayName','email','department']); [w.writerow([u['username'],u['displayName'],u['email'],u['department']]) for u in users]; f.close(); print(f'Exported {len(users)} active users')"

Export users from specific OU:
.\venv\Scripts\python.exe -c "import csv; from app import ad_service; users = ad_service.get_users(base_dn='OU=Staff,OU=Abasyn,DC=abasyn,DC=local', show_builtin=False); f=open('staff.csv','w',newline=''); w=csv.writer(f); w.writerow(['username','displayName','department']); [w.writerow([u['username'],u['displayName'],u['department']]) for u in users]; f.close(); print(f'Exported {len(users)} users')"

Export users from specific department:
.\venv\Scripts\python.exe -c "import csv; from app import ad_service; users = [u for u in ad_service.get_users(show_builtin=False) if 'IT' in (u.get('department') or '')]; f=open('it_users.csv','w',newline=''); w=csv.writer(f); w.writerow(['username','displayName','department']); [w.writerow([u['username'],u['displayName'],u['department']]) for u in users]; f.close(); print(f'Exported {len(users)} IT users')"

## Implementation Notes

The export_report function in app.py must NOT contain any local datetime imports (from datetime import datetime, timedelta) because Python treats locally imported names as local variables for the entire function scope, causing UnboundLocalError on lines that use datetime before the local import statement. The datetime and timedelta are imported at the module level and should be used directly throughout the function.

All cell values in CSV rows are wrapped with str() and use .get() with empty string defaults to prevent None values from causing errors in the CSV writer. This handles cases where AD attributes may be missing or null for some users.

The exportReport function in the frontend api.js must use responseType blob without .then(r => r.data) chaining, because the Axios response wrapper needs to be preserved for the blob download to work correctly. The handleExport function in Reports.jsx accesses res.data to get the blob, creates an object URL, creates a temporary anchor element, triggers the download, and cleans up.

---

# APPENDIX B: BULK UPDATE SCRIPT

## Script Location
C:\AD Pro\public\backend\bulk_update.py

## Usage
python bulk_update.py <csv_file>

## CSV Format Requirements
First row must be column headers. The username column is required and is used to find the user in AD. All other columns are optional and represent fields to update. Column names are case-insensitive and support multiple aliases (e.g., jobtitle, job_title, and title all map to the AD title attribute). Empty values in the CSV are skipped (the corresponding AD attribute is not modified). The CSV must be comma-delimited (standard CSV format). UTF-8 encoding is supported for international characters.

## Example: Update Department for Multiple Users

Create update_dept.csv:
username,department
john.doe,Information Technology
jane.smith,Human Resources
bob.wilson,Finance

Run: python bulk_update.py update_dept.csv

## Example: Update Multiple Fields

Create update_multi.csv:
username,department,title,company
john.doe,IT,Senior Developer,Company Inc
jane.smith,HR,HR Manager,Company Inc

Run: python bulk_update.py update_multi.csv

## Example: Update from Excel

Open Excel, create columns with headers matching the supported column names, fill in the data, save as CSV (Comma delimited), then run the bulk update script on the saved file.

## Workflow: Export, Modify, Re-Import

Step 1: Export current data using the Reports page export button or command line export.
Step 2: Open the exported CSV in Excel.
Step 3: Modify the desired columns (add, change, or clear values).
Step 4: Save the file (keep CSV format).
Step 5: Run python bulk_update.py modified_file.csv to apply changes.
Step 6: Verify changes in the AD Manager Pro Users page.

## Script Features

Preview of first 5 rows before applying changes. Confirmation prompt before proceeding. Progress indicator showing current row out of total. Summary of successes and failures at the end. Detailed error list for any failed updates. Support for all standard AD user attributes via column name aliases.

## 4.18 Bulk Update Users from CSV

The Bulk Update feature allows administrators and helpdesk operators to update multiple existing Active Directory user attributes simultaneously by uploading or pasting a CSV file. Unlike Bulk Import which creates new users, Bulk Update modifies attributes of users that already exist in AD.

### Accessing the Feature

A dedicated orange Bulk Update button with a FileText icon is displayed in the Users page header bar, positioned between the green Bulk Import button and the refresh button. Clicking it opens the BulkUpdateCsvModal. The button is always visible regardless of user selection state.

### CSV Format Requirements

The CSV file must contain a header row as the first line. The username column is required and is used to locate each user in Active Directory. All other columns are optional and represent fields to update. Column names are case-insensitive and support multiple aliases. Empty cells are skipped entirely, meaning the corresponding AD attribute is not modified and retains its existing value. The CSV must be comma-delimited in standard CSV format. UTF-8 encoding is supported for international characters.

### Supported CSV Column Names

| CSV Column Name | AD Attribute | Aliases |
|---|---|---|
| username | sAMAccountName | user, samaccountname (required, used to find user) |
| firstname | givenName | first_name, givenname |
| lastname | sn | last_name, surname, sn |
| displayname | displayName | display_name |
| email | mail | mail |
| department | department | dept |
| title | title | jobtitle, job_title |
| company | company | |
| office | physicalDeliveryOfficeName | |
| phone | telephoneNumber | telephone |
| description | description | |
| manager | manager | (must be full Distinguished Name) |

Note: The upn (userPrincipalName) column is intentionally excluded from the Bulk Update CSV column mapping to prevent accidental UPN constraint violations. UPN updates should be performed individually through the Edit User modal.

### Modal Interface

The modal is displayed as a wide modal with the title "Bulk Update Users from CSV" and contains the following sections:

Info Banner: A blue-themed information box at the top explaining how the feature works with four bullet points: CSV must have a username column (required), lists other supported columns, explains that empty cells are skipped, and clarifies that users must already exist in AD.

File Upload: A file input accepting .csv files alongside a Template download button. The template downloads a pre-formatted CSV file named bulk_update_template.csv containing example data with columns for username, department, title, office, phone, email, company, and description with two sample rows using the domain abasyn.local.

Text Paste Area: A textarea allowing users to paste CSV content directly. The placeholder shows example format. Both file upload and text paste trigger automatic CSV parsing.

Preview Table: When valid CSV data is parsed, a preview section appears showing the number of rows detected and a table displaying up to 5 rows with all column headers. Empty values show an em dash for clarity. If more than 5 rows exist, a message indicates the remaining count.

Results Display: After the update operation completes, the preview and input sections are replaced with a results panel showing three stat boxes: Total (white on dark), Updated (green), and Failed (red). If any errors occurred, a scrollable error list shows each failure with row number, username in monospace font, and the error message in red text.

### Processing Flow

1. User uploads a CSV file or pastes CSV text into the textarea
2. The frontend parses the CSV extracting headers and row data
3. User reviews the preview table showing parsed data
4. User clicks the orange Update button showing the count of users to update
5. A confirmation dialog warns that only fields with values will be updated and empty fields will be skipped
6. The frontend sends a POST request to /api/users/bulk-update-csv with the rows array in the request body
7. The backend normalizes column names using the column mapping dictionary with case-insensitive alias support
8. For each row the backend extracts the username, removes empty values from the update data, and calls ad_service.update_user with only the non-empty fields
9. Each successful update is logged to the audit trail with action Bulk Update User showing which fields were modified
10. Results are returned showing total, updated count, failed count, success list, and error details with row numbers

### Backend Endpoint

POST /api/users/bulk-update-csv

Request body: JSON object with a rows array where each element is an object with username and the fields to update.

Response: JSON object with total, updated, failed, errors array, and success array.

Requires authentication with JWT token. Restricted to Admin and Helpdesk roles.

### Frontend API Function

Located in src/api.js as bulkUpdateCsv which sends a POST request to /api/users/bulk-update-csv with the rows wrapped in an object.

### Safety Features

Empty values in CSV cells are automatically filtered out before sending to the AD update function. This prevents accidentally blanking existing AD attributes when a CSV column exists but has no value for a particular user.

The username column is required and rows without a username are skipped with an error message indicating Missing username with the row number.

Rows where all fields excluding username are empty are skipped with an error message indicating No fields to update with the row number.

The UPN userPrincipalName field is excluded from the column mapping to prevent constraint violation errors. If UPN update is needed it should be done individually through the Edit User modal which validates UPN format.

Each update operation is individually logged to the audit trail allowing administrators to track exactly which users were modified and which fields were changed.

### Typical Workflow

Step 1: Export current user data from the Reports page using the All Users or Active Users export button which downloads a CSV file.

Step 2: Open the exported CSV in Microsoft Excel or any spreadsheet application.

Step 3: Modify the desired columns for the users that need updates. Leave cells empty for fields that should not be changed.

Step 4: Save the file in CSV format ensuring the username column is preserved.

Step 5: In AD Manager Pro navigate to the Users page and click the orange Bulk Update button.

Step 6: Upload the modified CSV file or paste its contents.

Step 7: Review the preview table to verify the data looks correct.

Step 8: Click the Update button and confirm the operation.

Step 9: Review the results showing how many users were successfully updated and any failures.

### Difference from Other Bulk Operations

| Feature | Purpose | Input Method | Creates Users | Updates Users |
|---|---|---|---|---|
| Bulk Import | Create new AD users from CSV | CSV with all required fields including password | Yes | No |
| Bulk Modify | Apply same value to multiple selected users | Manual form with checkbox fields | No | Yes same value for all |
| Bulk Update | Update different values per user from CSV | CSV with username plus changed fields | No | Yes different values per user |
| Bulk Move | Move selected users to a different OU | OU dropdown selection | No | No changes location only |

# DOCUMENT METADATA

Document Version: 2.2.2
Application Version: 2.2.2
Total API Endpoints: 80+
Total Frontend Pages: 14
Total Database Tables: 7
Total Lines of Code: approximately 8000+
Python Packages: 9
NPM Packages: 7
Supported Protocols: HTTPS (8443), HTTP (8080)
Authentication: JWT with AD LDAP bind
Encryption: Fernet AES for stored passwords
Database: SQLite (zero configuration)
Deployment: Windows Task Scheduler
Last Updated: 2026