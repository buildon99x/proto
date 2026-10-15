# Coaching evidence → game rules (2026-10-15)

Sources were read directly; federation-authored PDFs are hosted by a national association/club. Numbers below are game tuning, not measured human biomechanics or official playing laws.

[BWF Shuttle Time Teachers Manual](https://badminton.gr/wp-content/uploads/2025/11/Shuttle-Time-Manual.pdf), printed53–55,74–77,79–82: low forecourt contact calls for a lift; a higher defensive lift buys recovery time. Smashes require an early contact in front; a compact block can turn defence into net pressure. Base follows probable replies rather than a fixed spot. Space, time and balance matter together.

[BWF Level1 Coaches Manual](https://orpingtonjuniors.com/coach_resources/docs/BWFLevel1Handbook.pdf), printed53(PDF77),142–147(PDF171–176): shallow split begins before opponent contact and lands around/after contact, including during recovery. Straight play often needs less recovery; cross-court is useful variation with a positioning cost. Blocking away from the attacker's follow-up route can reverse pressure.

[Mike Hopley: building shots](https://www.badmintonbible.com/tactics/singles/building-shots) and [flexible central base](https://www.badmintonbible.com/tactics/singles/central-base): clears open front space; a net shot can invite a lift; a drop gives its hitter less recovery time; the base shifts towards the played side and depends on likely replies. These are coaching explanations, not hit-success probabilities.

## Gap at6582e24 and implementation contract
| Previous behavior | New mechanism and regression |
|---|---|
| Default is almost entirely height→drive/smash | Contextual lift/net/block/net-finish under the same clear/default/drop inputs; actual contact height, forward position and balance constrain attack |
| Weak input always means clear | Separate timing, preparation and posture; deterministic course error, exposed short lift, legal stroke fallback, no score-dependent dice |
| Recovery depth is fixed by shot label | Dynamic reply-covering base from technique AND placement; cross needs actual extra diagonal flight/recovery distance, not just a cosmetic accuracy penalty |
| No split step | Automatic shallow neutral landing at opponent contact; no destination prediction is disclosed before AI delay |
| AI has a short fixed shot sequence | Rank observed legal court options using displacement, flight time and own recovery, retaining delayed noisy observations |
| Five impact synth presets | Compact net/block vs drive vs overhead transient/envelope; successful collision remains the sole event source |

Acceptance: legal trajectories/actual swept net faults; same low/high input resolves differently; lift buys time; cross/straight have different physical distance and recovery; no impossible high attack; AI delay survives; natural UI inputs reach tactical exchanges. Injected domain fixtures and normal browser play are reported separately. Human hearing, physical-device latency/FPS and coaching realism remain separate checks.
