#!/usr/bin/env bash
# Recreate the local test DB from the auth shim + migrations. Needs DATABASE_URL (default: local port 5499).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
URL="${DATABASE_URL:-postgresql://postgres@localhost:5499/learn_test}"
BASE="${URL%/*}/postgres"; DB="${URL##*/}"
psql "$BASE" -qc "drop database if exists $DB" -c "create database $DB"
for f in "$ROOT"/supabase/tests/00_local_auth_shim.sql "$ROOT"/supabase/migrations/*.sql; do
  echo "== $(basename "$f")"; psql "$URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
