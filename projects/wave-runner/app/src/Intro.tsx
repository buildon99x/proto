import { useEffect, useRef, useState } from "react";
import { NEUTRAL_BUILD, resolve } from "./game/axes";
import { BASE_TUNING } from "./game/engine";
import { DEFAULT_RUNNER, applyRunner, silhouetteOf } from "./game/runners";

/**
 * 첫 실행 안내.
 *
 * ## 읽히는 튜토리얼이 아니라 손끝 핸드셰이크다
 *
 * brief 의 대상 조항은 "설치도 계정도 튜토리얼도 없다" 이고, 그 조항이 지키려는 것은
 * **지시를 읽게 만들지 않는 것**이다. 그래서 여기에는 진행 단계도, 넘기기 버튼도,
 * 읽고 확인해야 하는 문단도 없다. 한 번 누르고 한 번 놓으면 끝난다 — 실측 1초 남짓이라
 * "브라우저에서 30초 안에 시작한다"도 깨지 않는다.
 *
 * ## 안내를 끄는 것이 곧 첫 판을 시작하는 것이다
 *
 * "다시 보지 않기" 체크박스가 없다. 손끝으로 두 동작을 익히면 마지막 한 번의 누름이
 * `onDone` 이고, 그 누름이 그대로 첫 스테이지의 출발이다. 끄는 행위를 따로 만들면
 * 그것 자체가 읽고 판단해야 하는 일이 되어 조항을 어긴다.
 *
 * ## 그림은 실제 계수로 그린다
 *
 * 궤적은 손으로 그린 예시가 아니라 `resolve()` 가 준 상승·하강 속도와 전진 속도를
 * 그대로 적분한 것이고, 아바타는 `silhouetteOf` 를 히트박스 반지름으로 키운 것이다.
 * x·y 배율이 같으므로 여기서 보는 각도가 플레이 중 각도와 같다 — 홈 피커가 지그재그를
 * 과장하지 않는 것과 같은 이유다. 다른 그림을 보여주면 안내가 첫 거짓말이 된다.
 */

/**
 * 보여줄 월드 창. x·y 를 같은 배율로 그리므로 **여기 보이는 각도가 플레이 중 각도**다
 * (표준 기체 45°). 홈 피커가 지그재그를 과장하지 않는 것과 같은 규칙이다.
 *
 * 가로는 약 2초치 궤적이 담기게 잡았다 — 한 번 오르고 한 번 내리는 것이 한 화면에
 * 들어와야 "누르면 오른다 · 놓으면 내려간다" 가 **한 장의 그림으로** 읽힌다.
 */
const VIEW_W = 90;
const VIEW_H = 44;
/** 아바타의 가로 위치. 궤적은 여기서 왼쪽으로 흘러가 지나온 것이 된다 */
const ANCHOR = VIEW_W - 8;
/** 천장·바닥 여유. 히트박스(1.6)보다 넉넉히 둔다 */
const PAD = 3.5;
/** 한 동작을 "해 봤다" 로 칠 세로 이동량(월드 단위). 45° 기준 약 0.21초다 */
const NEED = 9;
/** 두 동작을 끝낸 뒤 이 시간이 지나야 시작 입력을 받는다 — 놓는 순간 튀어 나가지 않게 */
const ARM_SEC = 0.35;

type Step = "hold" | "release" | "go";

const CUE: Record<Step, string> = {
  hold: "누르고 있어 보세요",
  release: "이제 놓아 보세요",
  go: "익혔다"
};

