@echo off
title AD Manager Pro - Production
cd /d "C:\AD Pro\public\backend"
venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8443 --ssl-keyfile "certs\key.pem" --ssl-certfile "certs\cert.pem" --workers 4 --log-level info >> logs\service.log 2>&1
