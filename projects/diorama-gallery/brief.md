## Current main integration (2026-11-05)
The user explicitly requested all desert-through-Rome city dioramas merged to main. This supersedes historical branch-only and no-main constraints below for this integration. Version 0.11.0 combines the published source heads listed in docs/superpowers/plans/2026-11-05-main-integration.md and preserves harbor and Singapore. Ten entries are available, including five city-formation timelines. Unpublished Rome refinement 5d1e3ef is not included because its source is unavailable in this workspace. The merge is not a claim of 95% reference likeness or verified real-WebGL performance.

# Harbor in a box
A gallery of miniature worlds, launched from their own rendered thumbnails. First world: a busy warm-lit cardboard-box harbor inspired by the supplied image (Library libfile_1bd5550b24208191a13b3d460169e164 v0, inspected visually on 2026-11-02). Target is premium miniature craft, not a claim of achieved AAA fidelity.

## Singapore addition (2026-11-03)
The user now requests Singapore immediately, superseding the earlier wait-for-harbor order. Add a second thumbnail-launched world using the existing offline renderer. Visually inspected reference libfile_1dd9bd835258819187c34d73e63473eb v0: warm engraved map-paper miniature, slender Marina Bay Sands towers and skypark, lotus museum, ribbed garden conservatories, Supertrees, Flyer, civic clocktower, Merlion and arcing fountain, skyline, temple, elevated railway, green bus and orchids. Keep harbor unchanged. No AAA claim without actual inspection.

## Dubai addition (2026-11-03)
Third thumbnail world following completed Singapore. Visually inspected local supplied Dubai portrait reference: engraved map, stepped Burj Khalifa, sail hotel, Palm Jumeirah, dense skyline, Dubai Frame, fountain lake and mall, elevated metro, small boats, palms, pedestrians, camel and gold car. Keep existing worlds intact; implement and review as a candidate, not a certified AAA result.

## Dubai transit/environment follow-up
User asks to compare the reference visually, replace the oval train with a city-crossing route, and detail vegetation/sand/environment. Latest 0.6.1 actual full/detail/mobile images and original reference were inspected. Plan: diagonal elevated terminal-to-terminal metro, sculpted palms, coastal sand and shaded landscaping. Candidate only until actual visual validation.

## Dubai reference-density follow-up
Original14307.jpg and actual0.7 full/detail renders inspected again. Match the reference's layered city proportions and Palm Jumeirah anatomy; improve coast/water depth. Existing diagonal metro and controls remain. No reference artwork is included in output.

## Ancient river city addition
Fourth world: a fictional desert river city designed from the user-provided image and blueprint. A dark pyramid and stepped plinth, S river, colonnaded temple, distant pyramids, town and sparse desert ecology. Interactive candidate; source reference is not embedded.

## Actual desert geometry inspection
Provide a separate inspect-only view of the implemented desert meshes. The top-down camera and Z=−7.40 vertical section must show actual geometry, including the northern shrine, river and right pyramid, rather than substituting a blueprint. Keep the ordinary gallery and camera controls unchanged.

## Portrait reference camera
Add a desert-only reference camera inspired by the supplied 768×1344 image. Preserve full, cinematic and detail views, existing gestures and other worlds. Camera changes alone do not establish reference fidelity; actual GPU review is separate.

## Short landscape access
For 844×390 desert screens, make the stage shorter and keep every control reachable through normal page scrolling. Preserve desktop, tall-phone and other-world layouts. A native keyboard-focusable jump link outside the canvas gives a second route to controls.

## Desert formation timelapse (new version)
Preserve the existing desert world and create a separate miniature that depicts a fictional city's formation over time. Landforms, river, vegetation, settlement, pyramids, temples and river traffic appear in a legible, deterministic sequence. The visual is an imagined story, not a historical reconstruction. The finished scene holds before repeating; the real rendered finished frame is used as the thumbnail.

## Timeline controls (2026-11-05)
Add a visible timeline and playback-rate selector to the separate desert formation candidate. Keep original dioramas unchanged.

## Timelapse weather and night (2026-11-05)
Add independently selectable clear, cloudy, rain and sandstorm weather and day/night to the desert formation candidate. Night includes stars and moon. Preserve original dioramas, construction sequence, timeline, speed controls and current production.
## Dubai formation timelapse
Add a separate artistic city-formation world showing coast, reclamation, roads, building construction and vegetation over time. Preserve the original Dubai entry and source. No date-accurate historical claim.

## Timeline controls (2026-11-05)
Add timeline progress and playback speed to the separate Dubai timelapse. Preserve original worlds.

