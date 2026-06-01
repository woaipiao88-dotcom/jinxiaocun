@echo off
cd /d "%~dp0"
set JXC_PORT=5001
python -m pip install -r requirements.txt
python app.py
pause
