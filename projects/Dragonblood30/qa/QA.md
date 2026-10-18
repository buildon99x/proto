# DRAGONBLOOD 30초 — 최종 QA

## 납품과 범위

- 영상: `renders/DRAGONBLOOD-30s.mp4`, 대표 프레임: `renders/poster.png`.
- 현재 게임 `6b0b1e42`의 실제 `main.tscn`을 기존 cockpit의 클릭/대상 선택 경로로 조작했다. 별도 Xorg 화면 전체 1280×720를 FFmpeg x11grab으로 캡처했다. 상태를 직접 주입한 fixture를 실제 플레이로 사용하지 않았다. 원본 `cb-ll` 작업 트리는 변경하지 않았고, 캡처용 detached worktree에는 빌드/import 산출물만 생성했다. tracked 게임 파일 diff는 없다.
- 화면의 신규 캐릭터 교체는 **0건**이다. 정식 반입되지 않은 24프레임 후보 아트나 확인하지 못한 용화 기능을 사용/광고하지 않았다. 현재 게임의 카드 아트 폴백도 숨기지 않고 “개발 중 화면”을 표시했다.
- 소셜 게시·유료 API·자격증명 설정·수동 배포·main 병합은 하지 않는다. 승인된 Git push는 기존 Vercel 연동을 통한 후보 빌드/배포를 유발할 수 있으므로, 그 결과와 공개 접근 여부는 별도로 기록한다. 확인 전 “외부 배포 없음”으로 단정하지 않는다.

## 내용과 시각 검수

- 첫 0–3초: 실제 공격·적 쓰러짐 장면과 “이 한 장, 지금 쓸까?”. 3–8초: 실제 카드 선택/대상 조준/결과. 8–14초: 현재 가문 선택 화면의 파이렌·볼그림. 14–19초: 실제 분기 맵과 카드 보상. 19–26초: 소풍 후 용혈 격타의 카드 표시 피해 **6→9**. 26–30초: 실제 전투와 질문 CTA.
- **6→9는 카드 UI의 표시 피해**이다. 적 HP 감소량은 다른 유물/상태가 관여하므로 동일하다고 주장하지 않는다. 각 원본 screenshot, 선택 클립, 입력 영수증, 잘라낸 위치를 보존했다.
- 가로 플레이 화면 전체를 1024×576, 최종 좌표 x28/y639에 배치했다. 상단 HUD·손패·턴 종료·적 의도 UI를 강제로 크롭하지 않는다. 하단은 “실제 화면 확대”라고 표시한 별도 원본 인서트다.
- 최종 MP4에서 **14프레임**(0.7,1.7,4.8,6.6,9.5,12.5,15,17.4,20.6,21.4,23.4,24.6,28.2,29.1초)을 디코딩해 직접 열어 확인했다. 게임 창·한글 카피·조준·대상/체력 변화·가문/맵/보상·시너지 문구가 보이며 잘림/검은 영상 패널은 없다. `decoded-contact-sheet.jpg` 및 개별 PNG 참조. 별도 최종 플레이어의 23.4초 화면도 직접 확인했다.
- 초안에서 시너지 설명의 두 번째 줄이 작게 렌더되는 것을 고쳤다. 최종 영상 프레임은 OpenMontage 재렌더로 갱신했다. 이후 음량 조정은 비디오 stream-copy이며 영상 elementary stream SHA 동일을 확인했다.

## 자동 검사와 실제 재생

