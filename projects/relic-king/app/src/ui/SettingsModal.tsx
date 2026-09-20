import type { Tier } from "../game/types";
import { Modal } from "./Modal";
import { AUTO_SELL_OPTIONS, SPARE_SELL_OPTIONS } from "./sellOptions";
import type { Game } from "./useGame";

/**
 * ⚙ 설정·세이브(notes/ux-v02.md §1.4) — v0.1 세계 탭의 세이브(export/import/초기화)와
 * 소장고 탭에 있던 자동 매각 기준, 그리고 v0.1 접근성 토글(음소거)을 한 자리로 모은다.
 * 헤더 아이콘 1탭으로 어디서든 연다.
 */
export function SettingsModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const { world } = game;
  return (
    <Modal title="설정·세이브" onClose={onClose}>
      <section className="settings-section">
        <h4>편의</h4>
        <label className="settings-row">
          <span>
            감정 직후 자동 매각{" "}
            <em className="muted small">이미 가진 종의 사본이면 감정이 끝나는 즉시 판다 — 소장고에 쌓이지 않는다</em>
          </span>
          <select
            value={world.settings.autoSellBelow === null ? "off" : String(world.settings.autoSellBelow)}
            onChange={(e) => game.setAutoSell(e.target.value === "off" ? null : (Number(e.target.value) as Tier))}
          >
            {AUTO_SELL_OPTIONS.map((o) => (
              <option key={o.label} value={o.value === null ? "off" : String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-row">
          <span>
            소장고 중복 자동 매각{" "}
            <em className="muted small">
              같은 유물을 2점 이상 가졌을 때 이 티어 이하의 여분을 판다 — 종당 1점·전시 중·국보·유일은 남긴다
            </em>
          </span>
          <select
            value={world.settings.autoSellSpareBelow === null ? "off" : String(world.settings.autoSellSpareBelow)}
            onChange={(e) =>
              game.setAutoSellSpare(e.target.value === "off" ? null : (Number(e.target.value) as Tier))
            }
          >
            {SPARE_SELL_OPTIONS.map((o) => (
              <option key={o.label} value={o.value === null ? "off" : String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-row">
          <span>
            중복분을 보낼 곳{" "}
            <em className="muted small">
              경매는 직접매각보다 배율이 높지만 낙찰까지 기다려야 한다 — 경매장이 없거나 칸이 차 있으면 그 회차는 그냥 넘어간다
            </em>
          </span>
          <select
            value={world.settings.spareDestination}
            onChange={(e) => game.setSpareDestination(e.target.value as "sell" | "auction")}
          >
            <option value="sell">직접 매각</option>
            <option value="auction">경매 출품</option>
          </select>
        </label>
        <label className="settings-row">
          <span>음소거</span>
          <input
            type="checkbox"
            checked={world.settings.muted}
            onChange={(e) => game.setMuted(e.target.checked)}
          />
        </label>
        <label className="settings-row">
          <span>자동 재투자 <em className="muted small">남는 자금을 인부·장비·감정소에 자동으로 쓴다</em></span>
          <input
            type="checkbox"
            checked={world.settings.autoReinvest}
            onChange={(e) => game.setAutoReinvest(e.target.checked)}
          />
        </label>
      </section>

      <section className="settings-section">
        <h4>세이브</h4>
        <div className="save-tools">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              const text = game.exportSave();
              navigator.clipboard?.writeText(text).catch(() => undefined);
              window.prompt("세이브 코드 (복사해 두세요)", text);
            }}
          >
            내보내기
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              const text = window.prompt("세이브 코드를 붙여 넣으세요");
              if (text) {
                try {
                  game.importSave(text);
                } catch {
                  window.alert("세이브 코드를 읽지 못했습니다.");
                }
              }
            }}
          >
            가져오기
          </button>
          <button
            type="button"
            className="ghost danger"
            onClick={() => {
              if (window.confirm("진행 상황을 모두 지우고 처음부터 시작합니다.")) game.reset();
            }}
          >
            초기화
          </button>
        </div>
      </section>
    </Modal>
  );
}
