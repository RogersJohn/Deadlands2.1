@echo off
REM Run Combat Initiative E2E Tests for Windows
REM This script starts the Selenium grid and runs the combat initiative tests

setlocal enabledelayedexpansion

echo === Combat Initiative E2E Tests ===
echo.

REM Configuration
if "%FRONTEND_URL%"=="" set FRONTEND_URL=https://deadlands-frontend-production.up.railway.app
if "%API_URL%"=="" set API_URL=https://deadlands-campaign-manager-production-053e.up.railway.app/api
if "%1"=="" (set TAGS=@combat) else (set TAGS=%1)

echo Target Environment:
echo   Frontend: %FRONTEND_URL%
echo   API:      %API_URL%
echo   Tags:     %TAGS%
echo.

REM Check if docker-compose is available
where docker-compose >nul 2>&1
if errorlevel 1 (
    echo Error: docker-compose is not installed
    exit /b 1
)

REM Start Selenium Grid
echo Starting Selenium Grid...
docker-compose up -d selenium-hub chrome-gm chrome-player1 chrome-player2

REM Wait for grid to be ready
echo Waiting for Selenium Grid to be ready...
set max_attempts=30
set attempt=0

:waitloop
if %attempt% geq %max_attempts% goto timeout
curl -s http://localhost:4444/status 2>nul | findstr /c:"\"ready\": true" >nul
if not errorlevel 1 (
    echo Selenium Grid is ready!
    goto ready
)
set /a attempt+=1
echo   Waiting... (%attempt%/%max_attempts%)
timeout /t 2 /nobreak >nul
goto waitloop

:timeout
echo Error: Selenium Grid did not become ready in time
docker-compose logs selenium-hub
docker-compose down
exit /b 1

:ready
echo.
echo Running combat initiative tests...
echo.

set SELENIUM_HUB_URL=http://localhost:4444
call npx cucumber-js --tags "%TAGS%" features/combat-initiative.feature

set test_exit_code=%errorlevel%

REM Cleanup
echo.
echo Cleaning up...
docker-compose down

if %test_exit_code% equ 0 (
    echo.
    echo === All tests passed! ===
) else (
    echo.
    echo === Some tests failed (exit code: %test_exit_code%) ===
)

exit /b %test_exit_code%
