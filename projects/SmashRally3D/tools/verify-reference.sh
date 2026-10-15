#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../../.."
base=projects/SmashRally3D/verification/reference-swing-20261015
failures=0
run_case() {
  local name=$1 scenario=$2
  mkdir -p "$base/$name"
  SMASH_EVIDENCE_DIR="$base/$name" SMASH_FRAMING_QUALITY=LOW node projects/SmashRally3D/tools/browser-check.mjs "projects/SmashRally3D/tests/e2e/$scenario.mjs" > "$base/$name/run.txt" 2>&1
  local result=$?
  printf '%s exit=%s\n' "$name" "$result"
  if [ "$result" -ne 0 ]; then failures=$((failures + 1)); fi
  return 0
}
run_case composition reference-composition
run_case rally court-framing
run_case rotation court-resize
run_case swings swing-sequence
run_case native mobile-native
run_case drop-defence reference-drop

[ "$failures" -eq 0 ]
