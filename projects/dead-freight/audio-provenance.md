# DEAD FREIGHT rifle audio provenance

Status: Pixabay-backed development mix, 2026-10-08. Waveform/engine tests are verified separately below. **Not heard, not listening-approved, and not browser/device accepted.** No Call of Duty/Battlefield parity claim is made.

## Source and distribution boundary

The user's latest instruction explicitly selected Pixabay. All 28 runtime rifle WAVs are now built from the ten Pixabay downloads below. Earlier CC0-provider experiments were removed from this project; none of those earlier recordings or mixes are in this bank.

Every selected asset page says it is available under the [Pixabay Content License](https://pixabay.com/service/license-summary/). The [binding terms, section 5](https://pixabay.com/service/terms/) permit modified/adapted works, subject to the prohibited uses. They prohibit distribution of substantially unchanged audio on a standalone basis; trimming, filtering or layering alone is not a blanket permission to redistribute an SFX pack. Download/use also accepts Pixabay's terms.

This directory is **project-specific runtime media integrated into the DEAD FREIGHT game's mechanics, visuals and code**, not a general sound library. Do not export or market it as a standalone audio pack. Do not redistribute raw source MP3s. The repository contains only the game's edited, composed cues and provenance; the source download cache and audition fixture remain outside the repository. The files retain these license restrictions and are not relicensed as CC0 or as application code. Keep this notice when distributing the game or its complete source. If proposing another distribution format, review that format against the license first.

All downloads came from the public audio URLs exposed by the corresponding Pixabay asset pages. No account, authentication, CAPTCHA, credit card, uploaded file, game-ripped audio, or runtime CDN request was used. All artists are credited voluntarily; the license does not require attribution. No artist endorsement is implied.

## Selected source recordings

All entries use the Pixabay Content License. Full source download URLs, SHA-256 hashes, byte sizes, dates, and supplementary author references are recorded in `assets/audio/provenance.json`. Source originals are deliberately absent.

| ID | Artist credited by Pixabay | Source page | Role in this game |
|---|---|---|---|
| 99253 | SuperPhat (via freesound_community) | [Ar15-Real Recording](https://pixabay.com/sound-effects/film-special-effects-ar15-real-recording-99253/) | Isolated close attacks and low recorded body |
| 98831 | michorvath (via freesound_community) | [AR15 rifle shot from 50 yards away](https://pixabay.com/sound-effects/film-special-effects-ar15-rifle-shot-from-50-yards-away-98831/) | Outdoor environmental return |
| 45010 | michorvath (via freesound_community) | [AR15 pistol load and chamber](https://pixabay.com/sound-effects/film-special-effects-ar15-pistol-load-and-chamber-45010/) | Magazine contacts, actual AR charging/bolt pull and release |
| 104296 | Kodack (via freesound_community) | [Assault Rifle Reload](https://pixabay.com/sound-effects/film-special-effects-assault-rifle-reload-104296/) | Secondary receiver, handling and reload contact layers |
| 98832 | michorvath (via freesound_community) | [Rifle clip empty](https://pixabay.com/sound-effects/rifle-clip-empty-98832/) | Dry trigger mechanism |
| 75000 | Eipeiknip (via freesound_community) | [Brass shell drop onto concrete, multiple takes](https://pixabay.com/sound-effects/film-special-effects-brass-bullet-shell-drop-onto-concrete-multiple-takes-75000/) | Three distinct casing-floor contact takes |
| 31859 | APallot (via freesound_community) | [Hitting Metal](https://pixabay.com/sound-effects/film-special-effects-hitting-metal-31859/) | Metal and armor impact, quiet indoor decay |
| 6791 | altfuture (via freesound_community) | [Hitting Wood](https://pixabay.com/sound-effects/film-special-effects-hitting-wood-6791/) | Wooden hit and low impact support layer |
| 62692 | Fenodyrie (via freesound_community) | [stone on stone](https://pixabay.com/sound-effects/film-special-effects-stone-on-stone-62692/) | Stone impact, small hard-surface contact |
| 32436 | ccheatham (via freesound_community) | [real_punches_and_slaps](https://pixabay.com/sound-effects/film-special-effects-real-punches-and-slaps-32436/) | Body impact Foley and armor/body composite |

The [close recording's original author description](https://freesound.org/people/SuperPhat/sounds/432366/) identifies an actual AR15 recording already combined with a small kick-drum/trigger layer and processed into a burst. It is not an unprocessed measurement, and three game variations are edited takes of that source, not three independently recorded rifles. [The outdoor source](https://freesound.org/people/michorvath/sounds/427597/) identifies a recording about 50 yards away. [Kodack](https://freesound.org/people/Kodack/sounds/256912/) describes recording and editing the manipulation sound. These references substantiate origin; the audio used here was obtained from Pixabay.

## Edit and timing design

`tools/build-rifle-audio.py` defines all trim windows, filters, retiming, layer levels and arrivals. It verifies the original MP3 hashes before rebuilding. The mix uses sampled attacks, low body, AR receiver/bolt contacts and recorded environmental decay. No oscillator, generated noise, laser tone, beep or game recording is added. Suppressed cues are designed filtering/mixing variants of these recordings, not recordings of a physical suppressor or measured attenuation.

- Three shot variations, three suppressed variations, and corresponding indoor mixes: 12 files. Main pressure/body is centered. The shot's recorded action occurs at +45 ms. There is no casing-floor bounce baked into a shot.
- Outdoor response uses the distant field recording; indoor response uses bounded 19/37/63/104 ms early reflections and a quiet metal decay. This is an authored two-environment mix, not a room-acoustics simulation.
- Mag eject, insert, seat, charge, close, transition and dry trigger: 7 files. Tactical reload never automatically invokes charge. Empty/chamber reload receives the actual phase event. A charging cue combines AR handle pull and bolt return; it is not a shotgun pump.
- Metal, wood, stone, body, armor and partially penetrated armor/body response: 6 files. These are Foley-designed gameplay cues, not forensic bullet-impact recordings.
- Three separate casing cues play only when the game reports physical first floor contact. Soft ground/wood reduce gain and high frequencies. Ejection/action and surface contact remain distinct.

There is no long reload sequence or timer queue in the audio engine. `reloadstage` plays only the currently emitted phase. `cancelRifleReload()` stops active rifle reload tails without cutting shot reflections. Pause, mute, stop and destruction stop active source nodes. The engine has a bounded voice count, distance/pan input sanitization, compressor, and final output shaper; it cannot guarantee a safe physical headphone volume.

## Runtime/build contract

Load `rifle-audio.js` before `audio.js`. Copy `assets/audio/rifle/` to the build's `audio/rifle/`, together with this provenance/license notice or equivalent game credits. No network request leaves the game origin.

After a user-gesture `audio.resume()`, call `await audio.preloadRifle()`. `audio.stats().rifle` exposes `status` (`idle`, `loading`, `ready`, `error`), `error`, `loaded`, `total`. A missing, oversized, nonfinite, silent or undecodable file fails the entire bank visibly. Weapon index 3 never silently synthesizes or aliases legacy index 2.

- `audio.shot(3, {suppressed, environment: 'indoor'|'outdoor'})`
- `audio.event('reloadstage', {weapon:3, stage:'eject'|'insert'|'seat'|'charge'|'close'})`
- `audio.event('reload', {weapon:3})` plays a brief handling transition only
- `audio.event('empty'|'switch', {weapon:3})`
- `audio.impact(material, {weapon:3, armored, distance, pan, intensity})`
- `audio.event('casing'|'casingbounce', {weapon:3, material, distance, pan, intensity})`
- `audio.cancelRifleReload()` or `audio.event('reloadcancel', {weapon:3})`
- `riflecycle` has no additional sound because the recorded shot already contains the +45 ms bolt/action layer

Legacy indices 0–2 retain the previous APIs and synthesis. They are not claimed to satisfy this rifle-specific audio milestone.

## Rebuilding and verification

Use `python tools/fetch-rifle-audio.py --source-dir <private-directory-outside-repo>`, then `python tools/build-rifle-audio.py --source-dir <same-directory>`. The fetch helper reuses only hash-verified copies and stops on changed sources; it does not sign in or solve a CAPTCHA. Optional `--audition <path-outside-project>` writes a private listening fixture; do not distribute it as an SFX pack.

`assets/audio/rifle/manifest.json` contains every output SHA-256, duration, peak/RMS, exact zero endpoint, and source IDs. The bank is 48 kHz, stereo, signed 16-bit PCM WAV. Individual digital peaks are at or below 0.80. Files are one-shot, not looping; faded boundaries and decaying returns are checked. `node app/test-audio.cjs` checks legacy behavior; `node app/test-rifle-audio.cjs` checks the real WAVs and engine. Set `DF_RIFLE_SOURCE_DIR` to additionally verify the private raw-source bytes.

Signal/graph tests do not establish that these sounds are pleasant, convincing, balanced against all gameplay, or synchronized in a rendered browser. Listening through the game, real ordinary-input reload interruption, sustained full-auto, different surfaces/rooms, mute/pause and device volume remain required acceptance steps. No audio-perception tool was available in this worker, so **none of these sounds has been heard here**.
