# Existing intermediate preview check

Commit: `569cfb7fad7cdc33c9f58aece271f0f9cba5fe2d`. The remote feature branch still points to this commit. The authorized GitHub app returned Vercel **success** for this exact commit.

- Existing game URL: https://loop-lab-git-codex-smash-rally-3d-silentstacks-projects.vercel.app/runs/smash-rally-3d/index.html
- Existing deployment: https://vercel.com/silentstacks-projects/loop-lab/GBLbsjyQ3eq1CsmxywoGuUArPBFB

The real remote Chromium entry attempt failed with `net::ERR_TUNNEL_CONNECTION_FAILED` before an application HTTP response. A separate dashboard HEAD request received proxy `CONNECT tunnel failed, response 403` from Envoy. This is an environment transport limitation, not evidence that the game itself is unavailable. No remote menu, start, rally, current asset fingerprint or remote screenshots could be verified. `playable: null` records that uncertainty. Do not present deployment success as a completed remote gameplay check.

No duplicate deployment, main merge, public-default promotion, protection change or WIP push was performed. At the time of this05:38UTC remote check, contact-visibility/aim-feedback source was uncommitted;81 strict unit tests and full root build had passed, and final core browser qualification was paused to prioritize this request. Later source work is isolated on `codex/smash-contact-clarity-20261017`; see `../contact-clarity-20261017/` for its subsequent qualification. That later source must not be claimed as part of the deployed569cfb7commit.

The existing qualified local runtime evidence for this commit remains in `../courtyard-depth-20261017/`: 77 strict unit tests, full build, 14 browser checks, original-control rallies, and physical/rendered contact checks. These do not prove current remote delivery.
