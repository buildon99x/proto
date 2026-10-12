# Third independent melee candidate: active shield and fire counter

Baseline `fdde7fb370df25c82995a124e3f18037b07d6607` (storm v74 candidate) on `codex/emberwatch-rebuild`. This session defence loop is separate from crusher buildup and staff Combo/bells. It does not add a saved shield item, new skill tree, completed PoE2 port or AAA acceptance.

## Source basis and explicit candidate values

Official [0.2.0](https://www.pathofexile.com/forum/view-thread/3740562/filter-account-type/staff) records releasing Raise Shield immediately after a block to perform a frontal damaging/stunning Shield Bash. Official [0.3.0](https://www.pathofexile.com/forum/view-thread/3826682) records time-charged Magma Barrier spending a full charge on the next block with the shield raised for frontal lava spray. [0.5.0](https://www.pathofexile.com/forum/view-thread/3932540) changes shield Armour/Evasion-based added fire damage. These notes establish historical mechanics, not this adaptation's exact live tooltip or numerical parity.

| Choice | Provenance |
| --- | --- |
| Passive lava charge3 active simulation seconds | Authored trial; no verified PoE2 charge duration |
| Normal release window0.18 seconds after an actual active block, half-open | Authored trial reusing the existing queue-window magnitude, not its queue logic or a claimed PoE2 reaction window |
| Block stamina/reduction/facing | Existing shield quote unchanged, including partial damage reduction rather than immunity |
| Bash damage/duration/contact/CD/cost/range/arc | Existing mace quote; no extra MP or new multiplier |
| Bash stun | Existing learned charge stun value (base0.75s) |
| Charged spray damage/offense | Existing hammer quote's damage, authored conversion to a fire packet |
| Spray range/arc | Existing mace quote, frontal LOS geometry |
| Block Chance buff, Endurance Charge, Tower Shield Daze, Spirit reservation, shield Armour/Evasion scaling | Not implemented; old passive block remains unchanged |

## Actual executable loop

Ordinary whole starter training already supplies shield/mace/charge/hammer. In the candidate town menu select **용광 방패** with PoE controls and shield hold mode. Empty offhand uses a session training shield; the existing equipped oak shield also works through unchanged validated gear/catalog reads. No equipment writer or automatic item grant. Mainhand remains its actual existing item. Modes are mutually selected through the UI; no saved mode/charge/token fields.

Hold the current shield key and aim toward incoming attacks. The existing frontal active-block branch still pays its quoted stamina and applies its original damage reduction. Passive random blocks and rear attacks remain distinct. Only a positive, root incoming attack with a positive stable attack ID and a living hero can arm the release token or consume the full lava charge. Unknown-ID/environment exposures can retain ordinary guard behavior but cannot fabricate a new counter. In this selected mode a handled incoming attack ID cannot pay stamina, damage the hero or arm another counter on replay, including after invulnerability ends. The in-memory ledger is scoped to the battle/region; it is never serialized.

The real active block emits a dedicated directional shield impact and grants one0.18s token. Normal physical shield-key release consumes that token once and starts the existing mace action shell marked as **Shield Bash**. Its contact resolves a distinct frontal shield hit/stun with nonrecursive secondary packets. It does not run the ordinary mace contact or any crusher/Combo consumer. The shield shove peaks at the real quoted contact even while the previous partial block's hurt clock remains; original non-selected hurt priority is preserved.

The mode charges over active simulation time; menu/hidden pauses do not secretly advance it. At full charge the next real active block resets charge before emitting exactly one fire spray. Only current frontal, living, LOS targets receive one fire packet. No new mana charge, recursive hit proc, Endurance Charge or secondary counter is generated. A lethal hit wins over the payoff. Fire spray is immediate at block and Bash is a later conditional contact, not a differently coloured basic attack.

Other attack/interact/potion input cancels the pending release counter. Normal attacks keep the passive charge; accepted dodge clears defence/charge. Menu, blur, hidden, capture cancel and controls safety clear raised shield/token/charge through the existing owner/busy/blocked safety drain; there is no direct pending reset or save bypass. If a Bash was already accepted, safety marks its later contact cancelled while retaining ordinary action/recovery debt. After resume it cannot deal a delayed counter hit. Death clears immediately; region/retry rebuild creates fresh charge/token/ledger while carrying selection, and explicit reload/profile load/app restart returns to classic. Invalid mode setup clears defence and requires restoring hold/PoE controls or returning to classic.

## Verification and visual limits

See summary, focused/main/full tests, logs and preservation hashes. Model tests execute production projectiles, active/passive facing branches, resource spend, repeated attack IDs, root/secondary gating, timed/late/exact release boundaries, actual fire/Bash LOS, lethal active block, action/dodge cancellation, safety and rebuild. Main tests execute the actual menu focus, B hold, incoming projectile, B release, frames and durable saves, plus blur/hidden/focus/capture cancellation. Synthetic foes/projectiles and earned route fixtures are test setup, not native play or injected progression evidence.

Owned shield rig and distinct block outline, frontal fire rays, shield shove and lava meter are read-only. Existing owned audio is reused. Full physical immunity, live skill formula parity, native visual/temporal/audio/AX and AAA quality are not asserted. No new assets, installation, authentication, deployment, save/serialization/equipment writer, balance module or a19 change. The earlier storm native results are recorded separately in `native-storm-qa.md`.

## Normal-play QA on the existing Lv6 profile

Serve the complete extracted package root at `/qa-r14/`; retain the ordinary Lv6 profile restored to basic/iron mace in town. Keep the actual mainhand. Use the empty trained offhand or existing legally equipped shield. Set PoE controls and **방패 누름 유지**; at idle Esc → **전투 방식 · 용광 방패** → select. Use displayed bindings; default PoE WASD shield is B (the mode does not remap it).

For Bash, before or after charge, face a living enemy's tell and hold B to receive a real frontal block. Confirm stamina loss/partial HP damage and the dedicated shield outline. Release B immediately while **해제 반격 가능** appears: one shield shove should hit/stun only nearby frontal enemies. Compare no prior block, rear hit, stamina shortage and late release: no conditional Bash. Do not press another attack/guard-competing key during this reaction check.

For magma, wait3 active seconds while safely playing/holding guard, check **용암 준비**, then receive the next frontal active block. Confirm the meter resets and one frontal fire spray occurs; rotate/compare rear attacks and walls. Normal block costs continue; a weak attacker may die to the spray before the release Bash can hit it. Use a surviving enemy to inspect both contacts. Releasing after the window cannot rescue an expired token.

Exercise menu/blur/refocus, touch capture cancel, ordinary competing attack, dodge, death/retry, travel, mode switch and reload. No old raised shield/token/ready charge may create a free counter afterward. Shield pose, partial block readability, actual timing, one-effect perception, sound and keyboard/AX still require dot QA. Saving/failed gates must retain their original protection; never inject or import the profile through new writer routes.

## Remaining completion scope

Three session patterns are wired, with different levels of native verification. The gear audit still has7 slots/8 basic items, neck in accessory, no2H/left-right rings/belt, no stash, no graph skill tree and unconnected expedition modules. Those blocked/unfinished areas are not filled by this combat patch. Whole PoE2 port and AAA quality remain incomplete.

Readable logs normalize terminal CR/trailing whitespace. The raw log ZIP and SHA256 map preserve exact command outputs.
