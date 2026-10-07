import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let count = 0;
for (const directory of ['src', 'scripts', 'tests']) {
  const root = new URL(`../${directory}/`, import.meta.url);
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.m?js$/.test(entry.name)) continue;
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(entry.name, root))], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
    count++;
  }
}
console.log(`PASS: JavaScript syntax checks (${count} files); no static type checking is claimed`);
