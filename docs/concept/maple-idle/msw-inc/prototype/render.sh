#!/usr/bin/env bash
# 프로토타입의 시연 장면을 PNG로 굽는다. 사용: bash render.sh [장면...]
# 장면 목록은 demo.js 머리말에 있다. 결과는 shots/에 쌓인다.
set -e
cd "$(dirname "$0")"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
DIR="$(pwd -W 2>/dev/null || pwd)"
mkdir -p shots
SCENES="${*:-intro gap hire heal dungeon drag evolve report approval ch2 offduty}"
for s in $SCENES; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1280,720 --virtual-time-budget=6000 --autoplay-policy=no-user-gesture-required \
    --screenshot="$DIR/shots/$s.png" "file:///$DIR/index.html?demo=$s" 2>/dev/null
  echo "shots/$s.png"
done
