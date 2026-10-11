# Actual-play priorities after the v58 L1→L3 review

Date: 2026-10-11 UTC. All new screen evidence is public v58/R14a4 on dot cloud Chrome; a5–a8 are not implied by it. Normal profile qa-r14-feel-20261011-0259 was created, trained, played and exported through visible controls. Balance and new late-game progression are on hold.

## Established results
- First arrival, four starter actions, six-kill patrol and report reached L2. Normal continue, death/retry, first-boss encounter, low-health escape and town return reached L3. First boss was not defeated.
- Existing-profile reload preserved L3 HP3/63,XP29,G87 and keys. NPC rest deliberately healed HP. Travel itself did not heal.
- Earned skill points were spent through Bran's menu, producing mace3/hammer2/iron-collision1 and SP0. Their HUD costs changed to MP20/STA12.5. A subsequent first-boss retry ended in death; town retry preserved choices and earned progress (L3 XP51,G90,21kills,2deaths).
- L2, pre-refitL3 and post-refitL3 checkpoints are externally preserved. Only the earlier independent L18 checkpoint has been restored to an empty profile and actually continued. Do not claim all exported checkpoints were restored.

## Ranked defects and gates
1. P1: Old action-recovery notice survives later successful actions and occupies central fight space. Reproduced repeatedly in v58. Scoped a6 clearing and a7 desktop placement exist but require actual screen regression with long remapped labels and eight slots. Do not remove unrelated warnings or all notice lifetimes.
2. P2: Death HUD leaves Space/potion with ordinary descriptions. Reproduced in v58, confirmed in a7 source. a8 makes lifecycle availability explicit without changing runtime combat. Actual a8 death/retry screen and keyboard focus restoration remain required.
3. P1 validation gate: Large sprite, small ground body and camera-follow movement complicate precise contact/target reading. A target ring/name is visible, but an exact large-body centreline rejection has not been observed. a7's optional read-only path/body overlay must run on an ordinarily earned profile; its marker is geometric inference, not an engine contact-event claim.
4. P2: L1 town shows many locked/late portal labels and shrine-shaped NPC placeholders; training text exposes raw parameter/radian lists. A future narrowly reviewed hierarchy/label presentation pass should reduce this burden without hiding usable exits or inventing NPC assets.
5. P1 acceptance gate: Flashy a5 FX, full motion cadence and a7 diagnostic layering have not been watched in the candidate. Screenshots of v58 cannot accept them. Verify preparation/contact/recovery, danger-boundary priority, player/loot visibility and flash0 during an actual multi-enemy exchange.
6. P1 measurement gate: No new real-browser frame-cost sample exists. a7 records bounded CPU/RAF observations and keeps the last active segment during menus, but synthetic tests cannot establish GPU cost, end-to-end display latency or audio onset. Repeated foreground/render pauses were isolated to the automated tab foreground condition and resolved by normal tab selection; no broad focus-failure claim is justified.

## Evidence and limits
- First L2 QA: libfile_ed11057410588191a73fae0566416d7a, normal JSON libfile_7735a80423bc819190e5da3ca3df5465.
- L3 boss/retreat/reload QA: libfile_0e8ff3cb051c8191a9285f6aa6c4fe8f, JSON libfile_f3554eb4190c8191b9d67dc234992468.
- L3 refit/retry QA: libfile_007a6ca818308191a8dde91e40cd7d55, JSON libfile_54f4706ad85c8191981f1a84fe11be8a.
- Representative actual screens: libfile_ec0659ed2f7081918a639fe3918950dc (boss/notice/line overlap), libfile_5f8659d192108191b03bd044c2f11b89 (low-health town return).

Tool-requested key durations are not physical input timestamps. Frequent Escape observation pauses mean this is not a continuous-human performance, DPS, TTK or campaign-length benchmark. One earlier death followed an unattended tool gap; the later death followed deliberate combat chunks. Both must retain their context. Sound was not listened to: no listening capability was available. AAA completion, exact POE2 timings, all skills, all gameplay and full campaign are not accepted.

## Next smallest permitted validation
After an approved candidate update or a working supported local preview, verify a8's dead/retry labels, a6 stale-notice clearing and a7 notice placement together on the same normally earned profile. Enable contact and frame observers explicitly only for the contact/performance pass. Preserve screenshots, exact app/Site version and a selected-profile checkpoint. Keep original root and earlier saves. No deployment retry is authorized by this document; the pending v59 approval remains separate.
