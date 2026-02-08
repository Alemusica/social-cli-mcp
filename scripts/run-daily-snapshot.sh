#!/bin/bash
# Daily Snapshot Runner
# Designed to be called by cron or launchd

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/daily-snapshot.log"
mkdir -p "$SCRIPT_DIR/logs"

cd "$SCRIPT_DIR"

# Run the snapshot with quiet mode
echo "$(date): Starting daily snapshot" >> "$LOG_FILE"
npx tsx src/analysis/daily-snapshot.ts --quiet >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "$(date): Snapshot completed successfully" >> "$LOG_FILE"
else
    echo "$(date): Snapshot FAILED with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

echo "---" >> "$LOG_FILE"
exit $EXIT_CODE
