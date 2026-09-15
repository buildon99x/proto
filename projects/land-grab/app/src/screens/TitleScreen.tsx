import {
  DIFFICULTIES,
  KILL_SCORE,
  MAX_PLAYERS,
  PARTY_BOARD_SIZE,
  PLAYER_KEYS,
  WORLD_BOARD_SIZE,
  WORLD_BOTS,
  playerStyle,
  type DifficultyId,
  type GameMode
} from "../game/config";

type Props = {
  selected: DifficultyId;
  onSelect: (id: DifficultyId) => void;
  humans: number;
  onHumansChange: (humans: number) => void;
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onStart: () => void;
};

const HUMAN_OPTIONS = [1, 2, 3, 4];

const MODES: Array<{ id: GameMode; label: string; line: string }> = [
  {
    id: "world",
    label: "월드",
    line: `${WORLD_BOARD_SIZE}×${WORLD_BOARD_SIZE} 열린 세계 · 봇 ${WORLD_BOTS}기 · 죽을 때까지`
  },
  {
    id: "party",
    label: "파티",
    line: `${PARTY_BOARD_SIZE}×${PARTY_BOARD_SIZE} 한 화면 · 1~4인 · 90초`
  }
];

export function TitleScreen({
  selected,
  onSelect,
  humans,
  onHumansChange,
  mode,
  onModeChange,
  onStart
}: Props) {
  const world = mode === "world";
  const aiCount = world
    ? WORLD_BOTS
    : humans === 1
      ? DIFFICULTIES.find((item) => item.id === selected)?.aiCount ?? 0
      : MAX_PLAYERS - humans;

  return (
    <div className="screen screen--title">
      <header className="title">
        <h1>땅따먹기</h1>
        <p>격자 위를 달려 고리를 그리면, 그 안이 전부 내 땅이 된다.</p>
      </header>

      <section className="panel">
        <h2>모드</h2>
        <div className="modes">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === mode ? "mode mode--on" : "mode"}
              onClick={() => onModeChange(item.id)}
            >
              <b>{item.label}</b>
              <span>{item.line}</span>
            </button>
          ))}
        </div>
        <p className="hint hint--tight">
          {world
            ? "한 변을 가로지르는 데 100초가 걸린다. 화면은 내 말을 따라가고, 오른쪽 미니맵이 전체를 보여 준다."
            : "보드 전체가 한 화면에 들어온다. 한 키보드를 나눠 쓴다."}
        </p>
      </section>

      <section className="panel">
        <h2>규칙</h2>
        <ul className="rules">
          <li>내 영토 밖으로 나가면 <b>꼬리</b>가 남는다. 내 영토로 돌아오면 꼬리가 감싼 영역을 전부 가져온다.</li>
          <li>자기 꼬리를 밟으면 죽는다. 남의 꼬리를 밟으면 <b>그 상대가</b> 죽는다.</li>
          <li>킬 1회는 <b>{KILL_SCORE}점</b> — 땅 {KILL_SCORE}칸과 같다. 사냥은 땅을 넓히는 것만큼 큰 수단이다.</li>
          <li>바깥 벽에 닿아도 죽는다. 죽으면 내 영토는 전부 사라진다.</li>
          <li>
            {world
              ? "목숨이 없다. 죽으면 그 판이 끝나고, 기록은 순위와 생존 시간으로 남는다."
              : `90초 뒤 점수(땅 1칸 1점 + 킬 ${KILL_SCORE}점)가 가장 높은 쪽이 이긴다.`}
          </li>
        </ul>
      </section>

      {world ? null : (
        <section className="panel">
          <h2>사람 수</h2>
          <div className="seats">
            {HUMAN_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                className={count === humans ? "seat seat--on" : "seat"}
                onClick={() => onHumansChange(count)}
              >
                <b>{count}인</b>
                <span>{count === 1 ? "혼자" : `${count}명이 한 키보드`}</span>
              </button>
            ))}
          </div>
          <p className="hint hint--tight">
            {humans === 1
              ? `혼자 하면 목숨 3개, AI ${aiCount}명과 겨룬다.`
              : `${humans}명 + AI ${aiCount}명. 여럿이 하면 목숨 제한 없이 90초를 끝까지 간다.`}
          </p>
          {humans > 1 ? (
            <ul className="keymap">
              {PLAYER_KEYS.slice(0, humans).map((player, index) => (
                <li key={player.label}>
                  <span
                    className="keymap__chip"
                    style={{ background: playerStyle(index + 1).territory }}
                  />
                  <b>{player.label}</b>
                  <span>{player.hint}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      <section className="panel">
        <h2>{world ? "봇 성격" : "난이도"}</h2>
        <div className="difficulty">
          {DIFFICULTIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selected ? "chip chip--on" : "chip"}
              onClick={() => onSelect(item.id)}
            >
              <b>{item.label}</b>
              <span>{world ? item.description.replace(/^AI \d+명\. /, "") : item.description}</span>
            </button>
          ))}
        </div>
      </section>

      <button type="button" className="primary" onClick={onStart}>
        게임 시작
      </button>

      <p className="hint">
        {world || humans === 1
          ? "방향키 · WASD · 스와이프로 이동 / Esc · P 로 일시정지"
          : "Esc · P 로 일시정지"}
      </p>
    </div>
  );
}
