#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Usage: ./release.sh <version>"
  echo "Example: ./release.sh v0.2.4"
  exit 1
fi

# Validate semver format: vMAJOR.MINOR.PATCH with optional pre-release/build
if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: Version must be in semver format (e.g., v0.2.4)"
  exit 1
fi

# Strip the leading 'v' for package.json
SEMVER="${VERSION#v}"

PACKAGES=(
  packages/compiler
  packages/templates
  packages/lsp
  packages/cli
)

for pkg in "${PACKAGES[@]}"; do
  echo "Setting $pkg to version $SEMVER"
  npm --no-git-tag-version version "$SEMVER" --prefix "$pkg"
done

git add "${PACKAGES[@]/%//package.json}"
git commit -m "Release version $VERSION"
git tag "$VERSION"

echo "Pushing commit and tag to origin..."
git push origin HEAD
git push origin "$VERSION"

echo "Released $VERSION"
