#!/usr/bin/env bash

set -euo pipefail

force=0
for arg in "$@"; do
  if [ "$arg" = '--force' ]; then
    force=1
  fi
done

if [ "$force" -ne 1 ]; then
  jj_status=$(jj st 2>&1)
  if ! echo "$jj_status" | grep -q 'The working copy has no changes.'; then
    echo "The working copy has changes. Use --force to proceed anyway." >&2
    exit 1
  fi
fi

last_dir=$(basename "$(pwd)")

ssh chris@utmtwo "cd ${last_dir} && ../tar-new.sh /tmp/new-files.tar"

scp chris@utmtwo:/tmp/new-files.tar /tmp/new-files.tar

tar xvf /tmp/new-files.tar

rm /tmp/new-files.tar

ssh chris@utmtwo 'rm /tmp/new-files.tar'
