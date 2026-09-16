/**
 * 여백 렌더의 프레임 예산과 품질 강등.
 *
 * factory.ts 가 생성에 쓰는 예산 패턴과 같은 태도다 — 60fps 가 흔들리면 게임이
 * 재미없어지는 게 아니라 성립하지 않으므로, 여백은 예산 안에서만 존재한다.
 *
 * **버리는 순서가 곧 우선순위 선언이다.** 장식(게시물)을 먼저 버리고
 * 정보(질감)를 마지막에 버린다.
 *
 * 설계 근거: docs/design/margin-texture.md §5
 */

/**
 * 0 게시물 + 질감 + 격자 + 이정표   (기본)
 * 1 질감 + 격자 + 이정표            여백 p99 > 1.5ms 가 2초 지속
 * 2 질감(크로스페이드 생략)          여백 p99 > 2.0ms
 * 3 단색 — 0.4.0 렌더 그대로         여백 p99 > 2.5ms 또는 전체 프레임 p99 > 17.5ms
 *
 * M1 에는 게시물·격자·이정표가 아직 없으므로 0 과 1 의 화면은 같다.
 */
export type MarginTier = 0 | 1 | 2 | 3;

const WINDOW = 120;
const TIER1_MS = 1.5;
const TIER2_MS = 2.0;
const TIER3_MS = 2.5;
/**
 * 전체 프레임의 백스톱.
 *
 * 0.4.0 의 실측 프레임 p99 가 **정확히 17.5ms** 다. 그 값을 방아쇠로 쓰면 여백이
 * 공짜여도 첫 판정에서 바로 단 3 으로 떨어진다 — 목표치와 방아쇠는 같은 값일 수
 * 없다. 60Hz 에서 vsync 를 놓치기 시작하는 20ms 를 방아쇠로 쓴다. 여백 자신의
 * 비용은 marginP99 가 이미 1.5ms 로 정밀하게 잡고 있으므로 이쪽은 백스톱이면 된다.
 */
const FRAME_MS = 20;
const TIER1_SUSTAIN_MS = 2000;
/** p99 를 매 프레임 정렬하는 것이야말로 예산을 먹는 일이다 */
const RECHECK_EVERY = 20;

/** 고정 크기 링 버퍼. 매 프레임 배열을 늘렸다 줄이지 않는다 */
class Ring {
  private buf: number[] = [];
  private at = 0;

  push(v: number): void {
    if (this.buf.length < WINDOW) this.buf.push(v);
    else {
      this.buf[this.at] = v;
      this.at = (this.at + 1) % WINDOW;
    }
  }

  clear(): void {
    this.buf = [];
    this.at = 0;
  }

  p99(): number {
    if (this.buf.length === 0) return 0;
    const sorted = [...this.buf].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
  }
}

export class MarginBudget {
  private readonly margin = new Ring();
  private readonly frame = new Ring();
  private frames = 0;
  private startedAt = 0;
  private lastFrameAt = 0;
  private overSince: number | null = null;
  private current: MarginTier = 0;
  /** 관찰용 — 개발 패널과 검증이 읽는다 */
  stats = { marginP99: 0, frameP99: 0, tier: 0 as MarginTier };

  get tier(): MarginTier {
    return this.current;
  }

  /** 런이 끝나야 복구한다. 런 중에 화면이 바뀌면 "running 중 새 정보 없음"이 깨진다 */
  reset(): void {
    this.margin.clear();
    this.frame.clear();
    this.frames = 0;
    this.overSince = null;
    this.current = 0;
    this.lastFrameAt = 0;
    this.stats = { marginP99: 0, frameP99: 0, tier: 0 };
  }

  begin(now: number): void {
    if (this.lastFrameAt > 0) {
      const dt = now - this.lastFrameAt;
      // 탭 전환·첫 프레임 같은 이상치는 예산 판정에서 뺀다. 1초 넘게 끊겼으면
      // 창이 가려져 있던 것이므로 낡은 표본으로 강등하지 않도록 통째로 버린다.
      if (dt >= 1000) {
        this.margin.clear();
        this.frame.clear();
        this.overSince = null;
      } else if (dt < 200) {
        this.frame.push(dt);
      }
    }
    this.lastFrameAt = now;
    this.startedAt = now;
  }

  end(now: number): void {
    this.margin.push(now - this.startedAt);
    this.frames += 1;
    if (this.frames % RECHECK_EVERY === 0) this.evaluate(now);
  }

  private evaluate(now: number): void {
    const m = this.margin.p99();
    const f = this.frame.p99();
    this.stats.marginP99 = m;
    this.stats.frameP99 = f;

    let next = this.current;
    if (m > TIER3_MS || f > FRAME_MS) next = 3;
    else if (m > TIER2_MS) next = 2;
    else if (m > TIER1_MS) {
      if (this.overSince === null) this.overSince = now;
      if (now - this.overSince >= TIER1_SUSTAIN_MS) next = 1;
    } else {
      this.overSince = null;
    }

    // 강등은 한 방향으로만 일어난다
    if (next > this.current) this.current = next;
    this.stats.tier = this.current;
  }
}
