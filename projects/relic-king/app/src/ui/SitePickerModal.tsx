import { Modal } from "./Modal";
import { WorldExplorer } from "./WorldExplorer";
import type { Game } from "./useGame";
import type { SiteId } from "../game/types";

/** 지도·북마크·검색을 그대로 재사용하는 범용 거점 선택 시트 — 루틴 대상 변경(표#13),
 *  거점 이전 대상 선택(표#11)이 공유한다. "지도에서 거점을 탭한다"는 동작 자체는
 *  똑같으므로 새로 만들지 않는다. */
export function SitePickerModal({ game, title, onPick, onClose }: {
  game: Game; title: string; onPick: (site: SiteId) => void; onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} wide>
      <WorldExplorer
        game={game}
        onSelectSite={(site) => {
          onPick(site);
          onClose();
        }}
      />
    </Modal>
  );
}
