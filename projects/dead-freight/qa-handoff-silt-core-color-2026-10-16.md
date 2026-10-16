# SILT amber core correction — 0.15.1

Base: `07119b04511690526c658221ad27a84d77b8476e`, including the complete laptop QA-only history. Implementation was performed on dot in a clean local branch while retaining the earlier source checkpoint. No new dependency, lockfile, gameplay, audio, save schema, world/gun lighting or global accent-palette change. No manual deployment or public-default switch.

## Confirmed cause

The laptop's ordinary exposed-core screenshot and video show a pink/rose core. The authored material `0xffb84f` is converted by pinned Three.js into linear RGB `[1,0.479320183,0.078187422]`. The final screen grade maps all warm colors to a rose palette, producing approximately `[0.604457,0.329396,0.383161]`. Its blue channel exceeds green, contrary to the amber identity. Merely changing the core's source hex would not preserve amber through this mapping.

## Localized correction

`app/liquid-metal-view.js` keeps the core opaque, depth-tested, depth-writing, non-premultiplied and fogged. Its shader writes alpha0 only after normal fragment processing. This alpha is a semantic tag in the existing offscreen RGBA frame, not material transparency.

`app/render-style.js` continues the original cool/rose grade for alpha1 pixels. Tagged core pixels restore the authored linear RGB to display sRGB in the same post pass. It does not add a texture, light or render pass; the additional color conversion is conditional on a nonzero tag. Opaque background/occluders retain alpha1, and normal transparent foreground coverage attenuates the core tag. Partial overlays blend the two grading responses; this is not separate per-layer grading. The final screen output remains alpha1.

Core colors remain `0xffb84f` during disruption and `0xdca252` during reform, with existing distance fog retained. The closed/dead core is still hidden. Ordinary red hit/weapon accents and the world/gun palette are unchanged.

## Evidence and verification boundary

`qa-evidence/silt-core-color-2026-10-16/repro-before.txt` records the new final-color regression failing before the fix. Four additional checks cover both authored amber colors,257 exact legacy-grade samples, bounded/partial tags and core-only shader/material behavior. Focused readability18/view11 checks pass after the final conditional conversion edit. The independent read-only review also expanded the pinned Three shader chunks and verified exactly one final alpha0 write with opaque blending.

The58-suite app run passed1076 named checks (1054 PASS lines+22 world),38 syntax commands, static packaging and315 boundary cases. Focused checks were rerun after the final conditional guard. Final test counts, source hashes and blocked commands are in the adjacent `verification.json` and logs. Full app, syntax, static build and315 existing boundary audits are run. The dot environment's required registry/aggregate commands still fail at tsx IPC `listen EPERM`; the earlier0.15.0 laptop aggregate pass does not establish a0.15.1 aggregate pass.

These are source/numeric/rendererless results. They do not prove corrected actual GPU pixels. The previous laptop SILT normal combat and separate extraction/save runs remain evidence for0.15.0. Actual sound, foreground relative mouse feel, device frame pacing and human-motion naturalness remain unverified.

## Next laptop checks

Use the exact newly supplied remote commit in a preserved/clean worktree, existing dependencies and a fresh isolated browser profile. Run the existing app tests/lint/build and required registry/aggregate commands. Build-manifest must show0.15.1 and matching `liquid-metal-view.js`/`render-style.js` hashes.

Repeat the ordinary Canal Ward SILT encounter with the supported `?testProfile=workshop-qa` profile. Capture exposed core and reform before/after shots. Confirm orange/amber rather than pink, normal fog, opaque wall/core-cage/weapon occlusion, transparent foreground coverage, and no lingering colored pixels after core death or scene restart. Compare an ordinary world/gun frame with no core to the previous source. Any explicit placement/frozen-time/synthetic setup remains a separately labeled fixture. No need to relabel older audio or input evidence as newly verified.

Existing mutable branch candidate URL, verified at QA07119b0 before this correction:
https://loop-lab-git-codex-dead-freight-gu-519689-silentstacks-projects.vercel.app/runs/dead-freight/index.html?testProfile=workshop-qa

The prior check `https://github.com/buildon99x/proto/runs/116768959051` names this host. It loaded0.15.0 with the isolation badge and no authentication wall. The dot cloud browser could not initialize WebGL, so that check establishes page delivery only. Verify the label/manifest again after the repository's existing automatic candidate build. The older public chatgpt.site was not switched.
