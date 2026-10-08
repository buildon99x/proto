# Generated art provenance

The three transparent PNG atlases in `app/src/assets` were created with OpenAI image generation for this original prototype on 2026-10-08. The supplied ruined-citadel and character images were visual direction only and are not shipped. No sprite, code or image from Heroes of Hammerwatch II, Craftpix or sprite-gen was copied into the runtime.

- `citadel.png`: 16 environment regions: four stone top planes, two wall orientations, pillar, arch, brazier, rubble, statue, low wall, barrel, chest, crystal and skeleton statue.
- `hero.png`: four directions × idle, walk A, walk B, attack. Generated armored hero sheet.
- `guardian.png`: same four-direction/four-pose layout. Generated guardian sheet, shared by enemies with scale/tint variants.

Atlas coordinates and foot anchors are in `art-manifest.json` and the runtime `art.js`. Art is raster-sliced and drawn at runtime, with depth ordering and world-coordinate controls. Animation is a short four-pose prototype rather than a full production animation library. All playable classes currently share one visual hero.

References requested by the user:
- https://craftpix.net/freebies/free-base-4-direction-female-character-pixel-art/
- https://github.com/aldegad/sprite-gen

The visual target remains aspirational. There is no validated 99% match metric.
