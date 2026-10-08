# Campaign inventory and economy core

Implemented for canonical campaign plan v1.1, H2-05/06/07/11. These modules are pure, dependency-free domain logic. They are not connected to the expedition runtime, shop UI, world NPCs or combat effect dispatcher. They contain no production item catalog, recipes, prices, affix roll tables or original-game numeric formulas.

## Functional boundaries and provenance

- Exactly seven save slots: `mainHand`, `offHand`, `head`, `chest`, `hands`, `feet`, `accessory`.
- Warrior uses mace/shield; Mage uses wand/grimoire; Archer uses sword/bow. Main/off hand are separate fixed roles.
- Tier (`apprentice`, `adept`, `expert`, `master`) and quality (`common`, `uncommon`, `rare`, `epic`, `legendary`, `unique`) are independent dimensions. Equipment requires an item tier at or below the character's saved trained tier, in addition to STR/DEX/INT requirements. Character level alone never promotes or unlocks equipment. Quality does not grant or remove tier eligibility.
- Every equipment base explicitly supplies all three minimum attributes. Eligibility uses the existing sourced class base attributes plus the save's allocated attributes. No derived damage, armor, regeneration, critical, affix-stacking or enchantment-stacking formula is introduced.
- A comparison subtracts the two items' explicitly supplied raw stat values. An instance's `stats`, when present, is its complete rolled stat record, not an extra additive modifier. Otherwise base `stats` is used. Affixes/enchantment metadata is preserved and displayed separately; its combat conversion remains unresolved.
- Twenty-four world hours is the accepted plan's refresh scheduling rule. The reference describes this as approximately 24 hours for major shops. Its exact original timing phase and cash reset behavior are not established here. Epochs aligned to campaign minute zero are an explicit implementation scheduling choice. The merchant's cash policy and deterministic stock cycles must be declared in the input table.
- Cooking requires an owned tool whose catalog `toolType` is `pan`; an arbitrary tool cannot fulfill the requirement by being named in the recipe.
- Existing enchantment handling, allowed bases/tiers/qualities, equipped-item processing, yields and whether disenchantment destroys an item are required policies, never inferred from rarity.

Every executable catalog, item base, award, vendor table, recipe and processing/refill policy has `provenance: {kind, source}` (`url` may substitute for `source`). `kind` and source must be nonempty strings. A supplied `status` of `unknown`/`UNKNOWN` is rejected. Provenance records may carry supporting metadata. They record the caller's evidence; the engine does not independently verify source claims. Production data must preserve the distinction between sourced rules and original authored content. The numeric fixtures in the test file are synthetic and explicitly labeled; they are not Hammerwatch II data.

## Result and commit contract

Read operations return `{ok: true, ...data}` or `{ok: false, code, ...details}`. Every mutating public operation takes a request containing a stable `transactionId` and returns one of:

- Success: `{ok: true, save, receipt, replayed: false, ...operationResult}`.
- Exact retry against a settled save: `{ok: true, save, receipt, replayed: true}`. No duplicate operation effects are returned at the top level.
- Invalid operation: `{ok: false, code, ...details}`; the input save and all caller definitions remain unchanged, including refresh timestamps and receipts.

Use a transaction ID for one particular player action and reuse it across retries. Reusing the ID for a different request or domain returns `TRANSACTION_CONFLICT`. Exact retries return the existing saved result even if the item has since moved. The transaction domain and canonical request string form the intent check; caller-supplied object key order does not matter.

The caller must commit the complete returned snapshot with `createCampaignSession(...).save(result.save, {expectedRevision})` before replacing live state or presenting success. This atomically persists player money, merchant cash, physical ownership, stock, materials, equipment and receipt together. The pure operation does not call storage. A failed durable commit must leave live state at the last committed save and retry from that save, using the same transaction ID. Do not persist inventory and vendor state separately.

Consumable use returns declared effect descriptions and saves the associated receipt. Apply supported resource/buff changes to that same returned snapshot before its one durable commit. The consumer must skip effect dispatch when `replayed` is true. Persisting the item consumption and then dispatching effects separately is not an exactly-once effect transaction; that integration is not implemented in these modules. No combat/resource formula is guessed here.

Successful operations initialize missing optional ledgers. Existing malformed ledgers are rejected. Save extensions are:

- `transactions`: append-only receipts `{id, domain, intent, result, worldTimeMinutes}`. Existing foreign-domain receipts are preserved and their IDs remain reserved.
- `inventoryRules`: canonical signatures of settled catalog/vendor/recipe/policy/award definitions.
- `inventoryAwards`: independently unique award IDs, preventing a claimed chest/quest award from being repeated under a different transaction ID.
- `economy.vendors[vendorId]`: `{cycle, lastRefreshMinute, cash, stock}`.
- `world.shopRefreshTimes[vendorId]`: last refresh boundary in world minutes.

