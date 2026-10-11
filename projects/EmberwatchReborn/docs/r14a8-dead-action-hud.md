# R14a8 life-state action HUD correction

Date: 2026-10-11 UTC. This bounded change starts from the preserved R14a7 candidate; no historical test count is inherited.

## Observation and source finding

The parent reported the public v58/R14a4 death screen showed the trained skill buttons as `쓰러짐 · 행동 불가`, while Space still said `회피 후 홀드 질주`. Its separately captured screen evidence is `v58-refit-death-ui.jpg` in the parent play-QA record. This work did not run a browser or independently inspect that screenshot.

The current R14a7 source confirmed the same inconsistency: `updateHud()` chose mobility copy from presentation pose/default instructions and potion copy from cooldown/count without consulting life state. The actual execution paths already reject dead actors: `acceptCombatPress` checks lifeDown/HP, `acceptBattleInput` checks dead/HP, and the campaign reducer rejects potion use after death or at HP 0.

The canonical-plan status and restored requirement trace were read from `docs/requirements/requirements-source-status.json` and `warrior-completion-checklist.md`. The canonical Library v2/v1.1 source remains the previously documented HTTP-403 materialization gap; this correction does not claim a new canonical-file verification or game-reference fact.

## Change and boundaries

Only `app/src/main.js:updateHud()` changes production behavior:

- Use existing `state.world.lifeDown`, `battle.dead` or HP <= 0 to derive one presentation-only death gate.
- All action-bar skill, mobility and potion buttons get native `disabled` and matching `aria-disabled` during death. Visible labels and `aria-label` use the existing `쓰러짐 · 행동 불가` text. A stale guard highlight cannot remain active.
- Confirmed retry rebuilds the battle and runs the same HUD function, clearing disabled/aria-disabled and restoring the original bindings, movement descriptions and potion count/cooldown.
- An empty potion inventory remains `0개` while alive and after retry. Death copy takes priority only while dead; it does not imply a refill. Alive empty/full-health/cooldown potion attempts retain their existing reducer rejection and feedback contract.
- No HP, damage, AI, movement/cast timing, keys, tuning, persistence, death fee, retry rewards or execution guard changes. Version and build metadata remain parent-owned.

`docs/r14a8-dead-action-hud-scope.txt` records an exact comparison proving the production source differed from the preserved a7 source only inside `updateHud()` at this checkpoint.

## New automatic regression evidence

`app/tests/dead-action-hud.test.mjs` executes extracted, unchanged production main HUD, keyboard/pointer, dispatch, report, death-panel and retry handlers with real combat/controller/reducer/store modules. Only browser DOM/audio/storage boundaries are probes. Inventory-empty and injury/life-marker cases are explicitly synthetic state fixtures, not earned progression.

The final standalone run passes **17/17**:

- Controls v3 and POE v4/v5, with combined and separate dodge/run bindings.
- Actual settlement changes live HUD to disabled/dead copy; repeated dead keyboard/pointer/potion requests do not spend resources or write storage.
- Reconstructed dead state still rejects inputs after the test removes the modal/pause barrier, proving the existing life guards remain operative.
- Actual retry clears the death UI once; duplicate retry does not save or resettle. A failed retry save keeps the death UI disabled until a successful commit.
- Fresh real-key dodge and potion usage work after retry, with the normal roll and cooldown descriptions restored.
- HP/dead/lifeDown presentation markers take precedence over stale sprint pose and potion cooldown.
- Zero potion inventory is distinct from death and remains zero after retry.
- The exact reported Space stale-copy regression is covered directly.

Command: `node --test --test-reporter=tap app/tests/dead-action-hud.test.mjs`

Log: `docs/r14a8-dead-action-hud-regression.tap`.

A focused combined run passed **298/298** across the first 16 new cases plus `action-eligibility`, `resource-display`, `dead-save-resume`, `expert-main-input` and `poe2-mobility`. The final direct Space-repro test was added afterward and is included in the final standalone 17-case run above. These overlapping runs are not additive unique-test counts.

Log: `docs/r14a8-dead-action-hud-focused.tap`.

Syntax checks passed for `app/src/main.js` and the new test.

## 원본 a7 실패 재현 대조

In a disposable temporary copy, the new direct Space regression test ran against the untouched preserved R14a7 `main.js`. It failed as expected, producing this actual dead HUD text:

`<b>Space</b>구르기 / 홀드 질주<em>회피 후 홀드 질주</em>`

The candidate then passed the same test. The preserved a7 tree was read only and was not modified. Log: `docs/r14a8-dead-action-hud-negative-control.tap`.

## Verification limits

No native UI/browser, rendered-pixel, assistive-technology, deployment, Git, Library or full-suite validation was performed by this correction task. Parent-owned aggregate checks and a new actual death → retry screen review remain separate acceptance gates. The source/handler tests establish text, attributes and runtime-state safety; they do not establish visual legibility or actual screen-reader announcements.
