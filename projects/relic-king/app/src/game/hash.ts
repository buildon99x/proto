/**
 * 표준 32비트 FNV-1a 해시. 절차 생성 전역에서 재사용한다 — 유물 스프라이트 시드와
 * 같은 패턴으로, 거점 시세(§8.2)·스텝 후보 스탯(staff.md §4)이 이 하나의 해시로
 * 결정론적 값을 뽑는다. 새 절차 생성 방식을 만들지 않는다(notes/world-map.md §8.2).
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 해시를 [0,1) 구간으로 정규화한다 */
export function hashFrac(input: string): number {
  return fnv1a32(input) / 4294967296;
}
