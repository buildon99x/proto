# 자동 매각 기본값 재측정 — 12시드 + 대조군

- 일자: 2026-09-24 · 대상: v0.6.5(`45ea111`) 엔진 그대로(기본값은 바꾸지 않았다)
- 근거 작업: `prompts/v0.6.6-decision-tree-pass.md` 6② · `notes/decision-tree-10h.md` §5.5·§6 P7
- 표기: **[실측]** 이 레포에서 직접 돌린 값 · **[코드]** 소스로 확인 · **[추론]**

## 0. 결론

**§5.5의 "끄면 모든 축에서 낫다"는 12시드에서 재현되지 않는다. 기본값(`autoSellBelow: 1`)을 유지하기를 권한다.**

1. **10시간 결과는 설정이 아니라 유일(T4) 추첨이 가른다.** 방치 10시간 자산 중앙값은 기본 **27,147M**,
   끔 **28,520M**(+5%)이다. T4 보유는 둘 다 중앙 **1점**, 도감 471 대 469, 순위는 둘 다 1위다 **[실측]**.
   시드별 T4 점수로 보면 기본이 많은 판이 4, 끈 쪽이 많은 판이 4, 같은 판이 4다. 자산의 우열은 이
   T4 점수 차를 그대로 따라간다. 게임 규칙상 중립인 섭동
   (자동 루틴 위상을 30초 민다)만 줘도 기본값의 10시간 자산이 27,147M → **39,674M**으로, 끈 쪽이
   28,520M → **24,254M**으로 뒤집힌다 **[실측]**. 설정이 만드는 차이가 이 흔들림보다 작다.
2. **구조적 차이는 방치 첫 1시간에만 있고, 작다.** 끄면 첫 중복 배치 정리가 **37분 30초 → 19분 40초**로
   당겨지고, 1시간까지 정리 매각액이 226M → 351M, 발굴력이 2,311 → 2,594/s(**+12%**)가 된다. 이 방향은
   대조군에서도 그대로다(2,358 → 2,641). 그러나 10시간에는 발굴력이 둘 다 9,181/s로 같아진다 **[실측]**.
3. **메커니즘은 배치 정리 문턱(20점)과의 간섭이다** **[코드·실측]**. 감정 직후 매각은 T0·T1 중복만 판다
   (`AUTO_SELL_MAX_TIER = 1`). 배치 정리(v0.6.4, `autoSellVaultSpares`)는 소장고의 **T0~T2 중복이 20점**
   쌓여야 돈다(`AUTO_SELL_SPARE_BATCH_MIN`). 기본값에서는 T0·T1 중복이 감정 순간 이미 팔려 나가서
   문턱까지 T2 중복만으로 차야 하고, 그래서 첫 배치가 늦게 온다. T2 중복(점당 약 1,100만 달러)이
   현금이 되는 시각도 그만큼 늦어진다. 감정 직후 매각액 자체는 1시간 115점, **1,085만 달러**뿐이다.
   T0·T1은 한 점에 약 9만 달러라 자금원으로서의 무게가 없다.
4. **§5.5가 본 차이(자산 3.3배, 유일 0 대 2)는 3시드 추첨이었다.** 같은 첫 3시드를 이 문서의 루프로
   다시 돌리면 기본 중앙 28,780M, 끔 32,446M이다. §5.5의 12,232M 대 40,032M과 다르다. 두 루프는
   시작 발굴단 배정 방식과 루틴 호출 위치만 다른데 값이 이만큼 갈린다. 10시간 자산이 섭동에 얼마나
   민감한지를 보여 주는 또 하나의 증거다 **[실측·추론]**.
5. **운영 플레이에는 이 설정이 거의 무의미하다.** 운영 정책은 매 틱 T0·T1 중복을 직접 판다
   (`liquidateSurplus`). 그래서 10분·1시간 값이 기본과 끔에서 **완전히 같다** **[실측]**.

