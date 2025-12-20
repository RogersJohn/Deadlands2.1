@echo off
REM Run all backend tests and generate coverage report

echo ========================================
echo Running Backend Tests
echo ========================================

cd "%~dp0"
call mvnw.cmd test -f backend\pom.xml

echo.
echo ========================================
echo Tests Complete!
echo ========================================
echo.
echo View coverage report at:
echo backend\target\site\jacoco\index.html
echo.

pause
