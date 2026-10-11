# Reborn reimplementation instructions

- Preserve original projects/Emberwatch and its167-file manifest.
- Work in this new project only. This is reimplementation, not exact restoration of the lost source.
- Read the canonical v1.1/version2 plan and requirement trace before implementing. Keep brief.md/spec.md/eval.md current.
- Reuse original owned art/audio/fonts and retain provenance. Do not copy commercial game expression.
- Distinguish source-confirmed rules, unknowns and explicitly authored Emberwatch balance values.
- Warrior first. Data catalogs alone do not make a runtime skill implemented.
- New tests must execute real handlers, preserve failure/idempotency/save paths and never inherit old pass counts.
- Generated build output is not editable source.
- Back up each verified small checkpoint as source+tests+provenance in Library; local Git alone is insufficient.
- Current user-authorized Git scope: commit/push verified project code and text plus byte-identical original remote resources to buildon99x/proto, codex/emberwatch-rebuild, without force. Preserve original Emberwatch167 files and other projects. Exclude new/changed PNG and QA images from this Git checkpoint. Never retry or bypass unrelated pending PNG/file-import approvals.
- The latest user request authorizes immediate publication of the current R2 development checkpoint as a separate fully public GPT Site, with incomplete scope stated. Continue normal-input review and iterative correction after publication. Preserve the original Site/version; verify the published URL and repeat QA. This does not authorize retrying the old Git PNG upload or save import.


## R14a9 current checkpoint

Adaptive HUD and primary-first pause panel. Source is separate from the frozen a8 project. Read docs/verification-r14a9/README.md and final-summary.json. Do not infer actual screen/touch acceptance from automated tests.


## R14a10 current checkpoint

Read docs/verification-r14a10 and final-summary.json. Preserve a9 checkpoint and all game/save/binding semantics. Automated DOM probes do not establish native browser focus acceptance.

## R14a11 current checkpoint
Personal one-way town-return portal. Read docs/verification-r14a11/README.md and final-summary.json. The cooldown and immediate-opening behavior are Emberwatch-authored. Preserve a10 accessibility, old controls and original projects/Emberwatch. Browser/publication acceptance must not be inferred from the automatic fixture suite.


## R14a12 current checkpoint
Read docs/verification-r14a12/README.md and final-summary.json. Preserve frozen a11 source, the personal town portal, and dialog focus. The PoE queue's .18-second acceptance window remains; only accepted intent lifetime follows recovery time with the same .35 hitstop floor. Legacy .18 active-frame expiry remains. Hammer impact heading is presentation-only. Do not infer live screen/audio or subjective responsiveness acceptance from automated tests.

## R14a13 current candidate
Separate presentation integration from frozen R14a12. Read docs/verification-r14a13/README.md and final-summary.json before asserting acceptance. All three frozen patches are integrated by hunks. Final 4,312 unique tests, lint and app build passed; see exact logs and remaining native-browser/listening gates. Preserve gameplay balance, source assets, input, town portal, save boundaries and original projects. Do not treat older worker pass counts as this aggregate result. Standalone audio aggregate/lint cancellation is preserved and must not be retried or bypassed. Git writes and deployment are coordinator-owned, not authorized by this integration handoff.

## R14a14 current candidate
Independent safety-dialog containment from frozen a13. Read docs/verification-r14a14 before claiming acceptance. No rendering-performance fix is asserted: native QA observed rAF stalls, and isolated paired full-scene benchmarking remains incomplete. Keep frameWasSuspended >500ms, frameDelta clamp, input cancellation, original art, balances, saves, and portal semantics byte-identical. Safety-origin pauses expose only Continue and explicit full-menu acknowledgement; voluntary menu and keyboard access remain unchanged. Git/publication remain coordinator-owned after results review.


## R14a15 current diagnostic candidate
Independent diagnostic-only candidate from frozen a14. Read docs/verification-r14a15 before claiming acceptance. No stall cause or performance fix is asserted. Preserve strict runtime >500ms safety pause, dt clamp, input clearing, simulation, render/audio models, AI/FX and save behavior. The optional frame observer keeps 12 strict-long-gap pairs and displays six only on QA panel open/refresh. All clocks/phase costs are synchronous browser observations, not GPU/speaker/input-latency evidence. No nativeCanvas or isolated Chromium retry is authorized. Git and publication remain coordinator-owned.


## R14a16 current candidate
Independent death-overlay accessibility follow-up from frozen a15. Read docs/verification-r14a16 before asserting acceptance. Death markers block background menu/settings actions. Game panels own background HUD/canvas inert and aria-hidden state and restore it on valid close/alive profile load. Optional death diagnostics remain read-only and return to death; retry/save/death models and a15 frame/scene instrumentation remain unchanged. Normal supported-browser AX/focus verification remains required. Git and publication are coordinator-owned after review.

## R14a17 integrated scene-cache and death-overlay candidate
Read docs/verification-r14a17 before claiming acceptance. R14a16 death/AX containment is merged with a narrowly verified scene preparation optimization. Only detached canonical plain copies made by immutable-snapshot.js are memo eligible; arbitrary frozen values/Proxies and mutable states must always revalidate. Immutability is never a substitute for initial gameplay/save validation. Preserve all validator decisions, mutable controller API, original assets, balances, saves and >500ms frame-safety condition. The measured improvement removes established redundant computation; native browser stall resolution and AX acceptance remain separate unperformed gates. Git/publication wait for coordinator review.

## R14a18 head-first normal save candidate

The normal load validates the head-selected slot first and avoids one unused alternate-slot validation when its receipt matches. All three raw reads, decoder decisions, fallback recovery, CAS, locks, readbacks, upgrade fences, busy/input atomicity and 150 ms expiry remain intact. The same immutable-freeze scene optimization and death accessibility from a17 remain. No fix to actual browser input expiry is claimed. See docs/verification-r14a18 for release-label checks and docs/verification-head-first-save for the original 4,483-test full pass, retained initial unexplained file-process failure, 50 new checks and bounded paired timings. No validation-reuse second phase is included.
