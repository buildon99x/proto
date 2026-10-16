# Ordinary action/control review — 2026-10-16

Base and remote were `3ef7dda74c8c40a2d6154adcd10c5e82588ce142`; the separate `/workspace/emberwatch-reborn` checkout continues `codex/emberwatch-rebuild`. Default `cb-ll` is untouched. Library source `emberwatch-reborn-poe2-combat-controls.md` still has185 lines; no newly changed remote requirement was found. This is a bounded continuation, not completion of PoE2 combat parity.

## Reproduced correction

Click movement with the existing “last movement direction” charge option used keyboard router history (or cursor aim when absent), even though click locomotion ignores keyboard walking. Native before captures11/12 show a valid lower-right walk followed by stale upper-left charge. Actual main event/frame tests also reproduced it. Click locomotion now owns a transient, detached last direction from the click path or touch pad. Arrival/release retain it; menu/safety and battle/life/region ownership changes clear it. Fresh click mode without such history falls back to aim. WASD/legacy and aim-directed charge are unchanged; no saved option/schema, timing, damage, charge cost, queue window or balance change.

Initial test setup produced7 failures: four were invalid controls5 setup. Those are retained in heading-red.tap, not counted as defect reproductions. Corrected real preset setup produced6 expected direction failures and2 existing touch passes. Eight first green cases and18 focused cases then passed, including controls4/5, touch, arrival, ignored keyboard, recovery queue, aim, menu and owner reset. Test progression is a scripted fixture; it is not earned native play.

## Native ordinary UI evidence

Installed Chromium151.0.7922.173 and Python Playwright/CDP were available; no dedicated browser/computer app tool was exposed. Same persisted `qa-judgement-persistent-20261014` profile and origin were used. Only normal DOM/key/mouse actions changed gameplay. Read-only snapshots preserve owned item IDs; no raw slot bytes or browser profile are committed. Stale browser singleton symlinks were moved aside reversibly before Chromium startup; no store file was edited.

- 05/07: live guard warning; mace startup→roll cancellation→held mace resumes. Input rows distinguish1.0ms roll start and1.5ms mace start; a cancelled mace has no contact mark. These are browser handler clocks, not physical delay measurements.
- 11/12: accepted pre-fix click walk and wrong charge direction. Earlier request007 clicked an invalid edge and is excluded as direction proof.
- 17/18: after fix, accepted movement-directed Q follows the newer lower-right walk despite upper-left cursor aim. Start1.9ms, contact166.3ms. First after-reload trial010 was rejected by remaining cooldown and is explicitly excluded. Waiting for readiness also allowed real guard damage (109→63.254HP); no invulnerability/heal grant was used.
- 20/21: normal P/V town return, normal town-only crusher selection, existing heal and connected quarry shortcut re-entry. A region-local crusher selection attempt012 was disabled as designed; retained as failed setup.
- 24: two ordinary mace hits produce the ◆ prime on the living guard with a readable red hostile warning.
- 25: ordinary E consumes30MP and produces target-centered ring/fractures and55 visible damage; guard dies, kills44→45, gold288→294, XP179.5→229.5. All three owned equipment instance IDs, Adept/L7, learned skills, banked11skill/15attribute points remain unchanged. Profile is paused alive at quarry(654.646,161.589), HP109. No new campaign completion/repeat reward is asserted.

The9-second MP4 concatenates original CDP JPEG frames in the order and timestamp durations in video-segments.json, without invented in-between frames or sound. Capture overhead and variable frame rate apply. Before/after segments are separate trials. JPEG screenshots are unchanged browser captures. The browser was headless and muted: actual listening, speaker onset/physical display/input latency, physical touch and native AX are unverified. Death/retry/reload evidence from the earlier October14 checkpoint is not presented as a new October16 death run.

## Remaining gates

Crusher has new earned native payoff evidence, but actual listening/overall subjective quality remain open. Storm and magma runtime modes exist; full ordinary-input build differentiation and the remaining melee-build expansion are not complete. Advanced one/two-hand/conflict gear, left/right rings/neck/belt, Master13 effects, repeat-expedition ledger and later campaign completion remain incomplete. No balance easing is used to replace controls quality.

Original a19 equipment/save-writer and JSON-hook “possible cybersecurity risk” rejection is unresolved. No retry, replacement namespace, hidden hook, growth implementation or protected writer edit occurred. See ../verification-crusher-fx/writer-resumption-scope.md; await parent’s verified original review information. No main merge or default deployment.

App lint passed and final build produced133files/16,801,945bytes. The required root registry/Vercel commands each failed before project verification: pnpm ENOENT creating `/home/agent/.local/share/pnpm`; logs preserved, no environment-path bypass. Full suite and Library outcomes are recorded in final-summary.json after completion.

After final paused screenshot/snapshot, the QA page was put in CDP frozen lifecycle state to stop background rendering during the long test. Resume with `Page.setWebLifecycleState {state:"active"}`; normal game menu remains paused. This is browser lifecycle control, not a gameplay/profile mutation. Protected main equipmentAction/dispatch/syncVitals/report/checkpointPanel functions are text-identical;132 other runtime files and original Emberwatch assets are unchanged.

Library prepared batch (new checkpoint ZIP, two new screenshots, new MP4) failed before any app call with `hosted apps tools/list request failed: network`. No Library ID exists, no success is claimed, and no retry/alternate route was attempted. Local ZIP435files/18,081,082bytes and9.04s MP4 are retained; see library-outcome.json. ZIP source/test contents are the verified checkpoint; its pre-upload docs say Library pending. Final Library failure is this external follow-up, not included retroactively in that immutable ZIP.
