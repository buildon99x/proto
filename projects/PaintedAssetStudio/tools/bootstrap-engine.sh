#!/usr/bin/env bash
set -euo pipefail
studio_root=$(cd "$(dirname "$0")/.." && pwd)
engine_root="$studio_root/.engine"
engine_ref=8ee1cdd67f510a55eb6dc279e7113c593e1b282a
# Run only the pinned official source; never run remote installer pipes.
if [[ ! -d "$engine_root/.git" ]]; then
  git clone --filter=blob:none --no-checkout https://github.com/aliceisjustplaying/claude-paint.git "$engine_root"
  git -C "$engine_root" sparse-checkout init --cone
  git -C "$engine_root" sparse-checkout set crates .cargo
  git -C "$engine_root" checkout --detach "$engine_ref"
fi
[[ $(git -C "$engine_root" rev-parse HEAD) == "$engine_ref" ]] || { echo 'Wrong engine revision' >&2; exit 1; }
[[ -z $(git -C "$engine_root" status --porcelain --untracked-files=no) ]] || { echo 'Dirty engine checkout' >&2; exit 1; }
# cargo reads config from cwd, so the upstream fixed-Lua-hash config is active.
(cd "$engine_root" && cargo build --locked --release -p easel)
printf 'Engine: %s\n' "$engine_root/target/release/easel"
