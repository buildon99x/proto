import { useEffect, useRef } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import { SITES, SITE_BY_ID, TIER_NAME, appraiseSeconds, gearCost, labCost, workerCost } from "../game/balance";
import { digPower } from "../game/engine";
import { rate, won } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import { STRATA_H, STRATA_W, drawStrata } from "../render/strata";
import { Sprite } from "./Sprite";
import type { Game } from "./useGame";

export function DigView({ game }: { game: Game }) {
  const { world } = game;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const site = SITE_BY_ID[world.activeSite];
  const sp = world.sites[world.activeSite];

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
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

  return (
    <div className="dig">
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

      <div className="dig-side">
        <section className="card">
          <h3>발굴지</h3>
          <div className="site-list">
            {SITES.map((s) => {
              const state = world.sites[s.id];
              const active = world.activeSite === s.id;
              if (!state.unlocked) {
                const afford = world.funds >= s.unlockCost;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`site-row locked${afford ? " afford" : ""}`}
                    disabled={!afford}
                    onClick={() => game.unlock(s.id)}
                  >
                    <span>{s.name} <em className="muted">{s.anchor}</em></span>
                    <span className="price">{won(s.unlockCost)} ₩로 개방</span>
                  </button>
                );
              }
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`site-row${active ? " active" : ""}`}
                  onClick={() => game.goTo(s.id)}
                >
                  <span>{s.name} <em className="muted">{s.anchor}</em></span>
                  <span className="price">{state.layer}층</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h3>설비</h3>
          <Upgrade
            label="인부"
            detail={`${world.workers}명 · 1명당 발굴력 +1.1`}
            cost={workerCost(world.workers)}
            funds={world.funds}
            onBuy={game.buyWorker}
          />
          <Upgrade
            label="장비"
            detail={`Lv.${world.gear} · 발굴력 ×1.6`}
            cost={gearCost(world.gear)}
            funds={world.funds}
            onBuy={game.buyGear}
          />
          <Upgrade
            label="감정소"
            detail={`Lv.${world.lab} · 1점당 ${appraiseSeconds(world.lab).toFixed(1)}초`}
            cost={labCost(world.lab)}
            funds={world.funds}
            onBuy={game.buyLab}
          />
          <p className="muted small">
            현재 발굴력 {rate(digGuard(digPower(world)))}/s — {site.name} {sp.layer}층 ({site.eras[sp.layer - 1]})
          </p>
        </section>

        <section className="card">
          <h3>
            최근 소장{" "}
            {world.pending.length > 0 ? (
              <span className="muted">· 감정 대기 {world.pending.length}점</span>
            ) : null}
          </h3>
          {world.vault.length === 0 ? (
            <p className="muted small">
              발굴한 유물은 미감정 상태로 쌓인다. 감정이 끝나면 여기에 올라온다.
            </p>
          ) : (
            <ul className="recent">
              {world.vault.slice(-6).reverse().map((v) => {
                const a = ARTIFACT_BY_ID[v.artifactId];
                return (
                  <li key={v.uid}>
                    <Sprite artifact={a} size={34} />
                    <span className="recent-name">{a.name}</span>
                    <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em>
                    <span className="price">{won(v.value)} ₩</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
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
