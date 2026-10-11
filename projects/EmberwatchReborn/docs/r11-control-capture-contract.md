# R11 control/capture checkpoint, not yet UI integrated

Controls3, optional expert1/expert2 and strict separate actionSlots1 pure helpers. New recommended2/3; old v1/v2 migrations preserve every existing key, shield mode and charge direction and add only empty auxiliary bindings. Literal independent v2 custom fixture keeps Digit2 potion/Digit3 menu/E interaction/T heal. No gamepad or exact PoE2 key-copy claim.

`createExpertInputCapture.press(token,slot,slots,{canUse})` receives only an accepted base-router press and resolves its skill identity immediately. `snapshot()` emits finite expert1/expert2 skill-ID pulses and stable channel ownerToken/held/released/cancelReason. No resource is charged here. Original simultaneous aliases are reference-counted; late aliases do not take over/restart a held channel. Early release cancels undelivered Onslaught; finite Banner survives normal click release.

Normal up, held-pointer loss and safety clear are distinct. Busy release can pass cancelReason to up and must not become a late Lance. `reset()` is only for the caller after synchronously cancelling the live battle action and retaining its durable checkpoint event; it prevents the first fresh input after a menu from being swallowed by old cancellation. Do not call reset while silently leaving a live channel running. Missing owner stops never restart via held keys.

`validateActionSlots`/`assignActionSlot` require an explicit runtime-supported list and positive learned ranks, distinct known active IDs, exact schema, and expected current slot token. They do not claim state/controller integration or persisted slot assignment yet.

Focused97/97 includes all retained controls/Adept-control tests plus capture/strict-assignment cases. Zero failures/skips. Source syntax/diff pass. Historic tests were updated only for new current version/optional rows; independent v1 fixtures retained and literal v2 introduced. No old case removed. All new values are authored ergonomics; reference files unchanged.

Still required: state4 migration/command integration, real main handlers, safety cancellation during busy commit, promotion UI checkpoint/revision, actual touch/keyboard rebind/cancel/save tests, render and ordinary-input QA. This checkpoint is isolated, not published, and does not independently establish a functional Expert tier.

A scoped action-safety coordinator now queues cancellation while a persistence transaction is busy. It clears captured inputs immediately; only after reconciliation may its drain call the supplied live cancellation and return the critical events. Stale battle/controller/life/region jobs are discarded without touching the new action. Repeated causes collapse into one job. A thrown cancellation retains the pending job. Main integration and real checkpoint failure tests remain pending. New17 coordinator tests plus40 input tests:57/57 pass.
