# Coaching evidence → game rules (2026-10-15)

Sources were read directly; federation-authored PDFs are hosted by a national association/club. Numbers below are game tuning, not measured human biomechanics or official playing laws.

[BWF Shuttle Time Teachers Manual](https://badminton.gr/wp-content/uploads/2025/11/Shuttle-Time-Manual.pdf), printed53–55,74–77,79–82: low forecourt contact calls for a lift; a higher defensive lift buys recovery time. Smashes require an early contact in front; a compact block can turn defence into net pressure. Base follows probable replies rather than a fixed spot. Space, time and balance matter together.

[BWF Level1 Coaches Manual](https://orpingtonjuniors.com/coach_resources/docs/BWFLevel1Handbook.pdf), printed53(PDF77),142–147(PDF171–176): shallow split begins before opponent contact and lands around/after contact, including during recovery. Straight play often needs less recovery; cross-court is useful variation with a positioning cost. Blocking away from the attacker's follow-up route can reverse pressure.

[Mike Hopley: building shots](https://www.badmintonbible.com/tactics/singles/building-shots) and [flexible central base](https://www.badmintonbible.com/tactics/singles/central-base): clears open front space; a net shot can invite a lift; a drop gives its hitter less recovery time; the base shifts towards the played side and depends on likely replies. These are coaching explanations, not hit-success probabilities.

## Gap at6582e24 and implementation contract

| Previous behavior                             | New mechanism and regression                                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default is almost entirely height→drive/smash | Contextual lift/net/block/net-finish under the same clear/default/drop inputs; actual contact height, forward position and balance constrain attack        |
| Weak input always means clear                 | Separate timing, preparation and posture; deterministic course error, exposed short lift, legal stroke fallback, no score-dependent dice                   |
| Recovery depth is fixed by shot label         | Dynamic reply-covering base from technique AND placement; cross needs actual extra diagonal flight/recovery distance, not just a cosmetic accuracy penalty |
| No split step                                 | Automatic shallow neutral landing at opponent contact; no destination prediction is disclosed before AI delay                                              |
| AI has a short fixed shot sequence            | Rank observed legal court options using displacement, flight time and own recovery, retaining delayed noisy observations                                   |
| Five impact synth presets                     | Compact net/block vs drive vs overhead transient/envelope; successful collision remains the sole event source                                              |

Acceptance: legal trajectories/actual swept net faults; same low/high input resolves differently; lift buys time; cross/straight have different physical distance and recovery; no impossible high attack; AI delay survives; natural UI inputs reach tactical exchanges. Injected domain fixtures and normal browser play are reported separately. Human hearing, physical-device latency/FPS and coaching realism remain separate checks.

## Assistance and tuning

The three existing inputs remain unchanged. Height/context is labelled before the swing; a low default return becomes a lift automatically. Timing windows/buffer remain80/180/300ms and350ms; the new state does not add a mandatory precision input. Auto split uses90ms anticipation of the publicly visible opponent swing and lands30ms after its nominal contact; hop3.5cm. These are readable game values, not measured physiology. It brakes recovery at the current location instead of forcing a run to centre. AI sees no directional trajectory/intercept until its existing delayed observation. A predicted animation-contact time is public posture information, not the future shuttle landing.

## Native touch failure and repair

Recognition-only mobile QA passed but a later real-return test failed. Observed pointerdown11.108s was submitted at pointerup11.308s and rejected as late. The selected return is now reserved on touch-down. A swipe classifies that same reservation and can update technique during preparation, keeping the original swing start/contact clock, aim and gesture-start time. Classification closes45ms before nominal contact and is forbidden after the hit-frame event. Clip phase is retained rather than restarted. Pointerup submits nothing twice; cancel clears an unlocked reservation. A hold begins return preparation, with no charge mechanic.

The text cue starts240ms before nominal swing lead, within the existing accepted input buffer; the tighter visual ring still marks precision. Raw80/180/300ms quality thresholds and350ms buffer are unchanged. Early imperfect input can still rally instead of requiring a new gesture or exact deadline. These values are game tuning, not measured human reaction times. Native CDP replay now verifies not only intent recognition but acceptance before release AND real emitted clear/drop strokes. A separate clear-preset/one-finger-tap replay reaches six returns. This refines the original pointerup-only tap assumption without rewinding a missed shuttle or granting reach. Hardware touch/audio and physical FPS remain unmeasured.

The installed PlayCanvas2.23.2 AnimClip constructor/implementation was checked for its starting-time argument when preserving an existing preparation phase. The official API URL was also attempted but unavailable to the browser tool; no unverified API signature was assumed.
