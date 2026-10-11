# 채석장 완료 안내 프로토타입

2026-10-10 UTC. canonical 파일을 변경하지 않고 별도 복사본에서 작성했다.

## 적용 대상

- `app/src/quarry-presentation.js`: 완료 본문의 상태 분기와 승강기 자원 회복 범위 안내만 변경한다.
- `app/tests/quarry-completion-ui.test.mjs`: 실제 main 함수·클릭 handler 회귀 23건을 새로 추가한다.
- 적용 패치: `quarry-completion-guidance.patch` (150줄). baseline 대상 dry-run 통과.
- 복사 시 원본 presentation SHA-256: `4e1aaf8cf01e8af5dc672eb40e495848b02e478834dc84d5b0f2c1c49fe50654`
- 전달 직전 canonical 대상과 복사한 baseline의 바이트 동일성을 확인했다.

## 표시 내용

곡괭이 회수는 비소모 도구를 보유하고 경험치 60을 이미 받았음을 안내한다.
광부 구조와 운반기 수리는 보상을 이미 받았으며 재지급하지 않는다고 안내한다.
동서 닻과 승강기는 완료 상태·사용법·별도 보상 없음을 안내한다.
승강기의 미완료·완료 본문과 현재 목표는 지역 전환 자체가 자원을 회복시키지
않는다고 범위를 명시한다. 보행 등 시간 경과에 따른 재생을 부정하지 않는다.
남은 닻이 있으면 해당 쪽만 안내하고, 두 닻을 모두 고정했으면 운반기로 안내한다.
선택 승강기를 건너뛴 경우에도 닻 완료 뒤 필수 진행을 되돌리지 않는다.
운반기 수리 뒤에는 에다 보고, 보고까지 끝낸 재방문에는 현재 목표의 다음 조사를 안내한다.
승강기 회복 범위 문구를 제외한 미완료 본문과 버튼·선행조건·원장·보상·경제·전투·저장 구현은 변경하지 않았다.

## 검증

Node v24.19.0. 소스와 새 검사 문법 확인 통과.

```
node --test --test-reporter=tap --test-concurrency=1 \
 app/tests/quarry-completion-ui.test.mjs \
 app/tests/quarry.test.mjs app/tests/objective-ui.test.mjs
```

`quarry-completion-focused.tap`: **67/67 통과**, 실패·취소·건너뜀·TODO 0,
7350.281501 ms. 새 검사 23 + 변경하지 않은 채석장 39 + 목표 UI 5.
최초 새 검사 실행은 17/18 통과였다. fixture의 TOOL_REQUIRED 사유 문자열에
‘입구의’가 빠져 한 건이 실패했다. 실제 반환 code와 reason을 확인하도록 검사했고,
선택 승강기를 건너뛰는 회귀 1건을 추가해 63/63 통과했다.
후속으로 곡괭이 완료·미완료·보고 후 재방문 3건과 승강기 회복 문구/목표 1건을
추가해 위 최종 67/67 결과를 얻었다.

검사는 실제 production main의 showQuarry/panel/closePanel/dispatch/report와
전체 document click listener를 그대로 추출해 실행한다. controller/session/reducer와
저장 재진입은 실제 모듈을 사용한다. DOM·audio만 합성 경계이며 적 처치 보고와 위치는
허용된 reducer 정산 fixture다. 일반 입력 플레이나 실제 화면 검증을 의미하지 않는다.
전체 suite·브라우저·Library·배포·Git 작업은 수행하지 않았다.
