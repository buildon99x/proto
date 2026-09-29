import { useEffect } from "react";
import { usd } from "../game/format";
import type { Game } from "./useGame";

/** 이만큼 지나면 저절로 닫는다(초). 화면을 막지 않는 토스트라 오래 붙어 있을 이유가 없다 */
const AUTO_HIDE_MS = 15_000;

/**
 * 자동 정리가 미감정 한 점을 팔아 도감 한 칸이 빈 순간을 알린다(notes/play-review B2).
 * 예전엔 아무 말이 없어서, 판 시작 1분 40초에 자금이 $2,656 → $27.1만으로 뛰고 종합이
 * 1위 → 7위로 떨어져도 무엇이 팔렸는지 알 수 없었다. 매각은 엔진이 그대로 한다(G57) —
 * 이 컴포넌트는 `world.autoSold`를 읽어 한 줄로 적을 뿐이다. 닫으면 `seen`을 켠다.
 */
export function AutoSoldNotice({ game }: { game: Game }) {
  const sold = game.world.autoSold;
  // 복귀 요약이 떠 있는 동안은 미룬다 — 같은 자리(화면 아래 토스트)라 겹치면 요약 줄이 가려진다
  const visible = !!sold && !sold.seen && !game.offline;

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => game.dismissAutoSold(), AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
    // `game`은 렌더마다 새 객체라 의존성에 넣으면 타이머가 매번 다시 걸린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sold?.t]);

  if (!sold || !visible) return null;
  return (
    <div className="offline-toast auto-sold" role="status">
      <span>
        {sold.stalled ? "감정비가 모자라" : "미감정이 상한을 넘어"} 미감정 한 점(추정 {usd(sold.estimate)})을 팔았다 — 자금 +{usd(sold.gained)},
        도감 한 칸이 비었다.
        {sold.stalled ? <em className="muted small"> 감정비만큼 자금을 남겨 두면 팔지 않는다.</em> : null}
      </span>
      <button type="button" aria-label="닫기" onClick={game.dismissAutoSold}>✕</button>
    </div>
  );
}
