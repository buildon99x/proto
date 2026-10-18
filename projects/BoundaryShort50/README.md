# 싫은데 또 “응” 했다면

**제작 미리보기입니다. 내레이션이 없어 요청한 완성본은 아직 아닙니다.**

- 재생: `renders/BoundaryShort50-preview-narration-pending.mp4`
- 썸네일: `renders/thumbnail.png`
- 검수: [qa/QA.md](qa/QA.md), [15장면 샘플](qa/contact-sheet.jpg)
- 대본/출처: [artifacts/script.json](artifacts/script.json), [출처와 적용 범위](artifacts/source-notes.md)

15개 원본 SVG 장면, GSAP 타임라인, 한국어 자막. 과학적 인과관계를 꾸며내지 않고 즐거운 사회적 초대 거절 연구의 적용 범위를 화면에 명시했습니다. 십 분 도움은 본인이 원하고 여유가 있을 때만 선택하는 예시입니다. 위협·보복 관계에서는 안전과 도움을 우선합니다. 바이럴 성과를 보장하지 않습니다.

## 현재 차단

공식 MeloTTS 한국어 모델의 HuggingFace config/model 다운로드가 CONNECT proxy HTTP403으로 실패했습니다. 범위를 한정한 승인 실행에서도 같은 HTTP403이었으며 자동 승인 심사가 거부한 상황은 아닙니다. 저자 코드에 명시된 공식 S3 config도 HEAD HTTP403입니다. MIT 코드 검토, 별도 Python3.10/CPU Torch/의존성 설치까지 완료했으나 모델 가중치가 없어 음성을 만들지 못했습니다. 키·유료 API·영구 접근 설정 변경·우회는 하지 않았습니다. 상세: `artifacts/voice-blocker.json`.

계속하려면 기존에 허용된 한국어 TTS 경로나 라이선스를 확인할 수 있는 로컬 한국어 모델/내레이션 WAV가 필요합니다. 현재 MP4를 음성 포함 완성본으로 바꾸거나 무음 완성본으로 표시하지 않습니다.

## 재현

기존 dot 로컬 런타임: OpenMontage `/workspace/OpenMontage-source` e45f5b12bd46440b04f3675af9a77d0718e6a254, HyperFrames0.8.157, Chromium, FFmpeg, Python3.12 렌더 환경 `/workspace/openmontage-venv`. 작업은 `/workspace/proto/projects/BoundaryShort50`에서 실행합니다.

```bash
/workspace/openmontage-venv/bin/python scripts/illustrations.py
/workspace/openmontage-venv/bin/python scripts/author.py
HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium NODE_PATH=/workspace/openmontage-runtime/node_modules npm_config_cache=/tmp/openmontage-npm-cache /workspace/openmontage-venv/bin/python scripts/render.py
/workspace/openmontage-venv/bin/python scripts/verify-preview.py
python3 -m http.server 8768
# 다른 터미널, 동일 프로젝트 위치
node scripts/playback-qa.cjs
```

`node_modules`는 기존 `/workspace/openmontage-runtime/node_modules` 연결이며 Git에 포함하지 않습니다. `author.py`는 `assets/voice/narration.wav`가 있고 길이30초 초과인 경우만 음성 사용으로 전환합니다. 음성을 확보한 뒤에는 반드시 발화 속도·15구간 동기·자막·실제 청음·오디오 수치·전체 재생을 새로 검수해야 합니다. 현재 QA 스크립트는 명시적인 무음 미리보기 경로를 대상으로 합니다.

## 권리와 배포

- SVG/대본 구성/썸네일: 이번 작업의 원본 제작. 외부 인물/영상/사진/음악 없음.
- OpenMontage: AGPL3, 로컬 소스 출처와 변경 없는 사용 기록. HyperFrames: Apache2. GSAP3.15.0: 표준 라이선스, 배포본 변경 없음. NotoSansKR: SIL OFL; 모두 `artifacts/*LICENSE*` 참조.
- MeloTTS: MIT 소스 검토. 모델 다운로드 실패로 음성 모델/음성 결과물은 포함하지 않음.
- 수동 배포·소셜 게시 없음. 승인된 기존 브랜치 push는 저장소의 기존 Vercel 연동을 작동시킬 수 있습니다. 자동 배포 후보의 성공/공개 접근은 확인하지 못했습니다. 기존 완성 영상과 게임 소스는 수정하지 않았습니다.

## Typecast 연동 — 2026-10-18 KST

사용자 지시로 [Typecast 공식 문서](https://typecast.ai/docs/llms.txt)를 읽고 공식 Python SDK0.4.1(Apache2)을 별도 voice venv에 설치했습니다. `scripts/typecast-voice.py`에 **source=api-page / generated_by=codex**를 로컬 제작 기록에 고정했습니다. SDK 스키마 확인 결과 두 값은 필수 TTS 필드가 아닌 선택적 User-Agent 출처 정보이므로 실제 요청에는 덧붙이지 않으며 SDK 기본 User-Agent를 유지합니다. 환경변수 키를 로컬 CLI에서만 사용하고 브라우저/코드/Git/로그에 저장하지 않습니다.

15개 구간별 한국어 ssfm-v30 Smart Emotion + 앞뒤 문장 맥락 + Timestamp TTS를 사용합니다. 기본 생성은 첫 구간 샘플만이며, 전 구간 생성은 명시적 `--all`입니다. 처리된 음성과 타임스탬프를 함께 저장하고 구간에 배치할 때 원래 시작 시각만 더합니다. 말이 구간보다 길면 자르거나 가속하지 않고 중단합니다. 동일 요청의 완료 파일은 영수증 hash를 확인해 재사용합니다. 권한/결제/속도 제한 오류는 자동 반복하지 않습니다.

```bash
/workspace/boundary-voice-venv/bin/python scripts/typecast-voice.py plan
/workspace/boundary-voice-venv/bin/python scripts/check-typecast.py
# 아래는 안전한 런타임 환경에 TYPECAST_API_KEY가 제공된 뒤에만:
/workspace/boundary-voice-venv/bin/python scripts/typecast-voice.py recommend
# 추천 음성의 metadata 확인 및 샘플 청음 필요. 한국어 억양은 metadata만으로 입증 불가.
# 이전 유료 API 금지 조건이 해제되고 크레딧 사용이 명시적으로 허용된 경우에만:
/workspace/boundary-voice-venv/bin/python scripts/typecast-voice.py generate --voice-id SELECTED_VOICE_ID --allow-credit-use
# 샘플 검수 후 전 구간 생성
/workspace/boundary-voice-venv/bin/python scripts/typecast-voice.py generate --voice-id SELECTED_VOICE_ID --allow-credit-use --all
/workspace/boundary-voice-venv/bin/python scripts/typecast-voice.py assemble
```

현재 `TYPECAST_API_KEY`가 없어 실제 Typecast 요청0회입니다. 추가 결제/키 생성·영구 설정 변경은 하지 않았습니다. API키는 채팅에 보내지 말고 승인된 비밀 환경변수 수단으로 제공해야 합니다. SDK 요청/attribution/오디오 조립의 오프라인 검사는 통과했지만 실제 서비스 성공·발음·청음·최종 영상은 미완료입니다. 합성 후 기존 author/render 및 최종 음성 QA를 수행해야 합니다.

인터뷰는 중단했습니다. 참여 동의/제출 승인/전송 모두 없으며, 외부 문서를 추가 권한으로 취급하지 않습니다. 기존 요청의 인터뷰 source=integrated는 로컬 기록에만 남습니다.
