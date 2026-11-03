# Landscape camera/action access, narrow design

Source: proto-cat-cafe ac9e04f, released 0.3.11. Actual saved 568×320 before/after screenshots show zoom working, but the user must scroll between camera and play controls. The 390×844 screenshots already fit both sets, so portrait and desktop presentation stay unchanged.

## Chosen direction

Only when the existing card is expanded in landscape (480–1000px wide, <=500px high):
- A fixed first row inside the existing card contains ordinary buttons `놀이`, `시점`, `접기`, each at least 44×44px. View buttons use aria-pressed plus aria-controls. They are not tabs and do not implement arrow-key tab behavior.
- The scroll body starts with a single 44px control row: either all three labeled actions (default) or the existing two zoom buttons. Selecting either view returns this body to the top, including selecting its already-active view.
- The selected-cat name, distance, full activity/countdown, position disclosure, and nearest-cat button follow in the same scroll body. No copy is removed or line-clamped. Pending/countdown text continues updating in either mode; it is not replaced by camera text. The existing notice remains unchanged.
- Only the view/close row stays fixed. The active control row scrolls with the details. Pinning both rows was rejected because it would leave less than44px for the retained nearest/location controls.

## Layout budget

The right card stays wholly outside the central35–65% corridor. Landscape width is min(180px,35vw minus the right safe-area inset); standard right inset12px. Expanded landscape uses zero outer padding and3px horizontal gaps so the scroll body retains enough width for three44px targets even after its real scrollbar. Text/details get their own inset. Buttons keep full labels, with icon above text. Remove landscape action hover translation to avoid clipping.

Reduce landscape top/bottom gaps from12px to6px, without overlapping rooms/footer. At568×280 the bounded card is approximately104px high:44px header +4px gap +at least44px scroll viewport +2px border. For height<=300px, remove the vertical gap as well (90px minimum including border), leaving headroom when live-style room labels wrap. Enable this enhanced layout only when its measured scroll-body content width is at least138px (three44px targets plus two3px gaps), its viewport is at least44px high, and it stays within the card. With a larger safe-area inset or less space, retain the ordinary unified scroll card; never shrink controls or invade the center. The smaller viewport is an explicit gate: every retained button must become fully44px visible, not merely exist below the fold.

## DOM and focus

Use a body wrapper that is display:contents outside expanded landscape. In expanded landscape the header is a fixed flex item and the body is the only overflow:auto region, so sticky overlap cannot obscure a focused detail control. Keep the existing action and camera buttons, their IDs and handlers. In expanded landscape move only those two groups into a first-child control slot; restore them to their original positions on exit. A wrapper/header may be new, but there are no duplicate action/zoom controls, overlays, dependencies, or protocol changes.

Before hiding/moving a focused group, preserve a valid focus destination. Mode changes leave focus on their pressed view button. Opening moves focus off the now-hidden original card toggle to the selected view button. Closing/Escape returns focus to the original card toggle. Portrait resize restores focus to that toggle if a disappearing header button was focused; desktop resize restores to the corresponding existing control, or the always-visible settings button if that control is disabled. Moving a still-visible focused action/zoom restores that same element's focus after insertion. Native Tab order is header, active controls, position/nearest details, then following controls.

Collapse, room transition, and leave reset to the play view and collapsed compact state. Background/help/renderer gates continue disabling actual actions/zoom as before; no view switch invokes an action or movement. No timers/animations are added, so reduced-motion and pointer ownership remain unchanged.

## Rejected smaller alternative

Reordering five simultaneous44px controls still exceeds the narrow landscape card. Two pinned rows prevent remaining44px controls from ever becoming fully visible. A new floating overlay or wider center occupation violates the scope.

## Verification gates

Test first: mode/collapse/resize focus, real main room/leave/help/background and stale callbacks, no new sends, existing zoom clamp and pointer tests. Full app tests/lint/Vite. Supported cloud DOM at480×320,568×320,568×280 plus390×844/desktop regression: all labels and targets >=44px, both modes one tap away, all details controls fully scroll-reachable, no corridor/rooms/footer overlap, and focus valid after interruptions. DOM is not a physical-touch/GPU claim. Parent owns release and actual jh QA.
