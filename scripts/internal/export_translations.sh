#! /bin/bash
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
${SED} -e 's/\"//g' -e 's/^\s*//g' -e 's/,\s*$//g' -e 's/^.*: //g' -e '/^{/d' -e '/^}/d' $1
echo '\n======'

exit 0;
