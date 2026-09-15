# io 서버 설계 — splix 서버 구조를 따라간다

상태: **설계만.** 서버는 아직 짓지 않았다. 이유는 §4.

지금 월드 모드는 **한 브라우저 안에서 도는 io 게임**이다. `600 × 600` 보드에 봇 40기,
카메라 추적, 미니맵, 상위 10 리더보드까지 io 문법을 갖췄지만 상대가 전부 봇이다.
사람을 붙이려면 서버가 필요하고, 그 구조는 splix 서버를 그대로 따르는 것이 맞다.

## 1. splix 서버에서 확인한 구조

공개 소스(`jespertheend/splix`, MIT)의 `gameServer/src` 를 읽고 정리한 것이다.

### 층 구분

| 층 | 하는 일 |
| --- | --- |
| `Main` / `WebSocketManager` | 연결을 받고 게임 인스턴스에 붙인다 |
| `Game` | 아레나 하나와 그 안의 플레이어들. 스폰 위치, 리더보드, 미니맵 주기를 관리 |
| `Arena` | 타일 격자. 소유권 변경과 점령 채우기를 맡는다 |
| `Player` | 한 명의 상태: 위치·방향·꼬리·점수. 이동과 충돌 판정이 여기 있다 |
| `arenaWorker` | 채우기와 미니맵을 **별도 워커**에서 돌린다. 메인 루프를 막지 않으려고 |
| `WebSocketConnection` | 메시지 인코딩·디코딩 |

핵심은 **채우기를 워커로 뺀 것**이다. 점령 한 번이 경계 상자 전체를 훑는데,
그게 메인 루프에 있으면 모든 플레이어의 이동이 같이 멈춘다.

### 메시지

전부 **바이너리**(`ArrayBuffer` + `DataView`)다. JSON 은 제어용에만 쓴다.

클라이언트 → 서버: `PROTOCOL_VERSION`(가장 먼저), `SET_USERNAME`, `SKIN`, `READY`,
`UPDATE_MY_POS`, `REQUEST_MY_TRAIL`, `HONK`, `PING`, `SPECTATOR_MODE`.

서버 → 클라이언트: `MAP_SIZE`, `READY`, `CHUNK_OF_BLOCKS`, `FILL_RECT`,
`PLAYER_STATE`, `SET_PLAYER_TRAIL`, `PLAYER_NAME`, `PLAYER_SKIN`, `REMOVE_PLAYER`,
`PLAYER_DIE` / `UNDO_PLAYER_DIE`, `PLAYER_HIT_LINE`, `MY_SCORE`, `MY_RANK`,
`LEADERBOARD`, `MINIMAP`, `GAME_OVER`.

위치는 `Int8` 방향 + `Uint16` x + `Uint16` y 로 5바이트다. 방향에는 "정지"도 들어간다.

### 시야 관리

- 플레이어 주변 **20칸**은 타일이 반드시 전송돼 있어야 한다(`MIN_TILES_VIEWPORT_RECT_SIZE`).
- 움직이면 가장자리에 **5칸 폭 조각**을 붙여 보낸다(`VIEWPORT_EDGE_CHUNK_SIZE`).
  타일 데이터는 **압축하지 않는다.** 조각이 작으니 그럴 필요가 없다.
- 시야를 벗어난 상대는 `REMOVE_PLAYER` 로 지우게 하고, 다시 들어오면 이름·스킨을 다시 보낸다.

### 지연 보정

되돌리기 600ms / 최대 5칸(`MAX_UNDO_EVENT_TIME`, `MAX_UNDO_TILE_COUNT`).
죽음도 되돌릴 수 있다 — `UNDO_PLAYER_DIE` 가 그래서 있다.
확정 사망은 되돌리기 창이 지난 뒤이고, 영토는 그때 한 번만 지운다.

## 2. 여기서 그대로 쓸 수 있는 것

지금 코드는 **이미 권위 있는 시뮬레이션**이다. 서버로 옮길 때 다시 쓸 수 있다.

- `game/board.ts` — splix 의 `Arena` + `PlayerBoundsTracker` 에 해당한다.
  플레이어별 경계 상자와 증분 칸 수를 이미 유지한다.
