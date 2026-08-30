#!/usr/bin/env bash

set -euo pipefail
umask 077

usage() {
  echo "Usage: $0 <backup.sql.gz[.enc]> <target-database>"
  echo "The target database must already exist and should be empty."
}

if [ "$#" -ne 2 ]; then
  usage >&2
  exit 64
fi

BACKUP_FILE=$1
TARGET_DATABASE=$2

case "$TARGET_DATABASE" in
  ""|*[!A-Za-z0-9_]*|[0-9]*)
    echo "Target database must be a PostgreSQL identifier beginning with a letter or underscore." >&2
    exit 64
    ;;
esac

if [ ! -f "$BACKUP_FILE" ] || [ -L "$BACKUP_FILE" ]; then
  echo "Backup file does not exist: $BACKUP_FILE" >&2
  exit 66
fi

ENCRYPTION_PASSWORD_FILE=${BACKUP_ENCRYPTION_PASSWORD_FILE:-}
ENCRYPTION_ITERATIONS=${BACKUP_ENCRYPTION_ITERATIONS:-600000}
CHECKSUM_FILE="$BACKUP_FILE.sha256"

if [ ! -f "$CHECKSUM_FILE" ] || [ -L "$CHECKSUM_FILE" ]; then
  echo "Backup checksum file is required: $CHECKSUM_FILE" >&2
  exit 65
fi
BACKUP_DIRECTORY=$(cd "$(dirname "$BACKUP_FILE")" && pwd -P)
BACKUP_BASENAME=$(basename "$BACKUP_FILE")
CHECKSUM_BASENAME=$(basename "$CHECKSUM_FILE")
if ! (
  cd "$BACKUP_DIRECTORY"
  shasum -a 256 -c "$CHECKSUM_BASENAME"
); then
  echo "Backup checksum verification failed: $CHECKSUM_FILE" >&2
  exit 65
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to restore a PostgreSQL backup." >&2
  exit 69
fi
for required_command in gzip shasum; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Required command is unavailable: $required_command" >&2
    exit 69
  fi
done
if [[ "$BACKUP_FILE" == *.enc ]] && ! command -v openssl >/dev/null 2>&1; then
  echo "Required command is unavailable: openssl" >&2
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

restore_encrypted_backup() {
  if [ -z "$ENCRYPTION_PASSWORD_FILE" ] || [ ! -r "$ENCRYPTION_PASSWORD_FILE" ]; then
    echo "BACKUP_ENCRYPTION_PASSWORD_FILE must reference the secret used to create this backup." >&2
    exit 78
  fi
  openssl enc -d -aes-256-cbc -pbkdf2 -iter "$ENCRYPTION_ITERATIONS" \
    -pass "file:$ENCRYPTION_PASSWORD_FILE" \
    -in "$BACKUP_FILE" | gzip -dc
}

restore_unencrypted_backup() {
  if [ "${ALLOW_UNENCRYPTED_LOCAL_RESTORE:-false}" != "true" ]; then
    echo "Refusing unencrypted restore. Set ALLOW_UNENCRYPTED_LOCAL_RESTORE=true only for a local exercise." >&2
    exit 78
  fi
  gzip -t "$BACKUP_FILE"
  gzip -dc "$BACKUP_FILE"
}

echo "Restoring $BACKUP_BASENAME into $DB_HOST:$DB_PORT/$TARGET_DATABASE..."

if [[ "$BACKUP_FILE" == *.enc ]]; then
  restore_encrypted_backup
else
  restore_unencrypted_backup
fi | PGPASSWORD="$DB_PASS" psql \
  --no-psqlrc \
  --set ON_ERROR_STOP=1 \
  --single-transaction \
  --host "$DB_HOST" \
  --port "$DB_PORT" \
  --username "$DB_USER" \
  --dbname "$TARGET_DATABASE"

echo "Restore completed successfully."
