#!/bin/bash

# Script to create a local tarball, install it globally, and clean up
# This allows testing the latest local code with `sushify start` from anywhere

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Building and installing Sushify locally...${NC}"

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Build the project first
echo -e "${YELLOW}📦 Building project...${NC}"
npm run build

# Create unique tarball name with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TARBALL="/tmp/sushify-local-${TIMESTAMP}.tgz"

# Create tarball
echo -e "${YELLOW}📦 Creating tarball: ${TARBALL}${NC}"
npm pack --pack-destination=/tmp

# Find the created tarball (npm pack creates it with version number)
ACTUAL_TARBALL=$(find /tmp -name "sushify-*.tgz" -newer /tmp/sushify-local-marker 2>/dev/null | head -1)

# Create marker file for next run
touch /tmp/sushify-local-marker

# If we couldn't find the tarball, use a fallback approach
if [ -z "$ACTUAL_TARBALL" ]; then
    ACTUAL_TARBALL=$(ls -t /tmp/sushify-*.tgz 2>/dev/null | head -1)
fi

if [ -z "$ACTUAL_TARBALL" ]; then
    echo -e "${RED}❌ Failed to find created tarball${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Found tarball: ${ACTUAL_TARBALL}${NC}"

# Uninstall previous version if it exists
echo -e "${YELLOW}🗑️  Uninstalling previous global version...${NC}"
npm uninstall -g sushify 2>/dev/null || echo "No previous version found"

# Install from tarball
echo -e "${YELLOW}🚀 Installing from local tarball...${NC}"
npm install -g "$ACTUAL_TARBALL"

# Clean up tarball
echo -e "${YELLOW}🧹 Cleaning up tarball...${NC}"
rm -f "$ACTUAL_TARBALL"

# Verify installation
echo -e "${YELLOW}✅ Verifying installation...${NC}"
if command -v sushify >/dev/null 2>&1; then
    INSTALLED_VERSION=$(sushify --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Sushify installed successfully!${NC}"
    echo -e "${GREEN}📍 Version: ${INSTALLED_VERSION}${NC}"
    echo -e "${GREEN}🎯 You can now run 'sushify start' from anywhere on your machine${NC}"
else
    echo -e "${RED}❌ Installation failed - sushify command not found${NC}"
    exit 1
fi

echo -e "${BLUE}🎉 Done! Test with: ${GREEN}sushify start \"your-command\"${NC}"
