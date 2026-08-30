#!/usr/bin/env bash

set -euo pipefail
umask 077

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
RUN_SUFFIX="${TIMESTAMP}_$$_${RANDOM}"
ENCRYPTION_PASSWORD_FILE=${BACKUP_ENCRYPTION_PASSWORD_FILE:-}
ENCRYPTION_ITERATIONS=${BACKUP_ENCRYPTION_ITERATIONS:-600000}

case "$BACKUP_DIR" in
  ""|"/"|"."|"..")
    echo "BACKUP_DIR must be a dedicated, non-root directory." >&2
    exit 64
    ;;
esac

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
if [ -L "$BACKUP_DIR" ]; then
  echo "BACKUP_DIR must not be a symbolic link." >&2
  exit 64
fi
BACKUP_DIR=$(cd "$BACKUP_DIR" && pwd -P)
BACKUP_MARKER_FILE="$BACKUP_DIR/.autocare-backup-directory"
if [ -L "$BACKUP_MARKER_FILE" ]; then
  echo "Backup directory marker must not be a symbolic link." >&2
  exit 64
fi
if [ -e "$BACKUP_MARKER_FILE" ] && [ ! -f "$BACKUP_MARKER_FILE" ]; then
  echo "Backup directory marker is not a regular file." >&2
  exit 64
fi
if [ ! -e "$BACKUP_MARKER_FILE" ]; then
  printf 'AutoCare Hub backup directory\n' > "$BACKUP_MARKER_FILE"
fi

BACKUP_FILE="$BACKUP_DIR/db_backup_$RUN_SUFFIX.sql.gz.enc"
CHECKSUM_FILE="$BACKUP_FILE.sha256"
STAGED_BACKUP_FILE=""
STAGED_CHECKSUM_FILE=""
RAW_BACKUP_FILE=$(mktemp "$BACKUP_DIR/.db_backup_$RUN_SUFFIX.XXXXXX.sql.gz")
trap 'rm -f "$RAW_BACKUP_FILE" "$STAGED_BACKUP_FILE" "$STAGED_CHECKSUM_FILE"' EXIT

for required_command in date mkdir mktemp gzip shasum find; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Required command is unavailable: $required_command" >&2
    exit 69
  fi
done

if [ -z "$ENCRYPTION_PASSWORD_FILE" ] || [ ! -r "$ENCRYPTION_PASSWORD_FILE" ]; then
  if [ "${ALLOW_UNENCRYPTED_LOCAL_BACKUP:-false}" != "true" ]; then
    echo "BACKUP_ENCRYPTION_PASSWORD_FILE must reference a readable secret file." >&2
    echo "Set ALLOW_UNENCRYPTED_LOCAL_BACKUP=true only for an explicitly non-production local exercise." >&2
    exit 78
  fi
  BACKUP_FILE="${BACKUP_FILE%.enc}"
  CHECKSUM_FILE="$BACKUP_FILE.sha256"
fi

if [ -n "$ENCRYPTION_PASSWORD_FILE" ] && [ -r "$ENCRYPTION_PASSWORD_FILE" ] && ! command -v openssl >/dev/null 2>&1; then
  echo "Required command is unavailable: openssl" >&2
  exit 69
fi

echo "Starting database backup for $DB_NAME..."

# Check if we should use Docker or local pg_dump
if [ "$DB_HOST" == "localhost" ] && command -v docker >/dev/null 2>&1 && [ "$(docker ps -q -f name=autocarehub-postgres 2>/dev/null)" ]; then
  echo "Using Docker container (autocarehub-postgres) for backup..."
  docker exec autocarehub-postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$RAW_BACKUP_FILE"
else
  echo "Using local pg_dump..."
  if ! command -v pg_dump >/dev/null 2>&1; then
    echo "pg_dump is required when the Docker PostgreSQL container is unavailable." >&2
    exit 69
  fi
  PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$RAW_BACKUP_FILE"
fi

gzip -t "$RAW_BACKUP_FILE"

if [ -n "$ENCRYPTION_PASSWORD_FILE" ] && [ -r "$ENCRYPTION_PASSWORD_FILE" ]; then
  STAGED_BACKUP_FILE=$(mktemp "$BACKUP_DIR/.db_backup_$RUN_SUFFIX.XXXXXX")
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter "$ENCRYPTION_ITERATIONS" \
    -pass "file:$ENCRYPTION_PASSWORD_FILE" \
    -in "$RAW_BACKUP_FILE" \
    -out "$STAGED_BACKUP_FILE"
  mv "$STAGED_BACKUP_FILE" "$BACKUP_FILE"
else
  mv "$RAW_BACKUP_FILE" "$BACKUP_FILE"
fi

STAGED_CHECKSUM_FILE=$(mktemp "$BACKUP_DIR/.db_backup_checksum_$RUN_SUFFIX.XXXXXX")
(
  cd "$BACKUP_DIR"
  shasum -a 256 "$(basename "$BACKUP_FILE")"
) > "$STAGED_CHECKSUM_FILE"
mv "$STAGED_CHECKSUM_FILE" "$CHECKSUM_FILE"
chmod 600 "$BACKUP_FILE" "$CHECKSUM_FILE" "$BACKUP_MARKER_FILE"
echo "Backup successful: $BACKUP_FILE"
echo "Checksum written: $CHECKSUM_FILE"

# Keep only the last 7 days of backup archives and their checksums.
if [ ! -f "$BACKUP_MARKER_FILE" ]; then
  echo "Refusing retention cleanup: backup directory marker is missing." >&2
  exit 64
fi
find "$BACKUP_DIR" -type f \( -name "db_backup_*.sql.gz" -o -name "db_backup_*.sql.gz.enc" -o -name "db_backup_*.sha256" \) -mtime +7 -delete
echo "Old backups cleaned up (keeping last 7 days)."
