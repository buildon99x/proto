# 5분 자동 연장 · OpenMontagePilot

15초 세로 코미디. 복숭아색 사각 머리와 남색 잠옷을 입은 오리지널 캐릭터가 “딱 5분만” 쉬려다 새벽 3시를 맞습니다.

- 바로 재생: [final.mp4](renders/final.mp4)
- 대표 이미지: [poster.png](renders/poster.png)
- 검수: [QA 보고서](qa/QA.md), [디코딩 프레임](qa/decoded-contact-sheet.jpg), [규격·움직임·오디오 수치](qa/metrics.json)
- 이 작업 환경: `/workspace/proto/projects/OpenMontagePilot`, Git branch `codex/openmontage-viral-pilot`.

## 제작/검수 재현

Python≥3.10, Node≥22, FFmpeg/FFprobe, Chromium이 필요합니다. 실제 테스트 환경은 Python3.12.14, Node24.19.0, FFmpeg7.1.5, Chromium151이며 버전 차이로 픽셀·압축 바이트는 달라질 수 있습니다. API나 키는 필요하지 않습니다.

```bash
# 프로젝트 루트에서. 설치 위치는 별도 작업 디렉터리로 지정.
git clone https://github.com/calesthio/OpenMontage.git /workspace/OpenMontage-source
# artifacts/upstream.json의 commit으로 checkout 후 사용
python3 -m venv /workspace/openmontage-venv
/workspace/openmontage-venv/bin/pip install -r artifacts/python-requirements.lock
mkdir -p /workspace/openmontage-runtime
cp scripts/runtime-package.json /workspace/openmontage-runtime/package.json
npm --cache /tmp/openmontage-npm-cache install --prefix /workspace/openmontage-runtime --ignore-scripts --no-audit --no-fund
ln -s /workspace/openmontage-runtime/node_modules node_modules
export OPENMONTAGE_ROOT=/workspace/OpenMontage-source
export NODE_PATH=/workspace/openmontage-runtime/node_modules
export npm_config_cache=/tmp/openmontage-npm-cache
export HYPERFRAMES_NO_TELEMETRY=1
export HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium
export XDG_CACHE_HOME=/tmp/openmontage-cache
python3 scripts/author.py
/workspace/openmontage-venv/bin/python scripts/pipeline.py
/workspace/openmontage-venv/bin/python scripts/render.py
/workspace/openmontage-venv/bin/python scripts/verify.py
ffmpeg -hide_banner -i renders/final.mp4 -af ebur128=peak=true -f null - 2>qa/audio-loudness.txt
```

`hyperframes/assets/gsap.min.js`와 Noto 글꼴 subset은 포함되어 있어 author.py가 네트워크 자산을 요청하지 않습니다. OpenMontage tool 기본 생성물은 별도 `assets/characters/tool-draft-*`에만 남으며 최종 HTML은 직접 작성한 SVG/GSAP 연기입니다. 실제 도구 결과는 `artifacts/receipt_*.json`에 있습니다.

Playwright 1.62.1이 있는 환경에서 별도 브라우저 seek 검수:

```bash
python3 -m http.server 8766 --bind 127.0.0.1 --directory hyperframes
# 다른 터미널에서 (playwright가 모듈 경로에 있어야 함)
node scripts/browser-qa.cjs
```

이 환경은 preinstalled Playwright를 `PLAYWRIGHT_MODULE`로 지정해 사용했습니다. browser-qa는 소리 청음 도구가 아닙니다. **실제 청음은 수행하지 못했으며**, 수치 검수와 구별해 QA에 기록했습니다.

로컬 재생 화면:

```bash
(cd app && node build.mjs)
python3 -m http.server 8080 --directory app/dist
```

저장소 루트에서 `COREPACK_HOME=/tmp/openmontage-corepack corepack pnpm sync:registry`와 `... pnpm build:vercel`을 실행해 로컬 통합 빌드를 확인했습니다. 배포/게시/main 병합은 하지 않았습니다.

## 출처와 범위

[OpenMontage](https://github.com/calesthio/OpenMontage) AGPL-3.0의 베타 character-animation 경로와 실제 도구 7개를 사용했습니다. [HyperFrames](https://github.com/heygen-com/hyperframes) Apache-2.0 0.8.157, [GSAP](https://gsap.com/standard-license/) Standard no-charge 3.15.0, Noto SIL OFL 글꼴을 사용했습니다. `artifacts/LICENSE-REVIEW.md`와 license 사본을 참조하세요. 캐릭터·장면·효과음은 직접 제작했고 외부 영상이나 유명 캐릭터를 복제하지 않았습니다. 로컬 제작비/API 사용비는 $0입니다. 바이럴 성과는 보장하지 않습니다.
