#!/usr/bin/env bash
# 비교할 두 커밋을 정한다. 결과를 셸 변수로 찍는다 — `eval "$(resolve_refs.sh ...)"`로 받는다.
#
#   resolve_refs.sh [브랜치]                 기본: 지금 체크아웃한 브랜치
#   resolve_refs.sh --base REF --after REF   직접 지정
#
# 기본 규칙 — "이 브랜치가 main에 무엇을 더했나"를 잰다.
#   · 브랜치가 이미 main에 머지됐다 → 그 머지 커밋(AFTER)과 머지 직전 main(BASE = 머지^1).
#     병렬로 들어온 다른 작업이 양쪽에 똑같이 들어 있어서 이 브랜치의 효과만 남는다.
#   · 아직 안 머지됐다 → 브랜치 끝(AFTER)과 main과의 merge-base(BASE).
# 브랜치의 출발점부터 끝까지 전 과정을 보고 싶으면 --base로 출발점을 직접 준다.
set -euo pipefail
BRANCH="" BASE="" AFTER=""
while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --after) AFTER="$2"; shift 2 ;;
    *) BRANCH="$1"; shift ;;
  esac
done
git fetch -q origin main 2>/dev/null || true
MAIN=origin/main
TIP=$(git rev-parse "${BRANCH:-HEAD}")
MODE=manual
if [ -z "$AFTER" ] || [ -z "$BASE" ]; then
  if git merge-base --is-ancestor "$TIP" "$MAIN"; then
    MODE=merged
    # TIP을 처음 품은 main의 first-parent 커밋 = 머지 커밋
    MERGE=$(git rev-list --first-parent --reverse --ancestry-path "$TIP..$MAIN" | head -1)
    [ -z "$MERGE" ] && MERGE=$TIP   # TIP 자체가 main 끝이다
    if [ "$(git rev-list --parents -n1 "$MERGE" | wc -w)" -lt 3 ]; then
      echo "echo '머지 커밋을 찾지 못했다($MERGE) — --base/--after로 직접 지정하라' >&2; exit 1"; exit 1
    fi
    AFTER=${AFTER:-$MERGE}; BASE=${BASE:-$MERGE^1}
  else
    MODE=open
    AFTER=${AFTER:-$TIP}; BASE=${BASE:-$(git merge-base "$TIP" "$MAIN")}
  fi
fi
BASE=$(git rev-parse --short "$BASE"); AFTER=$(git rev-parse --short "$AFTER")
ver() { git show "$1:projects/relic-king/project.json" | sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' | head -1; }
echo "MODE=$MODE"
echo "BASE_REF=$BASE"
echo "AFTER_REF=$AFTER"
echo "BASE_LABEL=v$(ver "$BASE")"
echo "AFTER_LABEL=v$(ver "$AFTER")"
subj() { git log -1 --format=%s "$1" | tr -d "'"; }
echo "BASE_SUBJECT='$(subj "$BASE")'"
echo "AFTER_SUBJECT='$(subj "$AFTER")'"
