# 최종 검수: 5분 자동 연장

영상: `renders/final.mp4` / 대표 이미지: `renders/poster.png`.

- FFprobe: **1080×1920, 30/1fps, 450프레임, 영상·컨테이너 15.000초**. H.264/yuv420p + AAC stereo. 로컬 HyperFrames 0.8.157 렌더 성공. 최초 브라우저 캐시 경로 오류를 기존 `/usr/bin/chromium` 지정으로 해결했고 같은 런타임을 유지했다.
- HyperFrames 최종 통합 check: lint/runtime/layout/motion/contrast **오류 0**. 기존 `lint`, `validate`, `inspect`도 실행했다. `validate` 대비 실패 0. `doctor`의 `ok:false`는 선택적 Whisper/Kokoro/MusicGen 부재이며 렌더 필수 Node/FFmpeg/Chrome은 정상. 표준 Chromium screenshot 캡처 경로를 사용했다.
- 경고: 단일 SVG 장면을 subcomposition으로 나누라는 편집 구조 권고와 mouth 경로를 시계 바늘로 오인한 off-pivot 자동 탐지. 실제 시계의 pivot은 822,780이며 decoded 프레임에서 바늘 중심·얼굴 연결을 확인했다. 경고를 지우거나 strict-all 검사를 통과했다고 주장하지 않는다.
- 실제 화면 검수: 0, 0.8, 2.4, 5.5, 6.7, 8.1, 12, 14.967초의 MP4 디코딩 프레임을 보았다. 누운 자세, 전화기 엄지 탭, 눈뜸/고개 두 번 확인, 팔 들며 놀람, 다짐, 첫 자세 복귀가 보이며 자막은 잘리지 않는다. `decoded-contact-sheet.jpg`를 증거로 보존했다.
- Playwright: 오류 0; 뒤로 seek한 첫 상태와 최초 상태가 같다 (`browser-qa.json`). file:// 접근이 관리 브라우저에서 차단되어 표준 로컬 HTTP 서버로 검사했다.
- 움직임: 자막·시계·버튼을 제외한 캐릭터 영역(100:920,760:1390)에서 샘플 간 평균 절대 픽셀 차이 **7.61~45.90/255**. 배경/카메라 변화도 일부 포함하므로 자세별 브라우저 transform과 시각 검수를 함께 사용했다. OpenMontage reviewer의 `motion_detected`는 `actions_timed`에서 나온 값일 뿐 움직임 증거가 아니다.
- 루프: 디코딩 첫/끝 프레임 평균 차이 **0.273/255**. 압축 오차가 있고 완전 동일 바이트는 아니다. 마지막 0.4초가 첫 자세/자막으로 복귀한다. 음향은 첫/마지막 구간 무음으로 경계를 연결한다.
- 오디오 수치: AAC 디코딩 peak **-4.95dBFS**, clipped samples **0**, RMS **-26.62dBFS**. `audio-loudness.txt`/`audio-astats.txt` 참조. 첫 렌더보다 효과음을 약 5.6dB 올렸다. 파형·수치 검사는 완료했지만 **실제 청음은 수행하지 못했다**. 음량/효과음 취향 최종 판단은 사용자 재생이 필요하다.
- OpenMontage 도구 실제 실행: character_spec_generator, svg_rig_builder, pose_library_builder, action_timeline_compiler, character_rig_renderer, hyperframes_compose, character_animation_reviewer. JSON receipts와 upstream commit을 저장했다. 기본 bounce/blink 생성물은 `assets/characters/tool-draft-*`에 별도 보존되며 최종에는 사용하지 않았다. 초안 rig/pose/timeline은 실제 SVG 좌표와 연기로 수정했다.
- 재현/통합: `pnpm sync:registry`, `pnpm build:vercel` 로컬 성공. 최초 신규 프로젝트 updatedAt 누락 타입 오류는 첫 source commit 이후 registry를 재생성해 해결했다. 외부 배포는 하지 않았다.
- 권리/비용: 원본 캐릭터·소파·시계·전화기·효과음을 직접 제작. 외부 영상/유명 캐릭터 사용 없음. OpenMontage AGPL-3.0, HyperFrames Apache-2.0, GSAP Standard no-charge, Noto font SIL OFL. 설치는 독립 Python venv와 버전 고정 npm 패키지(`--ignore-scripts`)에 한정했다. API 비용 $0, 비밀키 변경 없음.
- 범위: OpenMontage character-animation 베타 파이프라인을 로컬 authoring pilot으로 실행했다. Rig/pose/action/reviewer는 upstream schema 검증을 통과했다. 연구·편집·렌더 설명용 artifacts는 프로젝트 audit용이며, 모든 upstream stage의 canonical schema/checkpoint 완료를 주장하지 않는다. 바이럴 성과는 검증하거나 보장하지 않는다.
