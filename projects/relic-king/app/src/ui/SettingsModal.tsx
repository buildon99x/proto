import type { Tier } from "../game/types";
import { Modal } from "./Modal";
import type { Game } from "./useGame";

const AUTO_OPTIONS: { label: string; value: Tier | null }[] = [
  { label: "끄기", value: null },
  { label: "흔함", value: 0 },
  { label: "희귀 이하", value: 1 },
  { label: "진귀 이하", value: 2 }
];

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
          <span>자동 매각 기준 <em className="muted small">감정 완료 후 이 티어 이하는 자동으로 판다</em></span>
          <select
            value={world.settings.autoSellBelow === null ? "off" : String(world.settings.autoSellBelow)}
            onChange={(e) => game.setAutoSell(e.target.value === "off" ? null : (Number(e.target.value) as Tier))}
          >
            {AUTO_OPTIONS.map((o) => (
              <option key={o.label} value={o.value === null ? "off" : String(o.value)}>
                {o.label}
              </option>
            ))}
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
