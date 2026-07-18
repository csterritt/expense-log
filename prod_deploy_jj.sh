#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

set -Eeuo

curl -s 'http://localhost:3000' > /dev/null || ( echo 'No local server running' ; exit 1 )
./clean-for-production.rb || exit 1
echo clean
jj abandon
msg=$(./update-version.rb)
rm -f public/index.html
sleep 1
curl -s 'http://localhost:3000' > public/index.html || exit 1
sleep 1
rm -f public/style-*.css
npx @tailwindcss/cli -i ./src/style.css -o public/style-$(date '+%Y%m%d%H%M%S').css
node ./timestamp-build-filenames.js
rm -f public/index.html
sleep 1
curl -s 'http://localhost:3000' > public/index.html || exit 1
sleep 1
jj describe -m "$msg"
jj bookmark set dev -r @
jj new main dev -m "$msg"
if [[ $(jj resolve --list) ]] ; then
  jj resolve --tool :theirs
fi

./clean-for-production.rb ignore || exit 1
echo Changes brought over, please check and commit.
