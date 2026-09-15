/**
 * 시간 분할 섹터 공장.
 *
 * 생성 한 번은 후보 수십 개를 솔버에 돌리는 일이라 한 프레임에 끝낼 수 없다.
 * Performance Reliability 는 이 게임의 유일한 필수 Contract 이므로, 생성은
 * **프레임당 예산(기본 3ms)만큼만** 진행하고 나머지는 다음 프레임으로 넘긴다.
 * 예산 안에 못 끝내면 호출자는 사전 검증된 수제 섹터를 쓴다 — 늦는 것보다
 * 덜 다양한 편이 낫다.
 */
import { generateCandidates } from "./generate";
import type { Candidate, GenerateRequest } from "./generate";
import type { Sector } from "./types";

const DEFAULT_BUDGET_MS = 3;

export class SectorFactory {
  private job: Generator<Candidate | null, Candidate | null, void> | null = null;
  private ready: Sector[] = [];
  /** 진행 상황 관찰용 — 개발 패널과 검증이 읽는다 */
  stats = { produced: 0, fallbacks: 0, ticks: 0, lastMs: 0 };

  constructor(private readonly maxReady = 2) {}

  get busy(): boolean {
    return this.job !== null;
  }

  get readyCount(): number {
    return this.ready.length;
  }

  /** 대기열에 여유가 있고 노는 중이면 새 작업을 건다. */
  request(req: GenerateRequest): boolean {
    if (this.job || this.ready.length >= this.maxReady) return false;
    this.job = generateCandidates(req);
    return true;
  }

  /** 예산만큼만 후보를 평가한다. */
  tick(budgetMs = DEFAULT_BUDGET_MS): void {
    if (!this.job) return;
    const start = performance.now();
    this.stats.ticks += 1;
    for (;;) {
      const step = this.job.next();
      if (step.done) {
        const best = step.value;
        if (best) {
          this.ready.push(best.sector);
          this.stats.produced += 1;
        }
        this.job = null;
        break;
      }
      if (performance.now() - start >= budgetMs) break;
    }
    this.stats.lastMs = performance.now() - start;
  }

  /** 완성된 섹터를 하나 꺼낸다. 없으면 null — 호출자가 폴백을 쓴다. */
  take(): Sector | null {
    const s = this.ready.shift() ?? null;
    if (!s) this.stats.fallbacks += 1;
    return s;
  }
}