A rule's ID is bound to its complete definition after first successful use. Changing the supplied definition, even its declared revision, is `RULE_CHANGED`. This prevents reopening a shop, reloading or modifying a recipe payload from rerolling settled outcomes. Content updates need a deliberate migration with preserved receipts; automatic rebinding is deliberately absent. Never prune the transaction or award ledger casually. The existing save store enforces its size limit and must report any resulting write failure.

## Catalog schema

`{id, revision, provenance, bases: [...]}`; IDs and revision are strings. Base categories:

- Equipment: `{id, category: 'equipment', slot, weaponType?, requirements: {strength, dexterity, intelligence}, stats: {...}, classes?, provenance}`. All requirement values are nonnegative safe integers; stat values must be finite. Weapons require `weaponType`. Optional `classes` is an explicit nonempty list from `warrior`, `mage`, `archer`.
- Material: `{id, category: 'material', provenance}`. Quantities live in `inventory.materials[baseId]`.
- Tool: `{id, category: 'tool', toolType?, provenance}`. Owned durable tool IDs live in `inventory.tools`; duplicates are rejected. Consumable or stackable tool rules would need a separate declared extension.
- Consumable: `{id, category: 'consumable', capacity?, effects?, provenance}`. `capacity` declares a refillable vessel's maximum charges. Effects are provenance-bearing records interpreted by the future combat integration.

Equipment instances: `{id, baseId, tier, quality, stats?, affixes?, enchantment?}`. Affixes and non-null enchantments require their own ID and provenance. Equipment remains in `inventory.equipmentInstances` while equipped; slots reference instance IDs. Each physical instance ID is unique across player equipment, consumables and live merchant stock. Sold-out stock rows retain their original template but no longer own that physical ID.

Consumable instances: `{id, baseId, quantity, charges?}`. Refillable vessels have quantity one and a charge count from zero through their base capacity. Uncharged food stacks have a positive integer quantity. Buying/selling a partial stack creates a deterministic transaction-derived ID and conserves total quantity.

Inventory operations validate the current catalog and inventory. Invalid imported equipment, duplicate IDs, unknown bases, duplicate tools, extra equipment/attribute keys, invalid trained tiers, gear above the trained tier and incompatible equipped weapons fail closed. An attribute reallocation that would invalidate currently equipped requirements must unequip the affected item within its own coherent change; this module does not silently remove gear or repair imported data.

## Public inventory API

All are named exports from `app/src/campaign/inventory.js`:

- `validateItemCatalog(catalog)` and `validateCampaignInventory(save, catalog)`.
- `equipmentEligibility(save, catalog, itemId, slot?)`.
- `compareCampaignEquipment(save, catalog, itemId)`: candidate/current copies, raw stat deltas, eligibility and unresolved combat calculations.
- `equipCampaignItem(save, catalog, {transactionId, itemId, slot?})`.
- `unequipCampaignItem(save, catalog, {transactionId, slot})`.
- `receiveCampaignItems(save, catalog, {transactionId, award})`, where award is `{id, provenance, items, gold?}`. Award ID is the once-only source identity, such as a particular chest instance or quest reward.

An item bundle has optional `equipment` and `consumables` instance arrays, `materials` quantity map and `tools` ID array. A received award's equipment and consumable IDs are explicit. Recipe/policy output instances instead receive stable IDs derived from the transaction and output position. IDs are nonempty, bounded strings; unsafe object keys are rejected.

The module also exports small validated-operation helpers used by `economy.js`; application UI should normally use the public domain operations above.

## Vendor tables and trade API

A vendor table is:

```js
{
 id, revision, provenance, cash,
 sellPrices: {baseId: integerPrice}, // Gold paid by the player.
 buyPrices: {baseId: integerPrice},  // Gold paid by the merchant.
 refresh: {intervalMinutes: 1440, cash: 'reset' | 'retain' | 'atLeast', stock: 'replace'},
 stockCycles: [ [ {id, baseId, quantity, instance?} ], ... ]
}
```

No base price multiplier, rounding or automatic resale margin is inferred. Prices may explicitly be zero, but negative, fractional, nonfinite and unsafe prices are invalid. Each vendor's price maps are independent. A vendor accepts resale only when both its buy and resale price for that base are declared. Stock items use the appropriate `instance` template for equipment or consumables; the engine stamps the base and a physical ID containing vendor, world epoch and row ID. Equipment and tools have quantity one. A potion template supplies its charge count.

