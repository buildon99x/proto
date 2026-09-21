/* 지그재그 폴리라인 — 과장 없이 실제 각도로 그린다.
 * x·y 픽셀 배율을 같게 유지해야 월드 각도가 곧 화면 각도가 된다
 * (spec.md "지그재그 각도 — 속도와 직교한다" 와 같은 규칙). */
function zigzag(w, h, riseDeg, fallDeg, pad) {
  const p = pad == null ? 12 : pad;
  const top = p;
  const bot = h - p;
  const amp = bot - top;
  const dxUp = amp / Math.tan((riseDeg * Math.PI) / 180);
  const dxDn = amp / Math.tan((fallDeg * Math.PI) / 180);

  const pts = [];
  let x = 0;
  let y = bot;
  let up = true;
  pts.push([x, y]);
  while (x < w) {
    x += up ? dxUp : dxDn;
    y = up ? top : bot;
    pts.push([x, y]);
    up = !up;
  }
  // 마지막 변을 오른쪽 경계에서 잘라 카드 폭을 넘지 않게 한다
  const [px, py] = pts[pts.length - 2];
  const [qx, qy] = pts[pts.length - 1];
  if (qx > w) {
    const t = (w - px) / (qx - px);
    pts[pts.length - 1] = [w, py + (qy - py) * t];
  }
  return pts.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(" ");
}
