# 땅따먹기 (land-grab)

격자 위를 달리며 폐곡선을 그려 영토를 넓히는 실시간 영역 점령 게임.

| 모드 | 내용 |
| --- | --- |
| **월드** (기본) | `600 × 600` 열린 세계, 봇 40기, 끝이 없다. 카메라가 따라다니고 미니맵과 상위 10 순위표가 붙는다 |
| **파티** | `60 × 60` 한 화면, 1~4명이 한 키보드, 90초 |

## 규칙 요약

- 내 영토 밖으로 나가면 꼬리가 그려지고, 내 영토로 돌아오면 꼬리가 감싼 영역이 전부 내 땅이 된다.
- 자기 꼬리를 밟으면 탈락, 남의 꼬리를 밟으면 그 상대가 탈락한다.
- 탈락한 플레이어의 영토는 중립으로 돌아간다. 플레이어는 목숨 3개.

## 조작

파티 모드에서는 한 기기에서 2~4명이 함께 할 수 있다. 타이틀에서 사람 수를 고른다.

| 자리 | 키 |
| --- | --- |
| P1 | `←↑→↓` · 숫자패드 (혼자일 때는 `WASD` 도) |
| P2 | `W A S D` |
| P3 | `I J K L` |
| P4 | `T F G H` |

| 입력 | 동작 |
| --- | --- |
| 스와이프 · 방향 패드 | 이동 방향 전환 (터치, 혼자일 때만) |
| `Esc` / `P` | 일시정지 |

## 온라인

세계 서버가 `server/` 에 있다. 프로세스 하나가 `600 × 600` 세계 하나를 들고
초당 6회 돌린다. 시뮬레이션은 브라우저와 같은 코드(`app/src/game`)를 쓴다.

```bash
cd server
npm ci --include=dev
npm test        # 타입 검사 + 규칙 검사 56개 (소켓 없이)
npm run build && npm run smoke   # 빌드된 서버 + 진짜 WebSocket 3개 (14개)
npm run dev     # 로컬에서 띄우기 → http://127.0.0.1:8080/status
```

배포는 Render 다. 저장소 루트의 `render.yaml` 이 설정이고, 조사와 제약은
[docs/design/render-deploy.md](docs/design/render-deploy.md) 에 있다.
**인스턴스는 항상 하나여야 한다** — 늘리면 세계가 쪼개진다.

브라우저 클라이언트는 아직 서버에 붙지 않는다. 남은 작업은 같은 문서 §8.
서버 구조는 [docs/design/io-server.md](docs/design/io-server.md),
한 화면 멀티는 [docs/design/multiplayer.md](docs/design/multiplayer.md).

## 개발

```bash
pnpm --filter land-grab dev      # 개발 서버
pnpm --filter land-grab test     # 타입 검사 + 규칙 검사 18건
pnpm build:project -- land-grab  # 빌드 후 launcher/public/runs/land-grab 로 복사
pnpm playtest --project land-grab
pnpm exec tsx projects/land-grab/tests/bench/rule-sweep.ts   # 규칙 실험 하니스
```

문서: [brief.md](brief.md) · [spec.md](spec.md) · [eval.md](eval.md) · [changelog.md](changelog.md)
