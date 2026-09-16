#!/usr/bin/env bash
#
# 수집된 런 결말을 내려받아 NDJSON 한 덩어리로 만든다.
#
#   ./pull.sh                                   # 배포본 전부
#   ./pull.sh tele/wave-runner/8f3a91c2/        # 특정 코스 지문만
#   ./pull.sh --local                           # 개발 중 로컬에 쌓인 것 (.telemetry/)
#   ./pull.sh tele/wave-runner/ deaths.ndjson   # 출력 파일 지정
#
# **지문이 다른 데이터는 절대 합산하지 않는다.** 0.5.5 에서 시드표가 통째로 갈렸듯
# 코스는 버전마다 다른 코스이고, 섞으면 어긋난 티가 나지 않는 채로 오염된다.
# 접두사에 지문을 넣어 받는 것이 기본이고, 전부 받았다면 분석기가 지문별로 가른다.
#
# 연결된 프로젝트에서는 Vercel CLI 가 OIDC 로 인증하므로 읽기 토큰이 따로 필요 없다.
# `vercel link` 만 되어 있으면 된다. 스토어가 CLI 의 기본 페이지보다 커지면
# `vercel blob list --help` 로 현재 페이지네이션 플래그를 확인해야 한다.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

if [ "${1:-}" = "--local" ]; then
  OUT="${2:-deaths.ndjson}"
  DIR="$REPO_ROOT/.telemetry"
  [ -d "$DIR" ] || { echo "$DIR 가 없다. 런처를 띄우고 게임을 한 번 돌려야 한다." >&2; exit 1; }
  find "$DIR" -type f -name '*.ndjson' -print0 | sort -z | xargs -0 cat > "$OUT"
  echo "$OUT ← 로컬 $(find "$DIR" -type f -name '*.ndjson' | wc -l)개 · 이벤트 $(wc -l < "$OUT")건"
  exit 0
fi

PREFIX="${1:-tele/wave-runner/}"
OUT="${2:-deaths.ndjson}"

command -v vercel >/dev/null || { echo "vercel CLI 가 필요하다: npm i -g vercel" >&2; exit 1; }

# 출력 형식이 표든 JSON 이든 경로만 뽑아낸다 — CLI 의 표 레이아웃에 기대지 않는다.
mapfile -t paths < <(
  vercel blob list --prefix "$PREFIX" \
    | grep -oE "${PREFIX//./\\.}[A-Za-z0-9._/-]+\.ndjson" \
    | sort -u
)

if [ "${#paths[@]}" -eq 0 ]; then
  echo "접두사 '$PREFIX' 에 해당하는 객체가 없다." >&2
  exit 1
fi

: > "$OUT"
for p in "${paths[@]}"; do
  vercel blob get "$p" >> "$OUT"
done

echo "$OUT ← 객체 ${#paths[@]}개 · 이벤트 $(wc -l < "$OUT")건"
