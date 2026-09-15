import { DIFFICULTIES, KILL_SCORE, type DifficultyId } from "../game/config";

type Props = {
  selected: DifficultyId;
  onSelect: (id: DifficultyId) => void;
  onStart: () => void;
};

export function TitleScreen({ selected, onSelect, onStart }: Props) {
  return (
    <div className="screen screen--title">
      <header className="title">
        <h1>땅따먹기</h1>
        <p>격자 위를 달려 고리를 그리면, 그 안이 전부 내 땅이 된다.</p>
      </header>

      <section className="panel">
        <h2>규칙</h2>
        <ul className="rules">
          <li>내 영토 밖으로 나가면 <b>꼬리</b>가 남는다. 내 영토로 돌아오면 꼬리가 감싼 영역을 전부 가져온다.</li>
          <li>자기 꼬리를 밟으면 죽는다. 남의 꼬리를 밟으면 <b>그 상대가</b> 죽는다.</li>
          <li>
            킬 1회는 <b>{KILL_SCORE}점</b> — 땅 {KILL_SCORE}칸과 같다.
            보드 전체가 3,364칸이니, 사냥은 땅을 넓히는 것만큼 큰 수단이다.
          </li>
          <li>바깥 벽에 닿아도 죽는다. 죽으면 내 영토는 전부 사라진다.</li>
          <li>90초 뒤 점수(땅 1칸 1점 + 킬 {KILL_SCORE}점)가 가장 높은 쪽이 이긴다. 목숨은 3개.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>난이도</h2>
        <div className="difficulty">
          {DIFFICULTIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selected ? "chip chip--on" : "chip"}
              onClick={() => onSelect(item.id)}
            >
              <b>{item.label}</b>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </section>

      <button type="button" className="primary" onClick={onStart}>
        게임 시작
      </button>

      <p className="hint">방향키 · WASD · 스와이프로 이동 / Esc · P 로 일시정지</p>
    </div>
  );
}
