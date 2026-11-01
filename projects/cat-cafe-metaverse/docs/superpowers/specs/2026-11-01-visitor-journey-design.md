# Visitor journey recovery and orientation
User requested human-like play and UX completion, explicitly opting out of repeated approval. This bounded correction preserves the café and multiplayer contract.

## Approach
Use the existing welcome/card UI plus a pure journey helper. A new navigation overlay or auto-walk would broaden scope and conceal collision/authority behavior, so neither is included. Source inspection confirms renderer construction failure currently only reveals a background fallback while both entry handlers still run.

## Contract
- No live join or solo creation without a working renderer. Disabled welcome entry buttons and visible WebGL2 recovery instructions; reload or return to room selection, no fake playable state. Context loss also exits safely.
- Manual service recheck only, retaining 10s request throttle and existing discovery cancellation. No polling.
- Leave immediately returns to welcome. Room changes discard selected-card guidance through existing state reset.
- Selected cat displays eight-way camera-relative direction and distance; no coordinates-only navigation. Close/zero-distance is explicit. Busy cats remain visible/selectable.
- Sleep/rest/groom/stretch copy derives from shared ambientPhase and snapshot time/room; explicit play modes override. Ambient walk is described as a short break/walk phase, not asserted physical motion.
- Keep touch targets >=44px and restrained styling. No server, protocol, world, dependencies or deployment changes here.

## Evidence boundary
Unit/source integration tests and build are not real rendered play. Parent performs supported browser journey review and publishes.
