#!/bin/bash

# Setup Git hooks for auto-versioning
echo "Setting up Git hooks..."

# Configure git to use the .githooks directory
git config core.hooksPath .githooks

echo "✅ Git hooks configured successfully!"
echo ""
echo "Auto-version incrementing is now enabled:"
echo "  - Versions will automatically increment on each commit"
echo "  - Root and all project versions will be bumped"
echo ""
echo "Manual version bumping commands:"
echo "  - pnpm bump-version        (default: patch)"
echo "  - pnpm bump-version:minor  (bump minor version)"
echo "  - pnpm bump-version:major  (bump major version)"
