@echo off
title Work Time - fix Electron and start
cd /d "%~dp0"

echo.
echo === Work Time: repairing Electron and starting the app ===
echo.

REM 1) Clear Electron's download cache (a half-downloaded zip there breaks every retry)
if exist "%LOCALAPPDATA%\electron\Cache" (
  echo Clearing Electron download cache...
  rmdir /s /q "%LOCALAPPDATA%\electron\Cache"
)

REM 2) Reinstall Electron from the normal download site, showing any errors
echo Reinstalling Electron (about 100 MB, please wait)...
if exist node_modules\electron rmdir /s /q node_modules\electron
set ELECTRON_MIRROR=
call npm install electron@33.4.11 --save-dev --foreground-scripts

REM 3) If electron.exe is still missing, try the mirror
if not exist node_modules\electron\dist\electron.exe (
  echo.
  echo Normal download did not work - trying the mirror...
  if exist "%LOCALAPPDATA%\electron\Cache" rmdir /s /q "%LOCALAPPDATA%\electron\Cache"
  rmdir /s /q node_modules\electron
  set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
  call npm install electron@33.4.11 --save-dev --foreground-scripts
)

REM 4) Still missing? Most likely antivirus removed it
if not exist node_modules\electron\dist\electron.exe (
  echo.
  echo ============================================================
  echo  electron.exe is still missing after downloading.
  echo  Your antivirus / company security probably removed it.
  echo  Open Windows Security ^> Virus ^& threat protection ^>
  echo  Protection history and check for electron.exe,
  echo  or ask IT to allow this folder:
  echo    %~dp0node_modules\electron
  echo  Then run this file again.
  echo ============================================================
  pause
  exit /b 1
)

echo.
echo Electron is installed correctly. Starting Work Time...
echo.
call npm run app
pause
