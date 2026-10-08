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

## 0.3 first-person polish target
The user explicitly requested reference-level first-person visual detail: articulated gloved hands actually gripping the weapon, a clear trigger finger, mechanical slide/chamber/sights, reload and recoil recovery, and stronger readable shot/impact/destruction response. Work in the Git repository and checkpoint/push changes. Browser visual acceptance remains gated on sign-in; geometry or unit checks alone cannot establish parity.

## 0.4 red accent / hard-surface correction
Match the visible wine/rust suppressor cap as a substantial accent rather than a barely visible sliver. Retain a restrained three-value red ramp through the four-tone post-process. Use a chamfered receiver cross-section and stepped, tapered suppressor pieces with clear machined edges. Preserve attachment controls, articulated finger contact and existing firing/reload mechanics. Any offline geometry diagnostic must be labeled separately from an actual in-game screenshot.

## 0.5 implementation acceptance
- Shared hip/ADS pose definition, camera-relative first-person silhouette checked against the 640×360 reference; exposed wrist separated from sleeve/glove
- Real viewmodel self-shadowing and authored creases/contact-darkening, preserving the red accent and four-tone style
- Stable damped positional/rotational recoil with return, responsive ADS, locomotion and landing/dash response, reload magazine/support-hand/slide/audio synchronization
- Original bounded WebAudio layers for shot transient/body/mechanics/reflection and material/target impacts; mute, pause/resume and safe master limiting
- Tests cover construction, reference framing, wrist visibility, contact zones, motion convergence/frame-rate robustness and audio scheduling/resource limits
- Browser-render, normal-input and audible acceptance require a working supported preview; disclose separately when blocked

## 0.6 extraction and readability acceptance
- Persistent high-contrast center reticle with hit feedback; no stochastic or Bayer screen-space noise. Static low-amplitude material texture belongs to world surfaces. Preserve weapon accents and restrained cold palette.
- Automatic timed cycling by default for pistol/shotgun; firing cannot skip recovery. Pump sound, casing and mechanical movement follow cycle events.
- Space jumps with gravity, ground contact and low-cover clearance; Ctrl/C slides with stamina cost, direction, friction, duration and cooldown. Shift sprints. X retains the existing dodge.
- A connected region approximately 320–360 m across, with multiple legible landmarks and routes; physical collisions match major cover. Use instancing/shared materials and bounded effects.
- Local encounters alert within range/line of sight rather than activating the whole map. Optional cargo and supply caches support route choice. Defeat the relay target, collect its token, and hold an extraction site until evacuation completes; leaving its radius cancels the hold.
- Map/objective/distance and concise Korean controls explain traversal and extraction. Restart and pause clear transient input safely.
- Deterministic model tests exercise automatic pump, jump/land/clearance, sliding/collision/stamina, connected routes, loot and extraction conditions. Browser WebGL, ordinary input, sound and performance require separate live verification.
