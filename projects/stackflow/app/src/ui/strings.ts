// Central Korean UI copy + tooltip text (localization, spec §10).
// Every user-facing string routes through here; block/advantage/boss names and
// descriptions live in data (blocks.json, bosses.ts), also Korean. Number
// formatting uses the ko-KR locale.

const ko = (n: number) => n.toLocaleString("ko-KR");

export const T = {
  // ---- title ----
  eyebrow: "프로토타입 랩",
  tagline: "체인을 쌓고 터뜨려라. 바닥은 매 수마다 차오른다. 3막 · 30스테이지 · 타이머 없음.",
  start: "▶ 게임 시작",
  seedPlaceholder: "시드 (선택)",
  pedia: "📖 블록도감",
  settings: "⚙ 설정",
  bests: (b: { chain: number; clear: number; perfectClears: number; act: number; stage: number }) =>
    `최고 기록 — 체인 ${b.chain} · 단일 클리어 ${ko(b.clear)} · 퍼펙트 ${b.perfectClears} · ${b.act}막 (${b.stage}스테이지)`,
  titleHint:
    "시작 조각은 클래식 7종. 같은 색 4개 이상을 잇거나 한 줄을 채워 지워라. 체인 배수: ×1, ×2, ×4, ×7, ×11…",

  // ---- bank / press ----
  bossBroken: (name: string) => `💥 ${name} 격파!`,
  targetReached: "목표 달성!",
  stageReward: "스테이지 보상:",
  creditsUnit: (n: number) => `${n} 크레딧`,
  rewardDetail: (blocks: number, overkill: number) =>
    ` (기본급 + 블록 ${blocks}${overkill > 0 ? ` + 오버킬 ${overkill}` : ""})`,
  bank: "🏦 뱅크 — 정산하고 진행",
  press: "🔥 프레스 — 계속 쌓아 오버킬",
  bankPressHint:
    "프레스는 이득뿐 — 단, 바닥은 계속 차올라 탑아웃에 가까워진다. 뱅크는 항상 안전하다.",

  // ---- offer card ----
  kindBlock: "블록",
  kindAdvantage: "어드밴티지",
  take: "획득",
  buy: (price: number) => `구매 · ${price}c`,

  // ---- shop ----
  shopTitle: (stage: number) => `🛒 상점 — ${stage}스테이지 후`,
  creditsLine: (n: number) => `💰 ${n} 크레딧`,
  slotsFull: (max: number) => `어드밴티지 슬롯 가득 참 (${max}/${max}) — 새로 사면 첫 번째와 교체됩니다.`,
  soldOut: "품절!",
  reroll: (c: number) => `🎲 리롤 · ${c}c`,
  continueTo: (stage: number) => `계속 → ${stage}스테이지`,

  // ---- quick buy ----
  quickBuy: "⚡ 퀵바이",
  nothingOnOffer: "제안 없음.",
  creditsShort: (n: number) => `💰 ${n}c`,
  skipTo: (stage: number) => `건너뛰기 → ${stage}스테이지`,

  // ---- treasure ----
  treasureTitle: "🏆 트레저 — 하나를 무료로 선택",
  treasureSub: "액트 보스를 격파했다. 다음 막을 위해 엔진을 재정비하라.",

  // ---- run summary ----
  runComplete: "🎉 런 완료!",
  runOver: "런 종료",
  statBiggestChain: "최대 체인",
  best: " ★ 최고",
  statSingleClear: "최고 단일 클리어",
  statPerfects: "퍼펙트 클리어",
  reached: (act: number, stage: number) => `${act}막 · ${stage}`,
  statReached: "도달",
  statBlocks: "파괴한 블록",
  buildLine: (names: string) => `빌드: ${names}`,
  oneMore: "↻ 한 판 더 (R)",
  toTitle: "타이틀",

  // ---- blockipedia ----
  pediaTitle: "📖 블록도감",
  pediaSub: (n: number) => `여러 런에서 만난 모든 블록. ${n}종 발견.`,
  locked: "???",
  lockedDesc: "런에서 이 블록을 만나면 해금됩니다.",
  back: "뒤로",
  normalBlockName: "블록",
  normalBlockDesc: "기본 점수 블록. 한 줄을 채우거나 같은 색 4개 이상으로 지웁니다.",
  junkName: "정크",
  junkDesc: "보스가 주입하는 파괴 불가 잔해. 피해서 설계하라.",

  // ---- settings ----
  settingsTitle: "⚙ 설정",
  reduceMotion: "모션 줄이기 / 광과민 모드 (흔들림·번쩍임·단계 애니메이션 생략)",
  sound: "사운드",
  keys: "키 설정",
  pressKeyFor: (label: string) => `— “${label}” 키를 누르세요…`,
  resetKeys: "키 초기화",
  keyLabels: {
    left: "왼쪽 이동",
    right: "오른쪽 이동",
    down: "아래로",
    rotateCw: "시계방향 회전",
    rotateCw2: "시계방향 회전 (보조)",
    rotateCcw: "반시계 회전",
    rotate180: "180° 회전",
    lock: "드롭 & 고정",
    hold: "홀드",
  } as Record<string, string>,
  actBossLabel: "액트 보스",
  miniBossLabel: "미니보스",

  // ---- HUD ----
  actLabel: (act: number) => `${act}막`,
  stageWithin: (within: number) => `${within}스테이지/10`,
  globalStage: (n: number) => `(#${n})`,
  actBossPrefix: "⚔ 액트 보스 — ",
  miniBossPrefix: "☠ ",
  phase2: " · 페이즈 2",
  breakGauge: (pct: number) => `브레이크 ${pct}%`,
  pressing: (c: number) => `프레스 중 · 오버킬 +${c}c`,
  bankNow: "지금 뱅크",
  overdrive: "오버드라이브",
  overdriveActive: (n: number) => `×2 (${n}수 남음)`,
  next: "다음",
  hidden: "?? 가려짐 ??",
  holdSlot: "홀드 (C)",
  dash: "—",
  advantages: (n: number, max: number) => `어드밴티지 ${n}/${max}`,
  runBests: "런 최고",
  bestsLine: (chain: number, clear: number) => `체인 ${chain} · 클리어 ${ko(clear)}`,
  thisRun: (chain: number, perfects: number) => `이번 런: 체인 ${chain} · 퍼펙트 ${perfects}`,
  controlsHint: "←→↓ 이동 · ↑/X 시계 · Z 반시계 · A 180° · Space 드롭",
  score: (n: number) => ko(n),
  target: (n: number) => `/ ${ko(n)}`,

  // ---- board ----
  chain: (mult: string) => `체인 ×${mult}`,
  link: (n: number) => `링크 ${n}`,
  danger: "위험",

  // ---- combat banners (useGame) ----
  hugeChain: "거대 체인!",
  perfectClearBanner: "퍼펙트 클리어 ×4!",
  overdriveBanner: "오버드라이브!",
  insaneCombo: "미친 콤보!",
  newBestChain: "최고 체인 갱신!",
  scorePopup: (n: number) => `+${ko(n)}`,
};

