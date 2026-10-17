# Balancing and limits
120Hz semiimplicit drag/gravity integration is shared by solver, prediction and flight. Drag0.065, speed5.8m/s, acceleration24m/s². Arms are fixed .36+.36m with a .46m grip/head relation. String/cork capture tolerance is .225m radial and .045m plane, accepted only inside the hit phase and for incoming court travel. Both string faces are usable. Solver ordinary/super bounds are34/55m/s; impossible downward attacks explicitly downgrade to Drop/Drive.

EASY/NORMAL/HARD delay .50/.30/.18s. No AI forecast exists before the delay. Observations afterward perturb current position AND velocity within per-level bounds and recompute the shared predictor. Their timing error ceilings .24/.19/.09s create imperfect returns; there are no score-dependent hit-success dice. NORMAL opens with safe clears for three returns and then attacks horizontal space/front-back based on player position. Both actors obey identical movement, recovery, limb and contact constraints.

The visual-cue controller wins all current EASY/NORMAL regression matches. This is a reproducible software-controller result, not a measured human win rate or successful difficulty balance. Hard/novice balance and shot choice diversity require continued play testing. Numerical fixtures establish consistency with this integrator, not empirical aerodynamic calibration.

Original athletes share17 weighted joints and9 exported clips. Engine AnimClip events drive the contact window; constrained procedural bone poses supply the final body/arm/foot result. Segment tubes and joint caps connect the limbs visually. It remains stylized procedural art, not AAA/mocap character quality. Camera(1,14,-17), look y2.6, FOV58 keeps high clears in view; portrait uses a wider stable framing.

Physical-device FPS/input latency, Safari, human onboarding and hardware listening remain unverified. Software Chromium/SwiftShader measurements do not substitute for device performance or audible output timing.
