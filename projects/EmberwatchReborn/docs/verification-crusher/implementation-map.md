# PoE-inspired runtime status at the first crusher checkpoint

This branch is the working PoE-inspired candidate, not a separately completed port. Its game entry is `/qa-r14/`; the exact Git checkpoint identifies the candidate while the existing R14a18 build label is preserved. A fresh profile still starts with existing recommended controls; select PoE WASD/click controls in the normal settings UI.

| Area | Actual runtime status | Remaining scope |
| --- | --- | --- |
| Movement/input | WASD or click movement, independent cursor/ground aim, release tracking, binding and learned skill slot assignment | Native responsiveness/focus QA is separate |
| Crusher | Town-selectable direct mace buildup, authoritative preparation diamond, targeted heavy conversion, one target-centred wave and reset | Damage-scaled accumulation, rarity thresholds and full live PoE2 formulas are not implemented |
| Storm combo | Not implemented in this checkpoint | Valid-hit combo, Tempest Bell placement/consumption, direct-hit waves, timed Gathering Storm interaction |
| Magma shield | Existing ordinary shield guard remains | Frontal actual-block buildup, timed magma readiness and release-after-block Bash |
| Equipment | Existing purchase/equip/stat flow, iron mace and oak shield | Multiple weapon engines and left/right rings, neck/belt are absent; blocked a19 writer work is excluded |
| Inventory | Existing equipment/inventory lists and approved transaction handlers | Grid bag/stash and new persistence schema are absent |
| Skill growth | Existing earned promotion, skill purchase list and branches | A visual linked node tree is absent |
| Portal/flasks | Existing one-way town portal and health consumable | Mana/charge flasks absent |
| Maps/enemies | Existing authored connected regions, dungeons and enemy telegraphs/patterns | PoE map items/Atlas absent |

The three working names “파쇄철퇴”, “폭풍연격”, “용광방패” describe intended Emberwatch adaptations, not confirmed official or popular PoE2 builds. This checkpoint delivers the first loop only. Save/serialization/migration extensions are outside the permitted scope; do not recreate or bypass the blocked a19 changes to fill those gaps.