export function Intro({ first, onDone }: { first: boolean; onDone: () => void }) {
  const [step, setStep] = useState<Step>("hold");
  const [armed, setArmed] = useState(false);
  const pathRef = useRef<SVGPathElement | null>(null);
  const shipRef = useRef<SVGPolygonElement | null>(null);
  const stepRef = useRef<Step>("hold");
  const armedRef = useRef(false);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // 표준 기체의 눈금 0 — 첫 판이 실제로 쓰는 계수 그대로다.
    const tuning = applyRunner(BASE_TUNING, DEFAULT_RUNNER);
    const r = resolve(NEUTRAL_BUILD, tuning);
    const shape = silhouetteOf(DEFAULT_RUNNER)
      .points.map(([x, y]) => `${(x * tuning.radius).toFixed(2)},${(y * tuning.radius).toFixed(2)}`)
      .join(" ");
    if (shipRef.current) shipRef.current.setAttribute("points", shape);

    let y = VIEW_H / 2;
    let camY = 0;
    let holding = false;
    let rose = 0;
    let fell = 0;
    let sinceGo = 0;
    // 아바타는 ANCHOR 에 서 있고 세계가 왼쪽으로 흐른다 — 플레이 중과 같다.
    let pts: Array<[number, number]> = [[ANCHOR, y]];
    let raf = 0;
    let last = performance.now();

    const advance = (next: Step) => {
      stepRef.current = next;
      setStep(next);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const vy = holding ? -r.riseRate : r.fallRate;
      y += vy * dt;

      /**
       * 가두지 않고 **세로로 따라간다.**
       *
       * 처음엔 y 를 창 안에 clamp 했는데, 꾹 누르고 있으면 천장에 붙어 **수평 구간**이
       * 그려졌다 — "가만히 있는 선택지는 없다" 고 써 놓고 그림이 멈춰 있는 것을 보여주는
       * 셈이다. 카메라가 여유(PAD) 밖으로 나가려 할 때만 따라가면 궤적은 언제나 기울어져
       * 있고, 평행이동이라 각도도 그대로다. 여기서 죽지 않는 것은 그대로다 — 첫 경험이
       * 사망이면 배운 것이 "이 게임은 나를 죽인다" 하나뿐이다.
       */
      if (y - camY < PAD) camY = y - PAD;
      else if (y - camY > VIEW_H - PAD) camY = y - (VIEW_H - PAD);

      if (holding) rose += r.riseRate * dt;
      else if (stepRef.current !== "hold") fell += r.fallRate * dt;

      if (stepRef.current === "hold" && rose >= NEED) advance("release");
      else if (stepRef.current === "release" && fell >= NEED) advance("go");

      if (stepRef.current === "go") {
        sinceGo += dt;
        if (!armedRef.current && sinceGo >= ARM_SEC) {
          armedRef.current = true;
          setArmed(true);
        }
      }

      // 되감지 않고 흘려보낸다. 창 끝에서 그림이 끊기면 조작의 연속성이 같이 끊긴다.
      const shift = r.speed * dt;
      for (const p of pts) p[0] -= shift;
      pts.push([ANCHOR, y]);
      while (pts.length > 1 && pts[1][0] < 0) pts.shift();

      if (pathRef.current) {
        pathRef.current.setAttribute(
          "d",
          pts
            .map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(2)} ${(py - camY).toFixed(2)}`)
            .join(" ")
        );
      }
      if (shipRef.current) {
        const deg = (Math.atan2(vy, r.speed) * 180) / Math.PI;
        shipRef.current.setAttribute(
          "transform",
          `translate(${ANCHOR.toFixed(2)} ${(y - camY).toFixed(2)}) rotate(${deg.toFixed(1)})`
        );
      }
    };
    raf = requestAnimationFrame(frame);

    /**
     * 활성 포인터를 센다 — 플레이 중과 같은 규칙이다. 여기서만 다르게 굴면
     * 익힌 것이 본 게임에서 한 번 배신당한다.
     */
    const down = new Set<number>();
    const press = () => {
      if (stepRef.current === "go" && armedRef.current && !doneRef.current) {
        doneRef.current = true;
        onDoneRef.current();
        return;
      }
      holding = true;
    };
    const release = () => {
      holding = false;
    };

    const isHoldKey = (e: KeyboardEvent) => e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp";
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isHoldKey(e)) return;
      e.preventDefault();
      if (!e.repeat) press();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!isHoldKey(e)) return;
      e.preventDefault();
      release();
    };
    const onPointerDown = (e: PointerEvent) => {
      down.add(e.pointerId);
      press();
    };
    const onPointerUp = (e: PointerEvent) => {
      down.delete(e.pointerId);
      if (down.size === 0) release();
    };
    const onBlur = () => {
      down.clear();
      release();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("blur", onBlur);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <section className="panel intro" data-step={step}>
      <header className="panel-head">
        <h1>Wave Runner</h1>
        <p>
          버튼은 하나뿐이고, 그 하나가 위아래를 정한다.
        </p>
      </header>

      <div className="intro-stage">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <path ref={pathRef} d="" />
          <polygon ref={shipRef} points="" />
        </svg>
        <p className="intro-cue">{CUE[step]}</p>
      </div>

      <ol className="intro-steps">
        <li className={step === "hold" ? "now" : "done"}>
          <b>누르면</b> 오른다
        </li>
        <li className={step === "hold" ? "" : step === "release" ? "now" : "done"}>
          <b>놓으면</b> 내려간다
        </li>
      </ol>

      <ul className="intro-facts">
        <li>가만히 있는 선택지는 없다 — 누르거나, 놓거나</li>
        <li>벽에 닿으면 즉시 죽고 0.5초 뒤 스스로 처음부터 다시 시작한다</li>
        <li>갈림길을 지나면 한 축이 오르고 다른 축이 내린다. 순수한 상승은 없다</li>
      </ul>

      <p className={`cue${armed ? "" : " waiting"}`}>
        {armed ? (first ? "누르면 첫 판이 시작된다" : "누르면 돌아간다") : "먼저 손끝으로 익힌다"}
      </p>
    </section>
  );
}
