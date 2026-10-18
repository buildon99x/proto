# 한국어 음성 수단 추가 확인 — 2026-10-18

추가 지시에 따라 차단된 다운로드를 재시도하거나 우회하지 않고 기존 설치/파일/OS 음성을 조사했습니다. 자격 증명 파일 내용은 읽거나 출력하지 않았으며 새 토큰·결제·접근 설정 변경도 없습니다.

| 대안 | 확인 결과 |
|---|---|
| 기존 muhanstory | /workspace, /opt, /usr/share, /home/agent 캐시/로컬공유 및 다운로드, /tmp 검색에서 경로/작업물 발견 못함. 검색 범위 밖에 없다고 단정하지 않음 |
| OS TTS | espeak/espeak-ng/festival/flite/piper/say/spd-say/edge-tts/mimic3/sherpa-onnx 실행파일 없음. Chromium speechSynthesis.getVoices()는 빈 배열, 한국어 로컬 음성 없음 |
| HyperFrames 로컬 TTS | Kokoro 연결 코드 존재. `kokoro_onnx` Python 패키지/로컬 모델 없음. 설치된 한국어 음성으로 사용할 수 없음 |
| OpenMontage Piper | 도구 래퍼 존재. `piper` 실행파일/패키지/음성 모델 없음. 래퍼의 기본값은 en_US-lessac-medium이므로 한국어 음성 설치 증거 아님 |
| Sherpa/Coqui/Edge | 조사한 voice venv에 sherpa_onnx/TTS/edge_tts 패키지 없음. Sherpa 모델도 발견 못함 |
| MeloTTS | MIT 공식 소스 clone와 CPU 의존성 설치 완료. torch2.2.2+cpu/torchaudio2.2.2+cpu/transformers4.27.4/g2pkk/jamo 등. 한국어 가중치 및 config 확보 실패로 합성 샘플 없음 |
| 유료/키 기반 TTS | OpenMontage 래퍼 코드만으로 권한/연결/무료 이용을 가정하지 않음. 실행하거나 키를 열람/설정하지 않음 |

차단 동작: 한국어 로컬 TTS config/model 다운로드.

- 모델: myshell-ai/MeloTTS-Korean. 시도한 config: `https://huggingface.co/myshell-ai/MeloTTS-Korean/resolve/main/config.json`
- 필요한 가중치 위치: `https://huggingface.co/myshell-ai/MeloTTS-Korean/resolve/main/checkpoint.pth` (config부터 차단되어 가중치 다운로드는 완료하지 않음)
- 공식 소스에 기록된 별도 S3 config: `https://myshell-public-repo-host.s3.amazonaws.com/openvoice/basespeakers/KR/config.json` HEAD도 CONNECT proxy403.
- 원인/상태: CONNECT proxy HTTP403 Forbidden. 한 번 범위를 한정한 승인 실행에도 동일 응답. 자동 승인 리뷰의 거부가 아님. 원격 모델이 삭제됐거나 자격 증명이 필요하다고 단정할 근거는 없음. 실행 결과는 실패이며 불확실한 성공 상태가 아님.
- 완료: 50초15장면 그래픽/자막/SRT/음성 투입 가능한 HTML/SVG/GSAP 편집 원본, OpenMontage 렌더, 규격/프레임/전체 재생 QA, 썸네일/미리보기 Library 저장, 저장소 전체 빌드.
- 남음: 허용된 기존 한국어 TTS 또는 라이선스 확인 가능한 로컬 모델/원본 내레이션 WAV → 발화 페이싱/장면 동기 조정 → 재렌더 → 실제 청음과 수치 오디오 QA → 최종 음성 MP4 납품.

증거: local-voice-discovery.json, browser-os-voices.json, voice-installed-modules.json, artifacts/voice-blocker.json. 가중치 검색의 `.pth` 결과 중 distutils-precedence.pth는 Python 경로 설정 파일이며 음성 가중치가 아닙니다.
