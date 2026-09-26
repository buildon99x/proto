#!/usr/bin/env node
// IP 그림용 폰트 원본을 빌드타임에 받아 ip/.cache/fonts 에 둔다(커밋하지 않는다).
//
//   node ip/src/fetch-fonts.mjs
//
// 런타임 외부 리소스 0 규칙은 그대로다. 받은 원본은 build.mjs 가 실제로 쓰인 글자만
// 남겨 ip/fonts/*.woff2 로 서브셋해 커밋한다. 라이선스는 전부 SIL OFL 1.1.
//   - Galmuri (도트 한글, 기록 카드·라벨)   npm `galmuri`
//   - Noto Serif KR / Noto Sans KR          github notofonts/noto-cjk (raw)
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache/fonts");
mkdirSync(CACHE, { recursive: true });

const NOTO = [
  ["Serif", "NotoSerifKR-Regular.otf"],
  ["Serif", "NotoSerifKR-Bold.otf"],
  ["Serif", "NotoSerifKR-Black.otf"],
  ["Sans", "NotoSansKR-Regular.otf"],
  ["Sans", "NotoSansKR-Bold.otf"]
];
for (const [kind, file] of NOTO) {
  const out = path.join(CACHE, file);
  if (existsSync(out)) continue;
  const url = `https://raw.githubusercontent.com/notofonts/noto-cjk/main/${kind}/SubsetOTF/KR/${file}`;
  console.log("fetch", url);
  execSync(`curl -sSfL -o "${out}" "${url}"`, { stdio: "inherit" });
}

if (!existsSync(path.join(CACHE, "Galmuri11.ttf"))) {
  const tmp = path.join(CACHE, "_galmuri");
  mkdirSync(tmp, { recursive: true });
  execSync(`npm pack galmuri@2.40.3 --silent`, { cwd: tmp, stdio: "inherit" });
  const tgz = readdirSync(tmp).find((f) => f.endsWith(".tgz"));
  execSync(`tar xzf "${tgz}"`, { cwd: tmp });
  for (const f of ["Galmuri11.ttf", "Galmuri11-Bold.ttf", "Galmuri9.ttf", "GalmuriMono9.ttf"]) {
    copyFileSync(path.join(tmp, "package/dist", f), path.join(CACHE, f));
  }
  copyFileSync(path.join(tmp, "package/ofl.md"), path.join(CACHE, "Galmuri-OFL.md"));
}
writeFileSync(path.join(CACHE, ".ok"), new Date().toISOString());
console.log("fonts ready:", readdirSync(CACHE).filter((f) => /\.(otf|ttf)$/.test(f)).join(", "));
