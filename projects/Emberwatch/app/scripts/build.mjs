import { cp, mkdir, rm } from 'node:fs/promises';

const source = new URL('../src/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'style.css', 'data.js', 'growth.js', 'combat.js', 'encounters.js', 'motion.js', 'audio.js', 'game.js', 'visual.js', 'art.js', 'assets', 'review.html']) {
  await cp(new URL(file, source), new URL(file, output), { recursive: true });
}
console.log('Built Emberwatch static artifact in app/dist');
