# Wave Runner

원버튼 지그재그 회피 게임. 누르면 오르고 놓으면 내려간다. 가만히 있는 선택지는 없다.

갈림길을 지날 때마다 **한 축이 오르고 다른 축이 내린다.** 순수한 상승은 없으므로 빌드는 세기가 아니라 형태다.

**현재 범위는 4단계의 각도 축까지다** — 부사 3축(각도·속도·편향), 교환 게이트, 섹터 4유형, Stage·Endless 두 모드, 메타 해금, 정확한 솔버 위에 올린 절차적 생성, 그리고 **기체 4종**.

기체는 프리셋이 아니라 **축 곡선**이다. 시작 눈금이 아니라 눈금을 계수로 옮기는 방식이 달라서, 같은 스테이지가 기체마다 다른 문제가 된다 — 같은 협곡에서 예봉은 여유 +64%, 둔각은 −27%다. 기본 지그재그는 45°/45°(꼭지각 90°)이고 축으로 21.6°~64.5°까지 간다.

피커는 별점 대신 **잰 값**을 보여준다. 그 기체의 실제 지그재그를 그려(봉우리 수가 기울기에 반비례한다) 도형으로는 안 잡히는 5.6° 차이를 눈에 보이게 하고, **여유**(굼떠도 깨지는가)와 **길**(아무 길로나 가도 되는가) 두 막대를 붙인다. 예봉은 길이 절반뿐인데 가장 너그럽다.

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
pnpm exec tsx projects/wave-runner/tests/verify/angles.ts         # 눈금 ↔ 화면 각도, 속도 독립성
pnpm exec tsx projects/wave-runner/tests/verify/runner-probe.ts   # 기체가 정말 양날인가
pnpm exec tsx projects/wave-runner/tests/verify/runner-paths.ts   # 어떤 기체로도 막다른 길이 없는가
pnpm exec tsx projects/wave-runner/tests/verify/runner-grades.ts  # 기체 성격을 재서 피커의 표를 굽는다
pnpm exec tsx projects/wave-runner/tests/verify/solver-check.ts   # 솔버를 신뢰할 수 있는가
pnpm exec tsx projects/wave-runner/tests/verify/generation.ts     # 생성기가 난이도를 겨냥하는가
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
- [notes/runner-variation.md](./notes/runner-variation.md) — **4단계 기획: 기체 베리에이션·스킬·해금** (구현 미착수)

설계 근거는 저장소 지식베이스에 있다 — [MDA 역설계](../../docs/kb/mda-analysis/space-waves.md) · [장르 방향](../../docs/kb/mda-analysis/one-button-roguelite-direction.md) · [코어 루프](../../docs/kb/mda-analysis/core-loop.md).
