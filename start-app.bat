@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

if not exist "server\.env" (
  echo ERROR: server.env missing. Create server.env before starting.
  pause
  exit /b 1
)

set "ACTIVE_MONGO_COUNT=0"
set "ACTIVE_MONGO_URI="
set "ACTIVE_DATABASE="

for /f "usebackq tokens=* delims=" %%L in ("server\.env") do (
  set "ENV_LINE=%%L"
  for /f "tokens=* delims= " %%A in ("!ENV_LINE!") do set "ENV_LINE=%%A"
  if /I "!ENV_LINE:~0,10!"=="MONGO_URI=" (
    set /a ACTIVE_MONGO_COUNT+=1
    set "ACTIVE_MONGO_URI=!ENV_LINE:~10!"
  )
)

if "%ACTIVE_MONGO_COUNT%"=="0" (
  echo ERROR: No active MONGO_URI found in server/.env.
  pause
  exit /b 1
)

if not "%ACTIVE_MONGO_COUNT%"=="1" (
  echo ERROR: Both live and demo MONGO_URI lines are active. Comment one line with # before starting.
  pause
  exit /b 1
)

set "DATABASE_PART=!ACTIVE_MONGO_URI!"
for /f "tokens=1 delims=?" %%D in ("%DATABASE_PART%") do set "DATABASE_PART=%%D"
set "DATABASE_PART=!DATABASE_PART:/= !"
for %%D in (!DATABASE_PART!) do set "ACTIVE_DATABASE=%%D"

if not exist "client\dist\index.html" (
  echo Missing production frontend build.
  echo Run npm run build once before starting the office app.
  pause
  exit /b 1
)

set NODE_ENV=production
echo Universal Systems App starting...
echo Active database: %ACTIVE_DATABASE%
npm start

endlocal
