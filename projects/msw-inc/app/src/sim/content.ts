/*
 * MSW 주식회사 — 콘텐츠 표 (03-systems.md §5·§6·§7)
 *
 * 몬스터 이름 가운데 "(가칭)"이 붙은 것은 메이플스토리 월드 공식 리소스 목록과 대조해 확정한다.
 * 이름은 notes/content.md에 출처와 함께 적어 둔다.
 */

export type TraitId = 'fast' | 'gift' | 'strong';
export type SpeciesId =
  | 'snail' | 'mush' | 'pig' | 'octo' | 'slime' | 'fairy' | 'necki' | 'lupin' | 'stump' | 'boar'
  | 'ligator' | 'stirge' | 'drake' | 'eye' | 'balrog';

export interface Species {
  names: string[];
  art: string[];
  base: number;
  trait: TraitId | null;
  /** 마지막 단계가 보스인가 (보스는 던전에 한 마리만) */
  boss: boolean;
  /** 이 챕터부터 채용할 수 있다. 0이면 채용할 수 없다(스토리 합류) */
  chapter: number;
  /** 도감 줄에 쓰는 한 줄 설명 */
  note?: string;
  /** 사는 지역 (도감 줄, 결재 선물). 없으면 chapter와 같다 */
  region?: number;
  /** v1.5 계열 사다리 (헤네시스·엘리니아 +2종씩). 규칙 moreSpecies가 켜져 있을 때만 쓴다 */
  extra?: boolean;
}

export const SPECIES: Record<SpeciesId, Species> = {
  snail: { names: ['달팽이', '파란 달팽이', '빨간 달팽이', '마노'], art: ['snail', 'bsnail', 'rsnail', 'mano'], base: 2, trait: 'fast', boss: true, chapter: 1 },
  mush: { names: ['주황버섯', '뿔버섯', '좀비버섯'], art: ['mush', 'horn', 'zombie'], base: 8, trait: null, boss: false, chapter: 1, note: '보스 없음 — 그 자리는 사장님 자리입니다' },
  // v1.5 계열 사다리: 1장(튜토리얼)은 두 계열로 가르치고, 1장 결재 뒤 헤네시스 식구 둘이 더 지원한다
  pig: { names: ['돼지', '리본돼지', '아이언호그'], art: ['pig', 'rpig', 'ihog'], base: 5, trait: 'gift', boss: false, chapter: 2, region: 1, extra: true },
  octo: { names: ['옥토퍼스', '빅 옥토퍼스', '킹 옥토퍼스'], art: ['octo', 'bocto', 'kocto'], base: 12, trait: 'strong', boss: false, chapter: 2, region: 1, extra: true },
  slime: { names: ['슬라임', '버블 슬라임', '퍼플 슬라임', '킹 슬라임'], art: ['slime', 'slime2', 'slime3', 'kslime'], base: 15, trait: 'gift', boss: true, chapter: 2 },
  fairy: { names: ['초록버섯', '이끼버섯', '숲지기버섯'], art: ['gmush', 'moss', 'keeper'], base: 20, trait: null, boss: false, chapter: 2 },
  necki: { names: ['주니어 네키', '네키', '킹 네키'], art: ['necki', 'necki2', 'kneck'], base: 18, trait: 'strong', boss: false, chapter: 2, extra: true },
  lupin: { names: ['루팡', '좀비 루팡', '골드 루팡'], art: ['lupin', 'zlupin', 'glupin'], base: 24, trait: 'fast', boss: false, chapter: 2, extra: true },
  stump: { names: ['스텀프', '다크 스텀프', '액스 스텀프', '스텀피'], art: ['stump', 'dstump', 'astump', 'stumpy'], base: 28, trait: 'strong', boss: true, chapter: 3 },
  boar: { names: ['와일드보어', '파이어보어', '아이언보어'], art: ['boar', 'fboar', 'iboar'], base: 34, trait: null, boss: false, chapter: 3 },
  ligator: { names: ['리게이터', '크로코', '골드 크로코', '킹 크로코'], art: ['ligator', 'croco', 'gcroco', 'kcroco'], base: 42, trait: 'fast', boss: true, chapter: 4 },
  stirge: { names: ['스티지', '다크 스티지', '블러드 스티지'], art: ['stirge', 'dstirge', 'bstirge'], base: 48, trait: 'gift', boss: false, chapter: 4 },
  drake: { names: ['드레이크', '레드 드레이크', '아이스 드레이크', '다크 드레이크'], art: ['drake', 'rdrake', 'idrake', 'ddrake'], base: 55, trait: 'strong', boss: true, chapter: 5 },
  eye: { names: ['이블아이', '커스아이', '콜드아이'], art: ['eye', 'ceye', 'coldeye'], base: 60, trait: null, boss: false, chapter: 5 },
  balrog: { names: ['주니어 발록'], art: ['balrog'], base: 70, trait: null, boss: true, chapter: 0, note: '입사 지원서로 합류한 유일한 직원' },
};
export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

