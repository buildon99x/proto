#!/usr/bin/env bash
# 목업 HTML을 화면별 PNG로 굽는다. 사용: bash render.sh
set -e
cd "$(dirname "$0")"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
URL="file:///$(pwd -W 2>/dev/null || pwd)/index.html"
shot(){ "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size="$2" --virtual-time-budget=3000 --screenshot="$(pwd -W 2>/dev/null || pwd)/$1.png" "$URL#$3" 2>/dev/null; }
shot s1-world 1280,720 world
shot s2-dungeon 1280,720 dungeon
shot s3-evolve 1280,720 evolve
shot s0-report 1280,720 report
shot s1m-mobile 390,844 mobile
ls -la *.png
