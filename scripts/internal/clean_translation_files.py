#!/usr/bin/env python3

# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
# SPDX-License-Identifier: EUPL-1.2

"""
Script to remove unused translation keys from EXAM translation files.
This script removes specified keys from all translation files while preserving formatting.

Usage:
    python3 clean_translation_files.py keys_to_remove.txt [--preserve-prefix PREFIX]

Example:
    python3 clean_translation_files.py unused_keys.txt --preserve-prefix i18n_exam_status_
"""

import json
import sys
import argparse
import os
from pathlib import Path

def clean_translation_file(file_path, keys_to_remove, preserve_prefixes=None):
    """Clean a single translation file by removing specified keys."""
    print(f"\n=== Processing {file_path} ===")
    
    if not os.path.exists(file_path):
        print(f"Warning: File not found: {file_path}")
        return 0, 0
    
    # Read the original JSON file
    with open(file_path, 'r', encoding='utf-8') as f:
        translations = json.load(f)
    
    print(f"Original keys: {len(translations)}")
    
    # Filter keys to remove based on preserve prefixes
    actual_keys_to_remove = set()
    preserved_keys = set()
    
    for key in keys_to_remove:
        should_preserve = False
        if preserve_prefixes:
            for prefix in preserve_prefixes:
                if key.startswith(prefix):
                    should_preserve = True
                    preserved_keys.add(key)
                    break
        
        if not should_preserve:
            actual_keys_to_remove.add(key)
    
    # Remove the specified keys
    removed_count = 0
    keys_not_found = []
    
    for key in actual_keys_to_remove:
        if key in translations:
            del translations[key]
            removed_count += 1
        else:
            keys_not_found.append(key)
    
    print(f"Keys to remove: {len(actual_keys_to_remove)}")
    print(f"Keys preserved: {len(preserved_keys)}")
    print(f"Removed keys: {removed_count}")
    print(f"Keys not found: {len(keys_not_found)}")
    print(f"Remaining keys: {len(translations)}")
    
    # Create backup
    backup_path = file_path + '.backup'
    if not os.path.exists(backup_path):
        import shutil
        shutil.copy2(file_path, backup_path)
        print(f"Backup created: {backup_path}")
    
    # Write the updated JSON file
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(translations, f, ensure_ascii=False, indent=4, separators=(',', ': '))
    
    print(f"File updated successfully!")
    return removed_count, len(keys_not_found)

def main():
    parser = argparse.ArgumentParser(
        description="Remove unused translation keys from EXAM translation files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 clean_translation_files.py unused_keys.txt
  python3 clean_translation_files.py unused_keys.txt --preserve-prefix i18n_exam_status_
  python3 clean_translation_files.py unused_keys.txt --preserve-prefix i18n_exam_status_ --preserve-prefix i18n_admin_
        """
    )
    
    parser.add_argument('keys_file', help='File containing translation keys to remove (one per line)')
    parser.add_argument('--preserve-prefix', action='append', dest='preserve_prefixes',
                       help='Preserve keys starting with this prefix (can be used multiple times)')
    parser.add_argument('--translation-dir', default='ui/src/assets/i18n',
                       help='Directory containing translation files (default: ui/src/assets/i18n)')
    
    args = parser.parse_args()
    
    # Get script directory and project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    
    # Read keys to remove
    keys_file_path = Path(args.keys_file)
    if not keys_file_path.is_absolute():
        keys_file_path = project_root / keys_file_path
    
    if not keys_file_path.exists():
        print(f"Error: Keys file not found: {keys_file_path}")
        sys.exit(1)
    
    with open(keys_file_path, 'r') as f:
        keys_to_remove = set(line.strip() for line in f if line.strip())
    
    print(f"Keys to process: {len(keys_to_remove)}")
    if args.preserve_prefixes:
        print(f"Preserve prefixes: {args.preserve_prefixes}")
    
    # Find translation files
    translation_dir = project_root / args.translation_dir
    translation_files = list(translation_dir.glob('*.json'))
    
    if not translation_files:
        print(f"Error: No translation files found in {translation_dir}")
        sys.exit(1)
    
    print(f"Found translation files: {[f.name for f in translation_files]}")
    
    # Process each translation file
    total_removed = 0
    total_not_found = 0
    
    for file_path in sorted(translation_files):
        if file_path.name.endswith('.backup'):
            continue
            
        removed, not_found = clean_translation_file(
            str(file_path), 
            keys_to_remove, 
            args.preserve_prefixes
        )
        total_removed += removed
        total_not_found += not_found
    
    print(f"\n=== SUMMARY ===")
    print(f"Files processed: {len([f for f in translation_files if not f.name.endswith('.backup')])}")
    print(f"Total keys removed: {total_removed}")
    print(f"Total keys not found: {total_not_found}")
    print(f"Backup files created with .backup extension")

if __name__ == '__main__':
    main()
