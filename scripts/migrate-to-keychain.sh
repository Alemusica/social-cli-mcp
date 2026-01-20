#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Migrate .env secrets to macOS Keychain
# ═══════════════════════════════════════════════════════════════
#
# This script reads your .env file and adds each secret to the
# macOS Keychain under the "social-cli-mcp" service.
#
# Usage:
#   1. Fill in your secrets in .env
#   2. Run: ./scripts/migrate-to-keychain.sh
#   3. Verify: security find-generic-password -s 'social-cli-mcp' -a 'TWITTER_API_KEY' -w
#   4. Delete or empty your .env after verifying
#

SERVICE_NAME="social-cli-mcp"
ENV_FILE="${1:-.env}"

echo "🔐 Migrating secrets from $ENV_FILE to macOS Keychain..."
echo "   Service: $SERVICE_NAME"
echo ""

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ File not found: $ENV_FILE"
    exit 1
fi

# Function to add secret to keychain
add_secret() {
    local key="$1"
    local value="$2"

    if [ -z "$value" ]; then
        return
    fi

    # Delete existing entry if exists (suppress errors)
    security delete-generic-password -s "$SERVICE_NAME" -a "$key" 2>/dev/null

    # Add new entry
    security add-generic-password -s "$SERVICE_NAME" -a "$key" -w "$value" -U

    if [ $? -eq 0 ]; then
        echo "✅ Added: $key"
    else
        echo "❌ Failed: $key"
    fi
}

# Parse .env and add each secret
count=0
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    # Remove quotes from value
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"

    if [ -n "$value" ]; then
        add_secret "$key" "$value"
        ((count++))
    fi
done < "$ENV_FILE"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Migration complete! ($count secrets)"
echo ""
echo "To verify, run:"
echo "  security find-generic-password -s '$SERVICE_NAME' -a 'KEY_NAME' -w"
echo ""
echo "⚠️  IMPORTANT: Clear your .env file after verifying!"
echo "═══════════════════════════════════════════════════════════════"
