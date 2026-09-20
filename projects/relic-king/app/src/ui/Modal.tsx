import type { ReactNode } from "react";

/** 공용 오버레이 — 설정·규칙·순위표·온보딩·전시 교체 시트 등 "요청해야 보인다"
 *  층(spec.md §3.2)의 화면들이 전부 이 위에서 열린다. 바깥 배경 클릭이나
 *  뒤로가기로 닫는다(notes/ux-v02.md §1.4). */
export function Modal(
  { title, subtitle, onClose, wide, children }:
  { title: string; subtitle?: string; onClose: () => void; wide?: boolean; children: ReactNode }
) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal modal-sheet${wide ? " modal-wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-head">
          <div>
            <h2>{title}</h2>
            {/* 거점 표시 규칙(sites.ts siteTitle/siteSubtitle) — 1차 도시명 · 2차 앵커,
                3차 나라는 부제로. 시트마다 제각기 조합하지 않도록 자리를 여기 둔다. */}
            {subtitle ? <p className="modal-sheet-sub muted small">{subtitle}</p> : null}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="modal-sheet-body">{children}</div>
      </div>
    </div>
  );
}
