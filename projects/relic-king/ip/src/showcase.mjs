// 쇼케이스를 게임 번들 옆(app/public/ip/)에 복사한다 → 런처 /runs/relic-king/ip/
// 게임은 이 폴더를 읽지 않는다. 런타임 외부 요청 0.
import { cpSync, mkdirSync, rmSync, copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { IP } from "./lib.mjs";

const OUT = path.resolve(IP, "../app/public/ip");
const ART = {
  "keyvisual.png": "keyvisual/keyvisual.png",
  "crew-lineup.png": "crew/crew-lineup.png",
  "conversion-overlay.png": "crew/conversion-overlay.png",
  "place-01-gyeongju.png": "places/place-01-gyeongju.png",
  "place-02-mars-shelf.png": "places/place-02-mars-shelf.png",
  "place-03-orbital-market.png": "places/place-03-orbital-market.png",
  "dir-a.png": "directions/dir-a.png", "dir-b.png": "directions/dir-b.png",
  "dir-c.png": "directions/dir-c.png", "dir-d.png": "directions/dir-d.png",
  "find-silla-gold-crown.png": "finds/silla-gold-crown.png",
  "sprite-seo-gaon.png": "crew/sprite-seo-gaon.png",
  "sprite-mira-anyango.png": "crew/sprite-mira-anyango.png",
  "sprite-jeong-dokyeong.png": "crew/sprite-jeong-dokyeong.png",
  "sprite-haedal-hd8.png": "crew/sprite-haedal-hd8.png",
  "sprite-yeoe7.png": "crew/sprite-yeoe7.png"
};
export function publishShowcase() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(path.join(OUT, "art"), { recursive: true });
  copyFileSync(path.join(IP, "showcase/index.html"), path.join(OUT, "index.html"));
  for (const [dst, src] of Object.entries(ART)) copyFileSync(path.join(IP, "art", src), path.join(OUT, "art", dst));
  const html = readFileSync(path.join(OUT, "index.html"), "utf8");
  const fonts = [...html.matchAll(/fonts\/(rk-[a-z0-9-]+\.woff2)/g)].map((m) => m[1]);
  mkdirSync(path.join(OUT, "fonts"), { recursive: true });
  for (const f of new Set(fonts)) copyFileSync(path.join(IP, "fonts", f), path.join(OUT, "fonts", f));
  return OUT;
}
