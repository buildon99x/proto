const { mkdirSync, writeFileSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { spawnSync } = require("node:child_process");

const task = process.argv[2];

if (!task) {
  console.error("Usage: node scripts/run-turbo.cjs <task>");
  process.exit(1);
}

const root = join(__dirname, "..");
const shimDir = join(root, ".cache", "bin");
mkdirSync(shimDir, { recursive: true });

const pnpmExecPath = process.env.npm_execpath;

if (pnpmExecPath) {
  if (process.platform === "win32") {
    writeFileSync(
      join(shimDir, "pnpm.cmd"),
      `@echo off\r\n"${process.execPath}" "${pnpmExecPath}" %*\r\n`,
      "utf8"
    );
  } else {
    const shimPath = join(shimDir, "pnpm");
    writeFileSync(shimPath, `#!/usr/bin/env sh\n"${process.execPath}" "${pnpmExecPath}" "$@"\n`, {
      encoding: "utf8",
      mode: 0o755
    });
  }
}

const pathValue = [shimDir, dirname(process.execPath), process.env.PATH || ""].join(
  process.platform === "win32" ? ";" : ":"
);

const result = spawnSync("turbo", [task], {
  cwd: root,
  env: {
    ...process.env,
    PATH: pathValue
  },
  shell: process.platform === "win32",
  stdio: "inherit"
});

process.exit(result.status ?? 1);
