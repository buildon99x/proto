# Calm café motion and natural resting cats

User direction: fix visible player trembling; cats should normally sleep at varied café locations instead of circling like toys; retain restrained natural activity and performance. User has explicitly delegated ordinary implementation choices rather than requesting another approval cycle.

## Findings and chosen approach
Current camera focus changes only on authoritative snapshots, while avatars damp every display frame with a fixed alpha. This mismatched clock produces relative camera/player jumps; fixed alpha and residual-distance gait also vary with FPS and packet cadence. Use bounded timestamped visual interpolation, a small documented presentation delay, display-velocity gait hysteresis, and camera tracking the same rendered local pose. Do not add client-authoritative movement/prediction or increase network frequency.

Current live idle cats chase perpetual sin/cos targets; solo cats alternate short rest and orbit. Replace with one shared low-frequency deterministic ambient policy: at least80% stationary sleep/rest time, occasional grooming/stretching and short bounded walks, staggered cats, stable heading while still. Use varied valid floor rest spots. For existing checkpoints, relocate only unowned idle cats whose homes exactly match the legacy grid, once; their new catalog home is the idempotent marker. Preserve custom homes and active interactions until their lease ends, and preserve all player/session/budget state. This narrow content migration changes neither checkpoint schema nor the rest of the live world. Keep user interactions authoritative and unchanged.

Alternatives rejected: per-frame network updates increase cost without fixing clock mismatch; client prediction needs new acknowledged-input reconciliation outside this narrow fix; complex continuous AI/pathfinding adds unnecessary CPU and state. No new AI/assets/dependencies.

## Compatibility/performance
Keep wire modes idle/pet/feather/ball and tuple/checkpoint shapes unchanged. Render stationary idle as sleeping/resting; shared phase affects pose without new network fields. Existing worlds, tokens, budgets and layout remain. Preserve two instanced remote avatar batches, no extra texture/shadow passes. No paid hosting, quota reset or main merge. Old immutable candidate remains accessible until replacement passes.

## Evidence required
Synthetic10Hz/irregular80–180ms snapshots at30/60/120FPS: no snapshot-time camera jump, continuous relative local pose, bounded stop tail and no hidden-tab catchup. Compare velocity variation, not merely FPS-independent damping. Shared cat fixture: >=80% stationary, stable idle yaw, valid locations, bounded rare walks, interaction parity. Compare local CPU and packed/delta bytes with baseline; no real100user/phone/visual claim from these checks. Actual supported browser visual verification remains a separate gate.

## Mixed-version rollout
Old immutable deployments share one authority key. Use a separately verified atomic authority-envelope 1→2 upgrade with fence/owner revocation and unchanged checkpoint/session/budget counters. The old Lua already fails closed on version !=1; new code accepts2. No parallel world, no quota reset. Old URLs become unavailable after deliberate replacement; publish the newly verified link. Migration is build-only and branch-scoped, never a public admin endpoint.
