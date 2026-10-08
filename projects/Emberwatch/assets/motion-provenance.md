# Warrior articulated motion

Created and reviewed 2026-10-08 for Emberwatch. This is an original articulated-art implementation with deterministic offscreen checks. It is not a commercial-quality, browser-playtested, or release-readiness claim.

## Delivered scope

Only the Warrior has the new motion library: idle, run, three-hit sword chain, Whirling Axes, War Cry, dodge, hurt, and death. Each of ten clips has 24 sampled poses in four source directions, for 960 atlas cells. Other classes and enemies are intentionally outside this rollout.

Runtime files:

- `app/src/motion.js`: pure pose sampler, shared sample/frame mapping, runtime action resolver, contact-time remapping, and single-draw atlas renderer.
- `app/src/assets/motion-hero.png`: RGBA atlas, 2688 × 4480 pixels, 112 × 112 cells, fixed ground anchor (56,94), standing body height 64 pixels.
- `app/src/assets/motion-warrior-axe.png`: original generated upright throwing axe, 180 × 224 RGBA pixels; exported through `MOTION_AXE_ASSET` for the projectile renderer.

## Source art and exact prompts

Existing `app/src/assets/hero.png` is original generated Emberwatch artwork, documented in `assets/provenance.md`. The four directional idle poses are explicitly masked into head, torso, cloth, upper arm, forearm, sword, shield, upper legs, and lower legs. Source polygons and joint anchors are inspectable in `app/scripts/bake-motion.mjs`. No commercial/CraftPix image was supplied to generation or copied into the rig.

`assets/motion-source/motion-warrior-axes-source.png` was generated with OpenAI's built-in image generation tool with transparent background enabled. Exact prompt:

“Use case: stylized-concept. Asset type: original game weapon source. Make a transparent game sprite sheet of exactly TWO isolated double-headed throwing axes, with NO character and NO hands, no text, no shadows, no glow, no grid. One axe is upright, one the same axe at horizontal orientation. Each axe has an aged ivory steel crescent blade, tarnished brass central socket, dark leather wrapped short brown handle, small turquoise teal gem in the central socket. Chunky readable high-quality hand-painted pixel-art-adjacent fantasy RPG style, dark crisp outline, highlights upper left, restrained warm ivory and teal/violet shadows. This is original art for an original warrior called Emberwatch. Put one axe in the left half, the second in the right half, generous transparent space, identical design and scale. Axe blade edges rounded beautifully crafted, no gore, no brands or copyrighted imagery.”

The first axe is cropped and resampled once by the bake script. It appears in the Q anticipation pose, leaves the hand at the authored release frame, and is available as real artwork for spinning projectiles. No source-master PNG needs to be shipped to the browser.

`assets/motion-source/motion-creatures-source.png` was generated before the user narrowed sequencing to Warrior-first. It is an unused source artifact, excluded from runtime assets and not a completed enemy-animation stage. Exact prompt:

“Use case: stylized-concept. Asset type: original game sprite atlas for an isometric action RPG, genuinely transparent background. Create a precise 4-column by 3-row grid of 12 isolated full-body sprites, each occupying one equally sized cell with generous transparent margins, aligned with feet at 85% of each cell height. No text, no grid lines, no shadows on ground. The image is 1536x1152 if possible. Every row is one original creature shown facing FRONT, LEFT, RIGHT, BACK in that exact column order. Pixel-art-adjacent hand-painted crisp high-detail fantasy game art, restrained teal, dusky violet and aged ivory palette, dark clean outlines, soft warm upper-left highlights, readable silhouette. Row 1: an original small hooded spectral mage wearing long ragged violet robes with bright teal lapels, bony hands, a glowing turquoise crystal held in a short crooked wooden staff in the right hand, hollow ivory skull face, long sleeves, belt. Row 2: an original squat red-violet goblin imp with large pointed ears and two tiny curved horns, dusty teal ragged waistcloth, clawed hands and feet, hunched shoulders, no weapon, mischievous amber eyes. Row 3: an original large dungeon rat with dusty charcoal violet fur, distinctive teal bioluminescent back streak, long tapered curled pink-grey tail, four paws and pointed snout. Keep character identity consistent within each row. Neutral ready pose with limbs distinctly separated from body, staff away from torso, full feet visible, no overlap between cells, no props besides the mage staff, no effects cloud, no glow extending beyond tight sprite, no copyrighted characters, no logos or watermarks. This is a production sprite source atlas to articulate into 24-frame animation.”

## What the animation is

This is authored skeletal/cutout animation of original generated source art. Each sampled pose independently articulates the head, torso, shoulder, elbow, weapon, shield, cloth and leg chains. Leg mapping uses explicit stance feet. Direction-specific shoulder/elbow curves aim sword contacts outward and distinguish reverse slash and overhand attacks. War Cry raises the weapon and opens the guard. Dodge has delayed elbow/cloth recovery. Death topples the torso consistently across directions and folds the feet without dropping the corpse outside its atlas cell.

It is not 24 independently hand-drawn source images per action. A whole-sprite translation, opacity change, or imperceptible floating-point hash difference is insufficient for the uniqueness test: the test also requires 24 distinct anatomical joint signatures per directional clip, excluding root movement and opacity.

The authored contact falls on a specific atlas sample. `resolveActorMotion` reads zero-based `actor.action.payload.combo` and Q/E `payload.which`, then maps the simulation's contact seconds and action duration onto the authored contact phase. Short real-time actions can skip source samples at a given display refresh rate. In the 60 fps authored-timing proof, dodge displays 21 of 24 samples and hurt displays 15; this is disclosed rather than inflating the observed playback frame count.

## Verification and review

`node app/tests/motion.test.mjs` checks:

- 960 distinct articulated joint poses, ordered sample/frame round trips, finite joints, and seamless loops.
- Idle foot anchors and at least one planted stance foot throughout the run cycle.
- All three combo payloads, Q/E resolution, monotonic phase mapping, and exact contact-frame alignment.
- Renderer missing-art/non-Warrior fallback, source/destination coordinates, and RGBA dimensions.
- Baked raster uniqueness and clear cell margins, using a validation report tied to the shipped PNG SHA-256.

`node app/scripts/bake-motion.mjs` reproduces the atlas and contact sheets with the offline `@napi-rs/canvas` tooling. There are no runtime package dependencies. `node app/scripts/render-motion-proof.mjs [optional-output-name.mp4]` makes an annotated MP4 using installed FFmpeg. Runtime drawing is one atlas draw per actor. Source masters and verbose raster reports are kept outside `app/src/assets` to avoid shipping unnecessary files. A lossless WebP trial saved only approximately 17%, so PNG was retained for the existing packaging contract.

Visual review inspected the original and revised key-pose sheets, enlarged four-direction sword contacts, the full east-facing 24-pose sheet, extracted proof-video frames, and enlarged corpse transitions. The first review identified shallow front-facing windups and downward side-contact blades; these were corrected with direction-specific two-joint curves. Tests exposed symmetric duplicate dodge joint poses, then the deeper corpse revision exposed clipped cells; delayed follow-through and a grounded collapse offset corrected those issues.

Evidence is under `assets/screenshots/motion-warrior/`. Every sheet and video is an offscreen render, not a player-controlled browser capture. The clip library, contact integration and artifact checks do not establish live input responsiveness, game performance, visual acceptability in a crowded fight, actual audio synchronization, or the Warrior-first browser quality gate. The result remains stylized cutout animation; game-size readability and combat feel require normal-control play review.
