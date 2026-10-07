# Black Pines 0.2.0 specification

## Visuals
- 640×360 internal render, fixed 16:9 frame, small rounded corners
- Four-tone cool black / slate / fog gray / ivory post-process with ordered dithering and fine stochastic texture
- Layered conifer forest, dark foreground branches, distant fog and a ruined relay
- Original large ivory receiver, black gloves and muted rust suppressor cap
- Quiet monochrome HUD; no neon palette or large cyan panels

## Skill-based combat
- Manual firing cycle with optional accessibility auto-cycle
- Readable enemy windup before dodgeable projectile fire; no unavoidable automatic hitscan damage
- Dash uses 45 stamina, has 0.2-second duration and 0.15-second invulnerability; stamina replenishes at 24/second
- Reload press during 44–62% of the reload animation grants three seconds of 30% damage bonus; mistiming adds recovery
- Headshots reward accuracy; style chains expire after four seconds and break on damage
- Three weapon classes, finite ammo, destructible obstacles, explosive barrels and healing pickups
- Eliminate the target, collect its token, return to extraction

## Technical scope
Static HTML/JavaScript with pinned, locally vendored Three.js 0.160.1 (MIT). No runtime external requests or server APIs. Procedural geometry/materials and synthesized audio are original. Desktop keyboard and mouse required. Arrow-key aim is the pointer-lock fallback.

## Non-goals and acceptance
No claim of identical source-game content, campaign or assets. No mobile gameplay or multiplayer. Visual acceptance requires inspecting a real rendered frame against the latest reference; live acceptance requires a human-style playthrough, including interruption/retry.
