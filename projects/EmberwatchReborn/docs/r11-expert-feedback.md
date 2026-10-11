# R11 bounded Expert presentation

Unintegrated development from aab0368. This is an authored presentation of the
R11 runtime contract, not an original-game measurement or Expert/AAA acceptance.
The integration owner maintains brief/spec/eval, UI/input wiring, release gates
and external preservation. No assets or combat rules are changed here.

## Intended renderer contract

- Forward the dedicated live `battle.banner` as renderer `banner`. Draw its
  same-region, positive-remaining, wall-LOS-covered radius underneath loot,
  hostile danger and actors, with a static low-opacity fill and keyed dash.
  Banner placement FX carries `bannerPlacement:true`; that tag suppresses only
  the redundant elevated generic ring, leaving ordinary ring effects unchanged.
- Flames and Lance FX carry `expertFootprint:{skillId,range,arcRadians}` plus
  existing x/y/angle/life/max. Only `flames_of_devotion` and `zealous_lance` are
  supported. Their accepted exact90/180 center radii get no legacy+10 padding.
  Tagged FX use a clipped floor sector instead of the old elevated slash.
- Onslaught reads accepted action angle, startup, channel duration, pulse and
  payment counters. Reuse existing baked action art. A renderer-local last-seen
  channel may settle through its actual recovery lock; a loaded generic lock
  cannot manufacture a resumed channel. Simulation time drives presentation.
- Inner Flame, live Banner coverage, hero registered statuses and enemy
  disarm/silence get restrained textual hints. No new glow or flash is needed.
- Frozen scene fixtures must render without mutation. Expired/dead/off-region
  effects disappear; absent Expert data leaves previous rendering unchanged.

## Verification boundary

Tests execute production geometry, presentation and renderer commands with
scripted fixtures and Canvas boundaries substituted. They do not establish
screen contrast, earned profiles, keyboard/touch play, audio or tactical quality.
Real-screen review at flash0 and regular settings remains mandatory, including
contested Banner pockets, off-axis enemy tells, natural channel releases and
status/counter readability in mixed combat. No browser/build/publication here.

## Automated result, 2026-10-10 UTC

- Final affected visual/readability gate:164/164 pass,0fail/skip. This includes
  24new Expert tests and140 retained rendering/presentation/readability tests.
  The new tests cover exact radii/arcs, LOS/fog/expiry, actual Canvas command
  order, no duplicate lifted FX, accepted startup/locked angle/pulse/payment
  presentation, interrupted/reloaded recovery, reused motion atlas samples,
  all registered status hints, unchanged absent-Expert output and flash0.
- Whole isolated suite before the final redundant-Banner-ring test was added:
  1308/1309 passed,1failed,0skipped,143.261s. The failure is the pre-existing
  `promotion-save.test.mjs` legacy-v2 migration fixture at line31: it marks
  controls as v1 but retains new Expert binding rows. The exact same failure
  was reproduced against an untouched Git archive of aab0368. No assertions
  were removed or altered; the integration owner handles that fixture and the
  final whole-suite run. This result is not presented as a full pass.
- Source/test syntax and `git diff --check` pass after final changes.
- A separate cross-worktree probe used actual production combat8d6f540 with
  its synthetic fixture: live Banner, contact Flames90, Onslaught startup and
  active presentation, and released end Lance180 matched the new helpers.
  This is a handler seam check, not real play, save integration or pixel QA.
- Required `pnpm sync:registry` was attempted; it failed at the existing pnpm
  home ENOENT before registry generation. No installation workaround, generated
  build, browser, Godot, screen capture, remote Git or Site write was performed.

The parent still needs to pass the real `battle.banner` into `visual.render`.
The combat owner supplied both exact Expert footprint tags. The additional
`bannerPlacement:true` tag is requested separately and must be verified during
integration before claiming the redundant placement ring is removed. Final integrated tests, real-screen flash0/regular review
and external source/test preservation remain with the integration owner.
