# Balancing and known limits
All values are provisional. `src/physics.ts` exposes 120Hz, drag 0.065, 5.8m/s movement, 24m/s² acceleration, 0.68m racket reach, 120ms normal swing lead and 350ms buffer. Same integrator drives flight, interception and launch inversion. Solver varies vertical launch and binary-searches horizontal launch speed; impossible steep attacks downgrade to drive, preserving aim.

Contact opportunity is chosen while the shuttle descends through 2.7–1.05m and travel plus acceleration allowance fits available time. Actual contact rechecks distance and height. Animation lead compresses only for accepted late commands; miss and reach checks remain independent. Body motion uses nine original GLB clips; feet and racket use fixed-clock poses. Clear reception permits overhead contact; lower attacking flights use a 1.85m defensive contact band so drive returns remain distinct. WEAK returns keep horizontal aim but land short (at most 4.1m depth), creating a physically exposed high ball.

EASY/NORMAL/HARD reaction delays: 0.50/0.30/0.18 seconds. Shared actor speed/acceleration; differing timing error ceilings 0.24/0.19/0.09 sec expose physically weak returns and super-smash opportunities. Deterministic variation allows reproducible tests. AI attacks the opposite horizontal space and alternates back/front tactics according to player position. Perception includes delayed movement and bounded target error; intercept prediction still uses authoritative trajectory and is a limitation relative to fully noisy perception.

No claims of AAA completion or measured physical-device performance. Procedural art is original and functional, not production character animation quality. Body/arm blending, crowd art and shadow realism still warrant human play review.

Camera correction after screenshot review: raised sports camera to (1,14,-17), look target y=2.6, vertical FOV58°. Previous camera clipped high clears near the top edge; stable wider framing keeps the flight readable without in-rally zoom or cuts.

NORMAL now begins with safe clears for the first three rally returns before applying attacking choices. Earlier normal-opening smashes ended too many serves before learners could exchange shots. AI recovery biases toward three repeatedly attacked horizontal targets while preserving identical speed/acceleration and leaving the opposite space open.
