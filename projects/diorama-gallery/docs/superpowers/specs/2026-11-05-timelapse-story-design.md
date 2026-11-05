# Timelapse environment story and ancient construction

## Intent
Both formation candidates should tell an automatic weather and day/night story on their existing timeline. Users can add, remove, and edit time/type events. The desert candidate also shows a small, legible ancient construction crew and equipment while buildings form.

## Approach
Use one deterministic environment track sampled from the existing runtime clock. Blend numeric lighting, fog, sky, clouds, rain, sand, moon and star weights through smooth easing. No independent wall clock, transition timers, history-dependent lerp, or shader/resource allocations in tick. Existing manual controls remain as an explicit override; an automatic mode returns to the edited track. Edits change only the current environment, not playback time, rate, view, or pause state.

The builder chose editable rows with time in seconds and event type, plus timeline-position markers. Each event changes either weather or daylight. Default sets cover clear, cloudy, rain, sandstorm, day and night. The last segment blends cyclically into the initial state, so weather does not flash at replay. Empty tracks resolve to clear/day; repeated or same-time events have stable, documented handling. Invalid times are rejected or clamped in the UI and validated atomically in the API.

Ancient work uses bounded reusable procedural people, stone blocks, wooden carts/sleds, scaffolds and a simple rope lifting frame. Motion comes from absolute scene time, fades/collapses at the work interval ends, respects batching, and leaves the completed scene unchanged. This is fictional simplified staging, not a claim of archaeological accuracy.

## Alternatives
Fixed automatic cycles alone are cheap but cannot satisfy editable events. Wall-clock crossfades are easy but break seek/replay determinism. A full keyframe video editor is unnecessary. Independent small timeline tracks fit the existing clock and allow easy changes.

## Constraints
Work only in the existing desert and Dubai candidate branches; preserve original worlds and production. Keep pinned dependencies, offline bundles, runtime disposal, speed/seek/pause/reduced-motion behavior and WebGL fallback. No browser sandbox, GPU, network, or security bypass. GPU output is unverified when ordinary WebGL2 is unavailable.

## Acceptance
Automated tests prove default tracks, edits and invalid data, smooth endpoints and loop seam, deterministic seeking, manual/auto behavior, fallback/disposal, bounded construction geometry and contact-aware motion. Run app tests/build/lint, registry/metadata checks, root release build or report exact environment blocker, independent review, remote commit verification, and separate candidate deployment.
