# Released short-tap movement charge — 2026-10-16

Base `a00dc112f44577994563107daeb2947538d51904`, separate `/workspace/emberwatch-reborn`, `codex/emberwatch-rebuild`. No main merge/default deployment or cb-ll/original Emberwatch edits.

## One reproduced independent defect

A controls4 Q tap captured while the normal checkpoint is in flight starts after commit. `handleSkillIntent` correctly selects the configured movement heading, but `startAction` unconditionally reapplies the released cursor sample. As a result, an accepted short tap can charge toward the cursor rather than the movement direction selected in the UI. This can reverse the combat route. Existing immediate and recovery-queued charge paths are unaffected; controls5 already passed the same setup because its deferred capture has different release-sample ownership.

The only runtime change is one condition in `combat.js`: a finite explicitly selected shield-charge heading is preserved through release-sample application. Aim-directed charge and other skills still use release aim; queued charge stays locked to the existing queue contract. No writer, schema, equipment, growth, JSON hook, timing, resource/CD formula,150ms wait limit, queue/cancel window or numeric balance changes. `main.js` and133 other runtime files are byte-identical; original167 files match base. See preservation.json.

## Test evidence

Actual production main key/frame handlers and existing delayed-checkpoint harness reproduced2 expected failures (controls4 WASD/click) and2 controls5 comparison passes. Fixtures use the existing in-memory store and scripted earned progression; no native browser store was delayed, injected or replaced. Initial focused tests had2 probe mistakes because sampling input after the pending key consumed its pulse; focused.tap preserves these failures. The corrected assertion samples expected aim before input and does not consume the pending command. Final12 new focused tests passed: controls4/5 × WASD/click movement, unchanged aim-directed behavior, one cost/CD/cast/contact, and expired/failed checkpoints with no start or payment. Existing recovery-queue, lifecycle, release aim and failure tests are covered by the full run.

The first attempted parallel test/build launch failed before process creation (`exec-server transport disconnected`); no output files existed and this is not a test failure/pass. Sequential launches then started normally. Full and app check outcomes are in final-summary.json.

## Native scope and limits

Same persistent profile/origin, normal Continue/settings/D/Q/menu only. Screenshots01–03 are unchanged Chromium JPEG captures. The profile remains L7 Adept,294G,XP229.5,45kills/1death, unchanged equipment instance IDs and ranks,11bankedskill/15attribute points. Q paid10stamina at start (screenshot02:56/66), followed movement toward the right despite left cursor, and produced a contact timing row. Position naturally stopped near the wall at(787.003,44.664); HP109, mana33.862,stamina62.166 at pause. No damage/payoff is claimed from this empty combat smoke.

This native Q did **not** establish an overlapping save wait. The deferred defect is reproduced and verified by the production-handler fixture only. Native row start1.10ms/render entry69ms/render return123.70ms/contact359.90ms were observed under full-suite load; these are browser clocks, not physical input/display or speaker latency, and no performance improvement is asserted. Audio request acceptance5.60ms is a function result; browser is headless/muted and actual listening remains unperformed. Death/retry/build expansion were not repeated in this unit.

After paused snapshot, the page was frozen via CDP browser lifecycle to stop background rendering. To continue, set `Page.setWebLifecycleState` to `active`; game panel remains paused. No browser profile/store file was edited.

## a19 and upload boundaries

See a19-investigation.md for the read-only investigation, exact unavailable items and conditional review scope. We did not recover the original invocation/diff/reason/review ID, so we cannot decide whether additional user approval would resolve it. No speculative permission request or retry of protected work was made. One/two-hand and exact-slot equipment, Master13 runtime and repeat-expedition writer remain incomplete, as do crusher listening/native overall-quality and the remaining melee-build gates. No balance easing.

The previous attachment batch failed **before** app mutation during supported helper discovery, with no IDs. Parent now authorizes checking a safe retry. Current Library metadata read succeeds; it does not prove the required upload route works. After full checks, one fresh-helper prepared retry of the same ordered four files plus this verified checkpoint failed before any app mutation: `hosted apps tools/list request failed: network`. No Library ID or saved item exists; see library-outcome.json. Earlier Forbidden transfer batches, unknown outcomes and blocked original Library imports are excluded. No direct-write fallback, helper modification, manual URL transfer or namespace substitution. Outcome is recorded separately; no attachment success is assumed.

Final qualification:4,738/4,738 full pass,0fail/skip/cancel,395157.7664ms;12/12 focused pass; app lint/build pass133files/16,802,016bytes. Required root registry/Vercel gates each fail pnpm ENOENT creating `/home/agent/.local/share/pnpm`, before the project script. No environment workaround or deployment. Local immutable checkpoint ZIP426files/16,933,246bytes passes ZIP integrity (SHA256 in library-outcome.json). Its source/tests are verified; its pre-upload documentation still says Library pending. Final failure is this follow-up record, not retroactively inserted into that archive.
