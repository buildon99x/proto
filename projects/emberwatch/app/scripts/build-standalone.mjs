import { readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
let html = await readFile(new URL('index.html', dist), 'utf8');
const css = (await readFile(new URL('style.css', dist), 'utf8')).replace(/^@import[^\n]*\n/, '');
const data = (await readFile(new URL('data.js', dist), 'utf8')).replace(/export /g, '');
const game = (await readFile(new URL('game.js', dist), 'utf8')).replace(/^import[^\n]*\n/, '');
html = html.replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)
  .replace('<script type="module" src="game.js"></script>', `<script type="module">${data}\n${game}</script>`);
await writeFile(new URL('Emberwatch.html', dist), html);
console.log('Created self-contained app/dist/Emberwatch.html');
