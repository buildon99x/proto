# Verification status — 0.2.0 playable candidate

The earlier f269f08 claims are superseded by [audit corrections](docs/AUDIT-CORRECTIONS.md). This candidate is playable and passes the listed software checks; AAA quality and full real-device acceptance are not certified.

| Spec gate | Evidence and practical limit |
|---|---|
| QA-01 match | Ten normal UI games: start/serve/4–12 return rally/5 points. Natural loss and PLAY AGAIN separately passed; pause/resume passed. |
| QA-02/03 physics and aim | Shared120Hz integrator, swept net/ground,1000 numerical launches, left/right solver assertions. Clear/drop/smash envelopes differ; empirical drag calibration remains unverified. |
| QA-04 timing | Independent quality/eligibility regression; UI cue controls retain finite lead/buffer. Human novice timing validation remains open. |
| QA-05 contact | Five actual-engine UI collisions plus rendered string-centre snapshots, maximum render-centre delta<0.000001m. Single engine event arms the window; actual collision emits SFX/FX. Offline WAV/event scheduling inspected, no hardware listening/presentation-latency claim. |
| QA-06 movement | Same bounded motor, fixed limbs, actual3D reach. First ten-game foot gate failed0.297m; fix rerun passed0.000000978m (10,549 eligible samples),3mm gate. Point resets/jumps excluded; see method. |
| QA-07 tactics | Normal games produced all five shot kinds; longest12 returns. Every NORMAL game29 contacts and12 cue-driven return commands, every EASY game21 contacts and8 commands. Controller wins all10; human difficulty balance remains unverified. |
| QA-08 AI | Delay before any forecast, then bounded noisy currentp/v samples; shared movement/contact rules.19 tests pass. Human difficulty/shot diversity review still needed. |
| QA-09 touch | Actual emulated tap/swipe input before release, stable gesture-start target, portrait/landscape and pause. Physical touch/Safari remain open. |
| QA-10 performance | Software SwiftShader around10–13FPS is recorded, not substituted for PC60/mobile30 targets. Real-device frame budget/download/startup/latency remains open. |
| QA-11 stability | Ten active games,0 runtime errors,250 real contacts, all finite/contact bounds valid; sampled heap15–40MB. This is no proof of long-run leak freedom. |
| QA-12 deployment | Root build:vercel passed. Existing GitHub Vercel status confirmed success for ac5829c. Direct external execution/access level still blocked by proxy403; never bypassed. |
| QA-13 assets | Original court/weighted athlete/racket/shuttle/motions/synthesis sources and dependency licenses recorded. |
| QA-14 accessibility | Mute/FX/trail/quality controls and readable timing feedback; reduced-FX/pause/reload software checks pass. Human accessibility review remains open. |

[Ten-match evidence](verification/after/ten-active-ui-matches.json) records each game's score, shot sequence/counts, cue-input count, longest rally and observed software FPS/heap. Controls use visible HIT NOW/SUPER, not internal contactAt. Full per-point command sequences were not recorded. All games used the same deterministic pattern, so this is regression coverage rather than diverse human strategy testing.

[Five-shot contacts](verification/after/contact-gallery/five-shot-contact-evidence.json) and labelled screenshots freeze real collision snapshots after UI input. Earlier Drive-provocation strategies failed; the NORMAL clear/drop/default tactical sequence succeeded. Inspection mode does not count as uninterrupted match play. Final camera-only inspection fix does not change the tested gameplay implementation.

Before/after silent videos are in verification/before and verification/after. Before used precise read-only timing assistance; after uses visible cues and records7 returns with0 browser errors. Five WAVs in verification/audio render the actual synthImpact function numerically; no speaker/headphone/Bluetooth hearing test was performed.

Important screenshots are staged in verification/library-deliverables. Library upload remains pending because the required official upload skill/helper source became unavailable. No Library write, alternate transfer route or invented identity was used.
