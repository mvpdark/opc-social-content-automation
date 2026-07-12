@echo off
setlocal

cd /d "%~dp0"
title OPC Local Launcher

echo.
echo ========================================
echo   OPC Local Launcher
echo ========================================
echo.
if /I "%~1"=="--status" (
  echo Checking backend on http://127.0.0.1:60001
  echo Checking frontend on http://127.0.0.1:60000
) else (
  echo Starting backend on http://127.0.0.1:60001
  echo Starting frontend on http://127.0.0.1:60000
)
echo.

set "PYTHON_EXE="
if exist "%CD%\.venv\Scripts\python.exe" (
  set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"
) else (
  for %%P in (python.exe python) do (
    if not defined PYTHON_EXE (
      where %%P >nul 2>nul
      if not errorlevel 1 set "PYTHON_EXE=%%P"
    )
  )
)

if not defined PYTHON_EXE (
  echo Python was not found.
  echo Install Python 3.11+, or run scripts\setup_local.py after Python is installed.
  echo.
  goto :fail
)

"%PYTHON_EXE%" scripts\start_local.py %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo OPC did not start cleanly. Check the message above.
  echo.
  goto :fail_with_code
)

if /I "%~1"=="--status" (
  if /I "%OPC_LAUNCHER_NO_PAUSE%"=="1" exit /b 0
  pause
  exit /b 0
)

echo.
echo OPC is starting or already running.
echo.
echo App:     http://127.0.0.1:60000/?theme=mint
echo API:     http://127.0.0.1:60001
echo Backend: backend\uvicorn-60001.log
echo Frontend: frontend\next-60000.log
echo.

start "" "http://127.0.0.1:60000/?theme=mint"

if /I "%OPC_LAUNCHER_NO_PAUSE%"=="1" exit /b 0
echo You can close this window after the browser opens.
pause
exit /b 0

:fail_with_code
if /I "%OPC_LAUNCHER_NO_PAUSE%"=="1" exit /b %EXIT_CODE%
pause
exit /b %EXIT_CODE%

:fail
if /I "%OPC_LAUNCHER_NO_PAUSE%"=="1" exit /b 1
pause
exit /b 1
