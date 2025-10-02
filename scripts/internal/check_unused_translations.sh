#!/bin/bash

# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
# SPDX-License-Identifier: EUPL-1.2

# Script to detect unused translation keys in EXAM application
# Usage: ./check_unused_translations.sh [language_file]
# Example: ./check_unused_translations.sh ui/src/assets/i18n/fi.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default to Finnish translation file if no argument provided
TRANSLATION_FILE="${1:-ui/src/assets/i18n/fi.json}"

if [[ ! -f "$PROJECT_ROOT/$TRANSLATION_FILE" ]]; then
    echo "Error: Translation file not found: $TRANSLATION_FILE"
    echo "Usage: $0 [translation_file]"
    echo "Example: $0 ui/src/assets/i18n/fi.json"
    exit 1
fi

echo "Analyzing translation file: $TRANSLATION_FILE"
echo "Project root: $PROJECT_ROOT"
echo ""

# Extract translation keys from the JSON file
TEMP_KEYS_FILE=$(mktemp)
grep -o '"i18n_[^"]*"' "$PROJECT_ROOT/$TRANSLATION_FILE" | sed 's/"//g' | sort > "$TEMP_KEYS_FILE"

TOTAL_KEYS=$(wc -l < "$TEMP_KEYS_FILE")
echo "Total translation keys found: $TOTAL_KEYS"
echo ""

# Check for unused keys
echo "Checking for unused translation keys in app/ and ui/src/app/..."
unused_keys=()
processed=0

while IFS= read -r key; do
    processed=$((processed + 1))
    found=false
    
    # Check in app/ directory (backend)
    if [[ -d "$PROJECT_ROOT/app" ]] && grep -r -q "$key" "$PROJECT_ROOT/app/" 2>/dev/null; then
        found=true
    fi
    
    # Check in ui/src/app/ directory (frontend)
    if [[ -d "$PROJECT_ROOT/ui/src/app" ]] && grep -r -q "$key" "$PROJECT_ROOT/ui/src/app/" --include="*.ts" --include="*.html" --include="*.js" 2>/dev/null; then
        found=true
    fi
    
    if [[ "$found" == false ]]; then
        unused_keys+=("$key")
    fi
    
    # Progress indicator
    if (( processed % 50 == 0 )); then
        echo "Processed $processed keys..."
    fi
done < "$TEMP_KEYS_FILE"

# Cleanup temp file
rm "$TEMP_KEYS_FILE"

echo "Analysis complete!"
echo ""
echo "=== RESULTS ==="
echo "Total translation keys: $TOTAL_KEYS"
echo "Unused translation keys: ${#unused_keys[@]}"
echo "Usage rate: $(( (TOTAL_KEYS - ${#unused_keys[@]}) * 100 / TOTAL_KEYS ))%"
echo ""

if [[ ${#unused_keys[@]} -gt 0 ]]; then
    echo "Unused keys:"
    for key in "${unused_keys[@]}"; do
        echo "  $key"
    done
    echo ""
    echo "To remove these keys, you can use the clean_translation_files.py script"
    echo "or manually delete them from the translation files."
else
    echo "🎉 All translation keys are being used!"
fi

echo ""
echo "Note: This analysis checks for static references in code."
echo "Some keys might be used dynamically or in configuration files not covered by this scan."
