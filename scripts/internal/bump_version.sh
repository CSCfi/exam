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

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

${SED} -i "s/version := .*/version := \"$1\"/g" "${DIR}/../../build.sbt"
${SED} -i "s/exam.release.version = .*/exam.release.version = \"$1\"/g" "${DIR}/../../conf/application.conf"
${SED} -i "s/\"version\": .*/\"version\": \"$1\",/g" "${DIR}/../../package.json"

npm i

echo "Version bumped to $1"
exit 0;
