# Wave Runner

원버튼 지그재그 회피 게임. 누르면 오르고 놓으면 내려간다. 가만히 있는 선택지는 없다.

갈림길을 지날 때마다 **한 축이 오르고 다른 축이 내린다.** 순수한 상승은 없으므로 빌드는 세기가 아니라 형태다.

**현재 범위는 4단계의 각도 축까지다** — 부사 3축(각도·속도·편향), 교환 게이트, 섹터 4유형, Stage·Endless 두 모드, 메타 해금, 정확한 솔버 위에 올린 절차적 생성, 그리고 **기체 4종**.

기체는 프리셋이 아니라 **축 곡선**이다. 시작 눈금이 아니라 눈금을 계수로 옮기는 방식이 달라서, 같은 스테이지가 기체마다 다른 문제가 된다 — 같은 협곡에서 예봉은 여유 +64%, 둔각은 −27%다. 기본 지그재그는 45°/45°(꼭지각 90°)이고 축으로 21.6°~64.5°까지 간다.

피커는 별점 대신 **잰 값**을 보여준다. 그 기체의 실제 지그재그를 그리고 그 뒤에 표준(45°)의 지그재그를 점선으로 깔아, 도형으로는 안 잡히는 5.6° 차이를 **기준선에서 벌어지는 폭**으로 보여준다. 여기에 **여유**(굼떠도 깨지는가)와 **길**(아무 길로나 가도 되는가) 두 막대를 붙인다. 예봉은 길이 절반뿐인데 가장 너그럽다.

0.6.0 에서 두 줄기가 합쳐졌다. 코스 쪽은 수제 섹터가 **18개**로 늘고(회랑이 드리프트 × 난이도 9종) 스테이지 시드를 다시 골라 함정 경로가 0 이 됐다. 그 위에 **런 결말 수집**과 **사망 보고서**가 붙어, 솔버가 계산한 난이도와 사람이 실제로 죽는 자리를 처음으로 대조할 수 있다.

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
pnpm exec tsx projects/wave-runner/tests/verify/angles.ts         # 눈금 ↔ 화면 각도, 속도 독립성
pnpm exec tsx projects/wave-runner/tests/verify/runner-probe.ts   # 기체가 정말 양날인가
pnpm exec tsx projects/wave-runner/tests/verify/runner-paths.ts   # 어떤 기체로도 막다른 길이 없는가
pnpm exec tsx projects/wave-runner/tests/verify/runner-grades.ts  # 기체 성격을 재서 피커의 표를 굽는다
pnpm exec tsx projects/wave-runner/tests/verify/solver-check.ts   # 솔버를 신뢰할 수 있는가
pnpm exec tsx projects/wave-runner/tests/verify/generation.ts     # 생성기가 난이도를 겨냥하는가
pnpm exec tsx projects/wave-runner/tests/verify/sector-probe.ts   # 3축이 정말 양날인가
pnpm exec tsx projects/wave-runner/tests/verify/sector-fairness.ts # 모든 빌드로 모든 섹터를 지날 수 있는가
pnpm exec tsx projects/wave-runner/tests/verify/stage-paths.ts    # 모든 빌드 경로가 통과 가능한가
pnpm exec tsx projects/wave-runner/tests/verify/endless-ramp.ts   # Endless 난이도가 실제로 조이는가
pnpm exec tsx projects/wave-runner/tests/verify/stage-time.ts     # 한 판이 50~60초 안인가
pnpm exec tsx projects/wave-runner/tests/verify/flatness.ts       # 어디가 아무것도 묻지 않는가
pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts  # 스테이지 시드 재선별
pnpm playtest --project wave-runner                               # 브라우저 자동 플레이테스트
node projects/wave-runner/tests/verify/course-map/run.mjs         # 12스테이지 통로 지도(난이도 시각화)
```

`curate-stages.ts` 는 기준 상수(티어 사다리·밴드·기체 편차 상한·최난 구간 경계)를 전부
**측정한 분포에서** 읽어 정한다. 구조를 바꿨다면 — 섹터 수, 섹터 풀, 축 표 — 굽기 전에
분포부터 다시 봐야 한다.

```bash
# 분포만 본다(굽지 않는다). CURATE_CACHE 를 주면 채점 결과를 떨어뜨린다
CURATE_CACHE=/tmp/cand.json pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts --probe
# 그 캐시 위에서 기준만 바꿔 가며 결과를 본다 — 전수 채점(10분)을 건너뛴다
CURATE_CACHE=/tmp/cand.json pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts --from-cache --dry
```

`course-map` 은 판정이 아니라 **눈으로 보는 도구**다. 솔버의 생존 회랑을 코스 전체에 칠해
`assets/screenshots/courses/` 에 굽는다 — 화면에 그려진 통로와 실제로 플레이되는 통로의
차이, 여유가 좁아지는 자리, 최악 경로가 무너지는 지점이 한 장에 들어온다.
puppeteer 는 playtest 하네스가 설치한 것을 빌려 쓰므로 먼저 playtest 를 한 번 돌려야 한다.
수치 짝은 `tests/verify/course-map/stats.ts` 다 — 티어 곡선, 함정 경로, 코스 중복, 섹터 사용 빈도,
통로 활용률, 최난 구간 길이를 한 표로 낸다. 그림과 어긋나면 수치가 원본이다.

보고서까지 한 번에 내려면 `/course-report` 를 쓴다 — 무거운 판독은
[`wave-course-analyst`](../../.claude/agents/wave-course-analyst.md) 서브에이전트가 맡고,
결과는 `notes/course-difficulty/<날짜>.md` 에 쌓인다.

검증이 무엇을 증명하고 무엇을 증명하지 못하는지는 [eval.md](./eval.md)에 적었다.

## 문서

- [brief.md](./brief.md) — 왜 만드는가, 무엇을 지키고 무엇을 더하는가
- [spec.md](./spec.md) — 좌표계·물리·코스·상태 머신·상수
- [eval.md](./eval.md) — 중단 판정과 확인 목록
- [notes/decisions.md](./notes/decisions.md) — 구현하며 내린 결정
- [notes/runner-variation.md](./notes/runner-variation.md) — **4단계 기획: 기체 베리에이션·스킬·해금** (구현 미착수)

설계 근거는 저장소 지식베이스에 있다 — [MDA 역설계](../../docs/kb/mda-analysis/space-waves.md) · [장르 방향](../../docs/kb/mda-analysis/one-button-roguelite-direction.md) · [코어 루프](../../docs/kb/mda-analysis/core-loop.md).
