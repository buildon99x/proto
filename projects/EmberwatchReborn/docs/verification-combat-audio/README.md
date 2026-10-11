# R14a12 combat-audio event patch

Independent audio-only candidate, 2026-10-11. No Git commit/push or deployment was performed. Apply the patch to the parent's integrated candidate; do not replace a separately edited combat.js wholesale.

## What changed

- Mace preparation still responds at input acceptance, using only a quieter pre-peak prefix of the existing slash sample. Its swish contact portion starts from the measured atlas peak only after the real actionContact event. No future wall-clock contact prediction is used by combat. This follows simulation slowdown at 30/60/120 Hz and with later or sustained hitstop.
- Magic preparation is restricted to the existing sample's pre-crest prefix and cancelled at real release/contact. Its old .366–.397 s crest cannot trail a roughly .229 s hammer release. No new asset was created. Sample slicing has a separate 2 ms leading envelope and 8 ms preparation end fade so detail ducking does not overwrite edge fades.
- Cast preparation/release tags are separate from actual hit identities. Dodge and status interruption stop the cast voice; a projectile already launched before a dodge still emits its later valid hit. Misses, unavailable actions and evaded damage do not invent impact/hurt sounds. Menu/blur cancellation retains gameplay debt. Pause/disable/dispose clear voices; region rebuilding clears old combat owners.
- Shield charge's actual swept collision already calls hitEnemy before its nominal .08 s actionContact. Its impact sound remains on that real collision (including a close target in the first frame). The nominal boundary adds no impact and does not prematurely cut ongoing charge movement. A non-piercing collision or wall stop cancels its movement tail. Empty-space charge stays an audible movement with no damage-confirmation sound. Damage, stun and travel timing are unchanged.
- Hostile cues carry enemy style, attack identity, owner and source position. Their voice priority exceeds routine friendly hits; boss cues get a bounded priority bonus. A .26 s danger window reduces subordinate detail voices to .52 of their own baseline, restoring them afterward. Per-source hostile gaps retain independent important tells under the existing 16-voice global / 3-voice enemy caps. Isometric panning and distance attenuation use the actual source. All event gains and master volume remain unchanged; windup gain is lower only.

## Design source and ownership

GGG's official [Skill Sound Design in Path of Exile 2](https://www.pathofexile.com/forum/view-thread/3794832), published 2025-06-18, explains distinguishing friendly actions from danger, managing simultaneous voices/cooldowns, and using ducking, distance and priority for clarity. These are design principles, not a source of copied audio, numeric tuning or a claim of PoE2 sound equivalence. The constants and implementation here are Emberwatch-authored.

All existing audio and art bytes, audio-manifest.js and audio-credits.txt are preserved. The existing atlas credits original procedural PCM plus spookymodem's Battlecry (CC BY 3.0). No commercial game sample was imported. No damage, cost, cooldown, actual stun, RNG, save or physics rule was intentionally changed.

Changed runtime files: audio.js; the audio-delivery/rebuild hunks in main.js; audio event/cancellation hunks only in combat.js. Added test: app/tests/combat-audio-sync.test.mjs. The enemy-reaction worker owns hit/death presentation, and the Warrior worker owns movement/visual presentation. The hitEnemy stun-line audio addition is adjacent to their reaction edits and needs normal hunk integration.

## Verified results and limits

- Same final 60 new tests on the original source: 46 failed / 14 passed. Final audio candidate: 60 passed / 0 failed / 0 skipped / 0 cancelled. These execute real combat handlers, an extracted production delivery handler, and mocked Web Audio scheduling. They include 30/60/120 Hz, actual/empty contact, hitstop, repeated casts, roll cancellation/evasion, status cancellation, death, invalid input, charge contact/whiff/wall, projectile after dodge, priority, ducking, voice limits, sample envelopes, and pause/lifecycle cleanup.
- Earlier focused existing suite: 227/227 passed. This preceded the last charge/mobility/region cancellation additions; it is not a final whole-suite result. Twelve paired four-second simulations at an earlier checkpoint produced identical non-event battle state. Existing tests were not modified.
- Final modified JavaScript syntax checks passed. Final static build passed: 120 files, 16,702,486 bytes. Changed built source hashes match source. Asset preservation is recorded in preservation.json.
- Whole npm test and npm run lint did not reach terminal summaries. The long execution stopped, and its poll reported “automatic approval review was cancelled.” These commands were not retried, split into equivalent commands or bypassed. aggregate.log and lint.log are retained as incomplete evidence. Parent must resolve the approval state before final integrated aggregate verification.
- No direct listening, speaker-output timing measurement, native-browser playback check or subjective mix acceptance was performed. Actual event delivery occurs at the render-loop boundary; frame delivery latency and the browser/device audio buffer still apply. Moving the scheduled sample peak to the received contact event does not establish sample-perfect audiovisual synchronization. Final mix quality and dense-combat readability remain listening gates.

## Parent integration notes

Read summary.json for the exact stage of each verification. The standalone unified patch is /workspace/shared/emberwatch-combat-audio.patch. Apply source/test hunks to the integrated candidate, preserve the other workers' hitEnemy/movement additions, and rerun approved integrated tests and build before publishing. Keep all original attribution and assets. Do not present this patch as fully heard/quality-approved audio.