/** Tooltip explanations for items/meters/buttons that carry no data `desc`. */
export const TIP = {
  start: "새 런을 시작합니다. 시드를 넣으면 같은 전개가 재현됩니다.",
  seed: "같은 시드 = 같은 조각·상점·보스 순서. 비우면 무작위.",
  pedia: "지금까지 만난 모든 블록을 모아 보는 도감.",
  settings: "모션 줄이기, 사운드, 키 재설정.",
  bests: "여러 런에 걸친 최고 기록.",
  stage: "현재 막과 스테이지. 3막 × 10스테이지 = 30.",
  score: "이 스테이지 목표 점수. 도달하면 뱅크할 수 있습니다.",
  progress: "목표 점수까지의 진행도.",
  overdrive: "체인으로 채워지고, 가득 차면 다음 몇 수의 점수가 ×2 — 수 기반, 타이머 아님.",
  credits: "블록 파괴와 스테이지 클리어로 얻어 상점에서 씁니다.",
  next: "다음에 나올 조각 미리보기.",
  hold: "현재 조각을 보관했다가 나중에 꺼냅니다 (스테이지당 1회).",
  advantages: "보유한 지속 효과. 활성 최대 5개.",
  breakGauge: "액트 보스의 내구도. 목표 점수를 쌓아 깎고, 60%에서 페이즈 2로 격화됩니다.",
  danger: "바닥이 상단에 근접했습니다. 한 줄만 더 차오르면 탑아웃될 수 있습니다.",
  bank: "보상을 정산하고 다음 스테이지로. 언제나 안전합니다.",
  press: "목표를 넘겨 계속 쌓으면 초과분이 보너스 크레딧이 됩니다. 단, 바닥은 계속 차올라 탑아웃 위험.",
  reroll: "상점 제안을 새로 뽑습니다. 뽑을수록 비용이 오릅니다.",
  controls: "이동·회전·드롭 조작키.",
  tide: "블록을 놓을 때마다 바닥에서 색 블록 한 줄이 차오릅니다. 줄·색 클리어로 밀어내세요.",
};
