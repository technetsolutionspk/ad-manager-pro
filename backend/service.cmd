@echo off
cd /d "C:\AD Pro\public\backend"
"C:\AD Pro\public\backend\venv\Scripts\python.exe" -m uvicorn app:app --host 0.0.0.0 --port 8080 --workers 4 --log-level info >> "C:\AD Pro\public\backend\logs\service.log" 2>&1