import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Rarity = "Common" | "Rare" | "Epic" | "Legendary";
type Quality = "D" | "C" | "B" | "A" | "S";
type ElementType = "무속성" | "불꽃" | "얼음" | "번개" | "독" | "신성";
type MaterialKey = "iron" | "ember" | "crystal" | "relic";

type Weapon = {
  id: number;
  kind: string;
  rarity: Rarity;
  quality: Quality;
  element: ElementType;
  enhanceLevel: number;
  value: number;
  materialValue: Partial<Record<MaterialKey, number>>;
};

type UpgradeKey =
  | "hammer"
  | "bench"
  | "furnace"
  | "staff"
  | "merchant"
  | "salvage"
  | "enhance";

type Upgrade = {
  key: UpgradeKey;
  name: string;
  description: string;
  baseCost: number;
  costScale: number;
};

type FloatingText = {
  id: number;
  text: string;
  tone: "gold" | "material" | "rare" | "craft";
};

const weaponKinds = ["검", "도끼", "창", "단검", "활", "지팡이", "망치", "방패"];
const rarities: Rarity[] = ["Common", "Rare", "Epic", "Legendary"];
const qualities: Quality[] = ["D", "C", "B", "A", "S"];
const elements: ElementType[] = ["무속성", "불꽃", "얼음", "번개", "독", "신성"];

const rarityWeights: Record<Rarity, number> = {
  Common: 70,
  Rare: 21,
  Epic: 7,
  Legendary: 2
};

const rarityValue: Record<Rarity, number> = {
  Common: 1,
  Rare: 2.2,
  Epic: 4.5,
  Legendary: 9
};

const qualityValue: Record<Quality, number> = {
  D: 0.75,
  C: 1,
  B: 1.35,
  A: 1.9,
  S: 2.8
};

const materialLabels: Record<MaterialKey, string> = {
  iron: "철광석",
  ember: "화염석",
  crystal: "마력 결정",
  relic: "고대 파편"
};

const upgrades: Upgrade[] = [
  {
    key: "hammer",
    name: "망치 강화",
    description: "클릭당 제작 진행도 증가",
    baseCost: 70,
    costScale: 1.55
  },
  {
    key: "bench",
    name: "제작대 확장",
    description: "제작 목표치 감소, 상위 품질 보정",
    baseCost: 110,
    costScale: 1.6
  },
  {
    key: "furnace",
    name: "화로 강화",
    description: "희귀 등급 확률 증가",
    baseCost: 150,
    costScale: 1.68
  },
  {
    key: "staff",
    name: "직원 고용",
    description: "초당 자동 제작 진행도 증가",
    baseCost: 130,
    costScale: 1.7
  },
  {
    key: "merchant",
    name: "상인 계약",
    description: "판매 가격 증가",
    baseCost: 160,
    costScale: 1.62
  },
  {
    key: "salvage",
    name: "분해 기술",
    description: "분해 재료 획득량 증가",
    baseCost: 120,
    costScale: 1.58
  },
  {
    key: "enhance",
    name: "강화 기술",
    description: "강화 비용 감소",
    baseCost: 180,
    costScale: 1.65
  }
];

const initialLevels: Record<UpgradeKey, number> = {
  hammer: 0,
  bench: 0,
  furnace: 0,
  staff: 0,
  merchant: 0,
  salvage: 0,
  enhance: 0
};

const initialMaterials: Record<MaterialKey, number> = {
  iron: 0,
  ember: 0,
  crystal: 0,
  relic: 0
};

function pickWeightedRarity(furnaceLevel: number): Rarity {
  const boosted = {
    Common: Math.max(32, rarityWeights.Common - furnaceLevel * 5),
    Rare: rarityWeights.Rare + furnaceLevel * 2.6,
    Epic: rarityWeights.Epic + furnaceLevel * 1.6,
    Legendary: rarityWeights.Legendary + furnaceLevel * 0.8
  };
  const total = Object.values(boosted).reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;

  for (const rarity of rarities) {
    roll -= boosted[rarity];
    if (roll <= 0) return rarity;
  }

  return "Common";
}

