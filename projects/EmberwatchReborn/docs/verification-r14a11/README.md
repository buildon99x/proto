# R14a11 · Personal town portal

2026-10-11. Base: R14a10, commit `c1cd560833a4b0c40e6ae8cfd038ddb93cffd57c`, tree `ef685163702ede40d565307a27d30407873449a4`. Work is isolated from the frozen a10 source. The a10 dialog/focus correction is preserved.

## User-facing contract

- P or the persistent ◈ 귀환 HUD button opens one ember/cyan portal exactly at the living hero's current valid location. No item, skill purchase, combat resource, combat-state restriction, or damage penalty is added.
- Opening and entering are distinct. The existing interaction binding (V in POE-style presets; each legacy/custom profile keeps its own binding) enters the nearby, line-of-sight-visible committed portal. It travels to the existing safe town spawn. Touch interaction and click-to-approach use the same authoritative entry command.
- Opening is an immediate utility request, with a pending world cue and status before saving, then a committed portal and sound on success. There is no invented PoE2 cast duration. Save failure creates no durable portal or cooldown; uncertain storage retains the existing recovery gate.
- `TOWN_PORTAL_COOLDOWN_SECONDS = 60` is a single Emberwatch-authored setting, not a source-confirmed PoE2 value. It starts on committed opening. It continues during menus and across reload. A running session follows monotonic elapsed time, so OS wall-clock corrections do not shorten/lengthen the current countdown. Reload compares the persisted epoch deadline. Clock rollback remains conservative. As a local-only game, this is not server-backed protection against deliberate clock/save modification outside a session.
- A new opening after cooldown replaces the single prior portal. Walking, dodging and sprinting do not close it. Region travel, entering the portal, or death close the active marker but retain the cooldown. Already in town and dead states never spend it. Rest/retry cannot reset it.
- P is adopted only if unused in the current historical binding map. Existing P ownership is preserved, leaving the new utility unbound but always available from the HUD; normal key settings support assignment and unbinding. Existing control snapshots and all old saved keys remain unchanged until an explicit settings save.
- This is one-way return to town. There is no return-to-origin endpoint. Existing scene reconstruction preserves saved defeated/reward/quest state, but does not snapshot living enemies' detailed transient combat state across regions. The new feature does not claim to add such instance persistence.

## State and race boundaries

- Optional schema5 `world.townPortal` contains validated opening/ready timestamps and either one active `{region, life, position}` marker or null. Absent data means an old profile with no portal history; it is not written during load. Historical controls accept an optional utility binding without forcing a combat-controls version migration or changing prior controls.
- Open/enter require the captured store revision and current life/region. Entry also captures the opening identity, reach and LOS. Duplicate queued requests, stale prior-marker clicks and delayed commands cannot create a second transaction, teleport from a stale region, reopen a dead-life marker, or grant rewards.
- Controller time is supplied only for the two new commands, preserving the exact trusted-context contract of Wilderness and promotion reducers.
- Entry reuses existing travel-era puzzle-input invalidation. It never sets door/shortcut/report flags. Defeats, claims, inventory, money, earned XP, resources and paid recovery are preserved. Portal props are non-solid and placed at the hero, so a blocked tile in front of the hero does not make the utility inaccessible.
- Pending open may complete behind a newer menu but never enters automatically or changes menu focus. Owner/battle changes discard its presentation. Existing 150ms deferred-input expiry, pause, blur, death and store gates also cover P.

## Presentation and source separation

The original Canvas portal has transparent rings and small amber runes. It is below hostile warnings and actor bodies, respects LOS and reduced-flash mode, and creates no fullscreen flash or camera shake. Compact HUD uses symbol, key, and status/countdown; details live in tooltip/help. It has a descriptive accessible label and remains present in town.

GGG's official [0.5.4b patch notes](https://www.pathofexile.com/forum/view-thread/3980516) describe an interruptible town-portal animation and a fix for creating it while being hit. That reference does not establish a 60-second cooldown or our immediate-opening/V-entry behavior. The latter are deliberate Emberwatch choices for the user's requested common cooldown utility. No commercial art/audio is copied.

## Verification

- Portal-focused reducer/controller/input tests cover successful and failed saves, depletion/paid recovery, repeated input, expiry boundaries, malformed saves, menu/death/reload, clock correction, key collisions and explicit remapping, normal travel/rest/retry, interaction and context-click reach, and retained kills.
- Production main handlers exercise pending FX, committed V entry, repeat suppression, failure cleanup, menu ownership and stale-profile completion. Canvas commands are exercised at normal/reduced settings; render-order checks retain warning/body priority.
- Earned production-handler fixtures cover all ten non-town regions plus unfinished Wilderness. These are scripted legal progression/settlement reports, not AI combat or native-browser play.
- Existing test harnesses now import the real new production helpers. No prior gameplay or focus assertions were removed. Historical control read assertions account only for the new detached optional utility row; byte-exact prior snapshot restoration remains asserted.
- The app's final unique test count, lint/build receipts and known monorepo dependency blockers are recorded in `final-summary.json`. Focused counts overlap and must not be added to the aggregate.
- Native browser play, screenshots, touch-size/layout confirmation, warning-overlap quality, audio/FX feel, and post-publication URL/version verification remain separate acceptance gates. No public Site or Git write was performed during implementation.

Final R14a11: **4,081/4,081 unique tests**, 0 fail/skip/cancel, 117874.756099ms; app lint and static build passed (120 files, 16,697,398 bytes), with every built source hash verified. Includes existing4,002 plus79 new. Root registry/build commands remain blocked by absent dependencies/corepack cache. Actual native-browser QA and public Site publication remain separate.

Preflight logs preserve initial failed dependency/fixture probes; `automatic-tests.tap` and `final-summary.json` are the final complete result.
