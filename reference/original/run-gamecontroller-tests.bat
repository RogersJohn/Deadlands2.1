When I log into the game @echo off
REM Run only GameControllerTest

echo ========================================
echo Running GameControllerTest (21 tests)
echo ========================================

cd "%~dp0"
call mvnw.cmd test -Dtest=GameControllerTest -f backend\pom.xml

echo.
echo ========================================
echo GameController Tests Complete!
echo ========================================
echo.
echo Expected: 21 tests, 0 failures
echo.

pause
