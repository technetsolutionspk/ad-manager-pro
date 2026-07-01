@echo off
REM ============================================================
REM AD Manager Pro - Start Backend Server
REM ============================================================

title AD Manager Pro - Backend Server

echo.
echo  ==========================================
echo   AD Manager Pro - Starting Backend
echo  ==========================================
echo.

REM ── Check virtual environment exists ─────────────────────────
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found.
    echo        Please run setup.bat first.
    pause
    exit /b 1
)

REM ── Check .env file exists ────────────────────────────────────
if not exist ".env" (
    echo ERROR: .env file not found.
    echo        Please run setup.bat first.
    pause
    exit /b 1
)

REM ── Check app.py exists ───────────────────────────────────────
if not exist "app.py" (
    echo ERROR: app.py not found.
    echo        Make sure you are in the correct folder.
    pause
    exit /b 1
)

REM ── Check certs exist ─────────────────────────────────────────
if not exist "certs\cert.pem" (
    echo WARNING: SSL certificate not found.
    echo          Run setup.bat to generate certificates.
    echo          Starting without SSL...
    echo.
)

REM ── Activate virtual environment ──────────────────────────────
echo    Activating virtual environment...
call venv\Scripts\activate.bat

REM ── Show startup info ─────────────────────────────────────────
echo    OK: Virtual environment activated
echo.
echo  ==========================================
echo   Server Information
echo  ==========================================
echo.
echo   URL:      https://localhost:8443
echo   API Docs: https://localhost:8443/docs
echo   Status:   Starting...
echo.
echo   Press CTRL+C to stop the server
echo  ==========================================
echo.

REM ── Start the server ──────────────────────────────────────────
venv\Scripts\python.exe -m uvicorn app:app ^
    --host 0.0.0.0 ^
    --port 8443 ^
    --ssl-keyfile certs/key.pem ^
    --ssl-certfile certs/cert.pem ^
    --reload ^
    --log-level info

REM ── If server stops ───────────────────────────────────────────
echo.
echo  ==========================================
echo   Server stopped.
echo  ==========================================
echo.
pause