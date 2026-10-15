# Smash Rally 3D

PlayCanvas2.23.2 + TypeScript + Vite five-point singles prototype. Movement, split readiness, posture and reply-covering recovery are automatic; the player chooses timing, course and a simple shot intention. Rally quality comes before content. This is not an AAA, human-balance or real-device certification.

[Branch Preview](https://loop-lab-git-codex-smash-rally-3d-silentstacks-projects.vercel.app/runs/smash-rally-3d/index.html) · [Draft PR46](https://github.com/buildon99x/proto/pull/46). Local production preview: http://127.0.0.1:5173 while the preview process runs. Existing branch hosting is unchanged; external access/security level remains unverified from this environment. No public default promotion or main merge.

| Intention     | PC            | Touch            | Automatic technique                                                                |
| ------------- | ------------- | ---------------- | ---------------------------------------------------------------------------------- |
| Deep/recovery | Shift + click | Short swipe up   | High clear or low-contact lift                                                     |
| Soft/short    | Right click   | Short swipe down | Rearcourt drop, defensive block or forecourt net shot                              |
| Return/attack | Click         | Tap              | Drive/lift or a legal high-contact smash; special opportunities remain conditional |

The same three on-screen buttons can select an intention, allowing one-finger repeated taps. No new mandatory key, combo or precise gesture. The label predicts contextual technique. The early cue allows preparation; the solid ring indicates precision. Esc pauses. Winner serves; first to5, no deuce.

A touch-down reserves the selected return. A swipe classifies that same preparation before the physical contact window, retaining original aim/time/swing clock; lifting the finger does not submit twice. It cannot change an already active hit. Straight/cross placement affects actual flight/recovery geometry, and late/poor posture changes available options. AI observes with delay/noise and uses shared movement/contact limits.

## Run and inspect

Node≥22.23.2 and pnpm9.15.4. Install with `corepack pnpm install --frozen-lockfile`, run `corepack pnpm --filter smash-rally-3d dev`, build with `corepack pnpm --filter smash-rally-3d build`, and test with `corepack pnpm --filter smash-rally-3d test`. Registry/release checks: `corepack pnpm sync:registry` and `corepack pnpm build:vercel`.

Browser tools use isolated `.playtest` Puppeteer and installed Chromium/Angle SwiftShader, outside production dependencies. Run `node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/tactical-final.mjs` for three complete visible-cue games; `mobile-beginner.mjs` for actual tap returns and `mobile.mjs` for actual accepted clear/drop gestures. Set SMASH_PORT for an independent run. Context inspection queries pause AFTER a real impact and are not normal match-play evidence.

Latest software checks:32 tests; three full UI games with118 contacts/49 cue-triggered return commands; native mobile3 taps→6 returns; actual accepted/emitted clear/drop gestures; full root build. [eval.md](eval.md) and [evidence guide](verification/tactics-20261015/README.md) identify original failures, exact per-game coverage and bundle hashes. Physical FPS/input latency, Safari, actual listening, human onboarding and balance remain open; natural UI net finish was not observed.

[Coaching research and mapping](docs/TACTICS-RESEARCH.md) distinguishes BWF/coaching material from game tuning. Full product authority remains [the original specification](docs/SmashRally3D-WebGame-Spec-v1.0.read-text.md); provenance distinguishes its complete text read from the blocked binary download. Original assets/synthesis and dependency licenses are recorded in assets/LICENSES.md.
