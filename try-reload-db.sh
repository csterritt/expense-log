#!/bin/bash
set -euo pipefail

# Check for clear argument
CLEAR_DATA=false
if [ "${1:-}" = "clear" ]; then
  CLEAR_DATA=true
fi

if [ $(/bin/ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite  | wc -l) != 1 ] ; then
  echo "Cannot find a single sqlite database in .wrangler."
  exit 1
fi
DB_PATH=$(/bin/ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite)

# Clear tables if requested
if [ "$CLEAR_DATA" = true ]; then
  echo "Clearing account, user, and event tables..."
  echo "DELETE FROM account;" | sqlite3 $DB_PATH
  echo "DELETE FROM user;" | sqlite3 $DB_PATH
fi

sqlite-utils insert $DB_PATH account - --pk id < tmp/account_dump.json
sqlite-utils insert $DB_PATH user - --pk id < tmp/user_dump.json
