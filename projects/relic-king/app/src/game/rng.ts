/** mulberry32 — 결정론 PRNG. 세이브에 상태(uint32)만 넣으면 재현된다. */
export function nextRandom(state: number): [number, number] {
  let a = (state + 0x6d2b79f5) | 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, a >>> 0];
}

/** 상태를 들고 다니는 얇은 래퍼. 엔진 스텝 안에서만 쓴다. */
export class Rng {
  constructor(public state: number) {}

  next(): number {
    const [value, next] = nextRandom(this.state);
    this.state = next;
    return value;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, maxExclusive: number): number {
    return min + Math.floor(this.next() * (maxExclusive - min));
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