The stock cycle is `floor(world.timeMinutes / 1440)`. Its explicit table entry is selected modulo the number of supplied cycles. There is no random generator or real-clock dependency. Reopening within an epoch preserves both purchases and merchant cash. Advancing across a boundary replaces stock using the declared next cycle and applies the explicit cash refresh policy. Going backward before a merchant's last epoch is rejected. Sold items become stock with original equipment properties; a later refresh handles that stock using the declared replacement policy.

Named exports from `economy.js`:

- `validateVendorTable(table, catalog)`, `validateCampaignEconomy(save, catalog)`.
- `refreshCampaignVendor(save, catalog, table, {transactionId})`.
- `quoteCampaignTrade(save, catalog, table, request)`: read-only quote including total and cycle.
- `tradeCampaignItem(save, catalog, table, request)`: refresh and trade in a single transaction.

Trade request: `{transactionId, direction: 'buy' | 'sell', quantity, stockId?, itemId?, baseId?, expectedTotal?, expectedCycle?}`. Buy by stock row ID; sell equipment/consumables by instance ID, or materials/tools by base ID. Equipped gear must be unequipped before sale. Pass the reviewed quote's total and cycle back to reject a stale quote. Failed trades do not refresh merchant stock as a side effect. Shortage, overflow, malformed stock or a conflicting item ID rolls back the entire operation.

## Recipes, refill and item processing

All recipes and processing policies explicitly include:

`{id, provenance, station, materials: {baseId: positiveInteger}, tools: [baseId], goldCost: nonnegativeInteger, unlock?: {questFlag, value}}`.

Use empty `materials`/`tools` when there is no requirement. The request's `station` must equal the policy's station. The caller is responsible for verifying that the current world NPC/workbench actually provides that station; these pure modules cannot establish player proximity or NPC availability.

- `craftCampaignRecipe(save, catalog, recipe, {transactionId, station})`: recipe adds `kind: 'craft' | 'cook' | 'potion'` and `outputs` bundle. Cooking also declares `panToolId` and requires that base to be a pan. Output instance IDs are generated from the transaction, not random. One call makes one recipe; batch crafting is not implicitly implemented.
- `refillCampaignPotion(save, catalog, policy, {transactionId, station, itemId})`: policy adds `baseIds` (eligible refillable consumables) and `amount: 'full' | positiveInteger`. Charges cannot exceed the declared capacity. A full potion rejects the action without charging money/materials.
- `consumeCampaignItem(save, catalog, {transactionId, itemId})`: consumes one stack unit or vessel charge and returns the base's declared effect records. Missing effects or empty vessels reject the action.
- `enchantCampaignItem(save, catalog, policy, {transactionId, station, itemId})`: policy also requires `baseIds`, `tiers`, `qualities` (each a nonempty explicit list or `'*'`); `equipped: 'reject' | 'allow' | 'unequip'`; `existingEnchantment: 'reject' | 'replace'`; and a complete provenance-bearing `enchantment`. This function sets only the declared enchantment metadata. It does not infer rarity changes or calculate combat totals.
- `disenchantCampaignItem(save, catalog, policy, {transactionId, station, itemId})`: uses the same explicit base/tier/quality/equipped restrictions, plus `existingEnchantment: 'required' | 'optional'`, `itemDisposition: 'destroy' | 'retain'` and an `outputs` bundle. Destroying equipped gear requires explicit `equipped: 'unequip'`; retaining an item clears its enchantment. Material yield is entirely supplied.

The engine does not claim an original-game restriction based only on an item's high quality. A verified restriction can be expressed by the allowed quality list and `existingEnchantment` policy; unresolved policies cannot be omitted and accidentally treated as permissive defaults.

## Verification and remaining integration

`node --test app/tests/campaign-inventory.test.mjs` passes 21 scenarios. Coverage includes every class/main-off pairing and all seven slots; all three requirements; independent tier/quality and authoritative trained-tier gating at all four tiers; level-only rejection and promoted unlock; immutable frozen input; malformed provenance/prices/IDs/ledgers; cash, stock, materials and overflow rollback; merchant-specific prices; exact 24-hour boundary and skipped cycles; buyback/stack splitting; no reopening or payload reroll; retry/cross-domain conflict; pan cooking; recipe unlock/tool checks; potion refill/use; enchant/disenchant policies; once-only award identities; and failure/recovery around the existing atomic campaign save store. Project JavaScript syntax checking also passed while these changes were developed.

Remaining work belongs to the campaign integration: verified or explicitly authored production item/recipe/vendor datasets; sourced affix distribution and restrictions; combat effect interpretation and derived totals; inventory/shop/workbench/quick-slot Korean UI; station/world interaction checks; a coordinated root-owned package test entry; save migration policy for future content revisions; browser lifecycle tests and normal-control play. This implementation does not establish M3 content completion, gameplay balance, real-player enjoyment, browser persistence acceptance or release readiness.
