#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: $0 <backup.sql.gz> <target-database>"
  echo "The target database must already exist and should be empty."
}

if [ "$#" -ne 2 ]; then
  usage >&2
  exit 64
fi

BACKUP_FILE=$1
TARGET_DATABASE=$2

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file does not exist: $BACKUP_FILE" >&2
  exit 66
fi

if ! gzip -t "$BACKUP_FILE"; then
  echo "Backup file is not a valid gzip archive: $BACKUP_FILE" >&2
  exit 65
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to restore a PostgreSQL backup." >&2
  exit 69
fi

DB_HOST=${RESTORE_DATABASE_HOST:-${DATABASE_HOST:-localhost}}
DB_PORT=${RESTORE_DATABASE_PORT:-${DATABASE_PORT:-5433}}
DB_USER=${RESTORE_DATABASE_USER:-${DATABASE_USER:-autocarehub}}
DB_PASS=${RESTORE_DATABASE_PASSWORD:-${DATABASE_PASSWORD:-autocarehub}}
CURRENT_DATABASE=${DATABASE_NAME:-}

if [ "$TARGET_DATABASE" = "$CURRENT_DATABASE" ] && [ "${ALLOW_SAME_DATABASE_RESTORE:-false}" != "true" ]; then
  echo "Refusing to restore into DATABASE_NAME=$CURRENT_DATABASE." >&2
  echo "Use a separate restore database, or set ALLOW_SAME_DATABASE_RESTORE=true only after explicit approval." >&2
  exit 77
fi

echo "Restoring $BACKUP_FILE into $DB_HOST:$DB_PORT/$TARGET_DATABASE..."

gzip -dc "$BACKUP_FILE" | PGPASSWORD="$DB_PASS" psql \
  --no-psqlrc \
  --set ON_ERROR_STOP=1 \
  --host "$DB_HOST" \
  --port "$DB_PORT" \
  --username "$DB_USER" \
  --dbname "$TARGET_DATABASE"

echo "Restore completed successfully."
