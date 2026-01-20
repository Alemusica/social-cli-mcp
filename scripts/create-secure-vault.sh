#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Create encrypted Sparse Bundle for sensitive files
# ═══════════════════════════════════════════════════════════════

VAULT_NAME="SecureVault"
VAULT_PATH="$HOME/$VAULT_NAME.sparsebundle"
MOUNT_POINT="/Volumes/$VAULT_NAME"
SIZE="100m"  # 100MB (grows as needed)

echo "🔐 Creating Encrypted Sparse Bundle Vault"
echo "   Location: $VAULT_PATH"
echo "   Mount: $MOUNT_POINT"
echo ""

# Check if already exists
if [ -d "$VAULT_PATH" ]; then
    echo "⚠️  Vault already exists at $VAULT_PATH"
    echo ""
    read -p "Do you want to mount it? (y/n): " mount_existing
    if [ "$mount_existing" = "y" ]; then
        hdiutil attach "$VAULT_PATH" -mountpoint "$MOUNT_POINT"
        echo "✅ Mounted at $MOUNT_POINT"
        open "$MOUNT_POINT"
    fi
    exit 0
fi

echo "Creating encrypted disk image..."
echo "You will be prompted to set a password."
echo ""

# Create encrypted sparse bundle
hdiutil create \
    -size "$SIZE" \
    -fs "APFS" \
    -type SPARSEBUNDLE \
    -encryption AES-256 \
    -volname "$VAULT_NAME" \
    "$VAULT_PATH"

if [ $? -ne 0 ]; then
    echo "❌ Failed to create vault"
    exit 1
fi

echo ""
echo "✅ Encrypted vault created!"
echo ""

# Mount it
echo "Mounting vault..."
hdiutil attach "$VAULT_PATH" -mountpoint "$MOUNT_POINT"

# Create folder structure
mkdir -p "$MOUNT_POINT/passwords"
mkdir -p "$MOUNT_POINT/2fa-backup"
mkdir -p "$MOUNT_POINT/api-keys"
mkdir -p "$MOUNT_POINT/certificates"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Secure Vault Ready!"
echo ""
echo "📁 Folder structure created:"
echo "   $MOUNT_POINT/passwords    - Password files"
echo "   $MOUNT_POINT/2fa-backup   - 2FA backup codes"
echo "   $MOUNT_POINT/api-keys     - API keys/tokens"
echo "   $MOUNT_POINT/certificates - SSL certs, etc."
echo ""
echo "📌 Commands:"
echo "   Mount:   hdiutil attach '$VAULT_PATH'"
echo "   Unmount: hdiutil detach '$MOUNT_POINT'"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Remember your password! It cannot be recovered."
echo "   - The vault auto-locks when unmounted."
echo "   - Back up the .sparsebundle file to a secure location."
echo "═══════════════════════════════════════════════════════════════"

# Open in Finder
open "$MOUNT_POINT"
