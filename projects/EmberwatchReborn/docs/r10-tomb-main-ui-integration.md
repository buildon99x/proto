# R10a Tomb main-handler integration

2026-10-10 UTC. This checkpoint connects the registered T reducers and read-only views to the actual main UI. It is a development candidate, not ordinary-input play, browser/screen acceptance, Expert implementation or a publication. The parent integration owns final whole-suite/build/registry/original-file integrity and external preservation gates. No browser, Library, publication or Git remote write was performed by this task.

## Production behavior

- All T actions pass through the existing controller/store dispatch. Object and Eda buttons capture only `tombCommandFields` plus the producing panel epoch. The captured revision, step and glyph are never refreshed on an old click. Busy input is ignored; pointer click count greater than one is ignored for T actions, and the existing native keyboard-repeat/focus ownership is preserved.
- Closing, opening the objective/menu/journal, death, loading or replacing a panel invalidates its completion callback. Opening a T object also respects generation and live-battle identity around its checkpoint await. An old controller finishing a save cannot replace a newly loaded profile's state or UI. Durable source commits remain valid.
- Successful T commands synchronize current HP/MP/stamina and paid recovery without replacing the battle. Only a `tombChanged.mapChanged` event rebuilds collision geometry and invalidates enemy path timers; enemies, committed tells, projectiles and live areas are retained.
- `nearest`, interaction routing, object cards, labels, render preparation and Eda quest cards use actual T catalog objects. Only Eda displays T acceptance/report; Orin keeps his equipment shop and Bran his existing skills. Dead heroes cannot open these interactions, and the authoritative reducer still rejects a replayed dead report.
- T portals are absent from town labels, render objects and selection before acceptance. Original return remains usable independently of the free optional stair. Priority is extended only for the explicit ready, reachable, line-of-sight checked T stair console/portal pair, within the existing76-unit reach.
- Completion comes from `tombObjectView.completed`. A locked, unfinished object remains visible despite having no action. The decoded projection keeps its free reread action; completed reward cards have no repeat-claim button.
- Latest campaign guidance prefers T after the earned F report. Full decoded order remains separately accessible through the journal from the objective and menu, including after ward/boss/report progress and reload. It names all three glyphs and explains wrong-order reset without a penalty. Existing interaction-key remapping is reflected in object/objective/HUD wording.
- Boss defeat does not collect the oath. The open boss return warns when the oath is missing; its ordinary return is not incorrectly gated by that pickup. The explicit oath action and Eda report are separate.
- HUD, inventory, shop and workshop use `tombGoldView`, showing total, spendable and reserved gold consistently. The protected120G is part of total gold. Shop eligibility still comes from authoritative equipment quotes. Death wording explains that ordinary spendable gold, not protected training funds, is subject to the5% loss.
- `renderer.render` receives `wardCarried:tombWardCarried(state)` and preserves original glyph/object metadata. This handoff is not visual verification. R10a title/menu/status share one build label; title/help disclose unplayed T and unfinished Expert/Master. Candidate copy UI includes the existing R9 namespace as a forward source.
- F/S completion text now directs the player to Eda for T and keeps Expert promotion/skills/future campaign explicitly unfinished. No reward, XP, skill cost or encounter numbers change in this UI slice.

## Tests and boundaries

`app/tests/tomb-ui-integration.test.mjs` executes unchanged current main functions and the actual document click listener, using production controller, store, reducers, views, battle construction, quotes and world geometry. DOM/audio/scheduling are substituted boundaries. Its parser reads the actual emitted button metadata rather than generating fresh action tokens at click time.

The predecessor and T routes are scripted production-handler fixtures. Enemy defeat reports and positions are scripted; they are not combat survival or normal keyboard/mouse gameplay. No XP, level, tier, tool, skill or quest flag is injected. Two explicitly labeled economic fixtures spend earned gold down to120G or0G by editing gold/spent-ledger values only; they verify UI availability/quote failure, not an observed shopping route.

New coverage includes normal/hard × skipped/connected stair complete routes; earned HardL14→L15 report; explicit oath; independent journal/reload/reread; captured revision/step/glyph and double/concurrent input; wrong-order feedback; paid pools and map-only rebuild; Close/objective/menu/journal races; profile replacement during commit; two-tab conflict/reload; failed/uncertain saves; dead carry/retry and dead report; completion versus locked cards; hidden town portals; exact stair priority/reach/LOS; correct NPC; totals/spendable/reservation UI; live custom key labels; renderer ward handoff; and actual R9→R10 copy/no-overwrite handling.

Existing checks were retained. Their harness imports were extended for the new production imports and renderer argument; obsolete four-pair, F-last-goal and T-unimplemented copy assertions were updated to the new contract rather than removed.

### Verified local checks

- `node app/scripts/check.mjs`: source and test syntax passed; no gameplay acceptance implied. Final UI test edits also passed `node --check`.
- Twelve affected UI/presentation/interaction/readability files, including the then73-case new T file: **291/291 passed**, zero failures/skips, sequential execution. These ran the final production UI source.
- Final T UI file now contains **74 passing cases**, including the added real R9→R10 copy handler case. The final rerun with the six retained dead-save startup cases passed **80/80**, zero failures/skips. This overlaps the preceding selection and must not be added as a separate new total.
- `git diff --check`: passed.
- No full-suite, build, registry, browser, publication, external archive or remote Git outcome is claimed here. The integration owner will run the full suite at final HEAD.

The complete local TAP/spec output is preserved in `verification-r10-main-ui/focused-291.txt` and `verification-r10-main-ui/final-tomb-and-dead-save-80.txt`. The latter contains the final74 T cases plus6 retained dead-save cases; both files are scripted handler evidence only.
