# Smash Rally 3D

PlayCanvas 2.23.2 + TypeScript + Vite. A playable 5-point arcade singles match against AI. Move automatically, aim at the far court, and time your return. This is a prototype with verified automated play, not an AAA quality certification.

[Branch Preview game](https://loop-lab-git-codex-smash-rally-3d-silentstacks-projects.vercel.app/runs/smash-rally-3d/index.html) · [Draft review](https://github.com/buildon99x/proto/pull/46)

Local production preview is available on the dot computer at http://127.0.0.1:5173 while the preview process runs. Existing Vercel integration builds the branch. Direct Preview-host access is blocked by this execution environment's proxy (403), so external game execution and public/private access level remain unverified. No hosting security setting was changed.

Mouse: move to aim, click for contextual return/smash, right click for drop, Shift+click for clear. Esc pauses. Touch: tap, swipe up for clear, swipe down for drop. The swipe start is the target; command submits at the threshold. Alternative shot buttons are available. The rally winner serves next; no deuce.

## Run and verify

Node >=22.23.2; pnpm9.15.4.

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter smash-rally-3d dev`
- `corepack pnpm --filter smash-rally-3d build`
- `corepack pnpm --filter smash-rally-3d test`
- `corepack pnpm sync:registry`
- `corepack pnpm build:vercel`

Browser tools remain isolated under `.playtest`, outside production dependencies. The project runner uses installed Chromium with current Angle/SwiftShader flags because the shared harness's older flags did not initialize WebGL here. `node projects/SmashRally3D/tools/browser-check.mjs [scenario-path]`; scenarios cover active visual-cue ten-match regression, five event-paused collision views, natural loss/rematch, emulated touch, high-clear framing and graphics recovery. Set `SMASH_PORT` for independent concurrent runs.

Full product authority: `docs/SmashRally3D-WebGame-Spec-v1.0.read-text.md`; read provenance is recorded separately from the blocked binary download. See `eval.md` for acceptance status, `docs/BALANCING.md` for tuning/limitations, and `assets/LICENSES.md` for original assets and dependencies. Physical PC/mobile FPS, Safari, audible A/V timing and physical touch latency require real devices. Human novice comprehension and tactical balance still need play review.

Latest software evidence:19 tests;10 active UI matches/250 contacts/100 visible-cue return commands; all five shots; fixed-foot displacement below1µm in eligible grounded samples;0 browser runtime errors. See verification/README.md for scope and original failure. Four important screenshots are staged in verification/library-deliverables; Library upload is pending official skill access. No physical performance/human-balance/AAA or externally accessible deployment claim.
