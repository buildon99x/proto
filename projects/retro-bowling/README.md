# Retro Bowling

도트 그래픽 8비트 볼링 게임. 원근 레인에서 파워·스핀·조준으로 공을 굴려
표준 10프레임 볼링을 즐긴다. 실시간 핀 물리로 스트라이크·스페어·스플릿이
자연스럽게 발생하고, 칩튠 사운드와 CRT 스캔라인 연출을 입혔다.

## 조작
- 키보드: `← →` 조준 · `Space`/`Enter` 파워→스핀→투구 · `M` 음소거
- 모바일: 하단 `◀ ● ▶` 버튼, 캔버스 탭 = 액션

## 플레이 흐름
조준(`< >`) → 파워 미터 고정(Space) → 스핀 미터 고정+투구(Space) → 핀 정산 → 반복.
10프레임 종료 시 최종 점수·랭크·하이스코어 표시.

연속 스트라이크는 DOUBLE→TURKEY→HAMBONE 콤보로 이어지고, 볼에 불이 붙는다.

## 개발
```bash
pnpm --filter retro-bowling dev      # 개발 서버
pnpm --filter retro-bowling build    # 타입체크 + 빌드
pnpm playtest --project retro-bowling # 헤드리스 자동 플레이테스트 + 스크린샷
```

## 구조
- `app/src/game/engine.ts` — 상태 머신 + 2D 핀/볼 물리
- `app/src/game/scoring.ts` — 표준 볼링 점수 계산
- `app/src/game/render.ts` — 픽셀 원근 렌더러
- `app/src/game/pixelfont.ts` — 5x7 비트맵 폰트
- `app/src/game/audio.ts` — WebAudio 칩튠 SFX
- `app/src/GameCanvas.tsx` — 게임 루프 + 입력
- `tests/e2e/scenario.mjs` — 플레이테스트 시나리오
