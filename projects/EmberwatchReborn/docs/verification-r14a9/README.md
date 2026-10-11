# R14a9 compact HUD and primary pause actions

Date: 2026-10-11 UTC. Frozen source baseline R14a8, Git parent 8909c8d80adaa050dcc9a946f8b28bf01ed5411c. This is a separate work surface; the a8 files remain unchanged.

## Observed defects
Actual dot Chromium QA of published a8 at **889×561** found six visible actions split five plus a left-aligned potion on a second row. The Esc panel initially focused Continue below its scroll viewport. Tab moved focus to Save and scrolled correctly: this was an initial focus-visibility defect, not a keyboard trap.

Parent QA evidence is held separately as 17-compact-viewport-menu.jpg, 18-compact-hud.jpg and 20-compact-menu-tab-focus.jpg in the a8 combat-quality evidence set. No new screenshots or game-image bytes are part of this Git checkpoint.

## Presentation changes
- Existing visible action count and CSS viewport width choose balanced columns. At 889px, six buttons use one 702px row, each 112×72px. Minimum target width is 88px; text is not globally scaled down. Narrow six-action layouts use 3+3. Full eleven-action compact layout uses 6+5.
- Hint/touch vertical offsets follow the occupied grid height instead of historical hard-coded two-row offsets. The helper writes only CSS custom properties, and skips unchanged writes.
- Continue, current-position Save, key settings and save-and-title appear before profile text, attributes and telemetry. The existing focus handler now targets the first visible action. Key help remains a direct secondary button.
- Attributes default open so allocating one point and rebuilding the menu does not collapse the next +1 action. Audio/display and telemetry/QA details default closed and remain keyboard-operable native details.
- Short panels use available dynamic viewport height. Existing Escape, save, failure/recovery, action bindings and button handlers are unchanged.

## Automated checks and limits
The new production-handler regression covers balanced widths including the 581/582 breakpoint, versions3/4/5 and combined/separate mobility, hidden actions, death labels, menu priority, help return, repeat opening, focus restoration and the uncertain-save gate. DOM/style/focus are boundary probes, not browser measurements. Existing controller/save/race tests remain part of the full suite.

First aggregate: 3961 total, 3918 pass, 43 fail; 41 resource-display harnesses lacked the new canvas width boundary and two title assertions still expected R14a8. Second aggregate after label expectations and default-open attribute correction: 3961 total, 3920 pass, 41 fail (same missing canvas). The resource-display fixture now supplies canvas.width without changing any gameplay assertion. Gap-aware width assertions and both exact breakpoint cases were added. Focused final 65/65 includes the new23 and existing42 resource-display cases; do not add this overlap to the final unique count. The unchanged a8 production HUD/menu/CSS run against the new regression fails9/23 while the pure-layout checks remain valid; baseline-probe.tap preserves this direct original-defect comparison. See final-summary.json for final aggregate results.

Read-only source review checked 19,452 layout combinations (300–1920px, 1–12 visible actions) and found no target-width, grid-row or side-bound violation. This is mathematical/static evidence, not rendered pixels.

## Checks not passed or not run
Root monorepo sync:registry/build:vercel were attempted in a separate archive of the exact base tree with the candidate overlaid. Dependencies are absent. Default pnpm first could not create its home store; a supported no-auto-install retry reached the missing tsx executable. These aggregate stages are **blocked**, not app-build failures. Their logs are preserved; remote CI for the exact pushed commit must be checked independently.

No a9 normal-input browser, screen-reader, touch, physical frame/audio latency or visual acceptance is claimed. Sites publication belongs to the parent task. R11 public root must remain unchanged.

## Post-publication acceptance
1. Verify deployed a9 bytes and build label. At 889×561, confirm all six starter buttons align in one row; potion remains rightmost, labels/costs readable, ground visibility improves.
2. Press Esc: Continue is visible and visibly focused immediately. Tab through Save, key settings and save-and-title. Return from help/settings repeatedly; initial focus remains visible.
3. Allocate repeated earned attribute points and adjust audio/display settings; verify correct save and no unexpected collapse/input resumption. Exercise save, leave, reload and the existing save-failure guard separately.
4. Repeat at 1180×757, narrow 375px, and a coarse-pointer viewport. At 375px, 10–12 visible actions necessarily produce four72px rows (318px bottom stack); short full-loadout touch screens remain a known QA concern rather than a claimed mobile acceptance.
5. Confirm death/retry native disabled and accessible labels, unchanged key bindings, and normal movement/combat after menu dismissal.