export const TRAITS: Record<TraitId, { icon: string; name: string; desc: string }> = {
  fast: { icon: '⏩', name: '빨리 큰다', desc: '근속 ×1.5' },
  gift: { icon: '🎁', name: '잘 퍼준다', desc: '던전 스마일 ×1.3' },
  strong: { icon: '💪', name: '튼튼하다', desc: '던전 레벨업 ×1.2' },
};

export interface Chapter { n: number; region: string; road: number; happy: number; say: string }
export const CHAPTERS: Chapter[] = [
  // say는 결재 조건(v1.3)을 말한다. 숫자는 막대가 말한다. happy는 v1.1 비교용(동시 인원)이라 그대로 둔다
  { n: 1, region: '헤네시스', road: 15, happy: 20, say: 'Lv 15까지 잇고, 즐거운 시간이 쌓이면. 그럼 결재.' },
  { n: 2, region: '엘리니아', road: 30, happy: 60, say: 'Lv 30까지 이어요. 즐거운 시간은 막대가 셉니다. 그럼 결재.' },
  { n: 3, region: '페리온', road: 45, happy: 110, say: 'Lv 45까지. 손님들이 즐긴 시간이 차면. 그럼 결재.' },
  { n: 4, region: '커닝시티', road: 60, happy: 160, say: 'Lv 60까지. 사람이 많아지겠네요. 시간이 차면, 결재는 그다음.' },
  { n: 5, region: '슬리피우드', road: 70, happy: 220, say: '끝까지 이어요. 발록 씨 던전도 열고, 슬리피우드 식구도 한 명. 그럼 마지막 결재.' },
];

export interface Region { n: number; name: string; from: number; to: number }
export const REGIONS: Region[] = [
  { n: 1, name: '헤네시스', from: 0, to: 15 },
  { n: 2, name: '엘리니아', from: 15, to: 30 },
  { n: 3, name: '페리온', from: 30, to: 45 },
  { n: 4, name: '커닝시티', from: 45, to: 60 },
  { n: 5, name: '슬리피우드', from: 60, to: 75 },
];

export type PlotId = string;
/**
 * 사냥터 (부지). extra: v1.4 초반 사냥터 (헤네시스·엘리니아 +2곳씩). 규칙 morePlots가 켜져 있을 때만 쓴다.
 * v1.7 사냥터 값 (규칙 grounds가 켜져 있을 때만): seats = 기본 자리(첫 40분이 걸린 헤네시스·엘리니아는 12 그대로, 3장부터 8 · 12 · 16. 지역 합은 12 × 부지 수 그대로), home = 이 사냥터의 식구(근속 ×1.2).
 * tiers = 던전 현장의 발판 수(표현). 자리는 "어느 부지를 열까", 식구는 "어디에 둘까"에 쓰인다(P4). 지역별 규칙은 없다.
 */