function pickQuality(benchLevel: number): Quality {
  const roll = Math.random() + benchLevel * 0.035;
  if (roll > 0.96) return "S";
  if (roll > 0.82) return "A";
  if (roll > 0.58) return "B";
  if (roll > 0.28) return "C";
  return "D";
}

function generateWeapon(id: number, levels: Record<UpgradeKey, number>): Weapon {
  const rarity = pickWeightedRarity(levels.furnace);
  const quality = pickQuality(levels.bench);
  const kind = weaponKinds[Math.floor(Math.random() * weaponKinds.length)];
  const element = elements[Math.floor(Math.random() * elements.length)];
  const elementBonus = element === "무속성" ? 1 : 1.18;
  const base = 34 + Math.floor(Math.random() * 32);
  const value = Math.floor(base * rarityValue[rarity] * qualityValue[quality] * elementBonus);
  const rareBonus = rarity === "Legendary" ? 3 : rarity === "Epic" ? 2 : rarity === "Rare" ? 1 : 0;

  return {
    id,
    kind,
    rarity,
    quality,
    element,
    enhanceLevel: 0,
    value,
    materialValue: {
      iron: 2 + rareBonus + Math.floor(Math.random() * 3),
      ember: element === "불꽃" ? 2 + rareBonus : rareBonus,
      crystal: rarity === "Epic" || rarity === "Legendary" ? 1 + rareBonus : quality === "S" ? 1 : 0,
      relic: rarity === "Legendary" ? 1 : 0
    }
  };
}

function upgradeCost(upgrade: Upgrade, level: number) {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, level));
}

function enhanceCost(weapon: Weapon, enhanceLevel: number) {
  const multiplier = 1 + enhanceLevel * 0.62 + rarityValue[weapon.rarity] * 0.2;
  return {
    gold: Math.floor(45 * multiplier),
    iron: Math.ceil(2 + enhanceLevel * 1.5),
    ember: weapon.element === "불꽃" ? 2 : enhanceLevel > 1 ? 1 : 0,
    crystal: weapon.rarity === "Epic" || weapon.rarity === "Legendary" || enhanceLevel > 2 ? 1 : 0,
    relic: weapon.rarity === "Legendary" && enhanceLevel > 1 ? 1 : 0
  };
}

function weaponLabel(weapon: Weapon) {
  return `${weapon.element} ${weapon.quality}급 ${weapon.kind} +${weapon.enhanceLevel}`;
}

