# Changelog

## 0.1.0

- 60×60 격자 영역 점령 게임 최초 구현: 꼬리 그리기, flood fill 점령, 충돌·탈락·리스폰.
- AI 상태 머신(EXPAND / RETURN / HUNT / RESPAWN)과 난이도 3단계.
- 타이틀 / 인게임 / 일시정지 / 결과 화면, 키보드 + 터치(스와이프·방향 패드) 조작.
- 플레이테스트 시나리오(`tests/e2e/scenario.mjs`)와 `window.__landGrab` 테스트 훅.
