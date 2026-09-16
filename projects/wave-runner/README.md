# Wave Runner

원버튼 지그재그 회피 게임. 누르면 오르고 놓으면 내려간다. 가만히 있는 선택지는 없다.

갈림길을 지날 때마다 **한 축이 오르고 다른 축이 내린다.** 순수한 상승은 없으므로 빌드는 세기가 아니라 형태다.

**현재 범위는 3단계다** — 부사 3축(각도·속도·편향), 교환 게이트, 섹터 4유형, Stage·Endless 두 모드, 메타 해금, 그리고 **정확한 솔버 위에 올린 절차적 생성**. 0.5.0 에서 **주행 표시와 기록 화면**이 그 위에 얹혔다.

난이도는 눈대중이 아니라 **생존 회랑 폭**으로 겨냥한다. 솔버가 "지금 여기서 출발해 끝까지 살아남을 수 있는 높이의 집합"을 정확히 계산하고, 그 폭을 시간으로 환산하면 "허용되는 타이밍 오차 190ms" 같은 사람의 단위가 된다. 생성기는 그 수치를 목표로 코스를 만든다.

## 실행

```bash
pnpm --filter wave-runner dev        # 개발 서버
pnpm build:project -- wave-runner    # 빌드 → launcher/public/runs/wave-runner
```

런처에서는 `/projects/wave-runner/run`.

## 조작

스페이스 · 클릭 · 탭을 **누르고 있으면 상승**, 떼면 하강. `H` 주행 표시(거리·경과·진행 레일) 켜고 끄기, `T` 튜닝 패널, `M` 음소거, `Esc` 목록.

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
pnpm playtest --project wave-runner                               # 브라우저 자동 플레이테스트
node projects/wave-runner/tests/verify/course-map/run.mjs         # 12스테이지 통로 지도(난이도 시각화)
```

`course-map` 은 판정이 아니라 **눈으로 보는 도구**다. 솔버의 생존 회랑을 코스 전체에 칠해
`assets/screenshots/courses/` 에 굽는다 — 화면에 그려진 통로와 실제로 플레이되는 통로의
차이, 여유가 좁아지는 자리, 최악 경로가 무너지는 지점이 한 장에 들어온다.
puppeteer 는 playtest 하네스가 설치한 것을 빌려 쓰므로 먼저 playtest 를 한 번 돌려야 한다.

검증이 무엇을 증명하고 무엇을 증명하지 못하는지는 [eval.md](./eval.md)에 적었다.

## 문서

- [brief.md](./brief.md) — 왜 만드는가, 무엇을 지키고 무엇을 더하는가
- [spec.md](./spec.md) — 좌표계·물리·코스·상태 머신·상수
- [eval.md](./eval.md) — 중단 판정과 확인 목록
- [notes/decisions.md](./notes/decisions.md) — 구현하며 내린 결정

설계 근거는 저장소 지식베이스에 있다 — [MDA 역설계](../../docs/kb/mda-analysis/space-waves.md) · [장르 방향](../../docs/kb/mda-analysis/one-button-roguelite-direction.md) · [코어 루프](../../docs/kb/mda-analysis/core-loop.md).
