# Smash feel — actual browser evidence

Starts from accepted close-camera revision eede0d71363cba58506156ff288c3c4ffd0a46d7. Runtime implementation: c6a8bbf. Only SmashRally3D is changed; no cb-ll source edits, main merge, public-default promotion or manual deployment.

## Review first

- [29-second actual play video](https://chatgpt.com/api/library/files/libfile_2b9a66f07fa88191a73664e4bcea52e8/download) — two smash/point/next-serve sequences and a HARD AI block, three explicitly labelled hard cuts at original wall-clock playback speed.
- [Ten actual swing/flight samples](https://chatgpt.com/api/library/files/libfile_25d5a6b236a88191bc0d6d0d33260266/download) — prepare, accelerate, physical contact, follow-through, descending flight and ready again from one real UI stroke. Original PNGs and timestamps remain under play-final/frames.
- [Full471.3-second capture with live audio](play-final/full-play-with-live-audio.mp4), [frame timestamps/hashes](play-final/capture-manifest.json), [raw gameplay snapshots](play-final/smash-evidence.json), [computed review summary](review-summary.json), [video edit ranges](delivery/video-edit.json).

The video is encoded at20fps by holding captured frames, without interpolation. It is a Chromium151/ANGLE SwiftShader recording, not a20fps device-performance claim. The JPEG stream was captured during play and encoded afterward. No pose reconstruction, injected actor/ball/time, cinematic camera, score award or contactAt-triggered automation was used. Inputs follow visible UI timing text. The PNG sheet uses untouched canvas samples; phase labels are annotations.

## Resulting behaviour

The existing close camera, strong shoulder coil/jump/cross-body motion, click/tap, clear, drop, swipe reservation and fair AI rules remain. SET and HIT NOW distinguish preparation from the attack sweet spot. A balanced perfect ordinary smash searches a faster/steeper legal profile below38m/s; good attacks retain the34m/s balance cap. Shared prediction/integration and safe fallback still reject impossible descending geometry. These rules apply symmetrically to both athletes.

A real collision drives the displayed contact snapshot, a restrained string-plane mark, tapered actual-flight trail and original short cork/string sound. The first impact frame discards remaining catch-up. A requested24–32ms real-clock hold pauses the whole simulation equally. Tiny directional camera response can be disabled; reduced motion disables hold/recoil. No random full-screen shake, automatic hit or scoring effect is added.

Sound scheduling now occurs once at the contact render's frame-end callback, after next-flight planning. Original synthesis combines a short filtered crack and damped string modes, with an85ms buffer. Repeated trail rendering reuses materials.

## Actual coverage

Six player smashes were observed, all perfect:23.782–36.898m/s, vertical velocity−4 to−7m/s. Four sequences have an observed following physical hit: three next-rally serves after points, and one actual HARD AI block0.300 simulated seconds after a36.898m/s smash. Two final end flights without a following hit are excluded from settled counts. This is scenario coverage, not a human win-rate claim. Natural Super Smash was not observed in this run; its existing eligibility/strength tests remain separate domain evidence.

All six observed impact renders agree with their physical racket-centre snapshots (zero mismatches). This does **not** mean every ball centre hits the string centre: actual plane distances0.01253–0.01705m and radial distances0.20355–0.21416m remain within the original0.045m/0.225m contact gates. Finite arms and the unchanged motion/contact regressions pass. Original primitive racket/cork overlap remains visible at the contact frame.

NORMAL/HARD selected-DROP windows each observe three real AI contact returns and zero immediate soft winners. Native trusted up/down gestures are classified before pointer-up and produce clear/drop physical shots. A continuing DPR2 MEDIUM rally survives portrait→landscape→portrait with accepted aim and no reload or state injection.

## Audio evidence and limits

35 real contacts produce35 scheduled sounds and35 packet groups in the captured **actual WebAudio destination stream**. Peak decoded amplitude is0.6201 or less, without clipping. Scheduling and presentation callbacks differ by at most0.1ms; this is a JavaScript callback measurement, not speaker/display latency.

MediaRecorder's container PTS starts at its first audible packet, rather than at recorder.start. The full/short videos use one8.334s stream-origin calibration against the first live scheduling event, fill timestamped silence, and preserve all subsequent packet spacing. There is no per-hit resynchronization or replacement/offline sound. Packet-group starts differ from their scheduling markers by−61.8 to+103.2ms under this software capture. A decoded mux check places the first four audible starts at8.34,16.13,24.65,33.93s against expected8.334,16.118,24.653,33.938s. The raw WebM, event ledger and edit metadata remain inspectable.

No speaker/headphone listening, physical-device AV latency, Safari or human game-feel certification was performed. The review video contains the real captured stream so it can be heard and assessed independently.

## Verification and attempts

58 tests pass in9 files (tests-final.txt); project build (build-final.txt), complete monorepo build (root-build.txt), and registry generation pass. The additional read-only strength probe finds30 common legal geometries with no slower/weaker Super Smash; it is domain evidence, separate from UI play.

qualification.json consolidates the final individual browser reports and layout metrics. All certify one unchanged runtime bundle. Near-court cropping remains intentional; athlete/shuttle clipping and event-time aim accuracy are the gates.

The first live VP9 encoder accumulated a backlog; it was cancelled, producing an EPIPE. Its logs/screens remain under attempts/live-vp9; the incomplete encoder file is excluded from delivery. That attempt's long-delay next-rally serves are **not** counted as AI returns. Actual subsequent hits are classified by the immediate next rendered motion, with Serve excluded.

The initial150s PC observation reached four returns with zero actor/shuttle clipping and zero runtime errors, then failed its six-return gate. The retry changes only the observation budget to420s, preserving the same viewport, controls and six-return/high-clear/aim/clipping gates. The first shell runner also logged an orchestration error after being edited while active and repeated the native case; both native runs passed. Its original log is retained under attempts/first-suite.txt; final individual reports are authoritative. The stable rerun script includes the longer budget and waits for the last attack outcome.

## Reference camera continuity

[Before correction](https://chatgpt.com/api/library/files/libfile_9b960e60f0548191beebe71f4ed093bf/download) and [accepted close-camera after](https://chatgpt.com/api/library/files/libfile_722c1d4e9594819195cac87caeab6386/download) remain the individual camera-comparison PNGs. Ready framing is unchanged: the1065×606 calibration gives net width66.47%, tape51.14%, hair50.94%, sole81.50% and athlete height30.56%. Blue practice apron/presentation net differ from regulation dimensions; legal white lines and physics remain unchanged. No spectators or third-party character/logo/background copies are introduced.

Direct download of13013.jpg previously failed three times with `library file transfer failed: download failed`; the parent directly inspected the original and supplied its visual measurements. This work preserves that accepted correction and does not claim a new direct source-image comparison.
