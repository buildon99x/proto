# Furnace 완료·재진입 안내 후보 수정

작성: 2026-10-10 UTC

## 결과

요청한 작은 안내 수정과 집중검사를 완료했습니다. 최종 후보의 presentation 검사 **29/29 통과**, 실패·건너뜀 0개입니다. 기존 17개 검사를 모두 유지하고 12개 회귀검사를 추가했습니다. 수치, 런타임 핸들러, 행동 허용 조건, 저장 형식은 바꾸지 않았습니다.

작업면: `/workspace/shared/emberwatch-furnace-guidance-work`

통합 대상은 두 파일뿐입니다.

- `app/src/furnace-presentation.js`
- `app/tests/furnace-presentation.test.mjs`

canonical은 수정하지 않았습니다. 필요한 소스·검사와 import 의존성 59개만 복사했고, 작업 후 59개 canonical 파일의 SHA-256이 작업 시작 시점과 모두 같음을 확인했습니다. 후보의 나머지 57개 복사 파일도 그대로입니다.

## 수정 내용

1. 냉각·배기·점화 본문에 실제 objective와 defeated로 계산한 상태 안내를 사용합니다.
   - 미수락 상태: 오린에게 의뢰 수락이 남아 있다고 표시합니다.
   - 조건 미충족: 아직 안 끝난 냉각 선택/배기 개방과 실제 남은 적 수만 표시합니다.
   - 냉각 앞마당의 적을 전부 처치했지만 냉각 선택을 안 한 경우: “처치를 마쳤으니 … 엄폐판 선택을 완료하세요”로 구분합니다.
   - 준비 상태: “냉각 준비 완료.”, “배기 준비 완료.”, “점화 준비 완료.”로 표시하며 이미 끝난 처치·선행 조건을 다시 요구하지 않습니다.
   - 완료 상태: 기존 완료/중복 보상 없음 안내와 비활성 행동을 유지합니다. 점화 완료 본문에도 “추가 보상은 없습니다.”를 명시했습니다.
2. 점화 대기 안내는 점화 회랑만이 아니라 전체 용광로의 남은 적 수로 준비 문구를 고릅니다. 이는 표시 조건만의 수정입니다.
3. 재진입과 승강기 안내의 “이동은 … 회복하지 않습니다”라는 넓은 표현을 없애고 “지역 전환 자체는 자원 회복·쿨다운 초기화를 하지 않습니다.”로 한정했습니다. 승강기 연결의 자원/남은 쿨다운 보존, 선택 경로, 보상 없음은 유지합니다.
4. 행동 label/choice/개수, 보상 수치와 출처, 영구 엄폐 선택, 별도 렌즈 회수와 오린 보고는 그대로입니다.

준비 상태의 대표 본문:

- 냉각: “냉각 앞마당 적 0/5명 남음. 냉각 준비 완료.”
- 배기: “작업 고리 적 0/6명 남음. 배기 준비 완료.”
- 점화: “냉각 선택과 작업 고리 배기 개방을 마쳤습니다. 점화 회랑 적 0/6명 남음. 용광로 전체 적 0/17명 남음. 점화 준비 완료.”

## 검증

- 변경 전 기존 검사: 17/17 통과. `evidence/baseline-test.log`
- 최종 회귀검사를 변경 전 source에 적용: 29개 중 12개 실패, 17개 통과. 옛 본문의 결함이 실제로 검출됩니다. `evidence/regression-red-test.log`
- 최종 후보 source + 최종 검사: 29/29 통과, 실패/건너뜀 0개. `evidence/focused-test.log`
- 변경한 source/test 두 파일의 `node --check`: 통과. `evidence/syntax-check.log`
- canonical/후보 복사본 해시 및 수정 범위 확인: 통과. `evidence/integrity-check.log`

실행 명령:

```sh
cd /workspace/shared/emberwatch-furnace-guidance-work
node --check app/src/furnace-presentation.js
node --check app/tests/furnace-presentation.test.mjs
node --test app/tests/furnace-presentation.test.mjs
```

새 검사는 실제 진행 reducer로 얻은 미충족/부분 처치/준비/완료 snapshot을 사용합니다. 임의 XP·레벨·아이템·진행 플래그를 주입하지 않습니다. 준비 안내의 기존 행동을 실제 핸들러에 보내 성공, 정확한 일회 보상 및 재실행 거절을 확인합니다. 완료/준비 상태의 저장·로드, 각 단계의 부분/준비 상태에서 실제 왕복 travel·재로드, 자원/쿨다운 보존, 렌즈 대기, view 불변성, 두 승강기 안내도 포함합니다.

기존 검사에서 바뀐 것은 냉각/배기/점화의 부정확한 고정 처치 문구와 재진입의 넓은 이동 문구를 기대하던 assertion입니다. 실제 남은 적 수/완료된 선행 조건/좁혀진 이동 의미를 더 엄격히 검사하도록 바꿨으며 테스트 등록이나 기존 핸들러 거절 검사는 제거하지 않았습니다.

이 검사는 scripted 좌표·처치 보고를 사용하는 view/실제 reducer 검사입니다. 일반 입력 전투, 브라우저 픽셀 또는 전체 캠페인 검수의 증거가 아닙니다. 요청대로 전체검사, build, 브라우저, Site/Git/Library 외부 쓰기를 하지 않았습니다.

## diff와 통합

- 소스 diff: `evidence/source.diff`
- 검사 diff: `evidence/tests.diff`
- 두 파일 통합 patch: `evidence/candidate.patch`
- 원본 복사 해시 목록: `source-copy-manifest.json`

부모 작업에서 두 변경 파일만 검토·반영하면 됩니다. import dependency 복사본과 evidence 파일을 production source로 복사할 필요는 없습니다. 전체검사와 실제 R12a5 화면 확인은 부모 통합 단계에 남습니다.
