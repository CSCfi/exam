#! /bin/bash

# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2

if [ "$#" -ne 1 ]; then
  echo "Usage: sh $0 <version_string>"
  exit 0;
fi

if hash gsed 2>/dev/null; then
    SED=gsed
else
    SED=sed
fi

# Check if readlink -f works (Linux), otherwise fallback to a macOS-friendly method
if readlink -f "$0" >/dev/null 2>&1; then
  DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
else
  # Fallback for macOS/BSD
  TARGET_FILE="$0"
  cd "$(dirname "$TARGET_FILE")"
  TARGET_FILE=$(basename "$TARGET_FILE")
  # Iterate to find the actual file if it's a symlink
  while [ -L "$TARGET_FILE" ]; do
    TARGET_FILE=$(readlink "$TARGET_FILE")
    cd "$(dirname "$TARGET_FILE")"
    TARGET_FILE=$(basename "$TARGET_FILE")
  done
  DIR="$(pwd -P)"
fi

${SED} -i "s/version := .*/version := \"$1\"/g" "${DIR}/../../build.sbt"
${SED} -i "s/exam.release.version = .*/exam.release.version = \"$1\"/g" "${DIR}/../../conf/application.conf"
${SED} -i "s/\"version\": .*/\"version\": \"$1\",/g" "${DIR}/../../package.json"

npm i --prefix "${DIR}/../../"

echo "Version bumped to $1"
exit 0;
