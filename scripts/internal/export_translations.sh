#! /bin/bash

# SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
#
# SPDX-License-Identifier: EUPL-1.2

if [ "$#" -ne 1 ]; then
  echo "Script that reads translation entries from json file and outputs them separately as keys and values"
  echo "so that they can be easily copy pasted to Google Drive sheet"
  echo "Usage: sh export_translations.sh <filename>"
  exit 0;
fi

if hash gsed 2>/dev/null; then
    SED=gsed
else
    SED=sed
fi

echo '====='
echo 'Keys:'
${SED} -e 's/\"//g' -e 's/^\s*//g' -e 's/:.*$//g' -e '/^{/d' -e '/^}/d' $1
echo '\n======'
echo 'Values:'
${SED} -e 's/\"//g' -e 's/^\s*//g' -e 's/,\s*$//g' -e 's/^.*[a-zA-Z0-9_]*: //g' -e '/^{/d' -e '/^}/d' $1
echo '\n======'

exit 0;