function materialSummary(materials: Partial<Record<MaterialKey, number>>) {
  return (Object.entries(materials) as [MaterialKey, number][])
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${materialLabels[key]} +${value}`)
    .join(", ");
}

export default function App() {
  const [gold, setGold] = useState(120);
  const [materials, setMaterials] = useState<Record<MaterialKey, number>>(initialMaterials);
  const [levels, setLevels] = useState<Record<UpgradeKey, number>>(initialLevels);
  const [progress, setProgress] = useState(0);
  const [weaponCounter, setWeaponCounter] = useState(1);
  const [completedWeapon, setCompletedWeapon] = useState<Weapon | null>(null);
  const [storedWeapons, setStoredWeapons] = useState<Weapon[]>([]);
  const [logs, setLogs] = useState<string[]>(["첫 주문이 들어왔습니다. 중앙 모루를 두드려 제작을 시작하세요."]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [strikeCount, setStrikeCount] = useState(0);
  const [completionFlash, setCompletionFlash] = useState(false);

  const targetProgress = Math.max(68, 100 - levels.bench * 5);
  const clickPower = 7 + levels.hammer * 2.4;
  const autoPower = levels.staff * 1.15;
  const sellMultiplier = 1 + levels.merchant * 0.16;
  const salvageMultiplier = 1 + levels.salvage * 0.22;
  const enhanceDiscount = Math.max(0.55, 1 - levels.enhance * 0.06);

  const progressPercent = Math.min(100, (progress / targetProgress) * 100);
  const heatLevel = Math.min(1, progressPercent / 100);

  const collectionStats = useMemo(() => {
    const legendary = storedWeapons.filter((weapon) => weapon.rarity === "Legendary").length;
    const best = storedWeapons.reduce((max, weapon) => Math.max(max, weapon.value), 0);
    return { legendary, best };
  }, [storedWeapons]);

  useEffect(() => {
    if (autoPower <= 0 || completedWeapon) return;
    const timer = window.setInterval(() => {
      advanceCraft(autoPower, "craft", "직원 +");
    }, 1000);

    return () => window.clearInterval(timer);
  }, [autoPower, completedWeapon, progress, targetProgress, weaponCounter, levels]);

  useEffect(() => {
    if (!completionFlash) return;
    const timer = window.setTimeout(() => setCompletionFlash(false), 800);
    return () => window.clearTimeout(timer);
  }, [completionFlash]);

  function addLog(message: string) {
    setLogs((current) => [message, ...current].slice(0, 7));
  }

  function addFloatingText(text: string, tone: FloatingText["tone"]) {
    const id = Date.now() + Math.random();
    setFloatingTexts((current) => [...current, { id, text, tone }]);
    window.setTimeout(() => {
      setFloatingTexts((current) => current.filter((item) => item.id !== id));
    }, 900);
  }

  function completeCraft(nextWeaponId: number) {
    const weapon = generateWeapon(nextWeaponId, levels);
    setCompletedWeapon(weapon);
    setWeaponCounter((value) => value + 1);
    setProgress(0);
    setCompletionFlash(true);
    addLog(`${weapon.rarity} ${weaponLabel(weapon)} 완성. 선택을 기다립니다.`);
    addFloatingText(weapon.rarity === "Common" ? "완성!" : `${weapon.rarity}!`, weapon.rarity === "Common" ? "craft" : "rare");
  }

  function advanceCraft(amount: number, tone: FloatingText["tone"], label: string) {
    if (completedWeapon) return;
    setProgress((current) => {
      const next = current + amount;
      if (next >= targetProgress) {
        completeCraft(weaponCounter);
        return 0;
      }
      return next;
    });
    addFloatingText(`${label}${amount.toFixed(amount >= 10 ? 0 : 1)}%`, tone);
  }

  function handleStrike() {
    setStrikeCount((value) => value + 1);
    advanceCraft(clickPower, "craft", "망치 ");
  }

  function sellWeapon(weapon: Weapon) {
    const amount = Math.floor(weapon.value * sellMultiplier * (1 + weapon.enhanceLevel * 0.22));
    setGold((value) => value + amount);
    setCompletedWeapon(null);
    addLog(`${weaponLabel(weapon)} 판매: 골드 +${amount}`);
    addFloatingText(`+${amount}G`, "gold");
  }

  function salvageWeapon(weapon: Weapon) {
    const gained = Object.fromEntries(
      (Object.entries(weapon.materialValue) as [MaterialKey, number][])
        .filter(([, value]) => value > 0)
        .map(([key, value]) => [key, Math.ceil(value * salvageMultiplier)])
    ) as Partial<Record<MaterialKey, number>>;

    setMaterials((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(gained) as [MaterialKey, number][]) {
        next[key] += value;
      }
      return next;
    });
    setCompletedWeapon(null);
    addLog(`${weaponLabel(weapon)} 분해: ${materialSummary(gained)}`);
    addFloatingText("재료 획득", "material");
  }

  function canPayEnhance(weapon: Weapon) {
    const cost = enhanceCost(weapon, weapon.enhanceLevel);
    const discountedGold = Math.floor(cost.gold * enhanceDiscount);
    return (
      gold >= discountedGold &&
      materials.iron >= cost.iron &&
      materials.ember >= cost.ember &&
      materials.crystal >= cost.crystal &&
      materials.relic >= cost.relic
    );
  }

  function enhanceWeapon(weapon: Weapon) {
    const cost = enhanceCost(weapon, weapon.enhanceLevel);
    const discountedGold = Math.floor(cost.gold * enhanceDiscount);
    if (!canPayEnhance(weapon)) {
      addLog("강화 재료 또는 골드가 부족합니다.");
      addFloatingText("비용 부족", "rare");
      return;
    }

    setGold((value) => value - discountedGold);
    setMaterials((current) => ({
      iron: current.iron - cost.iron,
      ember: current.ember - cost.ember,
      crystal: current.crystal - cost.crystal,
      relic: current.relic - cost.relic
    }));

    const upgraded = {
      ...weapon,
      enhanceLevel: weapon.enhanceLevel + 1,
      value: Math.floor(weapon.value * 1.34 + 18)
    };
    setCompletedWeapon(upgraded);
    addLog(`${weaponLabel(upgraded)} 강화 성공. 가치가 상승했습니다.`);
    addFloatingText(`+${upgraded.enhanceLevel} 강화`, "rare");
  }

  function keepWeapon(weapon: Weapon) {
    setStoredWeapons((current) => [weapon, ...current].slice(0, 16));
    setCompletedWeapon(null);
    addLog(`${weaponLabel(weapon)} 보관함에 등록했습니다.`);
    addFloatingText("보관 완료", "material");
  }

  function buyUpgrade(upgrade: Upgrade) {
    const cost = upgradeCost(upgrade, levels[upgrade.key]);
    if (gold < cost) {
      addLog(`${upgrade.name} 구매에 필요한 골드가 부족합니다.`);
      addFloatingText("골드 부족", "rare");
      return;
    }

    setGold((value) => value - cost);
    setLevels((current) => ({ ...current, [upgrade.key]: current[upgrade.key] + 1 }));
    addLog(`${upgrade.name} Lv.${levels[upgrade.key] + 1} 달성`);
    addFloatingText("업그레이드", "gold");
  }

  const pendingEnhanceCost = completedWeapon ? enhanceCost(completedWeapon, completedWeapon.enhanceLevel) : null;
  const pendingEnhanceGold = pendingEnhanceCost ? Math.floor(pendingEnhanceCost.gold * enhanceDiscount) : 0;

  return (
    <main className="game-shell">
      <aside className="resource-panel" aria-label="자원과 재료">
        <div className="panel-heading">
          <p>대장간 장부</p>
          <h1>대장장이 클릭커</h1>
        </div>

        <div className="gold-card">
          <span>보유 골드</span>
          <strong>{gold.toLocaleString()} G</strong>
        </div>

        <section className="material-list">
          <h2>재료 인벤토리</h2>
          {(Object.keys(materialLabels) as MaterialKey[]).map((key) => (
            <div className="material-row" key={key}>
              <span>{materialLabels[key]}</span>
              <strong>{materials[key]}</strong>
            </div>
          ))}
        </section>

        <section className="collection-panel">
          <h2>무기 보관함 / 도감</h2>
          <div className="collection-stats">
            <span>보관 {storedWeapons.length}</span>
            <span>전설 {collectionStats.legendary}</span>
            <span>최고가 {collectionStats.best}G</span>
          </div>
          <div className="weapon-vault">
            {storedWeapons.length === 0 ? (
              <p>아직 보관한 무기가 없습니다.</p>
            ) : (
              storedWeapons.map((weapon) => (
                <article className={`vault-item rarity-${weapon.rarity.toLowerCase()}`} key={weapon.id}>
                  <strong>{weaponLabel(weapon)}</strong>
                  <span>
                    {weapon.rarity} · {weapon.value}G
                  </span>
                </article>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className={`forge-stage ${completionFlash ? "is-complete" : ""}`} aria-label="메인 제작 화면">
        <div className="stage-topline">
          <span>작업 #{weaponCounter}</span>
          <span>자동 제작 {autoPower.toFixed(1)} / 초</span>
        </div>

        <button
          className="forge-button"
          type="button"
          onClick={handleStrike}
          disabled={Boolean(completedWeapon)}
          aria-label="모루를 두드려 제작 진행도 올리기"
        >
          <span className={`hammer hammer-${strikeCount % 2}`} aria-hidden="true" />
          <span className="spark-field" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="weapon-blank" style={{ "--heat": heatLevel } as CSSProperties}>
            <span className="blade" />
            <span className="guard" />
            <span className="grip" />
          </span>
          <span className="anvil" aria-hidden="true" />
        </button>

        <div className="progress-card">
          <div className="progress-copy">
            <span>제작 게이지</span>
            <strong>{Math.floor(progressPercent)}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <p>
            클릭 +{clickPower.toFixed(1)} · 목표치 {Math.floor(targetProgress)}
          </p>
        </div>

        <div className="floating-layer" aria-hidden="true">
          {floatingTexts.map((item) => (
            <span className={`float-text tone-${item.tone}`} key={item.id}>
              {item.text}
            </span>
          ))}
        </div>

        <section className="craft-log" aria-label="최근 완성 무기 로그">
          <h2>최근 작업 로그</h2>
          {logs.map((log, index) => (
            <p key={`${log}-${index}`}>{log}</p>
          ))}
        </section>
      </section>

      <aside className="upgrade-panel" aria-label="대장간 업그레이드">
        <div className="panel-heading">
          <p>성장</p>
          <h2>업그레이드 패널</h2>
        </div>
        <div className="upgrade-list">
          {upgrades.map((upgrade) => {
            const level = levels[upgrade.key];
            const cost = upgradeCost(upgrade, level);
            return (
              <button
                className="upgrade-button"
                type="button"
                key={upgrade.key}
                onClick={() => buyUpgrade(upgrade)}
                disabled={gold < cost}
              >
                <span>
                  <strong>{upgrade.name}</strong>
                  <small>{upgrade.description}</small>
                </span>
                <span className="upgrade-meta">
                  <b>Lv.{level}</b>
                  <em>{cost}G</em>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {completedWeapon ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="무기 완성 결과">
          <section className={`result-modal rarity-${completedWeapon.rarity.toLowerCase()}`}>
            <p className="eyebrow">무기 완성</p>
            <h2>{weaponLabel(completedWeapon)}</h2>
            <div className="result-weapon" aria-hidden="true">
              <span className="result-blade" />
              <span className="result-guard" />
              <span className="result-grip" />
            </div>
            <dl className="result-stats">
              <div>
                <dt>등급</dt>
                <dd>{completedWeapon.rarity}</dd>
              </div>
              <div>
                <dt>품질</dt>
                <dd>{completedWeapon.quality}</dd>
              </div>
              <div>
                <dt>속성</dt>
                <dd>{completedWeapon.element}</dd>
              </div>
              <div>
                <dt>기본 가치</dt>
                <dd>{completedWeapon.value}G</dd>
              </div>
            </dl>

            <div className="modal-actions">
              <button type="button" onClick={() => sellWeapon(completedWeapon)}>
                판매
                <span>{Math.floor(completedWeapon.value * sellMultiplier * (1 + completedWeapon.enhanceLevel * 0.22))}G</span>
              </button>
              <button type="button" onClick={() => salvageWeapon(completedWeapon)}>
                분해
                <span>{materialSummary(completedWeapon.materialValue) || "철광석 +1"}</span>
              </button>
              <button type="button" onClick={() => enhanceWeapon(completedWeapon)} disabled={!canPayEnhance(completedWeapon)}>
                강화
                <span>
                  {pendingEnhanceGold}G · 철광석 {pendingEnhanceCost?.iron}
                </span>
              </button>
              <button type="button" onClick={() => keepWeapon(completedWeapon)}>
                보관
                <span>도감 등록</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
