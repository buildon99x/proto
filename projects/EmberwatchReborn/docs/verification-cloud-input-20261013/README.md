# Supported Chromium input follow-up — bounded QA, not full crusher closure

Game source is still `7790afe6d7d20b5b1454bcdb208bab9f43e11df6`; branch start was `e1b9c0641b06f07a62e60f258cee4d1697764e23`. No game/input/audio/save/balance module was edited in this follow-up. The earlier4,681 automatic checks were not rerun or relabelled as fresh checks here.

The previous tool session87744 returned `Unknown process id`; its files, read-only earned snapshot and Git checkpoint remained. The old HTTP server on4182 closed connections without a response. Its browser OS process could still exist. We started a separate read-only HTTP server on4183 for the **same existing** `app/dist/qa-r14` output and a new ordinary profile `qa-cloud-input-20261013`. We did not inject/import/copy the earlier earned profile or create an alternate game writer. Normal UI gave this first-tier profile four trained starter skills and two potions. Consequently the added tests qualify common Warrior input paths, not the earlier earned Judgement-specific loop.

Native Playwright keyboard/mouse actions drive the actual installed headless Chromium app. DOM and browser-storage reads preserve evidence; a read-only `requestAnimationFrame` observer collects page frame intervals. No synthetic blur/visibility/gameplay events, game-module evaluation, stat mutation or storage writes are used by the QA runner. Existing game UI performs normal save/progression writes.

## Observed input cases

| Case | Evidence and actual result |
| --- | --- |
| Ready input | Screens02/03: native ready mace start0.60–1.10ms from handler observation; first render entry11.90–19.10ms, real action contact233.50–263.70ms. These are internal timestamps, not device/monitor latency. |
| Early and late skill interruption | Screen02: RMB at700ms of a repeated mace sequence was rejected `recovery-too-early`, with no hammer start/contact. It is not a successful skill switch. Screen03: later RMB at970ms entered the existing queue; hammer began91.00ms later and contacted at394.70ms from input. Held mace starts10/11 followed the hammer, with contacts179.60/205.60ms from their own start. |
| Startup dodge and held restart | Screen09: hammer input172 and mace input174 started, but their contact remained unobserved after Space inputs173/175 started rolls. Held mace176 subsequently started and contacted182.50ms from its own start. No physical sound/display synchronization is asserted. |
| Release stops repetition | Screen15: a1.2s native J hold followed by keyup and1.5s active wait produced exactly one new physical start180 and two held starts181/182. No additional repeat appeared during that wait. |
| Duplicate save click | Screen10: actual `.dblclick` on the normal save button retained a byte-identical model payload; revision361→362. This is a bounded save-button case, not proof about every transaction. |
| Duplicate charge click | Screen11: actual `.dblclick` on the charge hotbar button spent exactly10stamina (45→35). First input177 started/contacted;178 did not start and was rejected/not ready. The visible cooldown notice was3.0s. No second paid charge was observed. |
| UI focus ownership and resume | Screen16: while D/J were held, a native menu-button click moved focus into the actual dialog and cleared gameplay input. Position `(375.6213071,394.3786929)` stayed identical after Continue and repeated keydown while those keys were still held. Keyup then fresh D/J press moved to `(420.7672467,349.2327533)`. This is real within-page dialog focus behavior, not OS/browser-window blur acceptance. |
| Death transition and containment | Screens12–14: real road attacks killed the new profile. J/Q/P/Escape and three native Tab presses left the death dialog active, canvas inert and focus on its sole retry button. Dead revision558/life0/deaths1 remained; native Enter activated the existing retry UI → life1, still deaths1, full pools. No duplicate death or unintended background menu was observed in this sequence. |

## External focus remains unverified

Native page creation/`bring_to_front` did not produce the requested focus loss in this headless runtime: the game stayed `document.hasFocus()===true`, `visibilityState==='visible'`, modal hidden. Screen04 is a **failed focus-test setup**, not a safety-pause pass. The QA protocol then attempted Continue although no dialog existed; its timeout and a navigation/proximity mistake remain in raw evidence. We released the held keys, preserved the failure and did not manufacture events to make the check pass.

`summary.json` contains3 operation failures and zero page errors. Browser/OS blur, hidden-tab delivery, native screen-reader/AX acceptance and physical input/display/listening remain open. Ordinary dialog focus was tested separately as described above.

## Current page frame intervals

Same trained town camera position,1440×900, three8s idle trials and three8s held-mace trials, no movement during either measured condition.2,877 raw intervals total; none filtered. The actual samples and exact floating-point values are in `native-observations.jsonl`/`summary.json`.

| Condition | Samples | Median | P95 | P99 | Maximum |
| --- | ---: | ---: | ---: | ---: | ---: |
| Idle,3 trials | 1,439 | 16.7ms | 16.7ms | 16.8ms | 33.4ms |
| Held mace,3 trials | 1,438 | 16.7ms | 16.7–16.8ms | 16.8ms | 33.4ms |

No interval exceeded33.5ms or500ms in these samples. Values near33.4ms have ordinary floating-point subtraction noise; they are not treated as a separate regression. An old browser process may remain alive, and the added observer also has cost. This is **one headless town scene**, not full combat/FX performance, GPU cost, visible monitor frames, physical latency or a60FPS guarantee. No performance fix was implemented or claimed.

## PNG preservation and Library blocker

The parent explicitly requested the new representative PNG batch:57/62 plus byte-identical original `hero.png` and `motion-warrior-axe.png`. Official Library read and prepare actions succeeded through the available app surface; this was distinct from the earlier archive/helper-discovery failure. The current helper's signed-URL byte uploader then repeatedly reported `Put … Forbidden` for all four files. Its stuck transfer workers were terminated, and it returned `completed:[]`. **No finalization was called and no Library IDs were created.** No same-file direct fallback, alternate namespace or renewed transfer was attempted after this failure. The reason for Forbidden is unresolved; do not conflate it with clearance or the original a19 security decision.

Exact reviewable paths remain:

- Build: `/workspace/emberwatch-reborn/projects/EmberwatchReborn/app/dist/qa-r14/`, including `build-manifest.json`; current local server `http://127.0.0.1:4183/qa-r14/`.
- Earlier representative screens: `app/artifacts/qa-cloud-20261013/57-contrast-valid-contact.png` and `62-zero-flash-valid-wave.png`.
- Original PNGs: `app/src/assets/hero.png` and `motion-warrior-axe.png`; their exact-original-remote-blob provenance is already in `docs/verification-r14a2/git-resource-provenance.json` and the earlier167-file preservation report.
- This16-screen native QA set and private raw snapshots: `app/artifacts/qa-cloud-input-20261013/`.
- Public text evidence: this folder's `native-observations.jsonl`, `screenshots.json` and `summary.json`. PNGs/raw owned storage snapshots stay excluded from Git.

The unresolved a19 protection, actual listening/physical delay and remaining-build gate are unchanged. No equipment/save/growth writer was recreated, and no deployment or main merge occurred.
