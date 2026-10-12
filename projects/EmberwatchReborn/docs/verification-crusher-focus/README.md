# Crusher selection focus-safety follow-up

Baseline `d58005f40c81631a54dd4f90938a9b0d1d441fb4` (native v72). The coordinator observed the idle town menu permanently showing a processing warning with both choices disabled. Lv2/locked Judgement is a separate, intended progression requirement.

## Reproduced cause and minimal change

The production `focusin` listener calls `clearInput()` when a menu button gains focus. That queues `expertSafety.pending` even if the hero has no action, recovery debt or save in flight. The browser then delivers the button click before another animation frame. The crusher menu reads that pending flag as non-idle and renders disabled buttons. Frames subsequently drain the empty safety job, but the disabled markup is a fixed snapshot. Focusing a selection button also creates pending safety just before its click and can reject an otherwise permitted choice. Earlier handler tests explicitly inserted a frame between menu steps and did not emulate this focus transition.

Two real-handler tests reproduce the failure before modification (`focus-red.tap`). The only runtime patch is to call existing `flushActionSafety()` before the crusher idle snapshot and before the choice's action/recovery/busy/pending guard. Basic authorization, candidate/town/profile-life and stale presentation epoch checks still precede choice reconciliation. This uses existing owner/life/region and busy/blocked reconciliation. It does not directly reset pending, advance paused simulation, erase actions, expire recovery, ignore a real commit or change save writers. Focus/dialog handling and the safety coordinator itself are unchanged.

When actual finite action/recovery remains, switching remains disabled until the user resumes and lets that action/recovery finish. When a real save is delayed, safety stays pending and selection remains blocked; after it settles the user can reopen the menu. Failed durable gates still show the existing reload-required dialog. Missing learning remains a requirement, not an idle-processing failure.

## Verification

See summary, full tests, lint/registry/build logs and preservation hashes beside this file. Focused tests execute production `focusin`, menu click and selection click with no intervening frame, including missing skill/basic choice, learned choice, no saved/revision mutation, finite action preservation, actual Onslaught cancellation recovery debt, delayed commit and existing stale/field guards. The extra recovery fixture initially asserted before the normal asynchronous acceptance/save settled; the corrected fixture waits for real handlers/frames rather than altering recovery or bypassing the save. Readable logs normalize trailing terminal whitespace; the raw log archive preserves exact outputs and hashes.

No new combat rules or numbers. Existing hit-count prototype and incomplete PoE2 scope from verification-crusher remain. No a19 import, storage/serialization/JSON-hook/equipment writer modification, dependencies installation, release label change or deployment. Test passes establish handler behavior, not native browser/focus/visual/audio acceptance.

## Native QA rerun

Use the complete package at `/qa-r14/`, same existing isolated v72 profile and ordinary controls. In town release all keys/buttons, confirm full resources and ready mace, then press Esc. Click or Tab/Enter to **전투 방식 · 파쇄철퇴** without artificial waiting between focus and activation. At Lv2 with Judgement locked, expect the training/Judgement requirement, crusher disabled, **기본 전사로** enabled. Activate basic mode and verify the panel closes. Repeat close/reopen and mouse/keyboard focus transitions. With an ordinarily progressed profile that has learned Judgement, repeat and select crusher, then run the actual two-hit/strike/wave QA from verification-crusher.

Open while a finite attack or cancellation recovery truly remains: the guard must remain. Resume, let it finish, then reopen. Confirm delayed/failed saving retains its original guard and that a stale/background choice cannot change mode. Do not claim native v72 resolution until the coordinator repeats this sequence in dot.
