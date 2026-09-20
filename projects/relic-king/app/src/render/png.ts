/**
 * 의존성 없는 최소 PNG 인코더. 컨택트 시트(assets/generated)와 QA 산출물을
 * 굽는 데만 쓴다 — 앱 번들은 이 파일을 import 하지 않는다(브라우저는 canvas를
 * 쓴다, sprite.ts의 spriteUrl 참조).
 *
 * zlib은 Node 내장이라 새 패키지가 필요 없다. 이 프로젝트의 "런타임 외부 요청
 * 금지"와 같은 방향이다 — 빌드 도구도 네트워크 없이 돌아야 한다.
 */
import { deflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** RGBA8 픽셀 배열(길이 = w*h*4)을 PNG 바이트로 인코딩한다. */
export function encodePng(rgba: Uint8Array | Uint8ClampedArray, w: number, h: number): Uint8Array {
  // 필터 0(None) + 스캔라인. 도트 이미지는 색 수가 적어 deflate가 알아서 잘 줄인다.
  const raw = new Uint8Array(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const dst = y * (1 + w * 4);
    raw[dst] = 0;
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), dst + 1);
  }
  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, w);
  iv.setUint32(4, h);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array(deflateSync(raw, { level: 9 }))),
    chunk("IEND", new Uint8Array(0))
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
