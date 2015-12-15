#! /bin/bash
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

echo "Version bumped to $1"
exit 0;
