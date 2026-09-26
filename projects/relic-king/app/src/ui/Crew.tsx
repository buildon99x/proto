import type { ReactNode } from "react";
import { CREW, SCREEN } from "../game/lore";
import { crewSpriteUrl, CREW_SPRITE_H, CREW_SPRITE_W, type CrewId } from "../render/crew";

/**
 * 크루 도트 한 장(16×24, 정수배 확대). 종이색 칸 위에 올린다 — 도트의 외곽선이 잉크색이라
 * 어두운 패널 위에서는 실루엣이 먹힌다(ip/visual-guide.md §3의 원화도 종이 위다).
 */
export function CrewPortrait({ id, scale = 2 }: { id: CrewId; scale?: number }) {
  const url = crewSpriteUrl(id);
  return (
    <span className="crew-portrait" title={`${CREW[id].name} — ${CREW[id].role}`}>
      {url ? (
        <img src={url} width={CREW_SPRITE_W * scale} height={CREW_SPRITE_H * scale} alt={CREW[id].name} />
      ) : null}
    </span>
  );
}

/**
 * 크루 한 줄 — 명찰(도트 + 이름)과 문장 하나. 화면별 문구는 `lore.ts`의 `SCREEN`에서
 * 읽는다(spec.md §15.2). 읽지 않아도 그 화면의 규칙은 그대로다(척추 4번).
 */
export function CrewNote({ screen, who, children }: { screen?: keyof typeof SCREEN; who?: CrewId; children?: ReactNode }) {
  const entry = screen ? SCREEN[screen] : undefined;
  const id = who ?? entry?.who;
  if (!id) return null;
  return (
    <p className="crew-note small" data-crew={id}>
      <CrewPortrait id={id} scale={1} />
      <span>
        <b className="crew-name">{CREW[id].name}</b> {children ?? entry?.text}
      </span>
    </p>
  );
}
