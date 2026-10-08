# Original fantasy audio: Warrior-first implementation

## Provenance and scope

All included audio is original authored digital sound design for Emberwatch. No recordings, commercial-game audio, external sound libraries, voices of real people, or third-party sample licenses are involved. The deterministic source is `app/scripts/render-audio.py` (NumPy/SciPy, seed `0xE8BE2026`). These are offline build tools; the shipped browser runtime has no package or network-service dependency. The project’s source/license terms govern these authored assets; no external recording-license claim is being made.

The bank contains 55 mono, 32 kHz, 16-bit PCM samples across 20 families, in a 50.24-second, 3,215,404-byte atlas. Source families for generic magic remain compatibility support, not a claim that additional classes have passed their acceptance gate. Current acceptance is Warrior only: three-hit sword combo, Whirling Axes, War Cry, footsteps, dodge, hurt, death, and basic monster target cues.

## Sound construction

- Sword swishes: shaped broadband air, low cloth motion, edge hiss, and restrained inharmonic steel resonance. Heavy swings have a wider/lower pass-by and more air mass.
- Contacts: low filtered body/wood excitation, short broadband crack, leather/grit, and material-dependent damped steel modes. Heavy contact adds a delayed low-body layer. These are distinct from swing sounds.
- Whirling Axes: overlapping, individually varied rotating swishes with light metal resonance.
- War Cry: nonverbal glottal excitation through formant-like bands, air/breath noise, and a low body transient. It is synthesized, not a recording or imitation of a named person.
- Footsteps: sole/heel body, stone/grit, and delayed scrape. Dodge uses cloth and displaced air.
- Monster tells/releases: low pulsed breath excitation, throat/body filtering, and attack transients. Role variants are not copied creature recordings.
- Ambience: seamless filtered wind/room beds; the refuge also has quiet ember crackle. No music loop competes with combat.
- Reward and compatibility spell cues: inharmonic metallic/crystal impacts and air/grains rather than the previous single oscillator pitch sweeps.

## Runtime and event timing

`createFantasyAudio({enabled: () => save.settings.sound})` creates a silent object. `resume()` or `setEnabled(true)` must be invoked by an opted-in user gesture to create/unlock Web Audio and load the bank. Neither `play()` nor `tick()` initializes/resumes the browser audio context. Loading does not queue stale combat sounds. A failed read/decode is observable through `status().error`; it never substitutes a beep.

- At a sword action’s start, use `play('slash' or 'heavySwing', {contactIn: action.contact, tag: 'heroAttack'})`. Each sample contains its measured 12 ms energy-peak marker. The engine schedules the clip so this peak coincides with the future simulation contact, adjusting playback speed or trimming the leading air only for unusually short startup.
- Call `cancel('heroAttack')` when that windup is canceled, interrupted or replaced. Pause, disable and dispose also remove pending sources.
- `hit`, `heavyHit`, `hurt` and other contact sounds play immediately when called. `contactIn` does not move an impact off its confirmed contact event. A miss must never call the impact path.
- Whirling Axes and War Cry start at ability release. Play every permitted contact from the same confirmed damage event as flash, VFX and hitstop.
- `options.pan` is clamped to ±0.78. `material: 'armor'` or `'metal'` selects the metal contact bank. `enemy: 'brute'`/`'boss'` and ranged role strings choose tell/release variants.
- `tick(dt,{scene:'town'|'dungeon',paused,combat:0..1})` handles quiet ambience and transient ducking. It must still be called while menus/visibility pause gameplay, or the host must explicitly call `pause(true)`.
- `resume()` can unlock/load silently while paused; `play()` remains blocked and no ambience starts until unpaused. This supports the sound toggle inside a menu.

## Mixing and safeguards

The engine has 16 logical one-shot voices, per-family-group caps, event cooldowns, adjacent-variant avoidance, restrained pitch/gain variation, and priority-based voice replacement. Player hurt/death and heavy contacts outrank routine foley and rewards. Fading stolen sources may coexist for up to 12 ms while disconnecting, avoiding a sharp cut; two ambience loops are separately bounded and crossfaded.

Each source has a dry path and a short stereo diffuse-room send. The summed mix is high-passed at 42 Hz, low-passed at 11 kHz, compressed (−14 dB threshold, 5:1 ratio, 3 ms attack, 160 ms release), then softly bounded by an oversampled waveshaper. Ambience ducks during important contacts. The source atlas has conservative, varied peaks, DC removal, and edge fades on one-shots. None of these numerical safeguards alone proves pleasant or convincing audio.

## Listening deliverables

Open `app/src/assets/audio-audition.html` through the project’s HTTP preview (or `assets/audio-audition.html` in the built artifact). It contains manually triggered Warrior sounds, a scripted sequence using the real runtime mixer, volume control, and Stop. Nothing autoplays.

- `audio-demonstration.wav`: 33.62-second dry-source reel; the final ten seconds are an editorial Warrior example, not a gameplay capture. Cue times and per-sample measurements are in `audio-review.json`.
- `scripts/check-audio-browser.mjs`: an eleven-second stereo Warrior sequence harness intended for Chromium’s real OfflineAudioContext through `audio.js`. The attempt in this environment failed at Chromium startup (`process_singleton_posix.cc: socket() failed: Operation not permitted`), including the reviewed escalation retry. `audio-runtime-report.json` records that blocker. No `audio-runtime-render.wav` was produced, and no browser-audio rendering or listening success is claimed.

## Reproduction and evidence

From the repository root:

1. `python projects/Emberwatch/app/scripts/render-audio.py`
2. `node --test projects/Emberwatch/app/tests/audio.test.mjs`
3. `node projects/Emberwatch/app/scripts/check-audio-browser.mjs`

The focused suite validates all sample bounds/content/fades/unique variants and immediate contact energy, opt-in gating, no queued stale hits, repeat/material/role selection, exact peak timing and cancellation, bounded polyphony/priority, pause/disable/dispose, the graph’s safety stages and retryable load failure. These are sample/logic checks using a mocked context.

When run in a supported environment, the Chromium harness is designed to render the real graph without an audio output device and check finite/nonzero output, output peak and clipped-sample count, stereo response, scheduled events, and logical voice count. This path remains unverified here because Chromium could not start. A future successful OfflineAudioContext simulation would still be separate from normal game interaction.

Subjective listening remains unverified: no listening-capable tool or audio output device was available in the worker environment. Do not claim that metrics, generated files, a successful render, or an HTML audio control were heard. Required acceptance still includes speaker/headphone review, repeated-play fatigue, tell intelligibility under combat, and in-game timing/cancel behavior using ordinary controls.
