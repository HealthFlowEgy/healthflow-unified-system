#!/bin/bash

echo "🔄 Running Database Migrations..."
echo "=================================="

# Check if database is ready
echo "Checking database connection..."
docker exec healthflow-postgres pg_isready -U healthflow

if [ $? -ne 0 ]; then
    echo "❌ Database is not ready"
    exit 1
fi

echo "✅ Database is ready"
echo ""

# Run migrations
echo "Running Sprint 2 migrations..."
docker exec -i healthflow-postgres psql -U healthflow -d healthflow < shared/database/migrations/001_sprint2_tables.sql

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migrations failed"
    exit 1
fi

# Verify tables were created
echo ""
echo "Verifying tables..."
docker exec healthflow-postgres psql -U healthflow -d healthflow -c "\dt" | grep -E "prescriptions|medicines"

if [ $? -eq 0 ]; then
    echo "✅ Tables created successfully"
else
    echo "⚠️  Could not verify tables"
fi

echo ""
echo "=================================="
echo "✅ Migration Complete"