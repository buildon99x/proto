import { useState } from "react";
import { SITE_BY_ID } from "../game/balance";
import { CREW, CREW_ORDER, WANTED_CANDIDATES, WORLD_LINES, wantedLine, wantedOf, wantedStatus, worldMonth } from "../game/lore";
import { CrewPortrait } from "./Crew";
import type { Game } from "./useGame";

/** 접었는지 — 기기마다 기억한다. 게임 진행과 무관한 표시 설정이다 */
const FOLD_KEY = "relic-king/reg-card-folded-v1";

/**
 * 사람이 한 번이라도 접거나 펼쳤으면 그 선택을 따른다. 아직 안 건드렸으면 첫 30분(게임 시각)
 * 동안만 펼쳐 둔다 — 새로 온 사람에게는 세계와 크루가 첫 화면에 서고, 오래 한 세이브에는
 * 한 줄만 남는다.
 */
const UNFOLDED_UNTIL_SECONDS = 30 * 60;

function readFolded(t: number): boolean {
  try {
    const v = localStorage.getItem(FOLD_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
  } catch {
    /* 사생활 모드 등 — 아래 기본값 */
  }
  return t > UNFOLDED_UNTIL_SECONDS;
}

function writeFolded(folded: boolean) {
  try {
    localStorage.setItem(FOLD_KEY, folded ? "1" : "0");
  } catch {
    /* 사생활 모드 등 — 무시 */
  }
}

/**
 * 팀 등록증(spec.md §15.3 온보딩 행, §15.5 ③, G109) — 발굴 탭 맨 위의 카드 한 장.
 *
 * - **모달이 아니다.** 게임은 이 카드와 무관하게 0초부터 돈다(척추 4번). 읽지 않고 접어도
 *   진행·밸런스는 같다.
 * - 세계 다섯 문장, 크루 다섯의 명찰, 그리고 **빈칸 하나** — 찾는 한 점. 기본값이 이미
 *   들어 있어서 고르지 않아도 된다(G109: 기본값이 즉시 진행을 허용한다).
 * - 찾는 한 점은 규칙에 아무 효력이 없다. 도감에 표시가 남고, 다른 팀이 먼저 가져가면
 *   그 칸은 엔딩까지 빈다.
 */
export function RegistrationCard({ game }: { game: Game }) {
  const { world } = game;
  const [folded, setFolded] = useState(() => readFolded(world.t));
  const wanted = wantedOf(world);
  const status = wantedStatus(world);
  const toggle = () => {
    setFolded((v) => {
      writeFolded(!v);
      return !v;
    });
  };

  if (folded) {
    return (
      <section className="card reg-card folded">
        <span className="reg-card-title">지구 출토 · 팀 등록증</span>
        <span className={`reg-card-wanted-line small wanted-${status}`}>{wantedLine(world)}</span>
        <button type="button" className="ghost reg-card-toggle" onClick={toggle}>펼치기</button>
      </section>
    );
  }

  return (
    <section className="card reg-card">
      <div className="card-head">
        <h3 className="reg-card-title">지구 출토 — 팀 등록증 <em className="muted small">{worldMonth(world.t)} · 지구 강하</em></h3>
        <button type="button" className="ghost reg-card-toggle" onClick={toggle}>접기</button>
      </div>
      <ol className="reg-card-world">
        {WORLD_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
      <ul className="reg-card-crew" aria-label="크루">
        {CREW_ORDER.map((id) => (
          <li key={id}>
            <CrewPortrait id={id} scale={2} />
            <b>{CREW[id].name}</b>
            <span className="muted small">{CREW[id].role}</span>
          </li>
        ))}
      </ul>
      <label className="reg-card-wanted">
        <span>찾는 한 점</span>
        <select
          value={wanted.id}
          onChange={(e) => game.setWanted(e.target.value)}
          aria-label="찾는 한 점"
        >
          {WANTED_CANDIDATES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {SITE_BY_ID[a.site].city}
            </option>
          ))}
        </select>
      </label>
      <p className={`reg-card-wanted-line small wanted-${status}`}>
        {status === "found"
          ? "찾았다. 카드의 다음 칸에 우리 이름이 한 번 적혔다."
          : status === "gone"
            ? "다른 팀이 먼저 열었다. 이 칸은 엔딩까지 빈다."
            : "적어 봐야 아무 효력이 없는 칸이다. 도감에 표시가 남고, 다른 팀이 먼저 가져가면 엔딩까지 빈다."}
      </p>
    </section>
  );
}
