@echo off
REM Manual Testing - Quick Launch
REM Just launches the 3 browsers (assumes setup was already done)

echo ========================================
echo   Launching Test Browsers
echo ========================================
echo.
echo Launching 3 incognito Chrome browsers:
echo   1. Game Master
echo   2. Player 1 (Arcane Huckster)
echo   3. Player 2 (Divine Blessed)
echo.

cd ..\..
node test\manual-testing\launch-test-scenario.js

echo.
echo Press any key to exit (browsers will remain open)...
pause > nul
