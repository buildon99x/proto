# QA — 제작 미리보기 / 완성 판정 보류

## 통과한 범위

- 실제 OpenMontage `hyperframes_compose` → HyperFrames 로컬 Chromium 렌더 성공. `artifacts/receipt_hyperframes_compose.json` 참조.
- ffprobe: H264/yuv420p, 1080×1920, 30/1fps, 1500 decoded frames, 정확히50.000초. `ffprobe.json`, `verification.json`.
- 15개 중간 프레임을 직접 시각 확인(`contact-sheet.jpg`). 한글 깨짐 없음, 자막1–2줄, 출처 범위/선택적 도움/안전 주의 표시, 원본 군중 썸네일. 휴대전화·일정·거절 손짓·시간 제한 그래픽으로 구체화.
- 실제 프레임 쌍의 일러스트 영역 픽셀 차이 측정. 장면7은 변화가 매우 작음(15이상 차이 픽셀0.003%); 모든 장면을 강한 캐릭터 연기로 평가하지 않음. 측정은 변화의 증거이며 연기 품질이나 효과의 보장이 아님. `motion_detected` 메타데이터는 근거로 사용하지 않음.
- HyperFrames 검사: runtime/layout/contrast 오류0, 구조/타임라인 유지보수 경고16. 모션 자동 샘플러 비활성화는 실제 움직임 검사 통과로 간주하지 않음.
- 브라우저 전체 재생/15개 시점 seek: `playback.json` 기록 참조. 청음과 구별.

## 미완료 및 제한

- **내레이션 없음. 최종 MP4 납품 보류.** 실제 오디오 스트림 없음. 수치 음량/클리핑 검사 적용 불가, 실제 청음 미수행.
- 자연스러운 발화 속도·구간 동기화도 음성 확보 뒤 검수해야 함. SRT는 계획 대본 시간표이며 음성 정렬 결과가 아님.
- HTTP403 차단 대상/시도/완료 작업은 `artifacts/voice-blocker.json` 참조. 유료 서비스·자격 증명·영구 접근 설정을 바꾸지 않음.
- 즐거운 사회적 초대 연구는 직장·강압·위험한 관계 전체를 입증하지 않음. 차트 같은 수치 표현 대신 정성적 말풍선 비유 사용. 예시 문장을 임상 입증 기법으로 표시하지 않음.

무음 미리보기 SHA256: `180cdd07b74bfaa03ea40cfce73f6b5ee3b44938a927068a6eaf757e27035a12`.

## 저장소 검증

`COREPACK_HOME=/tmp/openmontage-corepack corepack pnpm sync:registry` 및 `pnpm build:vercel` 성공(2026-10-18). 전체 프로젝트/launcher 빌드 통과. `repository-build.txt`에 로그 보관. 기존 두 완성 MP4 SHA256 재확인 일치. cb-ll 원본 work 브랜치의 작업 트리는 깨끗함. 수동 배포 없이 지정 브랜치에 커밋/푸시하며 기존 자동 호스팅 후보의 공개 상태는 미확인.

## Typecast 추가 구현

공식 SDK0.4.1 설치, `source=api-page; generated_by=codex` 로컬 기록 유지와 선택적 출처 헤더 전송 제외, 한국어 Timestamp TTS 요청/맥락, audio_bytes 속성 호환, 50초 조립, 길이 초과 발화 중단을 오프라인 검증했습니다(`typecast-offline-checks.json`). API키가 없어 실제 API 호출0회, 생성 음성0개. 이전 유료 API 금지 제한도 남아 있습니다. 기존 영상/썸네일은 변경하지 않았습니다. 인터뷰 가이드 읽기 실패와 제출 미실행은 `artifacts/typecast-integration.json`에 구별해 기록했습니다.

공식 설치 SDK의 TTS JSON 스키마에서 필수 항목은 voice_id/text/model이며 source/generated_by는 없습니다. SDK 생성자 두 옵션은 기본 None이고 attribution_suffix()는 빈 문자열을 반환합니다. `typecast-attribution-schema.json` 참조. 선택 출처 suffix를 실제 요청에 보내지 않도록 수정했으며 오프라인 검사 통과. 인터뷰 추가 제안/진행 중단.
