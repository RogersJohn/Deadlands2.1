@echo off
REM Script to load reference data into PostgreSQL database

echo Loading reference data into database...

REM Load the reference data using Docker
docker exec -i deadlands-campaign-manager-db-1 psql -U deadlands -d deadlands < backend\src\main\resources\reference-data.sql

if %errorlevel% equ 0 (
    echo Reference data loaded successfully!
) else (
    echo Error loading reference data. Please check your database connection.
    echo Trying alternative method...

    REM Alternative: Try connecting directly if PostgreSQL is installed locally
    psql -U deadlands -d deadlands -f backend\src\main\resources\reference-data.sql
)

pause
