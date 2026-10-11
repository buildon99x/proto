# R14a4 — 진격 채널 FX 최소 수정

R14a3에서 분리한 presentation 수정입니다. 일반 6기술은 action.contact가 실제 전달되며 준비/접촉 연결이 정상입니다. 불굴의 진격은 일반 actionContact 대신 실제 channelPulse를 내보내므로, fired=false를 계속 준비 상태로 취급하고 접촉 효과가 누락되는 결함이 있었습니다.

## 변경
- app/src/poe-presentation.js: 실제 actionStarted 채널을 추적하고 channelPulse castId/index당 1회 효과 생성. 채널 contact 경과 시 준비선 종료. 마지막 pulse 이후 채널 종료에서도 잔향을 보존하고 무효/중복 pulse는 거절합니다.
- app/tests/poe2-presentation-runtime.test.mjs: 실제 battle.action→feedback→renderer 18개 회귀, flash0/1, 일반 6기술과 채널, 취소/종료, hostile/player layering, 입력 state 불변.
- 버전 표시 R14a4/0.14.0-reimplementation.4, 일치 검사와 기획 연결 문서 갱신.
- combat.js, 스킬 수치, 공격·이동·취소 시간, 자원/피해 판정, 저장 형식은 변경하지 않습니다.

## 자동검증
- 전체 고유 검사 3,792/3,792, 실패/취소/skip0,117.621s. 이전3,774를 축소하지 않았고 신규18개입니다.
- 집중180개는 전체와 겹치므로 합산하지 않습니다.
- 수정 전 presentation 복사본에 신규18개를 적용하면 진격3개가 실패, 수정 후 모두 통과.
- lint 및 static candidate build 성공.
- v57(R14a3)의 정상 입력 QA는 v57-normal-input-observations.md 참고. R14a4 실제 공개 후보 비교는 아직 미완료입니다.

구조·판정 연결 검사는 화려함, 청취, 난전 시인성, 입력의 체감 품질을 합격 처리하지 않습니다. 공개 루트 R11b6.1과 R12 후보는 유지합니다. 밸런스와 R13 신규 성장은 보류합니다.