- ffprobe: **1080×1920, 30/1fps, 900프레임, 정확히30.000초**, H.264/yuv420p + AAC stereo. 규격 검사 전부 통과.
- 이 영상의 실제 게임 영역만 측정한 frame mean absolute delta(자막·GSAP·인서트 제외): **9.94~26.74/255**, 5개의 전투 구간 쌍 모두 변화 확인. `metrics.json`에 좌표·시간·값 기록. 이전15초 motion QA를 가져오지 않았다.
- OpenMontage `hyperframes_compose` 실제 registry 호출 성공; bespoke HTML이 보존됐다. 최종 HyperFrames check에서 lint/runtime/layout/contrast 오류0. 정적 lint는 **경고9**(단일 파일의 timed group 구조/트랙 밀도 권고), layout/runtime/contrast 경고0이다. strict-all 통과로 표현하지 않는다.
- **HyperFrames motion은 `enabled:false`, `samples:0`으로 미실행**이다. 그 `ok:true`는 움직임 검증 통과 근거가 아니다. 실제 움직임 근거는 위 MP4 디코딩 프레임 차이·실제 플레이 캡처·직접 시각 검수다. contrast는 활성 상태에서 samples5, checked/passed63로 확인했다.
- Playwright/Chromium에서 최종 MP4를 **전체30초 재생해 ended:true/currentTime:30**, readyState4, error없음을 확인했다. 이어 9개 지정 시점 seek가 요청 시간과 일치하며 각 screenshot을 보존했다. `playback.json`/`player-at-*.png` 참조. 초기 기본 HTTP server 재생의 seek가0으로 돌아가는 문제는 그 결과를 통과로 사용하지 않고, 동일 원본 bytes를 browser Blob으로 로드해 실제 시간 일치를 검증했다. 원인은 HTTP Range 미지원 영향으로 추정하며 MP4 결함으로 단정하지 않는다.

## 오디오: 측정과 청음 구분

- 현재 게임 audio manifest의 variants가 비어 있어 실제 게임 원음을 썼다고 하지 않는다. 새 오리지널 영상용 합성 score/SFX만 사용하며 화면에 “영상용 사운드” 표시. 외부 음악/목소리/음원은 복제하지 않았다. `audio-provenance.json` 참조.
- 처음 렌더의 약−27.1LUFS-I를 영상 스트림 변경 없이 +6.02dB 조정했다. 최종 약 **−21.1LUFS-I / −4.9dBTP**, AAC decoded peak **-4.94dBFS**, RMS **-22.81dBFS**, clipped samples **0**. 수정 명령/전후 SHA와 video stream hash는 `receipt_audio_finish.json`에 있다.
- **실제 청음은 수행하지 못했다.** 브라우저 muted:false 재생·디코딩·수치 검사는 사람이 소리를 들었다는 뜻이 아니다. 음색/효과음 취향의 청각 최종 평가는 남아 있다.

## 재현·사용권·보존

- `rebuild-video.py` → `author.py` → `render.py`(OpenMontage compose + audio-only finish) → `verify.py` → `playback-qa.cjs`. 원본 선택 클립9개/합계30초가 포함되므로 raw 전체가 없어도 편집·최종 렌더 재현이 가능하다. 약6분 raw는 로컬에 보존하고 Git에는 넣지 않는다. 새 기계의 실시간 클릭 캡처가 픽셀/시간까지 동일하다고 보장하지 않는다.
- 게임 원본/카드/계승자의 기존 사용자/AI 생성 출처를 확인하고 허가된 프로젝트 자료에서만 캡처했다. provenance gate selftest26 cases와 552종 검사는 PASS이나, 원장에는 이연(unrecorded) 항목이 있으므로 완전한 독립 법률 검증/새 아트 승인으로 주장하지 않는다. `source-provenance.json`과 `game-provenance-gate.txt`에 기록했다.
- 기존 OpenMontage AGPL-3.0·HyperFrames Apache-2.0·GSAP Standard no-charge·Noto SIL OFL 사용을 기록했다. Rust1.94 공식 설치, native build, 첫 import의 translation 선행 로드 오류와 translation 생성 후 재import 오류0을 별도 로그로 남겼다. 원본 게임의 기능/배포는 바꾸지 않았다.
- 로컬 `pnpm sync:registry`와 `pnpm build:vercel` 성공. 최초 통합 빌드는 poster 생성 전 copy에서 실패했고, 최종 poster를 만든 뒤 재실행 성공했다. 음량 마무리 후 해당 프로젝트만 다시 빌드하여 app/launcher 사본의 MP4 SHA가 납품본과 동일함을 확인했다.
- 기존15초 납품 SHA256 **15456583ba806c5fbb41a8b6ac75006169e34f4f8aab502c7dcb6ec8b4656ad5** 그대로 보존.
- 최종 MP4 SHA256 **5bc06fb56785646a0a32268949b326ba5e65d043b47138da54281e4144b5d63f**. 소셜 반응 검증은 실제 공개/게시 후의 별도 실험이며 이번 제작에서 성과를 보장하지 않는다.
