# DEAD FREIGHT recorded firearm audio provenance

Status: all-firearm recording repair, 2026-10-08. **Signal/route checked; not heard here, not listening-approved, and not browser/device accepted.** No commercial-game parity claim is made.

## Source and distribution boundary

The user explicitly selected Pixabay. All 79 runtime WAVs are built from the 13 verified Pixabay downloads below. Raw MP3s are kept outside the repository. They are integrated game media, not a standalone sound pack. Do not redistribute the source downloads or export this bank as a reusable stock-SFX library. Retain these credits with the game/source distribution.

The source pages identify the [Pixabay Content License](https://pixabay.com/service/license-summary/); [binding terms, section 5](https://pixabay.com/service/terms/) allow adapted works subject to prohibited uses, including standalone distribution restrictions. Audio is not relicensed as application code or CC0 here. The supplementary Freesound pages substantiate recordings; every audio download used in the game came from its Pixabay page's public CDN URL. No login, CAPTCHA or runtime external request is used. Credits are voluntary, with no artist endorsement implied.

## Selected recordings

Full original URLs, SHA-256, sizes and retrieval dates are in `assets/audio/provenance.json`. The build verifies every cached original hash before editing it.

| ID | Artist | Pixabay page | Game use |
|---|---|---|---|
| 45010 | michorvath | [AR15 pistol load and chamber](https://pixabay.com/sound-effects/film-special-effects-ar15-pistol-load-and-chamber-45010/) | R-4 magazine contacts, actual AR charging/bolt return |
| 104296 | Kodack | [Assault Rifle Reload](https://pixabay.com/sound-effects/film-special-effects-assault-rifle-reload-104296/) | R-4 and fictional SMG handling/reload contacts |
| 75000 | Eipeiknip | [Brass bullet shell drop onto concrete, multiple takes](https://pixabay.com/sound-effects/film-special-effects-brass-bullet-shell-drop-onto-concrete-multiple-takes-75000/) | Three physical casing-floor contacts |
| 31859 | APallot | [Hitting Metal](https://pixabay.com/sound-effects/film-special-effects-hitting-metal-31859/) | Metal and armor impact |
| 6791 | altfuture | [Hitting Wood](https://pixabay.com/sound-effects/film-special-effects-hitting-wood-6791/) | Wood and low body-impact support |
| 62692 | Fenodyrie | [stone on stone](https://pixabay.com/sound-effects/film-special-effects-stone-on-stone-62692/) | Stone and hard-surface contact |
| 32436 | ccheatham | [real_punches_and_slaps](https://pixabay.com/sound-effects/film-special-effects-real-punches-and-slaps-32436/) | Body and partial-armor impact |
| 98832 | michorvath | [Rifle clip empty](https://pixabay.com/sound-effects/film-special-effects-rifle-clip-empty-98832/) | Shared dry trigger mechanism |
| 6349 | michorvath | [9mm pistol shot](https://pixabay.com/sound-effects/film-special-effects-9mm-pistol-shot-6349/) | Pistol report; also shortened at original rate for the fictional 9 mm SMG |
| 94496 | Kobrakon47 | [Saiga 12k Gunshot(12ga)](https://pixabay.com/sound-effects/film-special-effects-saiga-12k-gunshot12ga-94496/) | Shotgun report |
| 98830 | michorvath | [9mm pistol load and chamber](https://pixabay.com/sound-effects/film-special-effects-9mm-pistol-load-and-chamber-98830/) | Pistol magazine and slide actions |
| 101896 | awrmacd | [Pump Action Shotgun](https://pixabay.com/sound-effects/film-special-effects-pump-action-shotgun-101896/) | Shotgun pump/actions, fitted to existing cycle recovery |
| 89473 | sidohzen | [machine gun](https://pixabay.com/sound-effects/film-special-effects-machine-gun-89473/) | R-4 and enemy report: isolated real M16 attacks and quiet recorded decay |

The M16 source's [author description](https://freesound.org/people/sidohzen/sounds/165809/) identifies real automatic fire recorded with a Sony camera. [The pistol author](https://freesound.org/people/michorvath/sounds/427592/) identifies an actual 9 mm shot. [The shotgun author](https://freesound.org/people/Kobrakon47/sounds/569309/) identifies raw Saiga 12 fire with 00 buckshot. [The pump author](https://freesound.org/people/awrmacd/sounds/387190/) identifies a real Mossberg shotgun; the first cycle is used because other takes have reported compression artifacts.

These are field/camera/MP3 recordings, not measured or studio-clean capture. The fictional SMG deliberately adapts the real 9 mm pistol report at unchanged pitch with a shorter decay. It is not represented as a separately recorded SMG. Pistol and shotgun variants are level variations of one take; R-4 variants are isolated attacks from one automatic-fire source. The earlier 99253 authored kick-drum/trigger composite and distant 98831 shot are absent from the current runtime bank and source manifest.

## Editing and timing

`tools/build-rifle-audio.py` is the exact deterministic recipe. It adds no oscillator, generated noise, beep, metal resonator or pitch change to gunfire. Existing original recorded Foley impact support layers remain source-based.

- R-4 attacks use source 89473 at 0.583, 1.903 and 2.659 seconds, 60 ms each, ending before subsequent reports. A quiet 1.30–1.54 s recorded decay supports the tail. No extra bolt smack is layered over the attack.
- Pistol uses source 6349 at 0.141–0.701 s; SMG uses its 0.141–0.321 s attack/body, with the game's own automatic cadence. Shotgun uses source 94496 at 0.205–0.825 s.
- Broad 35 Hz–17.5 kHz cleanup and short boundary fades remain. Suppressed variants apply authored attenuation and a gentle 7.5 kHz low-pass. They are not recordings of physical suppressors or measured attenuation. Indoor variants add quiet 19/37 ms early returns, with no metallic decay layer.
- Actual game events control reload, cycling and dry trigger. Pistol slide and shotgun pump contacts are edited into existing 0.19/0.28 s recovery windows without pitch change. SMG manipulation uses recorded AR magazine/receiver Foley for the fictional rig. Reload files contain the current phase only; no future insert/charge is queued.
- R-4 tactical reload does not automatically charge. Empty reload plays charge only at the actual charge event. Switch cancellation stops reload tails without cutting unrelated shot returns.
- Casing cues occur on physical first floor contact for all four guns. Shotgun ejection still begins at its cycle event. Ground/wood attenuate and low-pass the contact.
- Material hits, enemy gunfire and player body/armor hit use the bank independently of the equipped weapon. Synthetic kill, warning and reload-perfect/mistime/loaded overlays are removed.

Remaining procedural cues are movement/dash/landing/sliding, object break, explosion and pickup. They are outside firearm/mechanical/hit routes and are not claimed to be recorded.

## Runtime/build contract

The historical API/file names `rifle-audio.js`, `audio/rifle/`, `preloadRifle()` and `stats().rifle` remain for compatibility; the bank now covers every equipped gun. Load `rifle-audio.js` before `audio.js` and copy the complete bank/manifest/credits to `audio/rifle/`. Everything loads from the game origin.

After user-gesture `resume()`, preload the bank. It is atomic: any missing, oversized, nonfinite, silent or undecodable WAV produces a visible loading error for all guns. Gun routes never fall back to procedural synthesis. Until loading is complete, attempted gun cues return false and are discarded, never queued for late playback. The full PCM WAV bank is 6,375,956 bytes; decoded stereo float buffers total 12,744,960 bytes. Existing 32-voice bounds, same-origin fetch/redirect restrictions, cancellation and source-node disposal remain.

The master graph still has a 30 Hz high-pass, compressor (−13 dB threshold, 12:1 ratio, 1 ms attack, 90 ms release), default gain 0.72, and bounded output shaper. The repair changes sources/processing/routing, not this graph. Digital bounds do not guarantee a safe physical headphone volume.

## Verification and review limits

Build: `python tools/fetch-rifle-audio.py --source-dir <private-cache>` then `python tools/build-rifle-audio.py --source-dir <private-cache>`. The cache must remain outside the repository. The optional audition output is a private fixture, not a distributable SFX pack.

The manifest records all 79 output hashes, sources, stereo 48 kHz signed 16-bit format, durations, peak/RMS and exact-zero endpoints. Tests validate every file, all four gun routes, player/enemy hits, phase timing and cancellation, bounded voices, mute/pause/destroy, all-gun visible failure without synthetic fallback, and actual-event first-contact casing integration using a mocked renderer.

The companion game-specific comparison MP4 combines the exact pre-mixer baseline/current cue banks with original project diagrams and labels. It is an offline edited sequence, not captured gameplay or the post-compressor Web Audio signal. Neither the old nor new sound has been heard by this worker. Listening through actual game/device output, ordinary-input interruption/full-auto, room/surface balance and rendered browser acceptance remain open.
