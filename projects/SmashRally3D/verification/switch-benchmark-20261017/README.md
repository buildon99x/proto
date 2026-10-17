# Nintendo Switch Sports benchmark iteration — 2026-10-17

This is partial progress toward98, not a98/100 qualification. Runtime implementation:dd0571b. The baseline isacdebb9, with the frozen rubric and fresh evidence committed in2949481 before runtime source was committed. Only projects/SmashRally3D is changed. Accepted close camera, blue court/purple apron, no spectators, simple auto-footwork/aim/tap/swipe, finite contact, physics and AI are retained.

## Scope and actual access

The selected environment is a headless Linux container, hostnamecf8915a31a1e, not verified access to the user's dot desktop. DISPLAY is unset and no dot computer-control or output-listening tool is exposed. A connection-path question was sent; no actual dot operation is claimed. Browser evidence uses Chromium151/ANGLE SwiftShader, ordinary Puppeteer mouse/touch/keyboard input and read-only engine diagnostics. This is not physical-device60/30fps, human input comfort or device latency evidence.

Official [badminton introduction](https://www.nintendo.com/ph/switch/as8s/badminton/index.html) and [Nintendo tips](https://www.nintendo.com/us/whatsnew/tips-and-tricks-for-nintendo-switch-sports/) were read as text. They describe variation in rally pace, a modifier for a front-court drop, timing a descending shuttle for a smash and an opportunity on a high wobbly shuttle. Exact internal AI, collision or acceptance timing is not inferred. The [official2022 overview trailer](https://www.youtube.com/watch?v=tiwjvBSS_Wk) was located by title/publisher metadata; actual video open failed with Error fetching, and workspace video/image requests failed with Tunnel connection failed:403 Forbidden. No video viewing, source-pixel inspection or Nintendo listening is claimed. Image-search descriptions are not treated as direct visual evidence. No Nintendo characters, logos, backgrounds or sound files were copied. Details:references.json andcapabilities.json.

## Frozen experience evaluation

The twenty five-point criteria and anchors are indocs/switch-sports-rubric.md andrubric.json. Category weights:visual25,control25,audio15,UX15,match20. Unknown items staynull. A score of0 means observed failure, not missing evidence. Do not normalize the verified subtotal to100. A single assistant inspection is not a novice study or universal enjoyment/balance judgment.

Baseline:33 points from reviewed weight55; remaining weight45 unverified. Cycle1 lighting:35/55,45 unverified. Cycle2 action-based tips:37/55,45 unverified; this remains a scoped single-reviewer judgment from the new actual interaction evidence. Overall score remainsnull and98 qualification remainsfalse. Each criterion includes observations and exact evidence paths inevaluation-*.json. Human listening, hardware input/AV delay, natural real-speed motion, physical mobile comfort, opponent-defence experience and broad human fairness/depth remain unverified. Technical test passes do not fill those scores.

## Numbered audit steps

1. Entry/help/settings — reviewed. Fresh menu and four help sizes show readable instructions and44px Back; actual keyboard End/Tab/Enter checks are separate technical evidence. Pause settings are also inspected in short landscape and portrait. Complete screen-reader, focus-trap and physical-device audits remain open.
2. Held serve and aim — reviewed with limits. Four new LOW ready captures preserve camera and target projection coordinates exactly through the lighting-only cycle. The scene is substantially brighter and the arm/racket/net separate better. Simple meshes, grey character skin and broad flat background forms remain visible limitations. Directly inspected high-clear frames also show that the small white shuttle has weaker contrast against the bright sky on LOW. Its position stays visible/in bounds; real-speed tracking remains unverified and V1 stays at3, not a full approval.
3. Ordinary rally and strokes — reviewed by literal frame samples with limits. Fresh actual play contains a safe fallback, normal and naturally qualified Super Smashes. No actor/ball/time state injection is used for these captures. Frame samples show preparation/contact-event vicinity/release/return; they do not establish natural real-device motion or perceived hit feel.
4. Beginner learning — baseline issue confirmed. Previous tips changed every8s and treated32s as completion regardless of actions. The new progress records a real non-serve human return and actual successful chosen clear/lift and drop/net/block. AI actions, misses, selecting a button, serving, elapsed time or a default attack's safe fallback do not teach a chosen shot. Existing Settings/Pause can hide/reopen or restart the optional tips. No extra gameplay buttons or movement burden were added.
5. Point/results/rematch — reviewed with limits. The actual5-point winning match, terminal RESULTS NEXT frame, ordinary rematch and deliberate no-return losing game check state/copy continuity. Those scripted outcomes are not human win-rate or game-feel evidence.
6. Mobile/rotation/defence — technical results are separate. Trusted up/down gestures, continuing DPR2 MEDIUM rotation and NORMAL/HARD soft-return windows use the original gates. Opponent experience and human tactical depth are not scored from their passing status.

## Improvement and stagnation policy

Cycle1 targets the largest directly visible gap:crushed athlete/racket/net readability. Neutral tone mapping, daylight ambient and a broad key/fill improve separation without moving geometry or changing game rules. Four camera/aim projections remain identical. V1 andV2 each rise2→3;V3 remains2 because brightness does not replace authored environment depth. The lighting-only source patch and its exact captured bundle are retained.

Cycle2 replaces the timer with evidence from real successful actions; pure unit cases and actual native gestures check the distinction between serving, fallback and chosen strokes. The same simple inputs remain. The new hint is directly visible after the first return. Learning across actual32s, rematch, hide/reopen and actual native completion is checked. Five new unit cases make67 in11 files; no physics/input gates were relaxed.

The first benchmark-experience wrapper incorrectly expected a learned clear in an attack-only game. Its recorded clears were all automatic serves and all six chosen commands weredefault. The product correctly kept cleared=false; the QA expectation was corrected to require the two unperformed lessons stayfalse. The original failed attempt is retained underattempts; runtime did not change. This is a test-assumption correction, not a game fix or relaxed contact criterion.

There are two product cycles on different issues, each with observed progress. No same-issue three-attempt stagnation sequence occurred. If one occurs,iteration-ledger.json requires a causal breakdown and a different approach, not repeated parameter nudges or weaker weights/gates.

## Media limits

Recordings are actual CDP frames and the live WebAudio destination stream, with one media-origin alignment. Review cuts play at captured wall-clock1x, without interpolated poses, slow-motion retiming or substitute sounds. The20fps encoding holds sampled frames; the software renderer can run slowly, so the video is not the requested normal-speed dot/hardware qualification. Sound-event counts/offline amplitude are numerical checks, not listening. No hardware response, audibility, AV latency or98-point approval is inferred.

Full source captures, audio, frame timestamps, ordinary input commands and read-only contact snapshots remain inbaseline,lighting-play andfinal-play. Screenshot comparison uses original captures with proportional contain, not generated gameplay. Clip ranges and hashes are indelivery/edit.json. Terminal trailing whitespace in text logs may be normalized for Git; failures and measurements remain unchanged.

No main merge, public-default promotion or manual deployment was performed. The base cb-ll project was not modified. Dot access, direct reference playback and real listening/physical input/user studies are blocking the requested complete98 assessment; this document does not close them.

## Next evidence and work

The18-point gap inside the reviewed55 is still substantial. Priorities include original character/environment art, small high-shuttle contrast, compact35px settings targets, broader accessibility and novice learning observation. Dot real-speed/physical input tests, actual output listening, reference gameplay viewing and human fairness/depth studies are needed before the remaining45-point weight can be evaluated. No score is inserted for those missing observations. If dot becomes available, use the same frozen criteria and ordinary inputs, collect latency/AV frames and listener notes, then revise the evaluation rather than treating these software captures as a substitute.

## Individual saved deliveries

- [20-second actual1x software review (hardware feel/listening unverified)](https://chatgpt.com/api/library/files/libfile_980f2766bcb48191b666f0b35bfadfd4/download)
- [Before/after actual screenshots](https://chatgpt.com/api/library/files/libfile_a903ec9963408191920d92fd054c49eb/download)
- [100-point rubric scorecard:33→35→37/55,45 unverified](https://chatgpt.com/api/library/files/libfile_bb052cef5a88819186fa1584deb9ef58/download)

Stable Library identities are recorded indelivery/library-files.json. The prepared helper failed at read-only tools/list before preparing any write; the official native create route saved all three files successfully. No media was regenerated after saving.

## Final technical results, separate from experience scores

Strict67 tests/11 files pass; fullbuild:vercel passes. Twelve final browser reports pass without runtime errors on one bundle SHA256 `10f60103123fd20b2fe1ac8c796a2cbd1400c0f08dcf55d56369f34b427d5910`. Three trusted native repetitions complete/restart the three lessons. The attack-only37.52s match correctly leaves chosen clear/drop unlearned through32s, rematch and hide/reopen. The first wrapper expectation error is preserved underattempts/final-play-serve-assumption, and its corrected serial replay passes infinal-play-retry.txt; game source stayeddd0571b. The original suite log retains exit1 for that first QA error. No result is rewritten as a first-attempt pass.

| View | Actual returns | Player/shuttle clipping | Max aim error | Apex |
|---|---:|---|---:|---:|
| pc | 6 | 0/0 | 0.000028px | 9.764m |
| mobile-landscape | 6 | 0/0 | 0.389748px | 9.649m |
| mobile-portrait | 6 | 0/0 | 0.467294px | 9.589m |

Actual UI match:[5, 0], 17 physical contacts and 17 rendered samples, longest4 returns; maximum sampled racket-centre discrepancy2.65e-07m. Three normal and two naturally qualified Super Smashes remain on the unchanged solver path.17 hit/5 point sound events and0/0 with Sound off are numerical/live graph observations, not listening. NORMAL/HARD centre-soft windows have6 physical AI returns and0 immediate soft winners; separate original pressure patterns have13 responses and1 GOOD/PERFECT direct winner. None of these counts awards an unknown experience criterion.

To reproduce this candidate:run `bash projects/SmashRally3D/tools/verify-switch-benchmark.sh`, then the report assembler. The script now includes the pause case that was run separately in this session. Existing final run directories/logs are archived before a rerun. The source and human-reviewed scores must be evaluated anew for a different runtime; create a new evidence directory for a new audit. Already saved Library media must retain identity on future replacements.
