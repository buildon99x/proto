# DRAGONBLOOD — 이 한 장, 지금 쓸까?

실제 개발 중 게임을 캡처한 **30초 / 1080×1920 / 30fps** 소개 영상입니다. 소셜 반응 검증용 제작이며 별도 소셜 게시나 수동 공개 배포는 하지 않습니다.

- 완성 영상: `renders/DRAGONBLOOD-30s.mp4`
- 대표 프레임: `renders/poster.png`
- 검수: `qa/QA.md`, `qa/metrics.json`, `qa/decoded-contact-sheet.jpg`, `qa/playback.json`
- 편집 원본: `hyperframes/index.html`, `scripts/author.py`, `artifacts/edit_decisions.json`
- 실게임 출처: `buildon99x/cb-ll`의 `6b0b1e42`를 별도 detached worktree에서 빌드·조작·녹화했습니다. 게임 본체 tracked 파일과 기존 15초 `OpenMontagePilot` 납품본은 변경하지 않습니다.

## 구성과 사실성

0–3초 전투 훅 “이 한 장, 지금 쓸까?” → 3–8초 카드 선택·조준 → 8–14초 파이렌/볼그림 가문 선택 → 14–19초 분기 맵·카드 보상 → 19–26초 소풍 방어 뒤 같은 용혈 격타 카드의 **표시 피해 6→9** → 26–30초 “이 덱빌딩, 해보고 싶어?”. 숫자는 카드 UI의 표시 피해이며 적 HP의 실제 감소량을 뜻하지 않습니다. 실제 피해에는 다른 상태/유물 효과도 관여합니다.

가로 게임 화면은 전체 뷰포트 비율 그대로 배치하고, 하단의 원본 UI/그림 확대는 별도 인서트로 표시합니다. 카피·프레임은 영상 편집용 지원 레이어입니다. 게임 UI, 캐릭터, 효과를 새로 그려 실제 게임인 것처럼 대체하지 않았습니다. 신규 캐릭터 교체·24프레임 후보 아트·미확인 용화 연출은 사용하지 않았습니다. 현재 게임의 일부 카드 아트가 폴백인 모습도 그대로 보존하고 “개발 중 화면”으로 명시합니다.

## 기존 설치 재사용과 출처

기존 OpenMontage `e45f5b12bd46440b04f3675af9a77d0718e6a254`(AGPL-3.0), HyperFrames0.8.157(Apache-2.0), GSAP3.15.0(Standard no-charge), FFmpeg7.1.5, Chromium151, Godot4.6.3를 재사용했습니다. OpenMontage의 **hybrid / source-led** 경로를 검토하고 실제 `hyperframes_compose.render_existing` registry 호출로 최종 렌더했습니다. 렌더 뒤 `finish-audio.py`가 원본 영상용 score만 +6.02dB 조정하며 H.264 비트스트림 SHA 동일을 검사합니다. 프레임 재렌더나 런타임 변경은 없습니다. 렌더 영수증과 검사 결과는 `artifacts/receipt_hyperframes_compose.json`에 보존합니다. 이전 캐릭터 코미디의 artwork·motion QA·청음 상태를 이번 결과의 근거로 사용하지 않습니다.

잠금 의존성 godot0.5.3이 요구하는 Rust1.94.0을 공식 rustup 경로에서 `/workspace/dragonblood-{cargo,rustup}`에 설치했습니다. 원본 게임 저장 경로는 건드리지 않고 캡처용 XDG data/config/cache/state를 따로 두었습니다. 기존 Xorg dummy 디스플레이를 사용해 별도 시스템 패키지 설치는 필요하지 않았습니다. `artifacts/install-review.json`과 빌드 로그를 참조하세요.

현재 게임의 audio-manifest에는 실제 납품된 음원 파일이 없어, **새 오리지널 영상용 합성 사운드**를 편집에 사용했습니다. 외부 음악/음원을 복제하지 않았으며 게임 내 사운드라고 주장하지 않습니다. 화면에도 “영상용 사운드”를 표시합니다. 캐릭터/카드의 기존 출처·권리 기록은 `artifacts/source-provenance.json`, 원장 검사 결과는 `qa/game-provenance-gate.txt`에 있습니다. 이 검사는 일부 메타데이터 이연을 허용하므로 완전한 독립 법률 검증으로 표현하지 않습니다.

