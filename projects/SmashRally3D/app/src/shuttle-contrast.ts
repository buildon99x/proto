type ScreenPoint = { x: number; y: number; z: number };
export type ShuttleContrast = {
    visible: boolean;
    x: number;
    y: number;
    angle: number;
    opacity: number;
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));

// A screen-space silhouette for a small, high shuttle. It never changes the
// model, trajectory or hit volume, and is removed on the actual contact frame.
export function shuttleContrast(input: {
    cork: ScreenPoint;
    tail: ScreenPoint;
    height: number;
    width: number;
    viewportHeight: number;
    rally: boolean;
    paused: boolean;
    contact: boolean;
}): ShuttleContrast {
    const { cork, tail, height, width, viewportHeight, rally, paused, contact } = input;
    const valid = [cork.x, cork.y, cork.z, tail.x, tail.y, tail.z, height].every(Number.isFinite);
    const size = 2 * Math.hypot(tail.x - cork.x, tail.y - cork.y);
    const opacity =
        valid &&
        rally &&
        !paused &&
        !contact &&
        cork.z > 0 &&
        tail.z > 0 &&
        cork.x >= 10 &&
        cork.x <= width - 10 &&
        cork.y >= 10 &&
        cork.y <= viewportHeight - 10
            ? clamp((height - 3.4) / 1.4) * clamp((18 - size) / 6)
            : 0;
    return {
        visible: opacity > 0,
        x: cork.x,
        y: cork.y,
        angle: (Math.atan2(tail.y - cork.y, tail.x - cork.x) * 180) / Math.PI + 90,
        opacity,
    };
}

export const shuttleContrastSvg =
    '<svg viewBox="-10 -10 20 20" width="20" height="20" aria-hidden="true"><path d="M-1-1 -4-8 Q0-10 4-8 L1-1Z" fill="#fff9ed" stroke="#102b3b" stroke-width="1.4" stroke-linejoin="round"/><path d="M0-8V-1" stroke="#73909a" stroke-width=".6"/><circle r="1.8" fill="#fff9ed" stroke="#102b3b" stroke-width="1.3"/></svg>';
