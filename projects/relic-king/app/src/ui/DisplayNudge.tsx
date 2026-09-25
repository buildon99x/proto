import { useEffect, useRef, useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import { SITES, TIER_NAME } from "../game/balance";
import { museumOf, museumSlotCount } from "../game/engine";
import { withJosa } from "../game/format";
import type { SiteId, World } from "../game/types";
import type { Game } from "./useGame";

/** 첫 전시 안내를 이미 띄웠는가(한 번만 뜬다) */
export const DISPLAY_NUDGE_SEEN_KEY = "relic-king/display-nudge-v1";

function readSeen(): boolean {
  try {
    return localStorage.getItem(DISPLAY_NUDGE_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function writeSeen() {
  try {
    localStorage.setItem(DISPLAY_NUDGE_SEEN_KEY, "1");
  } catch {
    /* 무시 */
  }
}

type Nudge = { uid: number; site: SiteId };

/**
 * 비어 있는 임시 전시대(등급0 무료 1칸)와 걸 만한 유물(진귀 이상, 비전시)을 찾는다.
 * 무엇이든 하나라도 전시 중이면 안내할 필요가 없다.
 */
function findNudge(w: World): Nudge | null {
  if (w.vault.some((v) => v.displayed)) return null;
  const site = SITES.find((s) => w.sites[s.id].unlocked && museumOf(w, s.id).grade === 0 && museumSlotCount(w, s.id) > 0)?.id;
  if (!site) return null;
  const pick = w.vault
    .filter((v) => !v.displayed && ARTIFACT_BY_ID[v.artifactId].tier >= 2)
    .sort((a, b) => b.value - a.value)[0];
  return pick ? { uid: pick.uid, site } : null;
}

/**
 * 첫 전시 안내(v0.6.6, `notes/decision-tree-10h.md` P3의 "1:30 첫 전시"). 첫 진귀가
 * 소장고에 들어왔는데 임시 전시대가 비어 있으면 한 번 토스트로 알린다. 화면을
 * 막지 않는다. [전시]는 소장고의 전시 버튼과 같은 동작(`game.display`)이다.
 */
export function DisplayNudge({ game }: { game: Game }) {
  const { world } = game;
  const seenRef = useRef<boolean | null>(null);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  if (seenRef.current === null) seenRef.current = readSeen();

  useEffect(() => {
    if (nudge) {
      // 사람이 먼저 전시했거나 그 유물을 팔았으면 조용히 닫는다
      const item = world.vault.find((v) => v.uid === nudge.uid);
      if (!item || world.vault.some((v) => v.displayed)) setNudge(null);
      return;
    }
    if (seenRef.current) return;
    const found = findNudge(world);
    if (!found) return;
    seenRef.current = true;
    writeSeen();
    setNudge(found);
  });

  if (!nudge) return null;
  const item = world.vault.find((v) => v.uid === nudge.uid);
  if (!item) return null;
  const a = ARTIFACT_BY_ID[item.artifactId];
  return (
    <div className="offline-toast display-nudge" role="status">
      <span>
        임시 전시대가 비어 있다 — {withJosa(a.name, "을를")} 걸면 관람객이 늘어 명성이 오른다
        <em className="muted small"> · {TIER_NAME[a.tier]}</em>
      </span>
      <button
        type="button"
        className="display-nudge-go"
        onClick={() => {
          game.display(item.uid, nudge.site, 0);
          setNudge(null);
        }}
      >
        전시
      </button>
      <button type="button" className="display-nudge-close" aria-label="닫기" onClick={() => setNudge(null)}>
        ✕
      </button>
    </div>
  );
}
