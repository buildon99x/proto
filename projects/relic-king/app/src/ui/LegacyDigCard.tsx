import { useEffect, useRef } from "react";
import {
  DROP_INTERVAL_FLOOR_SECONDS, LAYERS_PER_SITE, SITES, SITE_BY_ID,
  appraiseSeconds, gearCost, labCost, workerCost
} from "../game/balance";
import { digPower } from "../game/engine";
import { isDropFloorBound } from "./Header";
import { rate, won } from "../game/format";
import { STRATA_H, STRATA_W, drawStrata } from "../render/strata";
import type { Game } from "./useGame";

/**
 * 직접 발굴(레거시, spec.md §8.1·notes/decisions.md G52.7) — 발굴단과 별개로
 * 계속 살아있는 v0.1 진행 축이다. 기존 지층 단면 캔버스를 그대로 살린다(작업
 * 지시 필수 사항). v0.2에서는 발굴단이 주 진행 수단이라 발굴 탭 안에서 보조
 * 카드로 내려온다 — 클릭은 여전히 완전한 선택(척추 4번, 안 눌러도 손실 0).
 */
export function LegacyDigCard({ game }: { game: Game }) {
  const { world } = game;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const site = SITE_BY_ID[world.activeSite];
  const sp = world.sites[world.activeSite];
  const ownedBases = SITES.filter((s) => world.sites[s.id].unlocked);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        drawStrata(ctx, {
          site: world.activeSite,
          layer: sp.layer,
          layerProgress: sp.layerProgress,
          time: performance.now() / 1000,
          digging: true,
          siteSeed: SITES.findIndex((s) => s.id === world.activeSite) + 1
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [world, sp, world.activeSite]);

  const combo = world.clickCombo > 1.02 && world.t < world.clickComboUntil;
  const floorBound = isDropFloorBound(world, world.activeSite, digPower(world));

  return (
    <section className="card legacy-dig">
      <div className="card-head">
        <h3>직접 발굴(레거시)</h3>
        {ownedBases.length > 1 ? (
          <select value={world.activeSite} onChange={(e) => game.goTo(e.target.value as typeof world.activeSite)}>
            {ownedBases.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="legacy-dig-body">
        <div className="dig-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={STRATA_W}
            height={STRATA_H}
            className="dig-canvas"
            onPointerDown={game.dig}
            aria-label="지층 단면 — 눌러서 삽질"
          />
          {combo ? <span className="combo">콤보 ×{world.clickCombo.toFixed(1)}</span> : null}
          <button type="button" className="dig-hint" onClick={game.dig}>
            눌러서 삽질 (선택 사항)
          </button>
        </div>
        <div className="legacy-dig-upgrades">
          <Upgrade label="인부" detail={`${world.workers}명 · 발굴력 +1.1/명`} cost={workerCost(world.workers)} funds={world.funds} onBuy={game.buyWorker} />
          <Upgrade label="장비" detail={`Lv.${world.gear} · 발굴력 ×1.6`} cost={gearCost(world.gear)} funds={world.funds} onBuy={game.buyGear} />
          <Upgrade label="감정소" detail={`Lv.${world.lab} · 1점당 ${appraiseSeconds(world.lab).toFixed(1)}초`} cost={labCost(world.lab)} funds={world.funds} onBuy={game.buyLab} />
          <p className="muted small">
            직접 발굴력 {rate(digGuard(digPower(world)))}/s — {site.name} {sp.layer}층({site.eras[sp.layer - 1]})
          </p>
          {floorBound ? (
            <p className="stalled small">
              {site.name}의 드랍 간격이 하한 {DROP_INTERVAL_FLOOR_SECONDS}초에 닿았다 — 여기서 발굴력을 더 올려도
              {sp.layer >= LAYERS_PER_SITE ? " 유물이 더 나오지 않는다" : " 드랍 수는 그대로고 층만 빨리 내려간다"}.
              자금은 새 거점·시설·발굴단에 써야 순위로 돌아온다.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function digGuard(v: number) {
  return Number.isFinite(v) ? v : 0;
}

function Upgrade({ label, detail, cost, funds, onBuy }: {
  label: string; detail: string; cost: number; funds: number; onBuy: () => void;
}) {
  const afford = funds >= cost;
  return (
    <button type="button" className={`upgrade${afford ? " afford" : ""}`} disabled={!afford} onClick={onBuy}>
      <span className="upgrade-main">
        <strong>{label}</strong>
        <em className="muted">{detail}</em>
      </span>
      <span className="price">{won(cost)} ₩</span>
    </button>
  );
}
