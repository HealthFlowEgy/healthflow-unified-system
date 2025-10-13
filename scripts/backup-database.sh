#!/bin/bash
BACKUP_DIR="./backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="healthflow_backup_${TIMESTAMP}.sql"

echo "Starting database backup..."
docker exec healthflow-postgres pg_dump -U healthflow healthflow > "${BACKUP_DIR}/${BACKUP_FILE}" 2>/dev/null
gzip "${BACKUP_DIR}/${BACKUP_FILE}"
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete
echo "✅ Backup complete: ${BACKUP_FILE}.gz"
