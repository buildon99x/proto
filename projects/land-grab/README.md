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

온라인 멀티는 이 저장소의 배포 구조(정적 산출물)로는 불가능하다.
선택지와 제약은 [docs/design/multiplayer.md](docs/design/multiplayer.md),
서버를 짓게 될 때의 설계는 [docs/design/io-server.md](docs/design/io-server.md).

## 개발

```bash
pnpm --filter land-grab dev      # 개발 서버
pnpm --filter land-grab test     # 타입 검사 + 규칙 검사 18건
pnpm build:project -- land-grab  # 빌드 후 launcher/public/runs/land-grab 로 복사
pnpm playtest --project land-grab
pnpm exec tsx projects/land-grab/tests/bench/rule-sweep.ts   # 규칙 실험 하니스
```

문서: [brief.md](brief.md) · [spec.md](spec.md) · [eval.md](eval.md) · [changelog.md](changelog.md)
