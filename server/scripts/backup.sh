#!/usr/bin/env bash

set -euo pipefail

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
BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz.enc"
CHECKSUM_FILE="$BACKUP_FILE.sha256"
ENCRYPTION_PASSWORD_FILE=${BACKUP_ENCRYPTION_PASSWORD_FILE:-}
ENCRYPTION_ITERATIONS=${BACKUP_ENCRYPTION_ITERATIONS:-600000}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
RAW_BACKUP_FILE=$(mktemp "$BACKUP_DIR/.db_backup_$TIMESTAMP.XXXXXX.sql.gz")
trap 'rm -f "$RAW_BACKUP_FILE"' EXIT

if [ -z "$ENCRYPTION_PASSWORD_FILE" ] || [ ! -r "$ENCRYPTION_PASSWORD_FILE" ]; then
  if [ "${ALLOW_UNENCRYPTED_LOCAL_BACKUP:-false}" != "true" ]; then
    echo "BACKUP_ENCRYPTION_PASSWORD_FILE must reference a readable secret file." >&2
    echo "Set ALLOW_UNENCRYPTED_LOCAL_BACKUP=true only for an explicitly non-production local exercise." >&2
    exit 78
  fi
  BACKUP_FILE="${BACKUP_FILE%.enc}"
  CHECKSUM_FILE="$BACKUP_FILE.sha256"
fi

echo "Starting database backup for $DB_NAME..."

# Check if we should use Docker or local pg_dump
if [ "$DB_HOST" == "localhost" ] && [ "$(docker ps -q -f name=autocarehub-postgres)" ]; then
  echo "Using Docker container (autocarehub-postgres) for backup..."
  docker exec autocarehub-postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$RAW_BACKUP_FILE"
else
  echo "Using local pg_dump..."
  PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$RAW_BACKUP_FILE"
fi

gzip -t "$RAW_BACKUP_FILE"

if [ -n "$ENCRYPTION_PASSWORD_FILE" ] && [ -r "$ENCRYPTION_PASSWORD_FILE" ]; then
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter "$ENCRYPTION_ITERATIONS" \
    -pass "file:$ENCRYPTION_PASSWORD_FILE" \
    -in "$RAW_BACKUP_FILE" \
    -out "$BACKUP_FILE"
else
  mv "$RAW_BACKUP_FILE" "$BACKUP_FILE"
fi

shasum -a 256 "$BACKUP_FILE" > "$CHECKSUM_FILE"
echo "Backup successful: $BACKUP_FILE"
echo "Checksum written: $CHECKSUM_FILE"

# Keep only the last 7 days of backup archives and their checksums.
find "$BACKUP_DIR" -type f \( -name "db_backup_*.sql.gz" -o -name "db_backup_*.sql.gz.enc" -o -name "db_backup_*.sha256" \) -mtime +7 -delete
echo "Old backups cleaned up (keeping last 7 days)."
