# io 서버 설계 — splix 서버 구조를 따라간다

상태: **서버는 지어져 있다.** `projects/land-grab/server/` — §5.
배포는 Render 로 정했다 — [render-deploy.md](render-deploy.md).

아래 §1~§3 은 splix 서버를 읽고 정리한 설계이고, §4 는 이 문서가 처음에 잘못 적었던
것을 정정한 기록이다.

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

## 4. 앞서 "지을 수 없다"고 쓴 것은 틀렸다

이 절에는 원래 "저장소가 서버를 둘 수 없다"고 적혀 있었다. 근거로 든 두 가지가 모두
사실이 아니었다. 코드를 다시 읽고 확인한 결과다.

**① `runtime` 스키마를 열어야 한다 — 아니다.**
서버는 레지스트리에 등록되지 않는다. 클라이언트만 `static-artifact` 로 남는다.

| 확인한 것 | 결과 |
| --- | --- |
| `pnpm-workspace.yaml` | 워크스페이스는 `launcher`, `packages/*`, `projects/*/app` |
| `scripts/build-all-projects.ts` | `runtime === "static-artifact"` 인 것만 빌드한다 |
| `scripts/sync-launcher-registry.ts` | `projects/*/project.json` 만 읽는다 |

`projects/land-grab/server/` 는 워크스페이스 글롭에 걸리지 않고 Vercel 빌드 경로에도
없다. 스키마는 손댈 일이 없었다.

**② Vercel 서버리스로는 WebSocket 을 못 든다 — 지금은 든다.**
2026-06-22 에 Vercel Functions 의 네이티브 WebSocket 지원이 퍼블릭 베타로 나왔다.
그래도 이 게임은 Vercel 에 못 올라가는데, 이유가 전송이 아니라 **구조**로 바뀌었다 —
연결이 함수 인스턴스에 핀되고 다음 연결이 같은 인스턴스로 간다는 보장이 없어서
같은 세계에 있다고 믿는 사람들이 서로 다른 세계에 앉는다.

실제로 필요했던 결정은 하나뿐이었다. **그 프로세스를 어디에 둘 것인가.**
Render 로 정했고, 조사와 설정은 [render-deploy.md](render-deploy.md) 에 있다.

## 5. 지금 지어져 있는 것

`projects/land-grab/server/` 에 있다. 위 설계를 그대로 따랐다.

| 파일 | 하는 일 | splix 대응 |
| --- | --- | --- |
| `src/main.ts` | HTTP(헬스·상태) + WebSocket, 고정 간격 루프 | `Main` / `WebSocketManager` |
| `src/world.ts` | 세계 하나. 자리 추가·제거, 바뀐 영역 수집 | `Game` |
| `src/session.ts` | 접속 하나. 시야·꼬리·점수 동기화 | `WebSocketConnection` |
| `src/viewport.ts` | 접속별로 어느 타일까지 보냈는지 | 시야 조각 전송 |
| `app/src/net/protocol.ts` | 바이너리 규약 v1 (서버·브라우저 공용) | 메시지 인코딩 |
| `app/src/net/client-state.ts` | 받은 것을 쌓아 두는 곳 (서버·브라우저 공용) | 클라이언트 상태 |

시뮬레이션은 다시 짜지 않았다. `app/src/game` 을 그대로 가져다 쓴다. 엔진에 새로
연 것은 두 가지뿐이다.

- `MatchOptions.shared` — 켜면 사람이 죽어도 판이 끝나지 않는다. 로컬에서는 "내 판이
  끝났다"가 맞지만, 공유 세계에서 한 명의 죽음이 세계를 끝내면 나머지 접속자의 판이
  같이 사라진다.
- `Match.addRunner` / `Match.removeRunner` — 판이 도는 중에 자리를 열고 닫는다.
  번호는 비어 있는 가장 작은 값을 재사용한다. 소유자 코드가 1바이트라 계속 늘려
  나갈 수 없다.

§3 에서 필요하다고 적은 다섯 가지의 현재 상태.

| 필요한 것 | 상태 |
| --- | --- |
| 시드 고정 | 됨. `AiController` 에 시드 난수를 넣었다 |
| 연결별 시야 상태 | 됨. `ViewportSync` 가 보낸 사각형을 기억하고 차이만 보낸다 |
| 프로토콜 | 됨. v1, 바이너리. `PROTOCOL_VERSION` 핸드셰이크 포함 |
| 입력 검증 | 됨. 클라이언트는 방향만 보낸다. 위치는 받지 않는다 |
| 지연 보정 | **아직.** 되돌리기는 넣지 않았다. 아래 참조 |

되돌리기(`UNDO_PLAYER_DIE`)를 빼 둔 것은 의도적이다. 그것을 넣으려면 서버가 최근
몇 틱의 상태를 들고 되감을 수 있어야 하는데, 지금은 **한 지역(싱가포르) 한 세계**로
시작하므로 왕복 시간이 크지 않다. 실제로 억울한 죽음이 관측되면 그때 넣는다.
먼저 재는 것이 순서다.

측정값은 [render-deploy.md](render-deploy.md) §3 에 있다 —
`600 × 600` 에 사람 56명 + 봇 40기가 붙어도 110 MB, 60초 시뮬레이션이 327ms,
1인당 대역폭 1.6 KB/s.

### 확인

```bash
cd projects/land-grab/server
npm test       # 타입 검사 + 규칙 검사 56개 (소켓 없이 세션을 직접 돌린다)
npm run smoke  # 빌드된 서버를 띄우고 진짜 WebSocket 3개로 붙는다 (14개)
```

### 아직 안 된 것

**브라우저 클라이언트가 서버에 붙지 않는다.** 규약과 상태 컨테이너는 서버와 같은
파일을 쓰도록 `app/src/net/` 에 있지만, 화면이 아직 그걸 읽지 않는다.
남은 작업은 [render-deploy.md](render-deploy.md) §8 에 적어 두었다.

## 6. 참고

- [splix 게임 서버 소스 (GitHub, MIT)](https://github.com/jespertheend/splix)
- 규칙과 수치는 [splix-analysis.md](splix-analysis.md)
- 지금 되는 멀티와 온라인 선택지는 [multiplayer.md](multiplayer.md)
- 배포 조사와 설정은 [render-deploy.md](render-deploy.md)
