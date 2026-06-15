// 게임 데이터 — 드래곤, 난이도, 스테이지, 업글. 디자인 문서(docs/design/*)와 1:1.

import type { DragonDef, DifficultyDef, StageDef, UpgradeDef } from "./types";

export const MAX_POWER = 5;

export const DRAGONS: DragonDef[] = [
  {
    id: "ignis",
    name: "화룡 이그니스",
    title: "밸런스 · 입문 표준",
    color: 0xff7a3c,
    speed: 4.0,
    shotCount: 5,
    shotSpread: 36,
    shotPower: 1.0,
    laserDps: 26,
    homing: false,
    closeKillBonus: 0,
    unlockCost: 0,
    unlockNote: "",
    blurb: "넓은 비늘 산탄과 강한 용염 빔. 첫 플레이 권장."
  },
  {
    id: "glacies",
    name: "빙룡 글라키에스",
    title: "고화력 · 저속 · 정밀",
    color: 0x57c8ff,
    speed: 2.9,
    shotCount: 3,
    shotSpread: 16,
    shotPower: 1.7,
    laserDps: 40,
    homing: false,
    closeKillBonus: 0,
    unlockCost: 300,
    unlockNote: "",
    blurb: "좁고 강한 집중 산탄과 최강 빔. 보스 버스트·정밀 스코어용."
  },
  {
    id: "phobos",
    name: "뇌룡 포보스",
    title: "고기동 · 유도 · 연환 유지",
    color: 0xc89bff,
    speed: 5.1,
    shotCount: 4,
    shotSpread: 24,
    shotPower: 0.8,
    laserDps: 16,
    homing: true,
    closeKillBonus: 0,
    unlockCost: 300,
    unlockNote: "",
    blurb: "유도 비늘로 연환 유지 최강. 회피·기동 특화, 보스 화력은 약점."
  },
  {
    id: "nox",
    name: "암흑룡 녹스",
    title: "하이리스크 · 스코어러",
    color: 0x9a4dff,
    speed: 4.0,
    shotCount: 5,
    shotSpread: 30,
    shotPower: 1.0,
    laserDps: 30,
    homing: false,
    closeKillBonus: 5,
    unlockCost: 1200,
    unlockNote: "1주차 클리어 1회 필요",
    blurb: "근접 격파 시 연환 배수 가산. 잔기·봄 축소, 점수 상한 해방."
  }
];

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "novice",
    name: "Novice",
    note: "오토봄 · 저밀도 · 입문",
    bulletSpeedMul: 0.78,
    fireRateMul: 0.65,
    chainCap: 6,
    scoreMul: 0.8,
    autoBomb: true,
    unlockNote: ""
  },
  {
    id: "original",
    name: "Original",
    note: "표준 밀도",
    bulletSpeedMul: 1.0,
    fireRateMul: 1.0,
    chainCap: 8,
    scoreMul: 1.0,
    autoBomb: false,
    unlockNote: ""
  },
  {
    id: "maniac",
    name: "Maniac",
    note: "고밀도",
    bulletSpeedMul: 1.22,
    fireRateMul: 1.4,
    chainCap: 12,
    scoreMul: 1.4,
    autoBomb: false,
    unlockNote: "Original 1주차 클리어로 해금"
  },
  {
    id: "ultra",
    name: "Ultra",
    note: "초고밀도 · 심연",
    bulletSpeedMul: 1.45,
    fireRateMul: 1.7,
    chainCap: 99,
    scoreMul: 1.9,
    autoBomb: false,
    unlockNote: "Maniac 노컨티뉴 클리어로 해금"
  }
];

export const STAGES: StageDef[] = [
  {
    index: 0,
    name: "폐허 성채 상공",
    stage: "STAGE 1",
    bgTop: 0x2a1d3a,
    bgBottom: 0x140a24,
    enemyHp: 3,
    enemyScore: 100,
    bulletSpeed: 2.2,
    waveCount: 5,
    bossHp: 600,
    bossName: "석룡 가르고",
    bossIntensity: 1
  },
  {
    index: 1,
    name: "화산 협곡",
    stage: "STAGE 2",
    bgTop: 0x3a1410,
    bgBottom: 0x200806,
    enemyHp: 4,
    enemyScore: 130,
    bulletSpeed: 2.5,
    waveCount: 6,
    bossHp: 850,
    bossName: "염룡 이프리타",
    bossIntensity: 2
  },
  {
    index: 2,
    name: "결빙 빙벽",
    stage: "STAGE 3",
    bgTop: 0x10283a,
    bgBottom: 0x06141f,
    enemyHp: 5,
    enemyScore: 160,
    bulletSpeed: 2.7,
    waveCount: 6,
    bossHp: 1100,
    bossName: "빙룡 코퀴토스",
    bossIntensity: 3
  },
  {
    index: 3,
    name: "폭풍 뇌운",
    stage: "STAGE 4",
    bgTop: 0x161a3a,
    bgBottom: 0x080a1f,
    enemyHp: 6,
    enemyScore: 190,
    bulletSpeed: 3.0,
    waveCount: 7,
    bossHp: 1400,
    bossName: "뇌룡 켈라이노",
    bossIntensity: 4
  },
  {
    index: 4,
    name: "마룡 공중요새",
    stage: "STAGE 5",
    bgTop: 0x231a2e,
    bgBottom: 0x100a18,
    enemyHp: 7,
    enemyScore: 220,
    bulletSpeed: 3.2,
    waveCount: 7,
    bossHp: 1750,
    bossName: "강철룡 모르도스",
    bossIntensity: 5
  },
  {
    index: 5,
    name: "마룡왕의 옥좌",
    stage: "STAGE 6",
    bgTop: 0x2e0f1a,
    bgBottom: 0x16060d,
    enemyHp: 9,
    enemyScore: 260,
    bulletSpeed: 3.4,
    waveCount: 8,
    bossHp: 2400,
    bossName: "마룡왕 바하무트",
    bossIntensity: 6
  }
];

export const UPGRADES: UpgradeDef[] = [
  { id: "startLives", name: "시작 잔기", effect: "시작 잔기 +1 (최대 +2)", costs: [250, 600] },
  { id: "bombs", name: "봄 소지수", effect: "봄 시작 재고 +1 (최대 +2)", costs: [200, 500] },
  { id: "awaken", name: "각성 효율", effect: "각성 충전 속도 +12% (최대 +36%)", costs: [150, 300, 500] },
  { id: "options", name: "옵션(비룡)", effect: "보조 화력 +1 (최대 +2)", costs: [400, 900] }
];

export function getDragon(id: string): DragonDef {
  return DRAGONS.find((d) => d.id === id) ?? DRAGONS[0];
}

export function getDifficulty(id: string): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}
