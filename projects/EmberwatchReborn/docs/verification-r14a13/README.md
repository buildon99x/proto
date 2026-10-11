# R14a13 combat-presentation integration

Date: 2026-10-11 UTC. Frozen baseline: R14a12 / fd3b6e1ea124788fb03d1f9bf6f044a47fa9ca32. Independent directory, no original/other-project/Git mutation or publication.

## Inputs and shared ownership

1. enemy-reaction code-and-tests.patch: combat reaction/dead cleanup and directional impact metadata, visual actor/death layers, pure reaction module, regression tests.
2. emberwatch-combat-audio.patch: audio voice scheduler; combat audio metadata/cancellation only; main delivery/rebuild lifecycle; 60 new tests. Patch used offsets/fuzz at adjacent combat hunks, followed by line-level semantic inspection. Reaction calls, impactAngle arguments, dead cleanup, RNG/cost/timing and event ordering remain intact.
3. Warrior source was frozen and declared ready at 11:55 UTC. Verified source-freeze hashes, applied only the new modules/tests and manually merged visual imports, renderer creation, hero draw and friendly hammer branches. The enemyDrawn/death layers remain intact. No Warrior combat edits were needed.

Audio cast contact cancellation precedes that cast's received contact swish; resolved hit voices use impact identities. Enemy death clears dead-only attack fields and delivers defeated once, which cancels enemy-owned voices. Actual charge impact remains separate from nominal actionContact; stop sound cancellation cannot change travel or damage.

## Verification authority

Standalone audio aggregate and lint were interrupted by automatic approval-review cancellation. Their output is incomplete. No rerun, split substitute, or alternative route was performed on that candidate. New final integrated checks may be requested only after all three patches are combined, explicitly against the new candidate; any reviewer denial must be reported without workaround. Worker historical pass counts are not aggregate acceptance.

Final intended checks: fresh app npm test / npm run lint / npm run build; new reaction+audio production-handler checks; 144 paired baseline simulation cases with exact gameplay/non-audio events/RNG after excluding new render metadata and intentionally cleared dead-only fields; final build-source hashes and frozen-file preservation. Native browser motion/FX, actual listening and subjective quality remain unverified.

## Frozen contracts

Original baseline manifest holds 1,242 hashes. Preserve balance/skills, save/state/controller/controls/focus, town portal, motion base, world/economy, source artwork/audio/licenses. Only candidate labels advance to R14a13 / 0.14.0-reimplementation.13. No save namespace/schema change. Parent owns later commit/push/publication and must verify their separate receipts.

## Integration review corrections

Static cross-review found and corrected two inherited patch gaps before final checks:
- Safety-drain soundCancel/mobilityCancelled events were dropped outside the normal battle event loop. flushActionSafety now delivers only their audio side effects before its existing durable checkpoint handling. New actual-main pointer safety probes check one cancellation without changing accepted action debt.
- Repeated enemy hit reactions restarted the active envelope and a light secondary hit could erase heavy intensity. Overlapping hits now retain the original duration/remaining deadline and strongest active intensity while updating impact direction. No gameplay timer changes.

The new production deliverCombatAudio dependency is added to shared extracted-main fixtures and the independently extracted expert/resource-display harnesses; their existing assertions are preserved. Audio boundary probes now expose cancel, matching the existing production audio API. Candidate-label assertions alone advance from a12 to a13.


## Final result

- Full unique suite: 4,312 passed / 0 failed, skipped or cancelled (122355.118341ms). All counts are newly executed on the final candidate.
- Lint and app build passed. Build:124 files /16,727,884 bytes;123 source-copy hashes matched. Generated recovery alias is separately verified through the manifest.
- 144 paired production simulations preserve exact gameplay, non-audio events and both RNG streams at each step after excluding presentation-only metadata and intentionally cleared dead-only attack fields.
- 1,242 frozen baseline files,14 source assets and18 protected runtime files remain unchanged. No asset imports, balance/schema/save-namespace changes or whole shared-file replacement.
- Final static cross-review:0 remaining issues. Final guard-specific route restores existing hurt animation whenever held guard and authoritative hurtTime overlap.
- Initial full run4,300/4,307 and focused363/366 remain in initial logs. The7 whole-suite failures were3 stale empty cancellation-event expectations,1 stale package version expectation and3 incorrect assumptions that unaugmented charge deals damage. Assertions now demand the exact new soundCancel, current label and preserved0-damage/real-stun behavior; no balance fix was made to satisfy a test.
- The174 new tests are30 enemy reaction,60 audio,72 Warrior,9 cross-module contact and3 actual-main safety-delivery cases.

## Remaining gates

No Git write, remote CI, Sites publication, Library upload or normal-input browser/listening review was performed by this worker. Local archives are preparations, not external backup success. The worker specimen renders are offscreen evidence, not integrated browser screenshots. Original sword-shaped source art, fully forward shield art and Onslaught’s existing pulse pose remain partial. Full PoE2 mechanics and original timing parity remain open; do not describe this bounded presentation checkpoint as overall completion.
