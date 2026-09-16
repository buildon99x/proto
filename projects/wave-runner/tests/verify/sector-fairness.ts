/**
 * 섹터 공정성 — **모든 도달 가능한 빌드로 모든 섹터를 통과할 수 있는가.**
 *
 * 0.5.3 에서 `gorge-3` 이 도달 가능한 19개 빌드 중 5개를 원천 봉쇄하고 있던 것을 잡고
 * 만든 검사다. 그 결함은 코스 단위 검증(`stage-paths.ts`)에 **잡히지 않았다** — 그 섹터를
 * 쓰는 시드가 큐레이션에서 조용히 탈락했을 뿐이라, 검증은 계속 ✓ 였고 섹터는 죽어 있었다.
 * 섹터는 섹터 단위로 물어야 한다.
 *
 * ## 도달 가능한 빌드란
 *
 * 게이트는 언제나 한 축 +1 / 다른 축 −1 의 교환이므로 **세 축의 합은 런 내내 0** 이다.
 * 그래서 (각도 −3, 편향 −3) 같은 조합은 존재하지 않는다 — 속도가 +6 이 되어야 하기 때문이다.
 * 합이 0 인 조합만 훑는 이유가 이것이고, 그래서 ±2 에서 19개 · ±3 에서 37개다.
 *
 * ## 무엇을 요구하는가
 *
 * 1. **통과 불가 0** — 어떤 빌드도 조작으로 만회할 수 없는 섹터를 만나서는 안 된다.
 * 2. **최소 여유 ≥ 50ms** — 통과 가능하지만 여유 3ms 인 것은 사람에게 통과 불가다.
 *    큐레이션의 공정성 하한과 같은 값이다.
 *
 * 진입 지점은 규격 입구(`CUFF`) 전체다 — 앞 섹터가 어디로든 넘겨줄 수 있으므로.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/sector-fairness.ts
 */
import { BASE_TUNING } from "../../app/src/game/engine";
import { CUFF_BOT, CUFF_TOP, SECTORS, SECTOR_TYPE_LABEL } from "../../app/src/game/sectors";
import { solvePiece } from "../../app/src/game/solver";
import type { Build, CoursePiece } from "../../app/src/game/types";

const SECTOR_LEN = 460;
const FLOOR_MS = 50;
const CAPS = [2, 3];

/** 세 축의 합이 0 인 조합만이 실제로 도달한다 — 게이트가 교환이기 때문이다. */
function reachableBuilds(cap: number): Build[] {
  const out: Build[] = [];
  for (let slope = -cap; slope <= cap; slope += 1) {
    for (let speed = -cap; speed <= cap; speed += 1) {
      const bias = -(slope + speed);
      if (Math.abs(bias) <= cap) out.push({ slope, speed, bias });
    }
  }
  return out;
}

const fmtBuild = (b: Build) => `각${b.slope >= 0 ? "+" : ""}${b.slope}/속${b.speed >= 0 ? "+" : ""}${b.speed}/편${b.bias >= 0 ? "+" : ""}${b.bias}`;

let failures = 0;
console.log(`섹터 ${SECTORS.length}개 × 도달 빌드(±2 ${reachableBuilds(2).length}개 · ±3 ${reachableBuilds(3).length}개)\n`);
console.log("섹터                  ±2 최소여유   ±3 최소여유   통과불가   가장 아슬아슬한 빌드");
console.log("-".repeat(88));

for (const sector of SECTORS) {
  const piece: CoursePiece = { kind: "sector", startX: 0, endX: SECTOR_LEN, sector };
  const perCap: number[] = [];
  let blocked = 0;
  let tightest: { build: Build; ms: number; cap: number } | null = null;

  for (const cap of CAPS) {
    const base = { ...BASE_TUNING, axisMax: cap, axisMin: -cap };
    let min = Number.POSITIVE_INFINITY;
    for (const build of reachableBuilds(cap)) {
      const res = solvePiece({
        piece, build, base,
        startSpans: [{ lo: CUFF_TOP + base.radius, hi: CUFF_BOT - base.radius }],
        startTime: 0, dt: 1 / 120
      });
      if (!res.passable) {
        blocked += 1;
        continue;
      }
      const ms = res.minSlackSec * 1000;
      if (ms < min) min = ms;
      if (!tightest || ms < tightest.ms) tightest = { build, ms, cap };
    }
    perCap.push(Number.isFinite(min) ? min : 0);
  }

  const worst = Math.min(...perCap);
  const bad = blocked > 0 || worst < FLOOR_MS;
  if (bad) failures += 1;
  console.log(
    `${(SECTOR_TYPE_LABEL[sector.type] + " " + sector.id).padEnd(22)}` +
      `${perCap[0].toFixed(0).padStart(7)}ms   ${perCap[1].toFixed(0).padStart(7)}ms   ` +
      `${String(blocked).padStart(6)}   ${tightest ? `${fmtBuild(tightest.build)} ±${tightest.cap}` : "-"}` +
      (bad ? "   ✗" : "")
  );
}

console.log();
if (failures > 0) {
  console.log(
    `실패 ${failures}개 — 통과 불가 빌드가 있거나 최소 여유가 ${FLOOR_MS}ms 미만이다.\n` +
      "섹터가 축을 **묻는 것**과 **막는 것**은 다르다. 램프·통로 폭·장애물 밀도 중 하나를 풀어야 한다."
  );
  process.exit(1);
}
console.log(`결과: 모든 섹터를 모든 도달 빌드로 통과할 수 있고, 최소 여유가 ${FLOOR_MS}ms 이상이다.`);
