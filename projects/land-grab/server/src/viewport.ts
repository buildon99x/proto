/**
 * 접속 하나가 "어느 타일까지 받아 갔는지"를 기억한다.
 *
 * `600 × 600` 은 36만 칸이라 접속마다 전부 보낼 수 없다. splix 처럼 주변 사각형만
 * 보내고, 움직이면 **가장자리에 붙는 조각만** 덧붙인다. 타일 데이터는 압축하지
 * 않는다 — 조각이 작아서 압축이 오히려 손해다.
 */

export type Rect = { x: number; y: number; w: number; h: number };

/**
 * `next` 에서 `prev` 를 뺀 나머지. 최대 4조각(위·아래·왼쪽·오른쪽 띠)으로 쪼갠다.
 * 겹치지 않으면 `next` 를 통째로 돌려준다.
 */
export function subtractRect(next: Rect, prev: Rect | null): Rect[] {
  if (!prev) {
    return [next];
  }

  const nextRight = next.x + next.w;
  const nextBottom = next.y + next.h;
  const prevRight = prev.x + prev.w;
  const prevBottom = prev.y + prev.h;

  const disjoint = nextRight <= prev.x || prevRight <= next.x || nextBottom <= prev.y || prevBottom <= next.y;
  if (disjoint) {
    return [next];
  }

  const strips: Rect[] = [];

  if (next.y < prev.y) {
    strips.push({ x: next.x, y: next.y, w: next.w, h: prev.y - next.y });
  }
  if (nextBottom > prevBottom) {
    strips.push({ x: next.x, y: prevBottom, w: next.w, h: nextBottom - prevBottom });
  }

  // 위아래 띠를 뺀 가운데 구간에서만 좌우 띠를 잘라낸다. 그러지 않으면 모서리가 겹쳐
  // 같은 타일을 두 번 보낸다.
  const bandTop = Math.max(next.y, prev.y);
  const bandBottom = Math.min(nextBottom, prevBottom);
  const bandHeight = bandBottom - bandTop;

  if (bandHeight > 0) {
    if (next.x < prev.x) {
      strips.push({ x: next.x, y: bandTop, w: prev.x - next.x, h: bandHeight });
    }
    if (nextRight > prevRight) {
      strips.push({ x: prevRight, y: bandTop, w: nextRight - prevRight, h: bandHeight });
    }
  }

  return strips;
}

/** 두 사각형의 교집합. 겹치지 않으면 `null`. */
export function intersectRect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  if (right <= x || bottom <= y) {
    return null;
  }
  return { x, y, w: right - x, h: bottom - y };
}

export class ViewportSync {
  /** 지금 "최신이라고 보장하는" 영역. 이 밖은 클라이언트에 남아 있어도 신뢰하지 않는다. */
  private sent: Rect | null = null;

  /**
   * @param boardSize 보드 한 변.
   * @param span 한 번에 보낼 사각형의 한 변.
   * @param margin 중심이 가장자리에서 이만큼 안으로 들어오면 다시 잡는다.
   *   **화면 반폭보다 커야 한다.** 작으면 다시 잡기 전에 화면이 보낸 영역을 넘어선다.
   */
  constructor(
    private readonly boardSize: number,
    private readonly span: number,
    private readonly margin: number
  ) {}

  get current(): Rect | null {
    return this.sent;
  }

  /** 다시 처음부터 보낸다. 리스폰처럼 위치가 순간이동했을 때 쓴다. */
  reset(): void {
    this.sent = null;
  }

  /**
   * 중심을 따라간다.
   * @returns 새로 보내야 할 사각형 목록. 움직일 필요가 없으면 빈 배열.
   */
  follow(centerX: number, centerY: number): Rect[] {
    const desired = this.rectAround(centerX, centerY);

    if (!this.sent) {
      this.sent = desired;
      return [desired];
    }

    const left = centerX - this.sent.x;
    const top = centerY - this.sent.y;
    const right = this.sent.x + this.sent.w - 1 - centerX;
    const bottom = this.sent.y + this.sent.h - 1 - centerY;
    const comfortable =
      left >= this.margin && top >= this.margin && right >= this.margin && bottom >= this.margin;

    if (comfortable) {
      return [];
    }

    const strips = subtractRect(desired, this.sent);
    this.sent = desired;
    return strips;
  }

  /** 바뀐 영역 중 이미 보낸 영역과 겹치는 부분. 겹치지 않으면 `null`. */
  clip(rect: Rect): Rect | null {
    return this.sent ? intersectRect(rect, this.sent) : null;
  }

  private rectAround(centerX: number, centerY: number): Rect {
    const w = Math.min(this.span, this.boardSize);
    const h = Math.min(this.span, this.boardSize);
    const x = Math.max(0, Math.min(this.boardSize - w, centerX - Math.floor(w / 2)));
    const y = Math.max(0, Math.min(this.boardSize - h, centerY - Math.floor(h / 2)));
    return { x, y, w, h };
  }
}
