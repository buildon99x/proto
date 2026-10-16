# Experience quality log

Updated2026-10-16. Baseline906024b; current implementation commits45809ad,04174df,0405569,0668f6e. AAA is a target, not a certification. Keep the existing specification's acceptance criteria; a passing software capture does not replace real-device testing.

## What the current review established

1. First entry/help/serve were reachable. Baseline screenshots are underverification/experience-20261016/baseline. The baseline script's screenshot-before-input consumed its touch window; its losses are not evidence of a new game-input defect.
2. A real front-target attack displayed `LIMIT: SMASH > DROP`. The safe physics fallback was correct, but the explanation exposed internal terminology. Actual hit feedback also omitted the hitter identity.
3. A resolved point retained the old SMASH control label and gave only IN/AI POINT. Failure cause and next action were unclear.
4. The intermediate short-screen help clipped BACK. The final dialog keeps its header/footer visible while its body scrolls; four viewport sizes and actual End/Tab/Enter navigation check it.
5. A repeated MEDIUM native test delivered swipe movement after a real contact. The late gesture correctly remained rejected; retroactive shot changes are prohibited. The old attack cue used+0.05s while physical PERFECT already allowed+0.08s. Sharing the existing0.08s boundary supplies the missing preparation signal without altering input acceptance, quality, buffer, reach, AI or collision clocks.

6. A review of the actual5–0 point frame found an incorrect next-serve hint. Terminal points now announce match won/lost and results next, enforced by the boundary unit test and the real winning-point frame check.

## Preserved and strengthened checks

| Area | Required evidence |
| --- | --- |
| Basic loop | Actual UI start/serve, at least3 rally returns,5-point result and ordinary rematch; both a winning game and deliberately unreturned losing game. |
| Attack consistency | Natural player normal and Super Smash on the engine path, not only a fixture. Super remains conditional on weak/high/slow incoming flight, preparation, balance, timing and legal descending geometry. Pre-hit text says chance. |
| Contact | Same original finite-arm/string-plane/radial gates; rendered and physical racket-centre disagreement at most0.002m. A ball need not strike the exact centre of the strings. |
| Shot explanation | Hitter-qualified actual result; human wording for safety fallback; persistent point cause; no stale dead-ball attack label. |
| Audio | One hit sound per real hit; separate one-score-event outcome cue; no pending cue on restart; both voices absent with Sound off. Offline amplitude and real stream capture are distinct from listening. |
| Mobile | Trusted tap/up/down gestures must be classified before pointer-up and produce the requested physical shots; same native case repeated3times on the final candidate. No post-contact reclassification. |
| Direction/visibility | Original6-return PC/landscape/portrait gates, zero actor/shuttle clipping, existing0.1px mouse/1.5px touch aim tolerances; continuing rotation at DPR2 MEDIUM. Near court cropping stays intentional. |
| Fair defence/reward | NORMAL/HARD repeated soft-DROP windows each produce3 real AI returns and0 immediate soft winners. Separate original pressure patterns must show both actual AI responses and a GOOD/PERFECT direct soft winner; no human win-rate inference. |
| Help | Back stays fully inside all tested viewports and at least44px tall; overflowing text can be keyboard-scrolled, then Back reached and activated. This is not a full focus-trap/screen-reader audit. |

## Evidence limits that remain open

- PC60fps/mobile30fps targets require physical-device measurements. SwiftShader frame rates and duplicated recording frames are not substitutes.
- Speaker/headphone listening, physical touch/audio/display latency, Safari and broad human game-feel/balance testing remain open.
- Controlled10-match domain tests do not certify10-browser-match memory/stability or a public deployment.
- No main merge, public-default promotion or deployment is authorized in this iteration.
- The Naver article remains unread. None of these findings or changes is attributed to its content or images. Existing original project assets and accepted close camera remain intact.

Final per-case results, source bundle identity, actual recordings, failed/intermediate attempts and delivery links are consolidated inverification/experience-20261016/README.md andqualification.json.
