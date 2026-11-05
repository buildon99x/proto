# Istanbul visual review, candidate 0.10.0

## Evidence
The supplied portrait reference was opened as actual pixels. Actual scene-derived frames at completed time 60 were exported from the authored geometry, instances, materials and camera, rendered in standard Blender EEVEE/CPU Cycles, and opened for comparison. The browser cannot create WebGL2 in this cloud environment, so these are disclosed offline reviews, not browser screenshots or FPS evidence.

## Corrections made from images
1. Reversed the camera azimuth to make the waterfront rise toward the right as in the reference, instead of sloping the opposite way.
2. Repositioned the sea bridge and Maiden's Tower into the foreground, lengthened the sea slab and raised the inspection angle.
3. Broadened Hagia Sophia, rotated the mosque complexes to open the Blue Mosque courtyard toward the central plaza, and restored a clear view of Galata's lower shaft.
4. Varied house colors, roof forms and bays; removed distracting rear houses; removed greenery that lay within landmark/house footprints or outside the shoreline.
5. Enlarged the Blue Mosque court, raised palace gates and monument terraces, softened the slab corners and tightened portrait composition. Added an early terrace phase and tested upward-facing water normals.
6. Reproduced intersecting light sources with a failing test and moved them out of architecture. Restored slate dome colors and the dark title.

## Remaining differences, in priority order
1. Hagia Sophia's exact asymmetric buttress and annex silhouette still differs from the reference. The Blue Mosque dome cascades and outer arcade proportions are simplified.
2. The reference has more natural and less repetitive waterfront massing, with finer balconies, cornices, stalls and stone detail.
3. The palace gateway, bridge endpoint proportions and relative landmark positions are interpretive, not a pixel-matched reconstruction.
4. Offline material and glow appearance cannot establish the actual WebGL render. Browser postprocessing, custom water shading, weather overlays and performance remain unverified.

The 95% target is not visually certified. No arbitrary percentage is assigned. This candidate is preserved for continued comparison rather than represented as the finished quality target.