## Timelapse weather and night (2026-11-05)
Add independently selectable clear, cloudy, rain and sandstorm weather and day/night to the dubai formation candidate. Night includes stars and moon. Preserve original dioramas, construction sequence, timeline, speed controls and current production.

## Automatic environment story (2026-11-05)
Integrate editable weather/day-night events into the automatic formation timeline; the desert also depicts simplified ancient construction work.

## Shared visual quality (2026-11-05)
Implement the researched optional HDR, restrained highlight bloom, Neutral/AgX tone mapping and color grading, with shared settings controls. Keep Original and all existing finishes/world behavior available unchanged.
## Shared visual quality integration (2026-11-05)
Integrate the reviewed opt-in shared visual quality engine into Dubai while preserving every city, camera, environment and timeline. Original is the default; no production promotion.
## Istanbul formation (2026-11-05)
New independent Istanbul miniature and 72-second formation sequence, preserving all existing entries and branches. Reference `libfile_7b932200d2f48191966df227c4c34ff8` actual pixels inspected: deep blue portrait night, two major domed mosque complexes, central Galata tower, palace courtyard, waterfront shop terraces/red trams, diagonal suspension bridge and foreground Maiden's Tower island. Aim for close visual composition; do not claim measured 95% similarity without a defined test and actual output comparison.

## Shared visual engine integration (2026-11-05)
Integrate reviewed shared opt-in HDR/Neutral/AgX/bloom/color-grade engine and Original/Soft/Vivid controls into this Istanbul candidate. Preserve every city scene, camera, environment and timeline. Default Original; non-miniature finishes retain their legacy renderer. Validate shared settings/runtime/resource tests, all city CPU tests, app build/lint and aggregate release build. GPU appearance and performance remain unverified without ordinary WebGL2.
## Paris formation (2026-11-05)
Build an independent Paris city-formation world using the existing timeline, speed and scene controls. Visually inspected supplied reference libfile_3b6dbbb349108191a974ba945033e175: square stone miniature, Eiffel Tower left, Notre-Dame on central river island, Louvre and glass pyramid in front, Arc de Triomphe in foreground, Sacré-Cœur on terraced rear-right hill, mansard-roof Haussmann blocks, turquoise Seine, bridges and autumn trees. Completed scene defaults to illuminated night; clear/cloudy/rain/snow and day/night remain independent controls. Preserve all earlier worlds and production. 95% similarity is a requested target, not an earned score.

Latest Paris feedback: raise the Eiffel Tower, make slate-roof blocks visibly diverse in window proportions and building massing, and keep all buildings and trees outside road surfaces. Verify actual meshes and compare the supplied reference against exact offline geometry; publication remains a separate pending step.

## Shared visual quality integration (2026-11-05)
Integrate the reviewed optional HDR, highlight bloom and color controls into the published Paris feedback revision c87113b. Keep Original as default and preserve every city, road, building, timeline, camera and environment change. Do not merge unrelated city candidates or promote production.
## Rome addition (2026-11-05)
Create an independent Rome miniature and 84-second formation timelapse using the existing renderer. The supplied portrait reference was viewed directly: S-shaped turquoise Tiber with stone arch bridges, St Peter's dome and oval colonnade upper left, large open Colosseum right, Castel Sant'Angelo left, Pantheon foreground, Forum ruins, dense ochre/terracotta city, cypresses and Villa Borghese. Target the completed city at night with warm architectural lights, plus independent clear/cloud/rain/snow and day/night choices. No measured 95% fidelity claim; no reference image in output. Existing worlds and production are preserved.

## Published Rome common visual integration (2026-11-05)
Integrate reviewed common engine c944186 onto published Rome be19f617 only. Preserve all authored geometry, opt-in orbitFit/framingProjection, night defaults, independent weather, and scene lists. Original remains default; HDR, Neutral/AgX, threshold bloom and grading are opt-in through Korean shared controls. Validate full app CPU suite, build/lint, shader compiler where available, registry and equivalent aggregate build. Real WebGL pixels and performance remain unverified. No unpublished Rome refinements or production promotion.

## Dubai evening transition (2026-11-05)
Only Dubai formation changes: smooth day-to-night 55–80 seconds, staggered building/metro lighting, Milky Way and three deterministic meteors. Preserve common controls and other worlds. 90-second loop holds night at 80–84 and rewinds at 84–90. Design and validation plan: docs/superpowers/plans/2026-11-05-dubai-night.md. GPU visuals/FPS require actual WebGL evidence.
