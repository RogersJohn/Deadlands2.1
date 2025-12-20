#!/bin/bash
# Script to load reference data into PostgreSQL database

echo "Loading reference data into database..."

# Check if PostgreSQL is accessible
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please ensure PostgreSQL is installed and in your PATH."
    exit 1
fi

# Load the reference data
psql -U deadlands -d deadlands -f backend/src/main/resources/reference-data.sql

if [ $? -eq 0 ]; then
    echo "Reference data loaded successfully!"
else
    echo "Error loading reference data. Please check your database connection."
    exit 1
fi
