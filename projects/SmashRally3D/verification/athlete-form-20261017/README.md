# Original athlete form, unchanged game rig

Baseline: `3f181892613ef7c4b898534efc062bb22f36f362`, 48/60 reviewed with 40 points unverified and overall score null. Selected original criterion: **V2 character material/volume**, previously 4/5. The remaining code/art gap was simple capsule/sphere anatomy and expression. Other equally one-point gaps include criteria requiring actual participants/devices; they cannot be completed by coding. This cycle changes only original athlete mesh contours.

## First, the requested existing deployment result

The authorized GitHub commit status confirms **Vercel success for 3f18189**: [deployment](https://vercel.com/silentstacks-projects/loop-lab/BfX9vTnpyTe5V5aAoUkC6nWWH9oC). The same commit's [Vercel check run](https://github.com/buildon99x/proto/runs/117329029505) supplies the exact hostname through its feedback link. The [actual candidate URL](https://loop-lab-git-codex-smash-contact-c-bd8963-silentstacks-projects.vercel.app/runs/smash-rally-3d/index.html) uses the existing project entry path; the hostname is not guessed. Preview Comments success is distinct from the separately verified deployment status.

Real Chromium navigation to that address failed before an application HTTP response with `net::ERR_TUNNEL_CONNECTION_FAILED`. No proxy bypass or protection changes were attempted. Remote menu/start/rally and delivered asset fingerprints therefore remain unverified; this is not evidence of a game-side outage. See `baseline-deployment.json` and `baseline-remote/remote-preview.json` (`playable:null`). The old 569cfb7 and 3f18189 branches remain separate; new work is isolated on `codex/smash-athlete-form-20261017`.

## What changed

Original authored elliptical sections replace the inflated jersey and constant-radius limbs. They define chest/waist, sewn sleeve hems, forearm/wrist and calf taper, fitted shorts, trainer upper/sole, jaw and short-crop hair contours, ears, brows and a restrained mouth. There are no downloaded characters, textures, logos or motion clips. The existing seven material values/batches per athlete and lighting are unchanged.

Runtime source commit: `e03a1198ff20f44dec3b1aa79a85eb49aed7165e`. JS remains byte-identical to 3f18189: SHA256 `8100b1a4f542ed333ed7d9b7efef38fd46608c1ddb9ddb3e44be74cfed31f1f6`. **The two athlete GLB hashes distinguish this build**; use the five-model tuple in `source-manifest.json`, not JS alone.

`asset-invariants.json` proves identical 19 nodes/17-joint hierarchy/rest transforms, decoded inverse binds, every nine-clip channel/time/rotation value, material values/order and seven primitive batches. Both teams share exactly identical geometry/weight/motion binary data; only uniform colour differs. Width 0.81 m, height 2.04 m, depth 0.47 m and grounding match the original vertex envelope exactly. No runtime scale/pivot/yaw compensation was added. Game, physics, AI, prediction, camera, stroke presentation, contact visibility, aim feedback and the court/racket/shuttle models remain byte-identical. `generation-reproduction.json` records exact deterministic regeneration.

## Inspect the actual old/new pictures

- [PC form comparison](delivery/01-pc-form-comparison.png) and [portrait form comparison](delivery/01-portrait-form-comparison.png): fourteen naturally reached ready/prepare/accelerate/contact/follow/landing/return checkpoints, both players. These are original PNG crops displayed with nearest-neighbor scaling.
- [Actual swing sequences](delivery/07-actual-swing-sequences.png): Serve/Clear/Drop source frames with exact timestamps and SHA256 manifest; absent short-phase captures are blank, not reconstructed. The canvas source excludes HTML HUD; ordinary match PNGs retain it.
- [Full ready composition](delivery/pc-ready-full.png), [actual smash contact](delivery/pc-contact-full.png), [follow-through](delivery/pc-follow-full.png) and [return checkpoint](delivery/pc-return-full.png).
- `phases-pc-1/` and `phases-portrait-1/` retain full original/repeated/current/restored PNGs and state. The original is imported 3f18189 geometry with the same live bones/materials; current is the new geometry. The game reaches phases through original visible-cue UI input, then holds update/clock only for the diagnostic comparison. Geometry swapping never changes an actor position, pose, physical hit or camera. This is not uninterrupted match or normal-speed playback evidence.
- `pixel-isolation.json`: all 14 baseline repeats/restores are pixel-exact; camera/clock/poses/contact equal. Changed pixels remain inside the existing conservative athlete projection envelopes, with 0 outside. Geometry is intentionally **not byte-gateable inside** those envelopes; no numerical quality threshold or experience points are inferred.
- `camera-preservation.json`: four fresh ordinary ready viewports retain exact camera/FOV, physical joint, court-target and shuttle projections. Full screenshots intentionally differ in athlete pixels.

## Discovered existing defect, kept visible

The portrait timed return checkpoint already shows YOU 1–AI 0 / YOUR POINT. The near player is cut by the right viewport in **both original and current** source images. `legacy-portrait-point-camera.json` retains those literal frames and states. It is not a full-body visibility pass, not newly introduced by geometry, and not hidden by changing the capture camera. The word return here is a timed checkpoint at +0.72 s after an actual hit; it can occur during point resolution. Existing RALLY-only visibility gates must not be generalized to the point phase. A point-resolution camera fix is a separate accessible follow-up, while preserving the reference rally/ready camera.

## Qualification status

81 strict tests in 14 files, exact asset invariants, full root build and all 21 browser reports pass on the same new-model tuple: 14 original functional cases, 2 additional functional cases and 5 separate diagnostics. Fourteen same-pose geometry pairs, four contact-material pairs, three native input repetitions and continuing MEDIUM rotation pass. The ordinary match finishes 5–0 with 17 physical/rendered contacts (maximum racket-centre error 2.074e-7 m); centre-soft defence returns all six, and pressure returns 13 with one PERFECT direct winner. Literal source frames, point-score neighbors and decoded video samples were directly inspected; no continuous normal-speed or listening claim.

The completed [qualification](qualification.json), [manual review](manual-review.json) and [frozen evaluation](evaluation-final.json) retain **V2 4/5, 48/60 reviewed, 40 unverified, overall null**. Fitted garment/limb/head contours visibly improve, but shoulder/hip joins remain segmented and facial expression remains simple. No integer point gain is claimed. Technical pass counts do not award experience points. This is one authoring trial; [remaining work](remaining-after-review.json) records the directly observed point-camera defect and the next integrated-surface approach rather than endless section-radius adjustments.

No physical-device FPS/input/comfort, Safari, continuous normal-speed human playback, direct listening, diverse human-strategy or original 13013 pixel-review claim. The reference image pixels remain unavailable to this worker; prior composition provenance is the parent's measured observations. No main merge, default promotion, alias/protection change, Library write or proxy bypass.

Geometry cost per athlete: 6996 → 9517 vertices, 11952 → 15144 triangles, still seven material batches. This is a recorded asset cost, not a physical-device FPS measurement.