**권고: 기본값 유지.** 기본값을 끔으로 바꿔서 얻는 것은 방치 첫 1시간 발굴력 +12%뿐이다. 그 대가로
`sim`·`density`·`eval.md`의 모든 기준선이 새로 잰 값으로 바뀐다. P7-(가)의 전제("기본값이 모든 축에서
진다")는 무너졌다. 첫 1시간의 지연을 없애고 싶다면 원인은 설정값이 아니라 **배치 문턱을 세는 방식**이다.
예를 들어 문턱을 점수가 아닌 금액으로 세거나, 감정 직후 매각분도 문턱에 넣으면 된다. 그쪽을 고치고
아래 탐침으로 다시 잰다. 설정 화면의 이 선택지는 "숨은 결정"이라기보다 **무게가 거의 없는 선택**이다.
§1 등급으로는 "결정"이 아니다.

---

## 1. 측정 조건

- 시드 12개: `20260917 + i × 7919` (i = 0…11) — `density`의 기본 시드열과 같다.
- 정책 두 개. 모두 `playlog`와 같은 루프다.
  - **방치(idle)**: `advance` 뒤 60초마다 `runAutoRoutine`.
  - **운영(active)**: 매 틱 `liquidateSurplus` → `runAutoRoutine` → `actExpansion` → `advance`.
- 스텝: 첫 20분 2초(`STEP_EARLY`), 이후 15초(`STEP_LATE`).
- 변형: `w.settings.autoSellBelow`를 `1`(기본)과 `null`(끔)로 둔다. 나머지 설정은 기본값 그대로다.
  `autoSellSpareBelow = 2`(배치 정리 켬)와 `autoReinvest = true`도 그대로 둔다.
- **대조군**(`--control`): 설정은 같게 두고, 방치 루틴 누산기의 시작값만 30초로 둔다. 루틴이 30초
  일찍 한 번 도는 것 말고는 게임 규칙상 아무것도 바뀌지 않는다. 기본↔끔 차이가 이 섭동이 만드는
  차이보다 작으면, 그 차이는 구조가 아니라 혼돈으로 읽는다.
- 값은 **중앙값(최악값)**이다. 최악은 많을수록 좋은 축에서는 최소, 패·순위에서는 최대다. 자산·자금
  단위는 백만 달러(M)다. 자산은 `playerAssets`(소장고 평가액 합)이고 자금은 들어 있지 않다. 순위는
  `fullRanking`을 `rank` 내림차순으로 정렬했을 때 플레이어의 자리다.

## 2. 결과 — 12시드

| 정책/설정 | 시점 | 도감 | 자산M | 자금M | T4 | 승 | 패 | 순위 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 방치 · 기본(1) | 10분 | 23 (21) | 93 (27) | 0.33 (0.01) | 0 (0) | 2 (1) | 2 (3) | 5 (7) |
| 방치 · 끔 | 10분 | 23 (21) | 93 (27) | 0.33 (0.07) | 0 (0) | 2 (1) | 2 (3) | 6 (7) |
| 방치 · 기본(1) | 1h | 151 (139) | 2,377 (1,621) | 6.7 (2.7) | 0 (0) | 11 (9) | 8 (11) | 2 (3) |
| 방치 · 끔 | 1h | 151 (146) | 14,956 (1,723) | 20.8 (1.0) | 1 (0) | 12 (8) | 7 (13) | 1 (3) |
| 방치 · 기본(1) | 10h | 471 (460) | 27,147 (10,455) | 115 (47) | 1 (0) | 132 (125) | 36 (41) | 1 (1) |
| 방치 · 끔 | 10h | 469 (433) | 28,520 (22,682) | 280 (22) | 1 (1) | 134 (126) | 32 (44) | 1 (1) |
| 운영 · 기본(1) | 10분 | 24 (22) | 87 (61) | 0.16 (0.01) | 0 (0) | 2 (1) | 2 (3) | 5 (7) |
| 운영 · 끔 | 10분 | 24 (22) | 87 (61) | 0.16 (0.01) | 0 (0) | 2 (1) | 2 (3) | 5 (7) |
| 운영 · 기본(1) | 1h | 166 (150) | 14,602 (1,123) | 1.07 (0.38) | 1 (0) | 12 (7) | 7 (12) | 3 (4) |
| 운영 · 끔 | 1h | 166 (150) | 14,602 (1,123) | 0.80 (0.13) | 1 (0) | 12 (7) | 7 (12) | 3 (4) |
| 운영 · 기본(1) | 10h | 1,003 (978) | 66,185 (34,094) | 291 (33) | 3 (1) | 152 (145) | 35 (40) | 1 (1) |
| 운영 · 끔 | 10h | 997 (977) | 71,528 (32,829) | 246 (43) | 3 (1) | 152 (145) | 32 (41) | 1 (1) |

**대조군(방치, 루틴 위상 +30초)**

| 설정 | 시점 | 도감 | 자산M | 자금M | T4 | 승 | 패 | 순위 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 기본(1) | 1h | 152 (139) | 14,809 (1,623) | 8.3 (3.0) | 1 (0) | 10 (8) | 7 (12) | 1 (3) |
| 끔 | 1h | 153 (138) | 2,191 (1,114) | 12.7 (1.0) | 0 (0) | 10 (7) | 8 (13) | 2 (3) |
| 기본(1) | 10h | 472 (456) | 39,674 (9,482) | 435 (78) | 2 (0) | 134 (127) | 34 (40) | 1 (2) |
| 끔 | 10h | 477 (456) | 24,254 (10,385) | 382 (49) | 1 (0) | 131 (125) | 36 (45) | 1 (2) |

**읽는 법.** 1시간·10시간의 자산·T4·순위는 대조군에서 기본과 끔의 우열이 **뒤집힌다.** 자산은 T4 한
점(1시간 평가액 중앙 약 13,260M)이 있느냐 없느냐로 거의 다 정해진다. 1시간 자산이 2,377M과 14,956M으로
갈린 것도 T4 한 점 차이다. 시드별로 보면 방치 1시간에 T4를 가진 판이 기본 3/12, 끔 7/12다. 하지만
대조군에서는 이것이 기본 쪽으로 뒤집힌다. 10시간 자금도 마찬가지다(115 대 280 → 대조군 435 대 382).
자금은 재투자가 `AUTO_INVEST_RESERVE`까지 쓰고 남은 잔고라, 마지막 배치 정리 뒤 몇 분이 지났느냐의
함수다 **[코드]**. 흔들림을 넘어 **대조군에서도 방향이 유지되는 것**은 아래 §3의 첫 1시간 현금 흐름뿐이다.

### 시드별 10시간 자산(방치, M · T4 점수)

| 시드 | 기본(1) | 끔 |
| --- | --- | --- |
| 20260917 | 14,098 · 0 | 54,292 · 3 |
| 20268836 | 28,780 · 1 | 28,520 · 1 |
| 20276755 | 42,059 · 2 | 32,446 · 1 |
| 20284674 | 43,920 · 2 | 23,921 · 1 |
| 20292593 | 26,849 · 1 | 33,391 · 2 |
| 20300512 | 29,236 · 1 | 28,972 · 1 |
| 20308431 | 10,455 · 0 | 28,524 · 1 |
| 20316350 | 40,458 · 2 | 22,682 · 1 |
| 20324269 | 23,277 · 1 | 41,456 · 2 |
| 20332188 | 27,147 · 1 | 24,588 · 1 |
| 20340107 | 57,252 · 3 | 22,789 · 1 |
| 20348026 | 24,441 · 1 | 23,960 · 1 |

T4 점수가 다른 8판에서 자산이 큰 쪽은 한 판도 빠짐없이 T4가 많은 쪽이다. 첫 시드(20260917)는
§5.5가 쓴 3시드에 들어 있는데, 12시드 중 끈 쪽이 가장 크게 이긴 판이다.

## 3. 메커니즘 — 돈은 어디서 오는가(방치, 중앙값)

| 항목 | 1h 기본 | 1h 끔 | 1h 대조 기본 | 1h 대조 끔 | 10h 기본 | 10h 끔 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 감정 직후 매각(점) | 115 | 0 | 108 | 0 | 2,412 | 0 |
| 감정 직후 매각액(M) | 10.9 | 0 | 12.0 | 0 | 387 | 0 |
| 첫 배치 정리 시각 | 37분 30초 | **19분 40초** | 40분 15초 | 20분 15초 | — | — |
| 배치 정리(점) | 20 | 143 | 20 | 142 | 445 | 2,873 |
| 배치 정리 평가액(M) | 226 | **351** | 220 | 374 | 4,336 | 4,953 |
| 미감정 매각(점) | 12 | 13 | — | — | 12 | 13 |
| 발굴력(/s) | 2,311 | **2,594** | 2,358 | 2,641 | 9,181 | 9,181 |
| 인부 | 49 | 54 | 49 | 55 | 75 | 75 |
| 감정 정체(초, 근사) | 425 | 418 | — | — | 425 | 424 |
| 드랍(점) | 315 | 315 | — | — | 3,388 | 3,391 |

- **T2 이상은 직접 영향을 받지 않는다.** 감정 직후 매각은 `min(autoSellBelow, AUTO_SELL_MAX_TIER) = 1`에서
  잘리고 T3·T4는 이중으로 막힌다(`autoSellEligible`) **[코드]**. T2 중복은 두 설정 모두 배치 정리로만 팔린다.
  달라지는 것은 **그 배치가 언제 오느냐**다.
- **배치 문턱이 T0~T2를 같이 센다.** `autoSellVaultSpares`는 `spareVaultItems(w, 2).length ≥ 20`일 때만 돈다
  **[코드]**. 끄면 T0·T1 중복이 소장고에 남아 문턱을 빨리 채우고, 그 배치에 T2 중복이 같이 실려 나간다.
  그래서 끈 쪽의 배치 한 점 평균은 약 250만 달러이고, 기본값의 첫 배치(20점, 한 점 약 1,100만 달러)는
  사실상 T2 중복만으로 찬다.
- **1시간 현금 차 약 1억 1천만 달러가 재투자로 들어가 발굴력 +12%가 된다.** 드랍 수는 같다(315 대 315).
  드랍 간격이 하한에 걸려 있어서다(`telemetry.ts` `AMBIENT` 주석). 그래서 이 발굴력 차이는 1시간 안에
  드랍이나 도감으로 번지지 않는다. 10시간에는 인부·장비가 상한 근처(75·10)에서 만나 차이가 사라진다.
- **감정비 파이프라인은 차이가 없다.** 감정 정체 근사치(큐가 있는데 그 스텝에 감정이 0건인 시간)가
  425초 대 418초다. 감정 직후 매각의 T0·T1 판매액은 수수료 흐름에 보탬이 되지 않을 만큼 작다.
- **안목(도감) 경로도 없다.** 종당 1점은 두 설정 모두 보존된다(`AUTO_SELL_KEEP_ONE_PER_SPECIES`). 그래서
  도감이 같고(151 대 151, 471 대 469), 안목 보너스와 레이스 승패도 같다(10h 132·36 대 134·32, 대조군
  134·34 대 131·36). "보유가 안목을 올려 레이스와 T4를 늘린다"는 경로는 이 설정에 없다 **[실측·코드]**.

## 4. 재현

아래 파일을 `app/src/sim/`에 임시로 두고(커밋하지 않는다) `app/`에서 돌린다. 10시간 12시드 × 6판에 약
2분 20초가 걸린다.

```bash
cd projects/relic-king/app
npx tsx src/sim/autosell_probe.ts --seeds 12 --hours 10 --per-seed --control   # 표 §2·§3
npx tsx src/sim/autosell_probe.ts --seeds 12 --hours 1 --control               # 첫 배치 시각(1h)
```

```ts
// 자동 매각 기본값 실험(v0.6.6 6②) — 읽기 전용. 엔진 기본값은 바꾸지 않는다.
import { AUTO_ROUTINE_INTERVAL_SECONDS, SITES } from "../game/balance";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import {
  advance, codexProgress, createPersistentRecord, createWorld, digPower, fullRanking,
  grantStartingTeam, playerAssets, runAutoRoutine
} from "../game/engine";
import { actExpansion, liquidateSurplus, STEP_EARLY, STEP_LATE } from "./policy";
import type { World } from "../game/types";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const N = Number(arg("--seeds", "12"));
const HOURS = Number(arg("--hours", "10"));
const SEEDS = Array.from({ length: N }, (_, i) => 20260917 + i * 7919);
const MARKS = [600, 3600, HOURS * 3600];

type Snap = {
  codex: number; assets: number; funds: number; t4: number; won: number; lost: number; rank: number;
  apprSold: number; apprSoldValue: number;      // 감정 직후 자동 매각(advance 안)
  spareSold: number; spareSoldValue: number;    // runAutoRoutine에서 소장고를 떠난 것(배치 정리)
  blind: number;                                 // 미감정 매각(교착·큐 초과)
  drops: number; t3drops: number; t4drops: number; t4won: number;
  dig: number; workers: number; gear: number; lab: number; layers: number;
  vault: number; vaultT01: number; pending: number; stallSec: number; firstSpareAt: number;
  valT012: number; valT3: number; valT4: number;
};

function run(seed: number, policy: "idle" | "active", autoSell: 1 | null, routinePhase = 0): Snap[] {
  const w = createWorld(seed, false);
  w.settings.autoSellBelow = autoSell;
  const record = createPersistentRecord();
  grantStartingTeam(w);
  const acc = { apprSold: 0, apprSoldValue: 0, spareSold: 0, spareSoldValue: 0, drops: 0, t3drops: 0,
    t4drops: 0, t4won: 0, stallSec: 0, firstSpareAt: -1 };
  const out: Snap[] = [];
  let routineAcc = routinePhase;
  let mi = 0;
  const routine = () => {
    const before = new Map(w.vault.map((v) => [v.uid, v.value]));
    runAutoRoutine(w);
    const after = new Set(w.vault.map((v) => v.uid));
    for (const [uid, val] of before) if (!after.has(uid)) {
      acc.spareSold++; acc.spareSoldValue += val;
      if (acc.firstSpareAt < 0) acc.firstSpareAt = w.t;
    }
  };
  while (w.t < MARKS[MARKS.length - 1] && !w.ended) {
    const st = w.t < 1200 ? STEP_EARLY : STEP_LATE;
    if (policy === "active") { liquidateSurplus(w); routine(); actExpansion(w); }
    const beforeUids = new Set(w.vault.map((v) => v.uid));
    const pendingBefore = w.pending.length;
    const r = advance(w, st, false, st, record);
    // 감정됐는데 소장고로 가지 않은 것 = 감정 직후 자동 매각된 것
    const fresh = w.vault.filter((v) => !beforeUids.has(v.uid));
    acc.apprSold += Math.max(0, r.appraised.length - fresh.length);
    acc.apprSoldValue += Math.max(0, r.appraised.reduce((a, x) => a + x.value, 0) - fresh.reduce((a, v) => a + v.value, 0));
    acc.drops += r.drops.length;
    acc.t3drops += r.drops.filter((d) => d.tier === 3).length;
    acc.t4drops += r.drops.filter((d) => d.tier === 4).length;
    acc.t4won += r.won.filter((id) => ARTIFACT_BY_ID[id]?.tier === 4).length;
    if (pendingBefore > 0 && r.appraised.length === 0 && w.pending.length >= pendingBefore) acc.stallSec += st;
    if (policy === "idle") {
      routineAcc += st;
      if (routineAcc >= AUTO_ROUTINE_INTERVAL_SECONDS) { routineAcc = 0; routine(); }
    }
    while (mi < MARKS.length && w.t >= MARKS[mi]) { out.push(snap(w, record, acc)); mi++; }
  }
  while (out.length < MARKS.length) out.push(snap(w, record, acc));
  return out;
}

function snap(w: World, record: ReturnType<typeof createPersistentRecord>, acc: Record<string, number>): Snap {
  const rows = [...fullRanking(w, record)].sort((a, b) => b.rank - a.rank);
  const tierOf = (id: string) => ARTIFACT_BY_ID[id].tier;
  const sumVal = (pred: (t: number) => boolean) =>
    w.vault.filter((v) => pred(tierOf(v.artifactId))).reduce((a, v) => a + v.value, 0);
  return {
    codex: codexProgress(w).owned, assets: playerAssets(w), funds: w.funds,
    t4: w.vault.filter((v) => tierOf(v.artifactId) === 4).length,
    won: w.stats.racesWon, lost: w.stats.racesLost,
    rank: rows.findIndex((r) => r.id === "player") + 1,
    apprSold: acc.apprSold, apprSoldValue: acc.apprSoldValue,
    spareSold: acc.spareSold, spareSoldValue: acc.spareSoldValue, blind: w.stats.blindSold,
    drops: acc.drops, t3drops: acc.t3drops, t4drops: acc.t4drops, t4won: acc.t4won,
    dig: digPower(w), workers: w.workers, gear: w.gear, lab: w.lab,
    layers: SITES.reduce((a, s) => a + w.sites[s.id].layer, 0),
    vault: w.vault.length, vaultT01: w.vault.filter((v) => tierOf(v.artifactId) <= 1).length,
    pending: w.pending.length, stallSec: acc.stallSec, firstSpareAt: acc.firstSpareAt,
    valT012: sumVal((t) => t <= 2), valT3: sumVal((t) => t === 3), valT4: sumVal((t) => t === 4)
  };
}

const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
const M = (v: number) => (v / 1e6).toFixed(v >= 1e8 ? 0 : 2);
const label = (t: number) => (t < 3600 ? `${t / 60}분` : `${t / 3600}h`);

const all: Record<string, Snap[][]> = {};
for (const policy of ["idle", "active"] as const) {
  for (const sell of [1, null] as const) {
    all[`${policy}/${sell === 1 ? "기본(1)" : "끔(null)"}`] = SEEDS.map((s) => run(s, policy, sell));
  }
}
// 대조군: 설정은 그대로, 자동 루틴 위상만 30초 민다(규칙상 중립인 섭동)
if (args.includes("--control")) {
  all["idle/대조(위상+30초)"] = SEEDS.map((s) => run(s, "idle", 1, 30));
  all["idle/대조(끔,위상+30초)"] = SEEDS.map((s) => run(s, "idle", null, 30));
}

const cols: [string, (s: Snap) => number, (v: number) => string, "hi" | "lo"][] = [
  ["도감", (s) => s.codex, String, "lo"], ["자산M", (s) => s.assets, M, "lo"], ["자금M", (s) => s.funds, M, "lo"],
  ["T4", (s) => s.t4, String, "lo"], ["승", (s) => s.won, String, "lo"], ["패", (s) => s.lost, String, "hi"],
  ["순위", (s) => s.rank, String, "hi"]
];
for (const [key, runs] of Object.entries(all)) {
  for (let i = 0; i < MARKS.length; i++) {
    const cells = cols.map(([name, f, fmt, dir]) => {
      const xs = runs.map((r) => f(r[i]));
      return `${name} ${fmt(med(xs))}(${fmt(dir === "lo" ? Math.min(...xs) : Math.max(...xs))})`;
    });
    console.log(`${key.padEnd(14)} ${label(MARKS[i]).padEnd(4)} ${cells.join(" · ")}`);
  }
}

const mech: [string, (s: Snap) => number, (v: number) => string][] = [
  ["감정직후매각 건", (s) => s.apprSold, String], ["감정직후매각 가치M", (s) => s.apprSoldValue, M],
  ["루틴 정리 건", (s) => s.spareSold, String], ["루틴 정리 가치M", (s) => s.spareSoldValue, M],
  ["첫 루틴정리초", (s) => s.firstSpareAt, String], ["미감정매각", (s) => s.blind, String],
  ["드랍", (s) => s.drops, String], ["T3드랍", (s) => s.t3drops, String], ["T4드랍", (s) => s.t4drops, String],
  ["T4레이스승", (s) => s.t4won, String], ["발굴력", (s) => s.dig, (v) => v.toFixed(0)],
  ["인부", (s) => s.workers, String], ["장비", (s) => s.gear, String], ["감정소", (s) => s.lab, String],
  ["층합", (s) => s.layers, String], ["소장고", (s) => s.vault, String], ["소장고T0-1", (s) => s.vaultT01, String],
  ["대기", (s) => s.pending, String], ["감정정체초", (s) => s.stallSec, String],
  ["T0-2가치M", (s) => s.valT012, M], ["T3가치M", (s) => s.valT3, M], ["T4가치M", (s) => s.valT4, M]
];
for (let i = 0; i < MARKS.length; i++) {
  console.log(`\n[${label(MARKS[i])}] 메커니즘(중앙값)`);
  for (const [name, f, fmt] of mech) {
    console.log(`${name.padEnd(12)} ${Object.entries(all).map(([k, runs]) => `${k} ${fmt(med(runs.map((r) => f(r[i]))))}`).join(" | ")}`);
  }
}

if (args.includes("--per-seed")) {
  for (const [i, title] of [[1, "1시간"], [MARKS.length - 1, "마지막 시점"]] as const) {
    console.log(`\n── 시드별 ${title}(방치) — 자산M·T4·발굴력·루틴정리가치M·순위 ──`);
    for (let j = 0; j < SEEDS.length; j++) {
      const f = (s: Snap) => `${M(s.assets)}·${s.t4}·${s.dig.toFixed(0)}·${M(s.spareSoldValue)}·${s.rank}위`;
      console.log(`${SEEDS[j]}: 기본 ${f(all["idle/기본(1)"][j][i])}  끔 ${f(all["idle/끔(null)"][j][i])}`);
    }
  }
}
```

## 5. 한계

- **12시드도 T4 추첨을 평균 내기에는 적다.** 10시간 T4는 판당 0~3점이고, 한 점이 자산의 절반 이상이다.
  그래서 이 문서는 자산 차이를 "없다"가 아니라 **"대조군의 흔들림보다 작다"**로만 말한다.
- 대조군 섭동은 하나(루틴 위상 +30초)뿐이다. 다른 중립 섭동(스텝 크기, 시작 발굴단 배정 순서)도
  같은 크기의 흔들림을 낼 것으로 보지만 **재지는 않았다** **[추론]**.
- "감정 정체"는 근사치다(큐가 있는데 그 스텝에 감정 0건). 엔진의 `appraisalStalled()`는 export되어
  있지 않아 그대로 쓰지 못했다.
- 정책은 사람이 아니다. 운영 정책이 T0·T1 중복을 매 틱 파는 것(`liquidateSurplus`)은 사람보다 훨씬
  부지런하다. 실제 운영 플레이어에게는 이 설정의 무게가 방치 쪽에 더 가까울 수 있다.
