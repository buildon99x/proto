#!/usr/bin/env bash
# 한쪽(기준 또는 비교) 커밋을 워크트리로 꺼내 빌드하고, 오늘의 자(계측기)를 이식한다.
#
#   prepare_side.sh REF WORKTREE_DIR
#
# 왜 양쪽 다 워크트리인가: 측정이 앱을 빌드하고(dist) 스크린샷을 찍는다. 사용자의
# 체크아웃에서 돌리면 추적 중인 파일이 바뀌고, 측정이 커밋되지 않은 변경을 섞어 잰다.
#
# 순서가 중요하다. 앱은 그 커밋 자신의 코드로 먼저 빌드하고(vite build — tsc는 건너뛴다.
# 이식할 계측기가 옛 엔진에 없는 함수를 부르면 타입 검사가 깨진다), 그다음에 계측기를
# 덮어쓴다. 마지막으로 1시드 시험 실행으로 옛 엔진에 빠진 export가 있는지 본다.
set -euo pipefail
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REF="$1"; WT="$2"
REPO=$(git rev-parse --show-toplevel)
P=projects/relic-king
TSX="$REPO/node_modules/.bin/tsx"
[ -d "$WT" ] && git worktree remove --force "$WT" 2>/dev/null || true
git worktree add -q --detach "$WT" "$REF"
ln -sfn "$REPO/$P/app/node_modules" "$WT/$P/app/node_modules"
( cd "$WT/$P/app" && ./node_modules/.bin/vite build >/dev/null 2>&1 ) || { echo "빌드 실패: $REF"; exit 1; }
# 자 — 지금 체크아웃의 계측기를 양쪽에 같이 쓴다. 같은 자로 재야 전·후를 비교할 수 있다.
for f in app/src/sim/density.ts app/src/sim/telemetry.ts tests/e2e/play.mjs tests/e2e/harness.mjs; do
  cp "$REPO/$P/$f" "$WT/$P/$f"
done
cd "$WT/$P/app"
# 옛 엔진에 빠진 export를 한 번에 찾아 알려진 심을 붙인다(없으면 아무것도 안 한다)
python3 "$HERE/apply_known_shims.py" "$WT/$P/app" || {
  echo "SHIM_NEEDED — references/shims.md를 보고 $WT/$P/app/src/game/engine.ts에 손으로 심을 달고"
  echo "  (cd $WT/$P/app && $TSX src/sim/density.ts --seeds 1 | grep -E 'E 첫 제보|A 사건 종류') 로 확인하라"
  exit 2
}
OUT=$(timeout 300 "$TSX" src/sim/density.ts --seeds 1 2>&1 || true)
if printf '%s\n' "$OUT" | grep -q "Error"; then
  printf '%s\n' "$OUT" | grep -m3 "Error"; exit 1
fi
printf '%s\n' "$OUT" | grep -E "E 첫 제보|A 사건 종류" | head -3
echo "READY: $WT"
