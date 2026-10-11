# R14a16 death-overlay accessibility candidate

Independent from frozen R14a15. Native a15 QA found a visually covered HUD menu button remained in AX. Activating it entered a full menu while dead. Continue correctly refused lifeDown; Leave correctly received HERO_DOWN from checkpoint, leaving no ordinary recovery control. No death/save model workaround is introduced here.

## Narrow implementation

1. HUD menu onclick rejects any currently open modal and all three death markers. showMenu independently rejects lifeDown, battle.dead and HP <= 0, including the pre-settlement window. Death-mode delegated clicks require a target in the current modal and permit Retry/Reload/read-only observation refresh/back only. Death settings changes are rejected.
2. Game panel lifecycle remembers original opener, moves focus into the dialog, then blocks HUD/canvas with native inert plus aria-hidden. Nested panels preserve original attribute snapshots. Valid close restores background attributes before restoring focus; direct alive profile load restores them too. Death/error gates keep blockers intact.
3. Existing toast text is also written to the current modal's polite status region. Hidden/inert HUD cannot silence recoverable Retry, Retry→diagnostics pending failure, or Reload errors. No transaction or error-policy change.
4. If recording is already ON, the death panel offers a read-only diagnostic button. It opens the existing snapshot without clear/toggle controls and returns to the death panel. Normal retry retains its established transient reset and single committed life increment.

No frame-observation, frame function, scene/model, gameplay balance, AI/FX, input semantics, save format/namespace, death penalty, retry math or audio change. No new image resources, external telemetry or native benchmark. Source-level preservation is in source-integrity.json.

## Verification

- New 18 cases: 17 fail against frozen a15; 1 normal-retry invariant already passes there. All 18 pass after patch. red-final.log records the exact final pre-change cases. focused-new.log reports 20 passed because it also includes two existing startup guards.
- focused-boundaries.log: 135/135 existing/new dialog, dead-save, dead-action and profile-ownership cases passed.
- reviewer-focused.log: independent 17/17 and static source review; the later additional alive profile-load invariant does not change source. See static-review.md.
- Initial startup fixture failures remain in focused-boundaries-initial.log. Three lacked candidate flag in extracted showDeath; dead-action boundary also needed modal.contains. Updated fixture boundaries preserve production-handler assertions.
- Final full suite, lint/build and build/source hashes are recorded in final-summary.json. Browser acceptance is not inferred from these probes.

## Supported-browser handoff

Use the ordinary publisher-owned supported browser only, with an isolated authorized QA profile. Do not activate hidden/background elements as a workaround.

- On an actual death dialog, verify AX contains its Retry and optional frame-record button, but not background menu, hotbar, touch controls or canvas. Verify Tab/Shift+Tab remain within the dialog and Escape does not resume death.
- With frame recording already ON before the encounter, open “사망 직전 프레임 기록.” It must show read-only refresh and “사망 화면으로 돌아가기,” with no toggles, Clear, full Menu, Leave or Continue. Record evidence before Retry/reload resets it.
- Return to death, choose ordinary Retry, and verify healthy game controls, focus and no extra death charge. Also check ordinary menu→help/controls→return and the automatic safety dialog remain normal.
- Accessible status is covered by synthetic save-error probes; do not intentionally corrupt live storage to manufacture failures. Verify native announcements if an ordinary recoverable error actually occurs.

No native browser action, Git write, publication or Library upload is included in this preparation. Native AX behavior, screen-reader output and rendered layout are remaining coordinator/publisher gates. This patch does not identify or fix the frame-stall cause; ongoing a15 scene investigation is separate.

Initial full aggregate was 4,372/4,378. Three stale-dead UI tests expected a reducer HERO_DOWN response; the new guard deliberately rejects before dispatch, so they now demand unchanged command/outcome counts as well as the prior unchanged state/revision/reward assertions. Three legacy Retry cases needed the real current-modal contains boundary. A partial-state backup probe also exposed an unsafe optional-world read; the new death guard now safely reads state?.world?.lifeDown. The six affected production-handler cases pass after those corrections. Their initial full log is retained, and final aggregate runs against all final source/test changes.

Negative-control quality follow-up: the stale-dead-action regression now asserts that the death dialog is unchanged immediately after each attempted action. Its frozen-a15 negative run fails on the first actual menu escape ("dead dialog unchanged after menu"), before any missing fixture dependency; strengthened green run passes. See red-stale-guard-strengthened.log and green-stale-guard-strengthened.log. The final whole-suite run includes this strengthened assertion.
