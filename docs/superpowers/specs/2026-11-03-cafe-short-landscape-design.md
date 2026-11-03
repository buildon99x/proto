# Short-landscape feedback readability

Observed source: released0.3.12. Actual568×280 screenshot v0312-280-play.jpg shows the notice beside the joystick at~77px width. compactNoticeLayout constrains this fallback to the left35% rail. The44px action row works, but below it only part of the selected-cat name is initially visible.

## Narrow change

Only landscape480–1000px wide and height<=300px uses an optional measured header slot for the existing notice. Derive its left from connection.right+8 and right from settings.left−8, each bounded by the stage. Place it from max(stage.top+4,min(connection.top,settings.top)−4) to rooms.top−4. Require at least180px width and40px height. Otherwise use the existing rail formula; do not enlarge the rail into the central play corridor or claim that fallback is fully readable. Normal landscape320px, portrait and desktop notice geometry stay unchanged.

The notice keeps its exact text, role=status, aria-live=polite,10px font and1.35 line height. Header-slot padding4px vertically/8px horizontally, allowing three lines in approximately52px. Text wraps normally; overflow remains scrollable without truncation. No new duplicate notice, announcement, timer, auto-scroll or focus change. The full text remains available to accessibility and native scrolling. Test actual longest success and entry/pending/error copy; if relevant supported dimensions cannot expose the whole success copy without scroll, report that separately rather than shrink it.

Bind notice geometry to measured connection/settings rectangles. Existing ResizeObserver additionally observes connection/settings. A text change that changes connection width schedules the update; same-size changes do not need it. Existing rooms/card/footer observers, window resize/orientationchange and visualViewport resize cover the other bounds. Clear the header dataset/style branch on taller landscape or portrait. Updates set styles idempotently and do not move DOM or focus.

For expanded short landscape only, add one selected-cat name line inside the existing44px play view button, between 놀이 and the pending/countdown line. Keep name9px, line-height10px; title10px/12px; state9px/10px;4px vertical padding totals40px when allthree lines exist, so44px height remains. Name comes from the currently selected cat and clears with selection/room/leave resets. No selected cat -> no name line. The full name is included in the button aria-label along with 놀이 and existing accurate action/pending state. The name line can truncate with ellipsis only if an unexpectedly long name exceeds the measured button width; real project names must fit the target480px geometry. Name line hidden outside short landscape. Full selected-cat name and detail copy remain in the scroll body.

## Approaches considered

Widening the left rail would occlude the center, and shrinking type would preserve the unreadability. A new floating overlay or taller card would disturb the passing controls. The measured unused header gap plus a name line inside the existing button is the smallest change. Insufficient safe space keeps the old bounded fallback with an explicit verification limitation.

## Gates

Tests first: measured header/fallback bounds, source rectangle offsets, status resizing, portrait/tall-landscape reset; actual-main selected name, pending/countdown aria-label, room/leave clearing, no new actions/messages. DOM at568×280 and480×280 plus568/480×320 andportrait: actual full longest success copy, entry/pending/error copy, name+countdown, all44px targets, connection/home/rooms/joystick/card/central-corridor nonintersection, insufficient-gap fallback, resize restoration. Review before implementation and final source/DOM review before parent release. DOM is not a physical-touch/GPU or actual jh claim.
