/**
 * 짧은 합성음(v0.6.6, `notes/decision-tree-10h.md` P4). 소리 파일은 쓰지 않는다 —
 * Web Audio 발진기로 그 자리에서 만든다(런타임 외부 리소스 0, `AGENTS.md` 환경 제약).
 *
 * 브라우저 자동재생 정책 때문에 AudioContext는 **사람이 처음 누른 뒤에** 만든다.
 * 그 전이거나 컨텍스트가 멈춰(suspended) 있으면 소리는 조용히 건너뛴다.
 * 음소거(`world.settings.muted`)는 부르는 쪽이 넘긴다.
 */

export type Cue = "uniqueTip" | "raceWon" | "raceLost" | "uniqueAcquired";

type Note = { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number };

/** 음 하나하나는 0.1~0.4초다. 길게 울리지 않는다. */
const CUES: Record<Cue, Note[]> = {
  // 유일 제보 — 높은 두 음을 두 번. 놓치지 않게 가장 또렷하다.
  uniqueTip: [
    { freq: 880, at: 0, dur: 0.12, type: "square", gain: 0.09 },
    { freq: 1320, at: 0.14, dur: 0.12, type: "square", gain: 0.09 },
    { freq: 880, at: 0.36, dur: 0.12, type: "square", gain: 0.09 },
    { freq: 1320, at: 0.5, dur: 0.2, type: "square", gain: 0.09 }
  ],
  // 레이스 승 — 올라가는 장3화음
  raceWon: [
    { freq: 523.25, at: 0, dur: 0.12 },
    { freq: 659.25, at: 0.1, dur: 0.12 },
    { freq: 783.99, at: 0.2, dur: 0.24 }
  ],
  // 레이스 패 — 내려가는 두 음
  raceLost: [
    { freq: 392, at: 0, dur: 0.16, type: "sawtooth", gain: 0.06 },
    { freq: 293.66, at: 0.16, dur: 0.3, type: "sawtooth", gain: 0.06 }
  ],
  // 유일 획득 — 한 옥타브를 넘어 올라가는 아르페지오
  uniqueAcquired: [
    { freq: 523.25, at: 0, dur: 0.14 },
    { freq: 659.25, at: 0.12, dur: 0.14 },
    { freq: 783.99, at: 0.24, dur: 0.14 },
    { freq: 1046.5, at: 0.36, dur: 0.4, gain: 0.14 }
  ]
};

let ctx: AudioContext | null = null;

/**
 * 어떤 신호를 언제 요청했는지 남긴다(최근 20건). `tests/e2e/play.mjs`가 읽는다 —
 * 헤드리스 브라우저에서는 소리를 들을 수 없으니 "울려야 할 때 울리려 했는가"를 본다.
 */
type CueRecord = { cue: Cue; muted: boolean; played: boolean };
function recordCue(cue: Cue, muted: boolean, played: boolean) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __relicKingCues?: CueRecord[] };
  const list = (w.__relicKingCues ??= []);
  list.push({ cue, muted, played });
  if (list.length > 20) list.shift();
}
let armed = false;

function contextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** 첫 사용자 입력에서 컨텍스트를 만든다. 앱 시작 때 한 번 부른다. */
export function armAudio(): void {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const unlock = () => {
    try {
      const Ctor = contextCtor();
      if (!Ctor) return;
      if (!ctx) ctx = new Ctor();
      if (ctx.state === "suspended") void ctx.resume();
    } catch {
      /* 오디오를 못 쓰는 환경 — 소리 없이 계속한다 */
    }
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

/** 신호음을 한 번 울린다. 음소거거나 컨텍스트가 없거나 멈춰 있으면 아무것도 안 한다. */
export function playCue(cue: Cue, muted: boolean): boolean {
  const played = !muted && !!ctx && ctx.state === "running";
  recordCue(cue, muted, played);
  if (!played || !ctx) return false;
  try {
    const t0 = ctx.currentTime + 0.01;
    for (const n of CUES[cue]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type ?? "triangle";
      osc.frequency.value = n.freq;
      const peak = n.gain ?? 0.12;
      const start = t0 + n.at;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + n.dur + 0.02);
    }
    return true;
  } catch {
    return false;
  }
}
