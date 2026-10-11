# R11B Lance release calibration candidate

## Why this bounded change

The R11a1 ordinary-input profile has legitimately earned Hammer4, not a starter
loadout. Its E1+Q4 already exceeds the authored200HP B boss before Lance, so this
change alone cannot establish boss depth or justify nerfing all skills. The
read-only audit found no repeated physical multiplier/armor application or
accidental basic/Judgement/hammer hit duplication. B-role changes are separate.

The old one-pulse release gives almost the entire burst through Lance, making
the choice to keep channeling weak: with rank1, armor6 and no other bonuses,
one pulse14.15 plus full mixed Lance97.17 gives111.32. At Lance3 the same short
commitment can give305.66. These are calculated fixtures, not actual DPS.

## Source and authored values

The immutable cached community row `reference-warrior.js` retains Lance maximum
damage100/200/300 and channel-end trigger. It is not a current original-game
measurement. Minimum commitment, physical/fire split, range, eligible stop and
charge curve are unknown. R11's one-pulse full-power eligibility was authored
Emberwatch policy. Neither that rule nor this new ramp is claimed as a verified
HammerwatchII rule. Reference files and maximum rows remain unchanged.

R11B uses completed eligible pulses1/2/3/4 to release25/50/75/100% of the accepted
maximum mixed packet, capped at100% afterwards. Pulses remain0.25 active seconds
apart; full power is reached at1 active second plus normal startup. This does
not require the full4-second channel or guarantee any hit. A safe early release
keeps partial damage; holding commits position for more damage. With armor6,
rank1 short release is14.15+24.29=38.44; four pulses plus full Lance is
56.60+97.17=153.77, before other bonuses/critical.

Costs and cancellation are unchanged. Payment at active1second still occurs if
held, so reaching the fourth pulse under held input also reaches the second
normal stamina payment. There is no new charge fee or refund. Wall/resource
stops use their actual completed pulses, not full power by reason alone.
Menu, death, blur, slot edits and other safety cancellation still emit no Lance.
Damage and UI both call the same strict accepted-spec projection. One shared
critical draw applies to the final scaled physical/fire packet. No pending
action is saved; old-profile load cannot restore an earlier-policy action.

## Presentation and acceptance

Trainer preview names the4-pulse threshold and25/50/75/100% progression. The live
channel cue shows current Lance percentage alongside existing payments/pulses.
Normal-input comparison must confirm that this is readable and early release
feels deliberate. Automated passes cannot certify that feeling.

New synthetic tests execute production startup/pulses/finish across all Lance
ranks, partial/full/overfull thresholds, release/wall/resource reasons, frame
partitions, critical mixed defense, immutable accepted rank and safety cancel.
These fixtures inject tier/XP/positions/targets; they are explicitly not earned
play. Existing first-pulse mixed-damage assertion changes only its expected
authored scale, retaining its one-hit/critical/LOS/range/double-scaling checks.

Next actual comparison: use a fresh, explicit UI copy of the untouched earned
R10 source, repeat the same normal promotion/purchases/equipment/allocations,
compare short/full channels and real threat responses, then save/reload.
Do not reset the completed B profile, inject progress, infer continuous fight
duration from paused diagnostic samples, or claim the15-node/whole-game gate.
