#!/usr/bin/env bash
# Chạy kiểm thử phân quyền trên một PostgreSQL cục bộ (cần quyền tạo CSDL). Ví dụ: sudo -u postgres bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
DB=${DB:-rls_test_$$}
createdb "$DB"
trap 'dropdb "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f 00_supabase_shim.sql
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f ../schema.sql 2>/dev/null
OUT=$(psql -q -d "$DB" -f 02_rls_tests.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //' | grep -E "PASS|FAIL|ERROR" || true)
echo "$OUT"
PASS=$(grep -c PASS <<<"$OUT" || true); BAD=$(grep -cE "FAIL|ERROR" <<<"$OUT" || true)
echo "---- $PASS PASS, $BAD FAIL/ERROR"
[ "$BAD" -eq 0 ]
