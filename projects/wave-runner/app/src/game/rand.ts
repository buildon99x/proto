/**
 * 결정적 난수 하나만 두는 자리.
 *
 * 코스 조립(course)과 게이트 제안(axes)이 같은 난수를 쓰는데, 둘 사이에 의존을
 * 만들면 순환이 된다. 어디에도 기대지 않는 이 모듈이 그것을 끊는다.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
