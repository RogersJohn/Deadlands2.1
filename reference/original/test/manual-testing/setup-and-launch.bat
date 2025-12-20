@echo off
REM Manual Testing - Setup and Launch
REM This script sets up test characters and launches 3 browsers for manual testing

echo ========================================
echo   Deadlands Manual Testing Setup
echo ========================================
echo.

REM Check if backend is running
echo [1/3] Checking if backend is running...
timeout /t 2 /nobreak > nul
curl -s http://localhost:8080/actuator/health > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Backend is not running!
    echo Please start the backend first:
    echo   cd backend
    echo   mvnw.cmd spring-boot:run
    echo.
    pause
    exit /b 1
)
echo     Backend is running!

REM Check if frontend is running
echo [2/3] Checking if frontend is running...
curl -s http://localhost:3000 > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Frontend is not running!
    echo Please start the frontend first:
    echo   cd frontend
    echo   npm run dev
    echo.
    pause
    exit /b 1
)
echo     Frontend is running!

REM Setup test characters in database
echo [3/3] Setting up test characters in database...
echo.
echo Running SQL script to create test characters...

REM Try to run SQL script (adjust credentials as needed)
set PGPASSWORD=deadlands
psql -U deadlands -d deadlands -f setup-test-characters.sql 2>nul

if %errorlevel% neq 0 (
    echo.
    echo WARNING: Could not automatically run SQL setup.
    echo Please run manually:
    echo   psql -U deadlands -d deadlands -f test/manual-testing/setup-test-characters.sql
    echo.
    echo Or copy/paste the SQL from setup-test-characters.sql into your database client.
    echo.
    echo Press any key to continue anyway...
    pause > nul
) else (
    echo     Test characters created successfully!
)

echo.
echo ========================================
echo   Launching Test Browsers
echo ========================================
echo.
echo Launching 3 incognito Chrome browsers:
echo   1. Game Master
echo   2. Player 1 (Arcane Huckster)
echo   3. Player 2 (Divine Blessed)
echo.
echo Browsers will auto-login and navigate to the correct pages.
echo.

REM Launch the Node.js script
cd ..\..
node test\manual-testing\launch-test-scenario.js

echo.
echo Press any key to exit (browsers will remain open)...
pause > nul
