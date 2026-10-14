# Changes
## 0.1.0
Initial rally implementation and verification in progress.

- Integrated original GLB motion playback, compressed accepted late swing lead, variable AI timing and exposed weak clears.
- Added real touch threshold verification, WebGL context-loss recovery, reduced-quality crowd/net LOD and slender timing rings.
- Existing Vercel integration deployed branch Preview; direct URL validation remains blocked by environment proxy.

## 0.2.0 candidate
Replaced rigid torso-only actors with common weighted skeletons, planted feet and fixed-length arm IK. Actual racket-plane sweep consumes engine hit-frame events. Repaired super attack ordering/fallback and introduced delayed noisy AI observations. Earlier verification scope is corrected in docs/AUDIT-CORRECTIONS.md.

- Repaired both-sided incoming string contact and preserved follow-through geometry across next-flight planning; added actual natural Super Smash regression and shared live/offline audio synthesis.
- Browser ten-match foot gate found0.297m sliding; early takeoff/hip reach/stride fix passed a19-test suite and ten active UI matches with<1µm measured stance displacement.
- Ten active UI games contain250 contacts and100 cue-triggered returns; five actual shot collision views,50s normal-rally silent video, touch/mute/context/pause/loss/rematch evidence recorded. Device/human/Vercel access/Library-upload gates remain separate.
