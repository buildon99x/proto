# Stash workshop slice, 0.14.0

Original specification§15 calls for after-session repair/crafting and protects story artifacts, but defines no recipes/prices. Existing catalog values and all weapon/ammo/armor combat tuning remain unchanged. Recipes use owned non-issued scrap; archives and bounty are never materials.

| Output, one stash stack | Scrap | Cash | Existing output value |
| --- | ---: | ---: | ---: |
| Medical kit |1|45|80|
| Frag |1|40|75|
| Scanner |2|40|110|
| Armor, durability45 |4|120|260|

Scrap value is35. Material value plus cash equals output value, so craft→sell cannot create value. Current armor sale value remains the existing260 (issued armor still0), regardless of wear; this slice does not retune sales. Full armor repair consumes1 scrap plus ceil(max(0,260×missingDurability/45−35)). UID and issued status survive repair; firearms currently have no wear field and are not repairable.

Craft projects stash slots after consumed materials: a full stash can work only when a whole input stack frees space; partial consumption preserves its UID and quantity. Each crafted stack has a new UID and immutable request receipt. Repair preserves the target UID. Retired materials cannot re-enter saved stash/raid results. Receipts persist through reload, conflict checks, failed writes and unknown acknowledgements. Currency cannot go negative or lose unrepresentable precision. Recovery overflow and active raids block workshop work.

Normal owned-stash UI exposes recipe/resource/cost controls, armor detail/repair quote and confirmation. Prepared quantities/durability refresh from saved stash after successful work or retry; outputs are explicitly taken into loadout. Existing12 bag slots/30kg and stash expansion limits remain. Taking an item into a full/heavy carry draft does not delete it from stash.

An end-to-end source fixture deploys in Canal Ward, takes actual authored scrap/bounty pickups, receives20 damage (armor45→32), completes the12s winch, settles820 contract cash, crafts a medical kit for1 scrap+45, repairs the same armor UID for1 scrap+41, then redeploys that equipment and crafted kit to Black Pines with734 bank/armor45. Enemy kills and travel are model fixtures; this is not recorded human combat or travel.

Schema6 reads1–5, preserves inventory/weapon states/progression/custom fields/receipts and retains exact schema5 bytes in deadfreight-backup-v5 before its first mutation when that backup is absent. Existing backups are not replaced. The key is scoped with all other keys in explicit test profiles. Workshop tests use fresh memory stores and mock DOM/render/audio; real user data is untouched. Observed stale writers refuse to overwrite; cross-tab atomicity is not promised by localStorage.

See [remaining work and exact execution](remaining-work-and-execution.md). The supported fresh URL is ?testProfile=workshop-qa; earlier arbitrary jh-laptop-qa-* URLs were rejected before startup and their HTTP200 results did not establish play. UI quality, actual browser storage, real raid→workshop→redeploy, screenshots, listening and device performance remain open. Weapon wear/mods, richer crafting/merchant economy and liquid-metal AI are not implemented by this slice.

## 0.14.1 ownership and restart audit

Three defects reproduced against source96e680917809afa90256dd06c67fa9c7f7c3cc66 with isolated memory stores are fixed: a failed workshop draft could stay stale forever after a foreign write; a deliberately changed return flag could make repaired issued armor saleable; a lost crafted UID could pass the fresh-issued deployment exception. Evidence JSON records baseline and fixed behavior, with actualUserData=false.

The conflict control discards only stale craft/repair intent after successfully reading the newer record, without writing it. Unreadable records, reverted conflicts and non-workshop pending operations are refused. New deployments persist optional UID/item/issued identity; new repair receipts preserve issued status. Legacy schema6 saves lacking these fields remain accepted without invented history. Source tests cover restart before/after writes, acknowledgement loss, observed stale tabs, deploy/workbench conflict and conservation. These guards do not provide atomic cross-tab transactions or client-side anti-cheat. Actual browser storage and human raid acceptance remain open.
