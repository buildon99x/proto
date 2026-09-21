import { useState } from "react";
import { GHOST_MAX } from "../game/balance";
import { fullRanking, rankRace } from "../game/engine";
import { duration, percent } from "../game/format";
import { isGhost } from "../game/rivalcard";
import type { AxisRankRow } from "../game/engine";
import type { RivalState } from "../game/types";
import { Modal } from "./Modal";
import type { Game } from "./useGame";

const AXIS_LABEL = { asset: "자산", codex: "도감", fame: "명성" } as const;

/**
 * 헤더의 "종합 N위" 칩을 탭하면 1단계로 여기 들어온다(notes/ux-v02.md §1.1).
 *
 * v0.5에서 하는 일이 하나 늘었다 — **기록패 교환이 여기서 일어난다**(notes/decisions.md
 * G76.5). 경쟁이 보이는 화면과 상대를 들이는 화면이 같아야 한다. ⚙ 설정·세이브 안에
 * 두면 "남과 겨룬다"는 행동이 백업 기능처럼 읽힌다.
 */
export function RankTableModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const rows = [...fullRanking(game.world, game.record)].sort((a, b) => b.rank - a.rank);
  const top = Math.max(rows[0]?.rank ?? 1, 0.0001);
  const race = rankRace(game.world, game.record);
  const ghosts = game.world.rivals.filter(isGhost);

  return (
    <Modal title="순위표" onClose={onClose}>
      <RacePanel race={race} />

      <ul className="rank-list">
        {rows.map((r, i) => (
          <RankRow
            key={String(r.id)}
            row={r}
            place={i + 1}
            top={top}
            ghost={ghosts.find((g) => g.id === r.id)}
            nowT={game.world.t}
          />
        ))}
      </ul>
      <p className="muted small">
        "유물왕" 칭호는 종합 점수 1위 + 도감 75% 이상을 함께 유지해야 얻는다 — 팔아서 자산만 채워서는 1위에
        오를 수 없다(도감·명성 가중치 0.70 vs 자산 0.30).
      </p>

      <CardExchange game={game} ghosts={ghosts} />
    </Modal>
  );
}

/** 지금 누구를 쫓고 있고, 어느 축에서 지며, 이 속도면 언제 넘는지 */
function RacePanel({ race }: { race: ReturnType<typeof rankRace> }) {
  if (!race.target) {
    return (
      <p className="race-line">
        종합 <b>1위</b>다. 도감 {percent(race.me.codex, 1)} — 75%를 넘겨야 칭호가 붙는다.
      </p>
    );
  }
  const axis = race.weakestAxis;
  return (
    <div className="race-panel">
      <p className="race-line">
        바로 위는 <b>{race.target.name}</b> — 종합 {percent(race.gap.rank, 2)} 차이.{" "}
        {race.gap[axis] > 0 ? (
          <>
            가장 많이 잃는 축은 <b>{AXIS_LABEL[axis]}</b>({percent(race.gap[axis], 1)} 뒤).
          </>
        ) : (
          <>세 축 모두 앞서는데 종합이 뒤진다 — 가중치 차이다.</>
        )}
      </p>
      <p className="race-line muted small">{overtakeText(race.overtakeSeconds)}</p>
    </div>
  );
}

/**
 * **모르는 것과 불가능한 것을 구분해서 적는다**(척추 5번). `undefined`는 표본이
 * 모자라 모른다는 뜻이고 `null`은 이 속도로는 못 넘는다는 뜻이다. 후자를 희망적으로
 * 돌려 적으면 그 순간 순위표가 거짓말을 시작한다.
 */
function overtakeText(seconds: number | null | undefined): string {
  if (seconds === undefined) return "추월 예상 — 성장률 측정 중(10분 뒤부터 나온다).";
  if (seconds === null) return "이 속도로는 못 넘는다 — 상대가 더 빨리 자라고 있다.";
  if (seconds <= 0) return "이미 앞섰다.";
  return `이 속도면 ${duration(seconds)} 뒤 추월한다.`;
}

function RankRow(
  { row, place, top, ghost, nowT }:
  { row: AxisRankRow; place: number; top: number; ghost?: RivalState; nowT: number }
) {
  const me = row.id === "player";
  return (
    <li className={me ? "me" : ghost ? "rank-ghost" : ""}>
      <span className="rank-no">{place}</span>
      <span className="rank-name">
        {ghost ? <span className="ghost-mark" aria-hidden="true">◈</span> : null}
        {row.name}
      </span>
      <span className="rank-bar">
        <i style={{ width: `${(row.rank / top) * 100}%` }} />
      </span>
      <span className="rank-val">{percent(row.rank, 1)}</span>
      <span className="rank-dig muted">
        {ghost
          ? `${ghostAge(ghost, nowT)} 기록 · 자산${percent(row.asset)} 도감${percent(row.codex)}`
          : `자산${percent(row.asset)} · 도감${percent(row.codex)} · 명성${percent(row.fame)}`}
      </span>
    </li>
  );
}

/** 고스트가 실시간이 아니라는 사실을 화면에서 지우지 않는다 */
function ghostAge(ghost: RivalState, nowT: number): string {
  const since = nowT - (ghost.ghost?.receivedT ?? nowT);
  return since < 60 ? "방금 받은" : `${duration(since)} 전 받은`;
}

function CardExchange({ game, ghosts }: { game: Game; ghosts: RivalState[] }) {
  const [name, setName] = useState(game.record.ownerName);
  const [note, setNote] = useState<string | null>(null);

  const copy = () => {
    const text = game.makeCardText();
    // 클립보드는 권한·보안 컨텍스트에 따라 조용히 실패한다. 실패하면 prompt로 떨어져
    // **언제나 손으로 복사할 수 있는 경로**를 남긴다 — 세이브 코드와 같은 관용구다.
    navigator.clipboard?.writeText(text).then(
      () => setNote(`복사했다 (${text.length}자). 상대에게 그대로 보내면 된다.`),
      () => window.prompt("내 기록패 (복사해 두세요)", text)
    );
  };

  const paste = () => {
    const text = window.prompt("상대의 기록패를 붙여 넣으세요");
    if (!text) return;
    const added = game.receiveCard(text);
    setNote(added ? `${added} — 순위표에 들어왔다.` : "기록패를 읽지 못했다. 코드가 잘렸거나 버전이 다르다.");
  };

  return (
    <div className="card-exchange">
      <h4>기록패</h4>
      <p className="muted small">
        서버를 쓰지 않는다. 내 상태를 코드로 구워 보내면, 받은 쪽 세계에서 <b>계속 자라는 상대</b>가 된다 —
        실시간이 아니라 그 시점의 기록이다.
      </p>
      <div className="card-name-row">
        <label htmlFor="owner-name">내 이름</label>
        <input
          id="owner-name"
          value={name}
          maxLength={12}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => game.setOwnerName(name)}
        />
      </div>
      <div className="detail-actions">
        <button type="button" onClick={copy}>내 기록패 복사</button>
        <button type="button" className="ghost" onClick={paste}>
          상대 기록패 붙여넣기
        </button>
      </div>
      {note ? <p className="muted small">{note}</p> : null}
      {ghosts.length > 0 ? (
        <ul className="ghost-list">
          {ghosts.map((g) => (
            <li key={g.id}>
              <span>◈ {g.name}</span>
              <button type="button" className="ghost" onClick={() => game.dropGhost(g.id)}>
                내보내기
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="muted small">동시에 {GHOST_MAX}명까지 받는다. 넘으면 가장 오래된 상대가 나간다.</p>
    </div>
  );
}
