import { createRequire } from "node:module";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(path.resolve(".playtest/package.json")),
  p = require("puppeteer"),
  out = path.resolve("projects/SmashRally3D/verification/audio");
await mkdir(out, { recursive: true });
const b = await p.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await b.newPage();
  await page.goto("http://127.0.0.1:5173/?audio-review");
  await page.waitForFunction(
    () => typeof window.smashAudioReview === "function",
  );
  const samples = await page.evaluate(() => window.smashAudioReview());
  const metrics = [];
  for (const s of samples) {
    const buf = Buffer.alloc(44 + s.pcm.length * 2);
    buf.write("RIFF", 0);
    buf.writeUInt32LE(buf.length - 8, 4);
    buf.write("WAVEfmt ", 8);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(s.sampleRate, 24);
    buf.writeUInt32LE(s.sampleRate * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write("data", 36);
    buf.writeUInt32LE(s.pcm.length * 2, 40);
    let square = 0,
      peak = 0;
    for (let i = 0; i < s.pcm.length; i++) {
      const v = s.pcm[i];
      square += v * v;
      peak = Math.max(peak, Math.abs(v));
      buf.writeInt16LE(
        Math.round(Math.max(-1, Math.min(1, v)) * 32767),
        44 + i * 2,
      );
    }
    await writeFile(path.join(out, s.shot + ".wav"), buf);
    metrics.push({
      shot: s.shot,
      rms: Math.sqrt(square / s.pcm.length),
      peak,
      firstNonzero: s.pcm.findIndex((x) => Math.abs(x) > 1e-6) / s.sampleRate,
      sampleRate: s.sampleRate,
    });
  }
  await writeFile(
    path.join(out, "offline-render.json"),
    JSON.stringify(
      {
        method:
          "Chromium OfflineAudioContext renders the same synthImpact used by live collision events. Numerical PCM checks only; no speaker/headphone listening or physical output latency was measured.",
        metrics,
      },
      null,
      2,
    ),
  );
  console.log(metrics);
} finally {
  await b.close();
}
