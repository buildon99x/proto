# R8 pause-menu travel snapshot correction

## Brief

Correct the normal-input observation that F portal travel followed immediately by
Escape leaves the open pause menu naming the departure region after the HUD and
committed state have reached the destination. This is a presentation-only fix;
travel, save, economy, combat, and progression rules remain unchanged.

## Specification

- Mark the pause menu's region text as its own DOM node.
- After a successful runtime commit, update that node from committed state only
  if it still exists in the open modal.
- Do not reconstruct the panel, move focus, reopen a dismissed menu, replace a
  newer panel, call the menu handler again, or issue another checkpoint.
- Failed or uncertain travel keeps the existing failure/reload gate behavior.
- Existing resources, recovery, durable rewards, and progression remain intact.

## Evaluation plan

Execute unchanged production keyboard, interaction, dispatch, pause-menu,
close-panel, and click handlers with the real controller and delayed durable
in-memory store. Exercise F → Escape, Escape/Continue dismissal while pending,
newer help/objective panels, repeated open/close, and save failure. Assert the
committed destination, displayed region, preserved menu/focus, saved resources,
and exact command/write counts.

These are runtime-handler tests with a DOM probe and scripted reducer fixtures,
not browser play, visual QA, timing evidence, or a complete campaign claim.
Ordinary-input published-build regression remains the integrating task's gate.

## Results — 2026-10-09 UTC

- 10/10 new actual-handler regressions passed.
- Focused retained suite: 67/67 passed across pause-travel UI, signal UI,
  objective UI, runtime gate, runtime synchronization, and immediate input.
- The first regression fails against the unchanged HEAD main.js in an isolated
  temporary module copy: the committed state/HUD name 잿불 마을 while the actual
  menu HTML still names 잿불 신호 분지. No shared source was replaced for this check.
- Main source/test syntax and `git diff --check` passed.
- `pnpm sync:registry` was attempted but blocked by the environment's missing
  writable pnpm home (`ENOENT` creating `/home/agent/.local/share/pnpm`). The root
  registry script is also absent from this recovery checkout.
- No full suite, browser, build, Site publication, or remote Git write was run
  for this bounded subtask. The integrating task owns release checks, canonical
  brief/spec/eval roll-up, external archival, and normal-input validation.

Production changes are limited to the region span and its post-commit text update
in `app/src/main.js`. There are no balance/data changes or new dependencies.
