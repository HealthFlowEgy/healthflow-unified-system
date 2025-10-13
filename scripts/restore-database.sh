#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: ./restore-database.sh <backup-file.sql.gz>"
    exit 1
fi
echo "Restoring from $1..."
gunzip -c "$1" | docker exec -i healthflow-postgres psql -U healthflow healthflow
echo "✅ Restoration complete"
