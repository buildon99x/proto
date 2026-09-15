# Wave Runner

원버튼 지그재그 회피 게임. 누르면 오르고 놓으면 내려간다. 가만히 있는 선택지는 없다.

갈림길을 지날 때마다 **한 축이 오르고 다른 축이 내린다.** 순수한 상승은 없으므로 빌드는 세기가 아니라 형태다.

**현재 범위는 2단계다** — 부사 3축(각도·속도·편향), 교환 게이트, 섹터 4유형, Stage·Endless 두 모드, 메타 해금. 런타임 절차 생성과 정확한 솔버는 3단계다.

## 실행

```bash
pnpm --filter wave-runner dev        # 개발 서버
pnpm build:project -- wave-runner    # 빌드 → launcher/public/runs/wave-runner
```

런처에서는 `/projects/wave-runner/run`.

## 조작

스페이스 · 클릭 · 탭을 **누르고 있으면 상승**, 떼면 하강. `T` 튜닝 패널, `M` 음소거, `Esc` 목록.

## 검증

```bash
pnpm --filter wave-runner lint                                    # 타입
node projects/wave-runner/tests/smoke/lookahead.test.mjs          # 선행 가시 시간 상수
pnpm exec tsx projects/wave-runner/tests/verify/sector-probe.ts   # 3축이 정말 양날인가
pnpm exec tsx projects/wave-runner/tests/verify/stage-paths.ts    # 모든 빌드 경로가 통과 가능한가
pnpm exec tsx projects/wave-runner/tests/verify/endless-ramp.ts   # Endless 난이도가 실제로 조이는가
pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts  # 스테이지 시드 재선별
pnpm playtest --project wave-runner                               # 브라우저 자동 플레이테스트
```

검증이 무엇을 증명하고 무엇을 증명하지 못하는지는 [eval.md](./eval.md)에 적었다.

## 문서

- [brief.md](./brief.md) — 왜 만드는가, 무엇을 지키고 무엇을 더하는가
- [spec.md](./spec.md) — 좌표계·물리·코스·상태 머신·상수
- [eval.md](./eval.md) — 중단 판정과 확인 목록
- [notes/decisions.md](./notes/decisions.md) — 구현하며 내린 결정

설계 근거는 저장소 지식베이스에 있다 — [MDA 역설계](../../docs/kb/mda-analysis/space-waves.md) · [장르 방향](../../docs/kb/mda-analysis/one-button-roguelite-direction.md) · [코어 루프](../../docs/kb/mda-analysis/core-loop.md).