export interface PlotInfo { id: PlotId; name: string; short: string; region: number; extra?: boolean; seats: number; tiers: 1 | 2 | 3; home: SpeciesId[] }
export const PLOTS: PlotInfo[] = [
  { id: 'h1', name: '헤네시스 들판', short: '들판', region: 1, seats: 12, tiers: 2, home: ['snail'] },
  { id: 'h2', name: '헤네시스 사냥터', short: '사냥터', region: 1, seats: 12, tiers: 2, home: ['mush'] },
  { id: 'h3', name: '버섯 언덕', short: '버섯 언덕', region: 1, seats: 12, tiers: 2, home: ['mush'] },
  { id: 'h4', name: '돼지의 해안', short: '해안', region: 1, extra: true, seats: 12, tiers: 3, home: ['pig', 'octo'] },
  { id: 'h5', name: '달팽이 언덕', short: '달팽이 언덕', region: 1, extra: true, seats: 12, tiers: 1, home: ['snail'] },
  { id: 'e1', name: '숲 입구', short: '숲 입구', region: 2, seats: 12, tiers: 2, home: ['slime'] },
  { id: 'e2', name: '나무 위 쉼터', short: '쉼터', region: 2, seats: 12, tiers: 2, home: ['lupin'] },
  { id: 'e3', name: '마법 숲', short: '마법 숲', region: 2, seats: 12, tiers: 3, home: ['fairy', 'slime'] },
  { id: 'e4', name: '버섯 동굴', short: '동굴', region: 2, extra: true, seats: 12, tiers: 2, home: ['fairy'] },
  { id: 'e5', name: '요정 샘터', short: '샘터', region: 2, extra: true, seats: 12, tiers: 1, home: ['necki'] },
  { id: 'p1', name: '바위 언덕', short: '바위 언덕', region: 3, seats: 16, tiers: 3, home: ['stump'] },
  { id: 'p2', name: '불타는 땅', short: '불타는 땅', region: 3, seats: 8, tiers: 1, home: ['boar'] },
  { id: 'p3', name: '전사의 길', short: '전사의 길', region: 3, seats: 12, tiers: 2, home: ['stump', 'boar'] },
  { id: 'k1', name: '지하철 입구', short: '지하철', region: 4, seats: 12, tiers: 2, home: ['stirge'] },
  { id: 'k2', name: '공사장', short: '공사장', region: 4, seats: 16, tiers: 3, home: ['ligator', 'stirge'] },
  { id: 'k3', name: '늪지', short: '늪지', region: 4, seats: 8, tiers: 1, home: ['ligator'] },
  { id: 's1', name: '잠든 숲', short: '잠든 숲', region: 5, seats: 12, tiers: 2, home: ['eye'] },
  { id: 's2', name: '개미굴', short: '개미굴', region: 5, seats: 16, tiers: 3, home: ['drake'] },
  { id: 's3', name: '저주받은 신전', short: '신전', region: 5, seats: 8, tiers: 1, home: ['eye', 'drake'] },
];
/** 이 계열의 식구 사냥터 (v1.7) */
export const homesOf = (sp: SpeciesId) => PLOTS.filter(p => p.home.includes(sp));
export const plotInfo = (id: PlotId): PlotInfo => {
  const p = PLOTS.find(x => x.id === id);
  if (!p) throw new Error('unknown plot ' + id);
  return p;
};

/**
 * 필드 보스 (v1.3) — 직원이 아니라 장마다 한 번 찾아오는 손님이다. 던전 레벨에 들지 않는다(P2).
 * 이름은 가칭이다. notes/content.md 절차대로 메이플스토리 월드 공식 목록과 대조해 확정한다.
 */
export interface FieldBoss { ch: number; name: string; art: string; lv: number; line: string }
/* 이름 확정 상태(v1.7)는 notes/content.md. 파우스트·다일·스톤 골렘은 원작 지역 보스 이름, 개미굴 왕은 가칭 */
export const FIELD_BOSSES: FieldBoss[] = [
  { ch: 2, name: '파우스트', art: 'faust', lv: 22, line: '…숲이 시끄럽군. 한번 놀아 볼까.' },
  { ch: 3, name: '스톤 골렘', art: 'golem', lv: 38, line: '…쿵. 쿵. 덤벼라.' },
  { ch: 4, name: '다일', art: 'dyle', lv: 52, line: '…늪에서 왔다. 오래 못 있는다.' },
  { ch: 5, name: '개미굴 왕', art: 'antking', lv: 65, line: '…굴 밖은 처음이다.' },
];
export const fieldBoss = (ch: number) => FIELD_BOSSES.find(b => b.ch === ch) || null;
export const bossDexKey = (ch: number) => 'fb:' + ch;

/* 도감 전체 칸 수는 규칙에 따라 다르다(계열 사다리): sim.ts dexTotal() */
