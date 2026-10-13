# Master13 gate audit

All13 existing reference nodes are rejected by previewSkill and purchaseSkill as DATA_ONLY; validateWarriorGrowth also rejects ranks outside runtimeSkillIds and Master tier outside runtimeTiers. There is no promoteMaster command/receipt or normal campaign unlock, and8-slot choices expose only existing ACTION_SKILL_IDS. Allowing new ranks/tier would change purchase/validation/persistence contracts even without editing save.js. That work is excluded by current writer boundary. No Master skill can be completed through CURRENT legal purchases. Tests execute each real reducer purchase on earned state and assert no changes.

Reference source is preserved HammerwatchII Paladin cached data, not official PoE2 skill definitions; table uncertainties remain unknown. No cost/stat adjustment or Master flag removal is made. Inventory JSON records exact values/base edges/one exclusive pair and uncertainties.

| ID | Base | Additional runtime work after legal unlock |
|---|---|---|
| healing_flames | inner_flame | Spell hit/leech and cost quote integration; existing Inner Flame base. Eligible damage and leech timing need definition. |
| pillar_of_light | root | New ground-target action/input slot; missing split/radius/cast/range/blindness/level origin. |
| pulsing_light | pillar_of_light | Pillar base, exclusive branch and repeat lifecycle; interval unknown. |
| heavens_wrath | pillar_of_light | Pillar base, exclusive branch and0.5s ticks/5s area; radius unknown. |
| blessed_champion | root | New timed attribute buff/action slot; HP/pool ordering and cast/cancel rules unknown. |
| champion_of_truth | blessed_champion | Champion base;3costs vs2crit values and True Strike definition unresolved. |
| champions_hammer | blessed_champion | Champion base; quoted hammer modifier and restoration; +15s cooldown target unresolved. |
| crusader | root | Kill-derived stacks; per-kill count and stack-refresh rule unknown. |
| dauntless | crusader | Crusader base; qualifying boss/superior hit identity and stack dedup. |
| zealot | crusader | Crusader base;400/200 damage thresholds, eligible damage/remainders/stacks per threshold unresolved. |
| guardian_angel | root | Taken-damage trigger;200threshold/4s/CD known, time-window/lethal ordering undefined. |
| true_restoration | guardian_angel | Guardian base;300/500% regen only during its active lifecycle. |
| wrathful_avenger | guardian_angel | Guardian base;200/300% damage only during its active lifecycle. |

Potential FIRST effect after a separately approved legal purchase/validation unit: healing_flames, because Inner Flame and spell-hit quote paths already exist. It is NOT implemented here. Next candidates Crusader plus Dauntless require explicit stack rules; new active Pillar/Champion also need action slots and retained cooldown/buff recovery design. Guardian's missing damage window prevents a faithful trigger definition. No free session toggle, rank injection, alternate namespace/writer or old a19 patch recreation is authorized.

Current source gates: warrior-balance.js training runtimeTiers/runtimeSkillIds; warrior-growth.js validateWarriorGrowth/previewSkill/purchaseSkill; state.js existing command dispatch/validateState; skill-loadout.js ACTION_SKILL_IDS. Changing these gates to accept unearned Master states is not read-only presentation.
