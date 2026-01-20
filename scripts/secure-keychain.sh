#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Secure Keychain - Add secrets with Touch ID/password protection
# ═══════════════════════════════════════════════════════════════
#
# This creates a SEPARATE keychain that requires authentication
# each time secrets are accessed.
#

KEYCHAIN_NAME="social-cli-secrets.keychain-db"
KEYCHAIN_PATH="$HOME/Library/Keychains/$KEYCHAIN_NAME"

echo "🔐 Setting up secure keychain with Touch ID protection..."
echo ""

# Check if keychain exists
if [ -f "$KEYCHAIN_PATH" ]; then
    echo "⚠️  Keychain already exists: $KEYCHAIN_NAME"
    echo "   To recreate, first delete it:"
    echo "   security delete-keychain '$KEYCHAIN_PATH'"
    exit 1
fi

echo "Creating secure keychain..."
echo "You'll set a password for this keychain."
echo ""

# Create keychain (will prompt for password)
security create-keychain "$KEYCHAIN_PATH"

# Add to search list so it can be found
security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | tr -d '"')

# Set keychain to lock after 5 minutes of inactivity and on sleep
security set-keychain-settings -t 300 -l "$KEYCHAIN_PATH"

echo ""
echo "✅ Secure keychain created!"
echo ""
echo "To add secrets with protection:"
echo "  security add-generic-password -s 'social-cli-mcp' -a 'KEY' -w 'value' -T '' '$KEYCHAIN_PATH'"
echo ""
echo "The -T '' flag means NO apps get automatic access - always prompts!"
echo ""
echo "To migrate existing secrets to this secure keychain:"
echo "  ./scripts/migrate-to-secure-keychain.sh"
