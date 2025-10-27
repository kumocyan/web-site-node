@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM Change directory to the location of this script
cd /d "%~dp0"

REM Ensure .env exists by copying from env.sample if available
if not exist .env (
  if exist env.sample (
    echo Creating .env from env.sample...
    copy /Y env.sample .env >nul
  ) else (
    echo Could not find .env or env.sample. Please create one manually.
    exit /b 1
  )
)

REM Load environment variables from .env
for /f "usebackq tokens=* delims=" %%L in (".env") do (
  set "line=%%L"
  if not "!line!"=="" (
    if not "!line:~0,1!"=="#" (
      for /f "tokens=1* delims==" %%a in ("!line!") do (
        if not "%%a"=="" set "%%a=%%b"
      )
    )
  )
)

echo Ensuring dependencies are installed...
call npm install
if errorlevel 1 (
  echo npm install failed.
  exit /b 1
)

echo Starting server...
call npm run start

endlocal
