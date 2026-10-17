#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/../../.."
base=projects/SmashRally3D/verification/switch-benchmark-20261017
# Let the earlier owned lighting capture finish its own recording/browser first.
while pgrep -f '^node projects/SmashRally3D/tools/browser-check.mjs ' >/dev/null; do sleep 3; done
archive="$base/attempts/previous-final-$(date -u +%Y%m%dT%H%M%S)"
mkdir -p "$archive"
for name in final-play final-native final-native-2 final-native-3 final-scene final-dialog final-pause final-loss final-pressure final-rotation final-defence final-rally; do
 if [ -d "$base/$name" ]; then mv "$base/$name" "$archive/$name"; fi
done
for name in tests-final.txt registry-final.txt root-build-final.txt; do
 if [ -f "$base/$name" ]; then mv "$base/$name" "$archive/$name"; fi
done
COREPACK_HOME=/tmp/smash-corepack corepack pnpm --filter smash-rally-3d exec vitest run --maxWorkers=1 --no-file-parallelism > "$base/tests-final.txt" 2>&1 || exit 1
cp projects/SmashRally3D/verification/drop-defence-20261015/domain-tactical-scenarios.json "$base/domain-tactical-scenarios.json"
git restore projects/SmashRally3D/verification/drop-defence-20261015/domain-tactical-scenarios.json
COREPACK_HOME=/tmp/smash-corepack corepack pnpm sync:registry > "$base/registry-final.txt" 2>&1 || exit 1
COREPACK_HOME=/tmp/smash-corepack corepack pnpm build:vercel > "$base/root-build-final.txt" 2>&1 || exit 1
git restore packages/registry/src/generated/projects.ts
failures=0
run_case() {
 local name=$1 scenario=$2
 mkdir -p "$base/$name"
 SMASH_DROP_DEADLINE_MS=420000 SMASH_FRAMING_DEADLINE_MS=420000 SMASH_FRAMING_QUALITY=LOW SMASH_EVIDENCE_DIR="$base/$name" node projects/SmashRally3D/tools/browser-check.mjs "projects/SmashRally3D/tests/e2e/$scenario.mjs" > "$base/$name/run.txt" 2>&1
 local result=$?
 printf '%s exit=%s\n' "$name" "$result"
 if [ "$result" -ne 0 ]; then failures=$((failures+1)); fi
}
run_case final-play benchmark-experience
run_case final-native benchmark-native
run_case final-native-2 benchmark-native
run_case final-native-3 benchmark-native
run_case final-scene benchmark-scene
run_case final-dialog experience-dialog
run_case final-pause benchmark-pause
run_case final-loss experience-loss
run_case final-pressure experience-pressure
run_case final-rotation court-resize
run_case final-defence smash-drop-regression
run_case final-rally court-framing
[ "$failures" -eq 0 ]
