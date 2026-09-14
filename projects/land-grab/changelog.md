# Changelog

## 0.2.0

- splix 서버 소스를 다시 훑어 빠져 있던 규칙 3개를 이식.
  - 점령 시 살아 있는 상대의 상하좌우를 채우기 시작점에 추가 — 상대를 둘러싸
    넓은 땅을 공짜로 먹던 구멍을 막는다.
  - 한 칸에서 방향 전환은 한 번만.
  - 스폰·리스폰 방향은 가장 가까운 벽의 반대쪽.
- 브라우저 없이 도는 결정적 규칙 검사 18건 추가 (`tests/rules/check.ts`).
  `pnpm --filter land-grab test` 가 타입 검사와 함께 실행한다.
- 차별화 제안서 `docs/design/differentiation.md` 추가 (구현 전, 선택 대기).

## 0.1.0

- 60×60 격자 영역 점령 게임 최초 구현: 꼬리 그리기, flood fill 점령, 충돌·탈락·리스폰.
- AI 상태 머신(EXPAND / RETURN / HUNT / RESPAWN)과 난이도 3단계.
- 타이틀 / 인게임 / 일시정지 / 결과 화면, 키보드 + 터치(스와이프·방향 패드) 조작.
- 플레이테스트 시나리오(`tests/e2e/scenario.mjs`)와 `window.__landGrab` 테스트 훅.
