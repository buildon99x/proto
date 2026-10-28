# SILT 0.15.1 laptop GPU recheck

Tested source: `5dc647e091c565f6762dd7d57787aed573478d9c` on jh-laptop. Existing QA history was preserved and the detached QA worktree fast-forwarded from 07119b0. No application source was edited. Evidence: `qa-evidence/silt-core-color-laptop-2026-10-16/`.

Actual installed Chrome rendered WebGL2 through `ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)`. This is actual GPU rendering captured from a headless browser. It is not listening, foreground relative mouse feel, or device frame-pacing acceptance.

## Ordinary encounter

`ordinary/normal-browser.json`: fresh workshop-qa profile, Canal Ward tourist difficulty, pistol, actual menu/keyboard input. Read-only mission/camera references and copied events were used for observation; no enemy/player/save setup mutations or direct damage calls.

Walked to the natural sentinel, fired three shell shots, captured exposed amber core, hit the core from 80 to 32, captured the natural reform phase, and confirmed restored shell with core HP still 32. Continued fire killed it: eight shots, one kill, cash 70, player HP 100, no page errors. The exposed/reform screenshots were visually inspected and both show orange/amber rather than the earlier rose core. This short rerun did not repeat extraction routes.

## Explicit GPU fixtures

`fixtures-4/core-color-fixtures.json` passed. Setup freezes simulation, positions player/SILT, disables other enemies, sets exposed/reform phases, adds a synthetic foreground plane, temporarily changes core fog and post shader for controlled comparisons, and forces death/restart. These are synthetic rendering tests, not ordinary gameplay.

- Exposed center pixel: `[255,184,79,255]`; reform: `[220,162,83,255]`.
- Opaque foreground plane: `[37,44,54,255]`; it fully covers the core with no amber showing through.
- Half-transparent plane: `[148,102,100,255]`; it visibly blends/attenuates the core tag. This mixed overlay can look muted rose/brown, consistent with the supplied partial-tag design; it does not remain pure amber through coverage. Zero-opacity control restores `[220,162,83,255]` exactly.
- Actual rifle foreground housing covers the core; its open sight area still reveals the part behind the opening. A sampled covered point is `[7,10,16,255]`.
- At 40 m, fogged core is `[211,159,96,255]` versus `[220,162,83,255]` with core fog explicitly disabled at the same position. Fog remains active and attenuates the amber.
- Death and new scene hide the core and leave no lingering amber pixels at the sampled location.
- With no core visible, the previous 07119b0 and current post shaders were rendered against the exact same GPU frame texture and fixed time. All 518400 pixels / 2073600 RGBA bytes matched exactly. This covers the ordinary world/gun frame for that controlled input; it is not an exhaustive comparison of every scene.
- No page errors or shader compilation errors were observed. Existing Three.js deprecation and missing optional resource/favicon console entries were retained.

`fixtures/` is the initial observer setup failure (renderer reference missing), not an application failure. `fixtures-2/` contains the first successful color/overlay run. `fixtures-3/` adds legacy GPU comparison and weapon occlusion; its first distant-fog sample was too near the HUD reticle and is not used as fog acceptance. The corrected player-height / 40 m / fog-disabled control is in `fixtures-4/`. Historical `normal` helper filenames inside fixture folders do not make those frames ordinary play.

## Automatic verification

All commands exited 0: app tests (58 suites, 1054 PASS lines +22 world checks =1076), 38 syntax files, static app packaging, registry sync (11 projects), and required root aggregate build (27/27 static pages). The 315 existing boundary audits also passed: reload135, item108, cover72. The 0.15.1 manifest and module hashes are retained in `verification.json`. Generated registry/weapon-content working-tree changes were restored and are excluded from this QA-only delivery.

## Library screenshots

All four new files were saved successfully; exact returned names, IDs and versions are retained in `library-delivery.json`.

- Ordinary exposed core: `libfile_f5569e378144819189a2b143048d65f1` — https://chatgpt.com/api/library/files/libfile_f5569e378144819189a2b143048d65f1/download
- Ordinary reform: `libfile_01c9047996cc8191834bebd64b953cf1` — https://chatgpt.com/api/library/files/libfile_01c9047996cc8191834bebd64b953cf1/download
- Explicit opaque occluder: `libfile_a0d60b6bc7f88191af2b543645a21e87` — https://chatgpt.com/api/library/files/libfile_a0d60b6bc7f88191af2b543645a21e87/download
- Explicit half-transparent overlay: `libfile_ed967210efa081919dd378dfa124f6d5` — https://chatgpt.com/api/library/files/libfile_ed967210efa081919dd378dfa124f6d5/download

The previous unoccluded core-color discrepancy is closed for the tested 0.15.1 GPU frames. No additional source defect requiring a dot change was established. Actual audio, foreground manipulation feel and broad performance acceptance remain unverified. No main merge or public deployment was performed.
