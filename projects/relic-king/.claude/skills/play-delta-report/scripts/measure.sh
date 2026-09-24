#!/usr/bin/env bash
# 한쪽을 잰다. 결과는 WORK 아래에만 쓴다(레포에는 아무것도 안 쓴다).
#
#   measure.sh SIDE WORKTREE_DIR WORK [--seeds 12] [--ui-runs 3] [--suite] [--sim-hours 48]
#
#   SIDE        before | after
#   --suite     전체 UI 시나리오도 돌린다(보통 after만)
#   --sim-hours 엔딩까지 걸리는 시간을 잰다. 0이면 건너뛴다
#
# UI 실측은 반드시 tsx로 돌린다. node로 돌리면 시나리오가 TS 상수를 못 읽어
# 일부가 undefined로 통과하거나 통째로 죽는다(2026-09-24에 실제로 97/109가 나왔다).
# play는 포트를 고정해 쓰므로 두 측정을 동시에 돌리지 않는다 — 이 스크립트는 순차다.
set -euo pipefail
SIDE="$1"; WT="$2"; WORK="$3"; shift 3
SEEDS=12 RUNS=3 SUITE=0 SIMH=0
while [ $# -gt 0 ]; do
  case "$1" in
    --seeds) SEEDS="$2"; shift 2 ;;
    --ui-runs) RUNS="$2"; shift 2 ;;
    --suite) SUITE=1; shift ;;
    --sim-hours) SIMH="$2"; shift 2 ;;
    *) echo "모르는 옵션: $1"; exit 1 ;;
  esac
done
REPO=$(git -C "$WT" rev-parse --show-toplevel 2>/dev/null || echo "$WT")
TSX="$(git rev-parse --show-toplevel)/node_modules/.bin/tsx"
APP="$WT/projects/relic-king/app"
mkdir -p "$WORK/density" "$WORK/play" "$WORK/sim"
cd "$APP"
echo "[$SIDE] density --seeds $SEEDS"
"$TSX" src/sim/density.ts --seeds "$SEEDS" --json "$WORK/density/$SIDE.json" > "$WORK/density/$SIDE.log" 2>&1
grep -E "E 첫 제보" "$WORK/density/$SIDE.log" | head -1
for i in $(seq 1 "$RUNS"); do
  echo "[$SIDE] play first #$i"
  "$TSX" ../tests/e2e/play.mjs first --out "$WORK/play/first-$SIDE-$i" > "$WORK/play/first-$SIDE-$i.log" 2>&1 || true
  grep -E "④ 제보 — 20분 안에|판정 [0-9]+건" "$WORK/play/first-$SIDE-$i.log" | head -2
done
if [ "$SUITE" = 1 ]; then
  echo "[$SIDE] play 전체"
  "$TSX" ../tests/e2e/play.mjs --out "$WORK/play/suite-$SIDE" > "$WORK/play/suite-$SIDE.log" 2>&1 || true
  grep -A1 "──────── PLAY" "$WORK/play/suite-$SIDE.log" | tail -1
fi
if [ "$SIMH" != 0 ]; then
  echo "[$SIDE] sim --hours $SIMH"
  "$TSX" src/sim/run.ts --hours "$SIMH" > "$WORK/sim/$SIDE.log" 2>&1 || true
  grep -E "^엔딩" "$WORK/sim/$SIDE.log" | head -1 || echo "엔딩 줄 없음 — ${SIMH}시간 안에 도달 못 했을 수 있다"
fi
echo "[$SIDE] 끝"
