#!/bin/bash
# scripts/backup.sh — Daily PostgreSQL backup with offsite sync
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/.config/flutur-ops/backups"
LOG_FILE="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting backup..." >> "$LOG_FILE"

# pg_dump
if pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/flutur-$TIMESTAMP.sql.gz"; then
  SIZE=$(du -h "$BACKUP_DIR/flutur-$TIMESTAMP.sql.gz" | cut -f1)
  echo "[$TIMESTAMP] Backup created: flutur-$TIMESTAMP.sql.gz ($SIZE)" >> "$LOG_FILE"
else
  echo "[$TIMESTAMP] ERROR: pg_dump failed" >> "$LOG_FILE"
  exit 1
fi

# Rotate old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "[$TIMESTAMP] Rotated backups older than 30 days" >> "$LOG_FILE"

# Offsite (Cloudflare R2 via restic) — uncomment when R2 is configured
# if command -v restic &>/dev/null && [ -n "${R2_ENDPOINT:-}" ]; then
#   restic -r "s3:${R2_ENDPOINT}/flutur-backups" backup "$BACKUP_DIR/flutur-$TIMESTAMP.sql.gz" >> "$LOG_FILE" 2>&1
#   echo "[$TIMESTAMP] Offsite sync complete" >> "$LOG_FILE"
# fi

echo "[$TIMESTAMP] Backup complete" >> "$LOG_FILE"
