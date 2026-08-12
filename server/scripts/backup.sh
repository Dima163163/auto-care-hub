#!/bin/bash

# AutoCare Hub Database Backup Script
# This script creates a compressed SQL dump of the PostgreSQL database.

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Configuration
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5433}
DB_NAME=${DATABASE_NAME:-autocarehub}
DB_USER=${DATABASE_USER:-autocarehub}
DB_PASS=${DATABASE_PASSWORD:-autocarehub}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup for $DB_NAME..."

# Check if we should use Docker or local pg_dump
if [ "$DB_HOST" == "localhost" ] && [ "$(docker ps -q -f name=autocarehub-postgres)" ]; then
  echo "Using Docker container (autocarehub-postgres) for backup..."
  docker exec autocarehub-postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
  echo "Using local pg_dump..."
  PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_FILE"
  # Keep only the last 7 days of backups
  find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete
  echo "Old backups cleaned up (keeping last 7 days)."
else
  echo "Backup failed!"
  exit 1
fi
