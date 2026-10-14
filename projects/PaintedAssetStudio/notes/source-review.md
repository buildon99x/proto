# Upstream installation/execution review

Official source: https://github.com/aliceisjustplaying/claude-paint
Pinned: 8ee1cdd67f510a55eb6dc279e7113c593e1b282a

Reviewed root README; notes/easel_guide.md; harness/easel_mcp/README.md and REMOTE.md; crates/easel/src/main.rs; crates/easel/src/session.rs's Lua setup and hash probe; workspace/package Cargo manifests; both build.rs files; .cargo/config.toml; LICENSE and THIRD_PARTY_NOTICES.md.

- Code MIT; included artworks/logs/text CC BY 4.0. Use original new compositions, preserve code notices and source attribution.
- Official Rust release build with locked Cargo dependencies and C compiler. Package build.rs scripts select compile flags/features; no network installer invoked by project setup.
- main.rs dispatches open/do/look/note/status/log/save/close and developer run/check. Live session communication is a Unix socket. `run` is a disposable local replay process; this CLI does not start remote HTTP or a tunnel.
- Lua receives table/string/math/UTF8 libraries; file/OS access is removed. Our CLI supplies only generated original Lua, never evaluates arbitrary downloaded artwork logs.
- The stdio MCP adapter would require uv and mcp==1.30.0. Not necessary for this workflow. REMOTE.md requires a bearer token and separate tunnel approval; we do not launch it or create credentials.
- Original RGB delivery is opaque. Look companions/gallery lighting are observations; output here is direct color PNG. Pigment mixtures do not encode exact RGB/HEX.
- Replay width is physical simulation resolution; our job declares a native width and all rounds/replay checks use it. Upstream treats narrower `run --width` as a development preview relative to its default live 2400px painting. We explicitly define these local assets at their requested replay resolutions, without claiming equivalence to a 2400px live canvas.
- Fixed Lua hash CFLAGS must be active in engine cwd. First wrong-config build was refused by the engine; cleaning mlua-sys in release and rebuilding with original config produced the expected hash probe.

## First installation/execution record
Rust 1.99.0 installed into /workspace/rust from official rustup, with no shell profile modification. One official crates.io request initially returned HTTP 403 `No approved upstream IPv4 address`; direct check of the same official URL later returned 200, and the same build succeeded. This was a transient network response, not an automatic approval rejection, and no alternate host or access bypass was used.

First execution refused random Lua hash seed; receipt retained in first-execution-failure.json. Fixed build's hash probe is:
`31,24,5,8,28,22,12,6,19,26,4,20,1,3,30,11,0,15,14,10,9,17,7,27,2,18,13,21,16,29,23,25,`

`live-engine-proof/commands.json` contains successful actual original `open`, `do` (paint), `look`, `note`, `status`, `log`, `save`, `close`; proof.png and sketch-proof.lua retain the original live result. Samples retain actual replay command receipts. No external AI API, payment, public hosting, main merge or engine source patch was used.
