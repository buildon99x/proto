import type { ReactNode } from "react";

/** 공용 오버레이 — 설정·규칙·순위표·온보딩·전시 교체 시트 등 "요청해야 보인다"
 *  층(spec.md §3.2)의 화면들이 전부 이 위에서 열린다. 바깥 배경 클릭이나
 *  뒤로가기로 닫는다(notes/ux-v02.md §1.4). */
export function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal modal-sheet${wide ? " modal-wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-head">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="modal-sheet-body">{children}</div>
      </div>
    </div>
  );
}
