# Wave Runner

원버튼 지그재그 회피 게임. 누르면 오르고 놓으면 내려간다. 가만히 있는 선택지는 없다.

갈림길을 지날 때마다 **한 축이 오르고 다른 축이 내린다.** 순수한 상승은 없으므로 빌드는 세기가 아니라 형태다.

**현재 범위는 3단계다** — 부사 3축(각도·속도·편향), 교환 게이트, 섹터 4유형, Stage·Endless 두 모드, 메타 해금, 그리고 **정확한 솔버 위에 올린 절차적 생성**.

통로 밖 벽면에는 **섹터 유형 질감**이 깔린다. 대비 상한이 1.5:1 이라 밝기로는 네 유형을 가를 수 없으므로 결의 **방향**으로 가르고, 게이트 리드인에서 다음 유형으로 크로스페이드한다 — 유형이 어떤 축을 원하는지를 선택 전에 읽게 한다.

난이도는 눈대중이 아니라 **생존 회랑 폭**으로 겨냥한다. 솔버가 "지금 여기서 출발해 끝까지 살아남을 수 있는 높이의 집합"을 정확히 계산하고, 그 폭을 시간으로 환산하면 "허용되는 타이밍 오차 190ms" 같은 사람의 단위가 된다. 생성기는 그 수치를 목표로 코스를 만든다.

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
pnpm exec tsx projects/wave-runner/tests/verify/solver-check.ts   # 솔버를 신뢰할 수 있는가
pnpm exec tsx projects/wave-runner/tests/verify/generation.ts     # 생성기가 난이도를 겨냥하는가
pnpm exec tsx projects/wave-runner/tests/verify/sector-probe.ts   # 3축이 정말 양날인가
pnpm exec tsx projects/wave-runner/tests/verify/stage-paths.ts    # 모든 빌드 경로가 통과 가능한가
pnpm exec tsx projects/wave-runner/tests/verify/endless-ramp.ts   # Endless 난이도가 실제로 조이는가
pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts  # 스테이지 시드 재선별
pnpm exec tsx projects/wave-runner/tests/verify/margin-texture.ts # 여백 질감이 색·이음매·결정성 사양을 지키는가
pnpm playtest --project wave-runner                               # 브라우저 자동 플레이테스트
```

검증이 무엇을 증명하고 무엇을 증명하지 못하는지는 [eval.md](./eval.md)에 적었다.

## 문서

- [brief.md](./brief.md) — 왜 만드는가, 무엇을 지키고 무엇을 더하는가
- [spec.md](./spec.md) — 좌표계·물리·코스·상태 머신·상수
- [eval.md](./eval.md) — 중단 판정과 확인 목록
- [notes/decisions.md](./notes/decisions.md) — 구현하며 내린 결정
- [docs/design/margin-space.md](./docs/design/margin-space.md) — 통로 여백 공간 활용 아이데이션 (10안·선정·기각)
- [docs/design/margin-space-e2e.md](./docs/design/margin-space-e2e.md) — 채택분의 e2e 기획 (메커니즘·데이터 모델·심사 파이프라인·검증)
- [docs/design/margin-texture.md](./docs/design/margin-texture.md) — 섹터 유형 질감 e2e 설계 (M1)
- [docs/design/margin-milestone.md](./docs/design/margin-milestone.md) — 기록 이정표 e2e 설계 (M2)
- [docs/design/margin-billboard.md](./docs/design/margin-billboard.md) — 플레이어 광고판 e2e 설계 (M4)

설계 근거는 저장소 지식베이스에 있다 — [MDA 역설계](../../docs/kb/mda-analysis/space-waves.md) · [장르 방향](../../docs/kb/mda-analysis/one-button-roguelite-direction.md) · [코어 루프](../../docs/kb/mda-analysis/core-loop.md).
