#!/bin/bash
# Version bump script for Vinco MAM plugin
# Usage: ./version-bump.sh [major|minor|patch]

VERSION_FILE="wordpress-plugin/vinco-mam.php"
PACKAGE_FILE="admin-ui/package.json"

if [ -z "$1" ]; then
    echo "Usage: ./version-bump.sh [major|minor|patch]"
    exit 1
fi

# Get current version from plugin file
CURRENT_VERSION=$(grep "VINCO_MAM_VERSION" "$VERSION_FILE" | grep -oP "'\K[^']+")
if [ -z "$CURRENT_VERSION" ]; then
    CURRENT_VERSION="1.0.0"
fi

# Parse version parts
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Bump version
case "$1" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
    *)
        echo "Invalid version type. Use: major, minor, or patch"
        exit 1
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "Bumping version from $CURRENT_VERSION to $NEW_VERSION"

# Update plugin file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/Version:.*$CURRENT_VERSION/Version:           $NEW_VERSION/g" "$VERSION_FILE"
    sed -i '' "s/VINCO_MAM_VERSION', '$CURRENT_VERSION'/VINCO_MAM_VERSION', '$NEW_VERSION'/g" "$VERSION_FILE"
else
    # Linux
    sed -i "s/Version:.*$CURRENT_VERSION/Version:           $NEW_VERSION/g" "$VERSION_FILE"
    sed -i "s/VINCO_MAM_VERSION', '$CURRENT_VERSION'/VINCO_MAM_VERSION', '$NEW_VERSION'/g" "$VERSION_FILE"
fi

# Update package.json
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/g" "$PACKAGE_FILE"
else
    sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/g" "$PACKAGE_FILE"
fi

echo "✅ Version bumped to $NEW_VERSION"
echo ""
echo "Files updated:"
echo "  - $VERSION_FILE"
echo "  - $PACKAGE_FILE"
echo ""
echo "Don't forget to:"
echo "  1. Rebuild React app: cd admin-ui && npm run build"
echo "  2. Update plugin zip: rm vinco-mam-plugin.zip && zip -r vinco-mam-plugin.zip wordpress-plugin"
echo "  3. Commit changes: git add -A && git commit -m \"Bump version to $NEW_VERSION\""
