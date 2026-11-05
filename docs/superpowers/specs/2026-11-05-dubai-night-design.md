# Dubai evening transition

User scope: Dubai formation only. Common timeline, weather, day/night and speed controls already exist and must remain unchanged. Preserve all other worlds and the original static Dubai world.

Use the existing Three.js scene, construction batching and environment-track API. Extend this one loop to 90 seconds: preserve formation through 55, blend day to night from exactly 55 to 80, hold the completed night city until 84, then rewind during 84–90. A hard reset at 80 would truncate the requested transition; a 90-second loop preserves the completed night scene and existing rewind idiom.

A Dubai-only environment wrapper owns an editable default track, procedural camera-relative Milky Way and three seed-scheduled meteors. Building windows and newly added metro lamps use deterministic, grouped staggered fades. Manual day/night and edited environment tracks remain authoritative; no separate hidden timer can fight them. All effects are absolute-time, build-time allocated, disposed by the toolkit and stable under seek, pause, speed changes and looping.

No new dependencies, external assets, global UI changes, main merge, production promotion or browser/GPU bypass. Candidate branch push and preview only. CPU geometry/runtime tests and shader validation are distinct from actual browser visuals/FPS.
