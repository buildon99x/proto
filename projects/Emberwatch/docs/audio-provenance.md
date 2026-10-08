# Original fantasy audio: Warrior-first implementation

## Provenance and scope

The bank now combines 53 original procedural PCM samples with two variants derived from **Battlecry by spookymodem**, licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), obtained from [the author's OpenGameArt submission](https://opengameart.org/content/battlecry). The original download, SHA-256, and credit are recorded under `assets/audio-source/`. The author describes it as a deep warcry before charging into battle; no claim of a specific voice actor or recording method is made. Changes: silence trim (0.425–1.825 seconds), mono downmix, 32 kHz resample, high/low-pass filtering, level/fades and a quiet original armor-contact accent. No endorsement is implied. Attribution, source and license links appear in the game's Korean guide and `app/src/assets/audio-credits.txt`, including the offline HTML guide.

The deterministic tooling is `app/scripts/render-audio.py` (NumPy/SciPy). The browser runtime has no package or audio-service dependency. The 55-sample, 20-family atlas is now 51.12 seconds / 3,271,724 bytes. All 53 unrelated source samples were verified byte-identical to 0.4.1. Warrior remains the only character acceptance target.

## Sound construction

- Sword swishes: shaped broadband air, low cloth motion, edge hiss, and restrained inharmonic steel resonance. Heavy swings have a wider/lower pass-by and more air mass.
- Contacts: low filtered body/wood excitation, short broadband crack, leather/grit, and material-dependent damped steel modes. Heavy contact adds a delayed low-body layer. These are distinct from swing sounds.
- Whirling Axes: overlapping, individually varied rotating swishes with light metal resonance.
- War Cry: the attributed Battlecry sample, with preserved vocal character and a quiet, short armor accent. The previous synthesized glottal/low-body sound was rejected by the user as fart-like and is retained only in the labeled A/B comparison.
- Footsteps: sole/heel body, stone/grit and scrape, now at event gain 0.1105, exactly 30% above the 0.4.2 value of 0.085, with zero room send. Alternating feet select balanced left/right variants. Dodge uses cloth and displaced air; it does not emit run footsteps.
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

Each source has a dry path and optional short stereo diffuse-room send; footsteps have no room send. The summed mix is high-passed at 42 Hz, low-passed at 11 kHz, compressed (−14 dB threshold, 5:1 ratio, 3 ms attack, 160 ms release), then softly bounded by an oversampled waveshaper. Ambience ducks during important contacts. The source atlas has conservative, varied peaks, DC removal, and edge fades on one-shots. None of these numerical safeguards alone proves pleasant or convincing audio.

## Listening deliverables

Open `app/src/assets/audio-audition.html` through the project’s HTTP preview (or `assets/audio-audition.html` in the built artifact). It contains manually triggered Warrior sounds, a scripted sequence using the real runtime mixer, volume control, and Stop. Nothing autoplays.

- `audio-demonstration.wav`: 34.06-second dry-source reel; the final ten seconds are an editorial Warrior example, not a gameplay capture. Cue times and per-sample measurements are in `audio-review.json`.
- `scripts/check-audio-browser.mjs`: an eleven-second stereo Warrior sequence harness intended for Chromium’s real OfflineAudioContext through `audio.js`. The attempt in this environment failed at Chromium startup (`process_singleton_posix.cc: socket() failed: Operation not permitted`), including the reviewed escalation retry. `audio-runtime-report.json` records that blocker. No `audio-runtime-render.wav` was produced, and no browser-audio rendering or listening success is claimed.

## Reproduction and evidence

From the repository root:

1. `python projects/Emberwatch/app/scripts/render-audio.py`
2. `node --test projects/Emberwatch/app/tests/audio.test.mjs`
3. `node projects/Emberwatch/app/scripts/check-audio-browser.mjs`

The focused suite validates all sample bounds/content/fades/unique variants and immediate contact energy, opt-in gating, no queued stale hits, repeat/material/role selection, exact peak timing and cancellation, bounded polyphony/priority, pause/disable/dispose, the graph’s safety stages and retryable load failure. These are sample/logic checks using a mocked context.

When run in a supported environment, the Chromium harness is designed to render the real graph without an audio output device and check finite/nonzero output, output peak and clipped-sample count, stereo response, scheduled events, and logical voice count. This path remains unverified here because Chromium could not start. A future successful OfflineAudioContext simulation would still be separate from normal game interaction.

Subjective listening remains unverified: no listening-capable tool or audio output device was available in the worker environment. Do not claim that metrics, generated files, a successful render, or an HTML audio control were heard. Required acceptance still includes speaker/headphone review, repeated-play fatigue, tell intelligibility under combat, and in-game timing/cancel behavior using ordinary controls.

## 0.4.2 movement contact repair

The run cycle is driven by actual collision-resolved distance, with left/right landing at baked frames 0 and 12. Pointer hover no longer freezes travel-facing; attacks keep their committed aim and dodge faces its own travel. Stop, walls, action poses, damage and pause suppress/cancel footstep voices. A floating-point boundary regression caught and fixed a duplicate contact at exact cycle wraps.

`assets/screenshots/feedback-0.4.2/Warrior-audio-before-after.wav` compares the previous/new War Cry and previous/new footsteps at identical playback conditions and fixed step cadence, using each version's runtime event gain. Cue times are in `audio-comparison.json`. `Warrior-travel-and-footsteps.mp4` uses actual update logic and the production motion renderer, with only the east panel's dry step events in its audio track. These are review artifacts, not captured browser play.

The 2026-10-08 listening-tool attempt explicitly returned “audio content omitted because you do not support audio input.” Subjective acceptance therefore remains unverified; the user's report, source labeling, and objective signal/timing checks are distinct evidence.

## 0.4.3 level tuning

The user found 0.4.2 footsteps too quiet. Event gain is now exactly 0.085 × 1.3 = 0.1105. The source samples, foot-contact events, zero room send and cancellation behavior are unchanged. The labeled 0.4.2 A/B artifacts remain historical evidence and were not regenerated.