- `game/engine.ts` — `Game` + `Player`. 이동·충돌·점령·리스폰이 전부 여기 있다.
- `game/ai.ts` — 서버에서 봇을 돌릴 때 그대로 쓴다. 빈 서버를 봇으로 채울 수 있다.

측정해 둔 여유도 있다. `600 × 600` · 41명 기준 **60초 시뮬레이션에 158ms**,
실시간의 380배다. 한 코어로 서버 하나에 수백 명을 받아도 시뮬레이션은 병목이 아니다.

## 3. 새로 필요한 것

1. **시드 고정.** 앱에서 `AiController` 가 `Math.random` 으로 돈다.
   서버가 권위를 가지려면 모든 난수가 시드에서 나와야 한다. 한 줄짜리 변경이지만 빠뜨리면
   재현이 안 된다.
2. **연결별 시야 상태.** 누구에게 어느 타일을 이미 보냈는지 기억해야 조각 전송이 성립한다.
3. **프로토콜.** 위 메시지 목록을 그대로 쓰되, 스킨·인증·관전은 뺀다.
   `PROTOCOL_VERSION` 핸드셰이크는 넣는다 — 클라이언트가 캐시될 수 있어서 버전 불일치가 반드시 생긴다.
4. **입력 검증.** 클라이언트는 방향만 보낸다. 위치는 절대 믿지 않는다.
   이 게임은 입력이 **칸 경계에서만** 반영되므로 검증이 쉽다 — 초당 6회, 값은 넷 중 하나다.
5. **지연 보정.** splix 의 600ms / 5칸을 그대로 시작점으로 삼는다.

대역폭은 걱정거리가 아니다. 상태 갱신은 플레이어당 5바이트,
타일은 시야 가장자리 조각뿐이다.

## 4. 왜 아직 안 지었나

이 저장소가 서버를 둘 수 없다. 추측이 아니라 코드로 막혀 있다.

- `packages/registry/src/schema.ts` 가 `runtime` 을 `"static-artifact"` 하나로 제한한다.
  다른 값을 넣으면 `pnpm validate:projects` 가 실패한다.
- `launcher` 에 API 라우트가 없고 `vercel.json` 은 정적 Next.js 빌드만 한다.
  Vercel 의 서버리스 함수로는 오래 살아 있는 WebSocket 을 들 수 없다.

즉 **코드를 쓴다고 해결되지 않는다.** 두 가지 결정이 먼저다.

1. `runtime` 에 값을 하나 더 열 것인가 (`node-service` 같은).
   레지스트리 스키마와 런처 카드가 같이 바뀐다.
2. 그 서버를 어디에 둘 것인가. WebSocket 을 들 수 있는 곳이어야 한다 —
   Fly.io · Railway · Render · 직접 띄운 VM 중 하나. Vercel 은 안 된다.

둘 다 이 프로젝트 하나가 아니라 저장소 전체에 영향을 준다.
그래서 결정 전에 코드를 먼저 쓰지 않았다.

## 5. 결정이 나면 밟을 순서

1. `runtime` 확장 + 런처가 그 종류를 어떻게 보여 줄지 정한다.
2. `projects/land-grab/server/` — 의존성 없는 Node 스크립트로 시작한다.
   시뮬레이션은 `app/src/game` 을 그대로 가져다 쓴다.
3. 프로토콜 v1: 접속 · 방향 · 상태 · 시야 조각 · 사망 · 리더보드. 스킨과 혼은 나중에.
4. 클라이언트에 접속 모드를 붙인다. 서버 주소는 설정값으로 둔다.
5. 봇을 서버에서 돌려 빈 서버를 채운다. 지금 `ai.ts` 를 그대로 쓴다.

## 6. 참고

- [splix 게임 서버 소스 (GitHub, MIT)](https://github.com/jespertheend/splix)
- 규칙과 수치는 [splix-analysis.md](splix-analysis.md)
- 지금 되는 멀티와 온라인 선택지는 [multiplayer.md](multiplayer.md)
