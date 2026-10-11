# R14a10 dialog focus correction

Date:2026-10-11 UTC. Frozen baseline:a9 source and Git fa4b6cf93c6c8ca8200bec4f94b7b108a31a0d0d. Work is a separate source copy; a9 remains unchanged.

## Actual a9 evidence
Published v61 at /qa-r14/, dot Chromium, new QA tab54/profile,889×561 client:
- Esc menu → 조작 안내: accessibility focus reports 키 설정 while the screenshot shows the top of the long guide; the focused button is below the viewport. Tab reaches 돌아가기 and scrolls it into view.
- Esc menu Continue → Tab twice → Enter opens 키 설정. Shift+Tab from its first preset button reaches the background potion. Enter there produced no visible gameplay action.

Evidence held separately:09-compact-help-initial.jpg,10-help-return-tab-focus.jpg,11-help-return-menu-focus.jpg,15-settings-shifttab-background-focus.jpg,16-background-enter-no-visible-action.jpg. a8 comparison was not performed, so introduction version is unknown. The old a9 compact bar and primary menu regressions were observed fixed in this publication pass. A separately cancelled anonymous full-hash check is neither retried nor inferred complete by this work.

## Minimal behavior changes
- Help's existing key-settings and return buttons precede the guide; no binding descriptions were rewritten.
- Production panels expose a labeled role=dialog/aria-modal surface. Initial focus permits native scrolling and requests nearest visibility. Empty panels can retain focus on the section.
- Tab and Shift+Tab wrap eligible dialog controls. Hidden, disabled/disabled-fieldset, inert/aria-hidden, negative-tabindex, invisible and closed-details descendants are excluded. The first summary remains eligible. Background focus is redirected inside the current modal.
- The original connected usable opener is retained across nested panels. Dismissal restores it, with verified-focus success and canvas fallback for BODY/HTML, removed, hidden, disabled or failed targets.
- To avoid stranding gameplay on the restored HUD button, only that exact still-focused restored button may hand one fresh configured game key to canvas. Its current event is then routed once. Enter/NumpadEnter/Space/Tab/Escape, modified shortcuts, repeats and ordinary unrelated UI focus retain their existing behavior. Any focus departure or new panel clears that narrow exception. Binding definitions, combat/save modules and balance are unchanged.
- Key-capture mode retains priority, including assigning Tab and using Escape to return to controls. Save-failure and death gates still prevent resume.

## Test-first sequence
Before code edits,20 new actual-handler tests ran against unchanged a9:8 pass/12 fail. After the first patch,20/20 passed. Review then found two restoration edge cases: focused HUD controls blocked subsequent configured gameplay keys, and unfocusable/no-op origins could suppress canvas fallback. Added probes first reproduced2/34 and5/37 failures respectively. After fixes and explicit closed-details tests,39/39 focused tests passed. Keep these focused counts separate from the unique aggregate result in final-summary.json.

Tests execute the real panel/help/controls/keyboard handlers and router, with DOM visibility/focus/scroll/audio boundaries substituted. The gameplay action sink in the focus-only suite records routing; existing full integration suites still exercise real battle/controller/store behavior. Mock rectangles, focus calls and semantic markup do not establish visual, native scrolling, AX or screen-reader acceptance.

The first full aggregate had4002 total/3980 pass/22 failures: three minimal dead-resume probes lacked a global document, one objective probe omitted the new production dependency imports, four pending-title probes had no canvas while gameplay was inactive, and fourteen trainer probes parsed only a literal attribute-free h2 tag. The production panel now reads its own ownerDocument; the resumed-game handoff short-circuits before canvas access when gameplay is inactive. The objective fixture imports actual dependencies and the trainer title parser permits semantic heading attributes. Three follow-on trainer assertions exposed the probe’s exact old focusable-selector string; the DOM probe now supports the expanded production selector while retaining every focus/save assertion. No gameplay assertions were deleted or relaxed.

Root sync:registry/build:vercel were attempted in an isolated monorepo copy and are locally blocked by absent tsx/dependencies and the unavailable corepack home cache. These are separate from the passing app syntax/static build and the exact-commit remote CI result.

## Remaining acceptance
After parent-controlled Sites publication, verify at889×561 and1180×757:
1. Help opens with a visible focused key-settings button; key guide remains scrollable.
2. Both Tab boundaries stay in each modal, including closed/open details; Shift+Tab from first settings preset never reaches HUD.
3. Escape/Continue restore the original opener when appropriate. First fresh configured movement key returns to canvas and works once; native Enter/Space/Tab and Escape still act as UI keys while the opener is focused.
4. Nested help/settings, repeated open/close, key-capture Tab/Escape, removed opener and reload/save-failure/death flows remain safe.
5. Check keyboard and assistive-technology focus presentation; no actual a10 browser/visual result is claimed here.

The task performs Git checkpointing and source preservation only. Sites publication belongs to the parent. Original167-file Emberwatch, other projects, old root site, all game resources and Instagram tab51 are outside the change surface.

Final R14a10: **4,002/4,002 unique tests**, 0 fail/skip/cancel, 121563.5436ms; app lint and static build passed (118 files). Includes existing 3,963 plus 39 new. Local monorepo aggregate checks remain blocked by unavailable dependencies/corepack cache; exact-commit remote CI is recorded separately. Actual a10 browser QA and Sites publication remain separate.
