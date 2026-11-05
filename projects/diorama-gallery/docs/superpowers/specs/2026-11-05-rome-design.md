# Rome atlas miniature
The user opted out of further design approval and requested autonomous completion. Reuse the existing Three.js renderer, controls and construction-batch engine, not a photograph/video on a plane.

## Composition
An 18 × 22 thin engraved parchment map, viewed in portrait from the south. St Peter's basilica and elliptical colonnade occupy the northwest; Colosseum is the right-center hero. Tiber snakes from north-center toward southwest then east across the foreground. Three to four stone arch bridges connect the banks. Castel Sant'Angelo, Pantheon, Forum ruins, Constantine arch, Spanish Steps and Villa Borghese anchor the remaining districts. Ochre facades, terracotta roofs, shutters, cypresses, umbrella pines, fountains and pedestrians provide scale.

## Interaction and time
Separate finished Rome and Rome formation gallery entries and offline standalone HTML. 84-second artistic formation: map/river, embankments/bridges, ancient monuments, basilica/neighborhoods, gardens/life, completed illuminated city, rewind. No date-accurate history claim. Existing pause, speed, scrub, phase, zoom/orbit/pan/reset are reused. Night is the initial lighting choice so the finished view has lit windows and arcades; day toggles those off. Independent clear/cloudy/rain/snow options. Effects use absolute time and owned resources.

## Constraints and tradeoffs
Base commit bd755a9, isolated codex/rome-city-timelapse branch. Preserve old world source/behavior and production. Procedural geometry is editable and interactive but cannot honestly promise photographic 95% likeness. Offline geometry rendering helps composition review when browser GPU is unavailable; it is not browser validation. No new dependencies or remote assets.