## 편집과 렌더 재현

필요 환경: Python3.12 + Pillow/numpy 및 `OpenMontagePilot/artifacts/python-requirements.lock`의 OpenMontage 의존성, Node≥22, FFmpeg, Chromium. 기존 실행 환경의 venv와 npm 패키지를 그대로 재사용할 수 있습니다.

```bash
# 프로젝트 루트
export OPENMONTAGE_ROOT=/workspace/OpenMontage-source
export NODE_PATH=/workspace/openmontage-runtime/node_modules
export npm_config_cache=/tmp/openmontage-npm-cache
export HYPERFRAMES_NO_TELEMETRY=1
export HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium
export XDG_CACHE_HOME=/tmp/dragonblood-cache
ln -s /workspace/openmontage-runtime/node_modules node_modules # 없는 경우에만
python3 scripts/rebuild-video.py
python3 scripts/author.py
/workspace/openmontage-venv/bin/python scripts/render.py
python3 scripts/verify.py
ffmpeg -hide_banner -i renders/DRAGONBLOOD-30s.mp4 -af ebur128=peak=true -f null - 2>qa/audio-loudness.txt
```

커밋된 9개 선택 원본 클립은 총 30초이며 `rebuild-video.py`가 크롭·속도 변경 없이 연결합니다. 전체 약 6분 raw 녹화는 로컬 `assets/gameplay/raw-session.mp4`에 유지하되 Git 파일 크기 제한 때문에 제외했습니다. `prepare-edit.py`는 이 raw에서 각 선택 구간을 다시 자르는 선택적 경로입니다. 프레임 권위는 커밋된 선택 클립이며, 실시간 캡처를 다른 컴퓨터에서 픽셀 동일하게 재생성한다고 보장하지 않습니다.

## 실제 조작 캡처 재현

지정 리비전의 GDExtension을 Rust1.94로 빌드한 뒤 Godot4.6.3의 editor import를 실행합니다. 이미 빌드된 라이브러리는 해당 캡처 worktree의 `godot/bin/debug/`에만 복사합니다. 원본 checkout은 그대로 둡니다. 필요한 명령·환경과 사용한 Xorg config는 `artifacts/capture-process.json`, `artifacts/xorg-capture.conf`, `qa/game-build.txt`에 있습니다.

```bash
python3 scripts/start-capture.py
# 별도 터미널: 전체 게임 창만 녹화, Ctrl-C로 정상 종료
python3 scripts/capture-record.py
# 또 다른 터미널: 기존 cockpit의 실제 클릭 경로 재생
python3 scripts/replay-capture.py
```

`replay-capture.py`는 `artifacts/input-events.jsonl`의 실제 명령을 재실행합니다. 처음부터 깨끗한 캡처용 userdata를 사용해야 하며, 출력 screenshot 경로·실시간 타이밍은 새 실행마다 달라집니다. 게임 상태를 직접 주입한 장면이나 fixture 영상을 실제 조작처럼 사용하지 않았습니다.

## 재생과 검수

```bash
python3 -m http.server 8767 --bind 127.0.0.1 --directory .
# 별도 터미널, Playwright1.62.1이 모듈 경로에 있어야 함
node scripts/playback-qa.cjs
```

브라우저 MP4 재생 시간 진행·seek·캡처, ffprobe, 디코딩 프레임 시각 확인, 게임 화면 영역의 프레임 차이, 오디오 수치 검사는 구분해 보고합니다. HyperFrames motion의 enabled/samples가 비활성/0이면 이를 움직임 검사 통과로 간주하지 않습니다. 실제 청음은 수행하지 못했으면 그대로 표시하며 브라우저 재생 성공을 사람이 들었다는 뜻으로 사용하지 않습니다.

저장소 통합은 `pnpm sync:registry`와 로컬 `pnpm build:vercel`로 검증합니다. 지정 브랜치의 authorized Git push가 기존 Vercel 연동의 후보 빌드/배포를 유발할 수 있습니다. 이것은 수동 배포·소셜 게시와 구분하며, 공개 접근 여부를 확인 전 단정하지 않습니다. 설정·삭제·권한 변경은 하지 않습니다. 소셜 반응/바이럴 성과는 아직 검증되지 않았고 보장하지 않습니다.
