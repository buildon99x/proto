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

`hyperframes/assets/gsap.min.js`와 Noto 글꼴 subset은 포함되어 있어 author.py가 네트워크 자산을 요청하지 않습니다. OpenMontage tool 기본 생성물은 별도 `assets/characters/tool-draft-*`에만 남으며 최종 HTML은 직접 작성한 SVG/GSAP 연기입니다. 실제 도구 결과는 `artifacts/receipt_*.json`에 있습니다. 위 제작 명령만 실행하면 `pipeline.py` 5개 + `render.py` compose 1개로 **6개 호출**입니다. 일곱 번째 `character_animation_reviewer`는 아래 브라우저 검수 후 `review.py`로 실행합니다. 성공한 기존 reviewer receipt도 보존되어 있습니다.

Playwright 1.62.1이 있는 환경에서 별도 브라우저 seek 검수:

```bash
python3 -m http.server 8766 --bind 127.0.0.1 --directory hyperframes
# 다른 터미널에서 (playwright가 모듈 경로에 있어야 함)
node scripts/browser-qa.cjs
/workspace/openmontage-venv/bin/python scripts/review.py
```

HyperFrames compose receipt의 motion은 **`enabled:false`, `samples:0`이므로 미실행**입니다. 그 `ok:true`를 움직임 검증 통과로 표현하지 않습니다. 실제 근거는 `qa/metrics.json`의 decoded-frame delta, `qa/browser-qa.json`의 body/head transform 변화, `qa/decoded-contact-sheet.jpg`에 보존된 **8프레임 시각 검수**입니다. reviewer의 `motion_detected` 역시 timed action 메타데이터이며 수치 움직임 검사와 구별합니다. `review.py`는 이 브라우저/프레임 증거가 존재하고 성공했는지 확인한 뒤 upstream reviewer를 호출하며, 시각 검수나 실제 청음을 대신하지 않습니다.

이 환경은 preinstalled Playwright를 `PLAYWRIGHT_MODULE`로 지정해 사용했습니다. browser-qa는 소리 청음 도구가 아닙니다. **실제 청음은 수행하지 못했으며**, 수치 검수와 구별해 QA에 기록했습니다.

로컬 재생 화면:

```bash
(cd app && node build.mjs)
python3 -m http.server 8080 --directory app/dist
```

저장소 루트에서 `COREPACK_HOME=/tmp/openmontage-corepack corepack pnpm sync:registry`와 `... pnpm build:vercel`을 실행해 로컬 통합 빌드를 확인했습니다. 수동 배포 명령·별도 외부 게시·main 병합은 실행하지 않았습니다. 다만 기존 Git 연동의 자동 후보 배포로 보이는 Vercel SUCCESS 상태가 commit `3c44cbaec977eb02daacc5580dd06ca34589de97`에 2026-10-14 14:58:10Z 생성됐다는 독립 확인을 받았습니다. [보고된 배포 대상](https://vercel.com/silentstacks-projects/loop-lab/4SC43Kg5BwkoUj2F1HFmVCPQEab6)의 **공개 접근 여부는 미확인**입니다. 배포 설정·삭제·권한은 변경하지 않았으며, 후속 Git 푸시도 기존 연동을 통해 자동 빌드/배포를 유발할 수 있습니다.

## 출처와 범위

[OpenMontage](https://github.com/calesthio/OpenMontage) AGPL-3.0의 베타 character-animation 경로와 실제 도구 7개를 사용했습니다. [HyperFrames](https://github.com/heygen-com/hyperframes) Apache-2.0 0.8.157, [GSAP](https://gsap.com/standard-license/) Standard no-charge 3.15.0, Noto SIL OFL 글꼴을 사용했습니다. `artifacts/LICENSE-REVIEW.md`와 license 사본을 참조하세요. 캐릭터·장면·효과음은 직접 제작했고 외부 영상이나 유명 캐릭터를 복제하지 않았습니다. 로컬 제작비/API 사용비는 $0입니다. 바이럴 성과는 보장하지 않습니다.
