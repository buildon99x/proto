# 땅따먹기 (land-grab)

격자 위를 달리며 폐곡선을 그려 영토를 넓히는 실시간 영역 점령 게임.
플레이어 1명 + AI 3명이 90초 동안 점유율을 겨룬다.

## 규칙 요약

- 내 영토 밖으로 나가면 꼬리가 그려지고, 내 영토로 돌아오면 꼬리가 감싼 영역이 전부 내 땅이 된다.
- 자기 꼬리를 밟으면 탈락, 남의 꼬리를 밟으면 그 상대가 탈락한다.
- 탈락한 플레이어의 영토는 중립으로 돌아간다. 플레이어는 목숨 3개.

## 조작

| 입력 | 동작 |
| --- | --- |
| `←↑→↓` / `WASD` | 이동 방향 전환 |
| 스와이프 · 방향 패드 | 이동 방향 전환 (터치) |
| `Esc` / `P` | 일시정지 |

## 개발

```bash
pnpm --filter land-grab dev      # 개발 서버
pnpm --filter land-grab test     # 타입 검사
pnpm build:project -- land-grab  # 빌드 후 launcher/public/runs/land-grab 로 복사
pnpm playtest --project land-grab
```

문서: [brief.md](brief.md) · [spec.md](spec.md) · [eval.md](eval.md) · [changelog.md](changelog.md)
