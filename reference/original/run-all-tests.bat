@echo off
REM Run ALL backend tests including new Game State tests

echo ========================================
echo Running ALL Backend Tests
echo ========================================
echo.
echo Tests to run:
echo - AuthControllerTest (13 tests)
echo - CharacterControllerTest (16 tests)
echo - GameControllerTest (21 tests)
echo - GameStateServiceTest (15 tests)
echo - GameStateControllerTest (12 tests)
echo ========================================
echo Total Expected: ~77 tests
echo ========================================
echo.

cd "%~dp0"
call mvnw.cmd test -f backend\pom.xml

echo.
echo ========================================
echo All Tests Complete!
echo ========================================
echo.
echo View coverage report at:
echo backend\target\site\jacoco\index.html
echo.
echo Expected coverage: ~35-40%%
echo.

pause
