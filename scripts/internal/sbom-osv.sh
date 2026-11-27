#!/bin/sh
# SPDX-FileCopyrightText: The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2
#
# Checks the dependency SBOM of a branch or release against OSV.dev.
#   scripts/internal/sbom-osv.sh                  # current branch
#   scripts/internal/sbom-osv.sh release/7.0
#   scripts/internal/sbom-osv.sh 7.0.1            # SBOM attached to a release
#   scripts/internal/sbom-osv.sh dev --format markdown
# Branch SBOMs come from the latest successful Build run (CI keeps them for 7 days).
# Needs gh (logged in) and osv-scanner. Exit code 1 means vulnerabilities were found.
set -eu

ref=${1:-$(git branch --show-current)}
[ $# -gt 0 ] && shift
dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT

if gh release view "$ref" --json assets -q '.assets[].name' 2>/dev/null | grep -qx exam-sbom.cdx.json; then
    echo "SBOM of release $ref" >&2
    gh release download "$ref" -p exam-sbom.cdx.json -D "$dir"
else
    run=$(gh run list --workflow Build --branch "$ref" --status success --limit 1 \
        --json databaseId,headSha,createdAt -q '.[] | "\(.databaseId) \(.headSha[:9]) \(.createdAt)"')
    [ -n "$run" ] || { echo "No successful Build run or release for '$ref'" >&2; exit 2; }
    echo "SBOM of $ref, run ${run%% *} (commit and time: ${run#* })" >&2
    gh run download "${run%% *}" -n bill-of-rights -D "$dir" ||
        { echo "No SBOM in that run: CI keeps it for 7 days, and older releases have none" >&2; exit 2; }
fi

# The SBOM also lists the jar files themselves; osv-scanner warns about each, so hide its log.
cd "$dir"
osv-scanner scan source -L exam-sbom.cdx.json --output-file report "$@" >log 2>&1 && rc=0 || rc=$?
if [ ! -s report ]; then
    cat log >&2
    exit "$rc"
fi
cat report
exit "$rc"
