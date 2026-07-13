// 표준 10프레임 볼링 점수 계산. 스트라이크/스페어 보너스, 10프레임 3구 처리.

export interface FrameScore {
  rolls: number[];
  /** 이 프레임 자체 점수(보너스 포함). 아직 확정 못하면 null. */
  score: number | null;
  /** 누적 합계. 앞 프레임까지 모두 확정됐을 때만 값. */
  cumulative: number | null;
  isStrike: boolean;
  isSpare: boolean;
}

export interface GameScore {
  frames: FrameScore[];
  total: number;
}

/**
 * frames: 프레임별 핀 수 배열. 1~9프레임 스트라이크는 [10], 스페어는 [a, 10-a],
 * 오픈은 [a, b]. 10프레임은 최대 3개.
 */
export function scoreGame(frames: number[][]): GameScore {
  const flat: number[] = [];
  const startIdx: number[] = [];
  for (const f of frames) {
    startIdx.push(flat.length);
    flat.push(...f);
  }
  const roll = (i: number): number | undefined => (i < flat.length ? flat[i] : undefined);

  const result: FrameScore[] = [];
  let running = 0;
  let stillComplete = true; // 앞 프레임까지 전부 확정됐는지

  for (let f = 0; f < 10; f++) {
    if (f >= frames.length) {
      result.push({ rolls: [], score: null, cumulative: null, isStrike: false, isSpare: false });
      continue;
    }
    const fr = frames[f];
    const s = startIdx[f];
    let frameScore: number | null = null;
    let isStrike = false;
    let isSpare = false;

    if (f < 9) {
      const first = roll(s);
      if (first === 10) {
        isStrike = true;
        const b1 = roll(s + 1);
        const b2 = roll(s + 2);
        if (b1 !== undefined && b2 !== undefined) frameScore = 10 + b1 + b2;
      } else {
        const a = roll(s);
        const b = roll(s + 1);
        if (a !== undefined && b !== undefined) {
          if (a + b === 10) {
            isSpare = true;
            const bonus = roll(s + 2);
            if (bonus !== undefined) frameScore = 10 + bonus;
          } else {
            frameScore = a + b;
          }
        }
      }
    } else {
      // 10프레임: 자체 굴린 공만으로 계산.
      isStrike = fr[0] === 10;
      isSpare = !isStrike && fr.length >= 2 && fr[0] + fr[1] === 10;
      const needThree = isStrike || isSpare;
      const done = needThree ? fr.length === 3 : fr.length === 2;
      if (done) frameScore = fr.reduce((a, b) => a + b, 0);
    }

    if (frameScore === null) stillComplete = false;

    if (frameScore !== null && stillComplete) {
      running += frameScore;
      result.push({ rolls: fr, score: frameScore, cumulative: running, isStrike, isSpare });
    } else {
      result.push({ rolls: fr, score: frameScore, cumulative: null, isStrike, isSpare });
    }
  }

  return { frames: result, total: running };
}

/** 스코어시트 셀에 찍을 마크 문자열. */
export function rollMark(pins: number, prevPins: number | null, isFirst: boolean): string {
  if (pins === 10 && isFirst) return "X";
  if (!isFirst && prevPins !== null && prevPins !== 10 && prevPins + pins === 10) return "/";
  if (pins === 0) return "-";
  return String(pins);
}

/** 최종 점수 → 랭크. */
export function rankFor(total: number): string {
  if (total >= 300) return "PERFECT";
  if (total >= 250) return "LEGEND";
  if (total >= 200) return "PRO";
  if (total >= 160) return "GREAT";
  if (total >= 120) return "GOOD";
  if (total >= 80) return "OK";
  return "ROOKIE";
}
