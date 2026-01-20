#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Load secrets from macOS Keychain to environment
# Usage: source scripts/load-secrets.sh
# ═══════════════════════════════════════════════════════════════

SERVICE_NAME="social-cli-mcp"

# Function to get secret from keychain
get_secret() {
    local key="$1"
    security find-generic-password -s "$SERVICE_NAME" -a "$key" -w 2>/dev/null
}

echo "🔐 Loading secrets from Keychain..."

# Twitter/X
export TWITTER_API_KEY=$(get_secret "TWITTER_API_KEY")
export TWITTER_API_SECRET=$(get_secret "TWITTER_API_SECRET")
export TWITTER_ACCESS_TOKEN=$(get_secret "TWITTER_ACCESS_TOKEN")
export TWITTER_ACCESS_SECRET=$(get_secret "TWITTER_ACCESS_SECRET")
export TWITTER_CLIENT_ID=$(get_secret "TWITTER_CLIENT_ID")
export TWITTER_CLIENT_SECRET=$(get_secret "TWITTER_CLIENT_SECRET")

# Instagram
export INSTAGRAM_ACCESS_TOKEN=$(get_secret "INSTAGRAM_ACCESS_TOKEN")
export INSTAGRAM_BUSINESS_ACCOUNT_ID=$(get_secret "INSTAGRAM_BUSINESS_ACCOUNT_ID")
export FACEBOOK_PAGE_ID=$(get_secret "FACEBOOK_PAGE_ID")

# Gmail
export GMAIL_USER=$(get_secret "GMAIL_USER")
export GMAIL_APP_PASSWORD=$(get_secret "GMAIL_APP_PASSWORD")

# Anthropic
export ANTHROPIC_API_KEY=$(get_secret "ANTHROPIC_API_KEY")

# Telegram
export TELEGRAM_BOT_TOKEN=$(get_secret "TELEGRAM_BOT_TOKEN")
export TELEGRAM_USER_ID=$(get_secret "TELEGRAM_USER_ID")

echo "✅ Secrets loaded!"
echo ""
echo "Loaded variables:"
echo "  - TWITTER_API_KEY: ${TWITTER_API_KEY:0:8}..."
echo "  - INSTAGRAM_ACCESS_TOKEN: ${INSTAGRAM_ACCESS_TOKEN:0:8}..."
echo "  - ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:12}..."
echo "  - TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:0:10}..."
