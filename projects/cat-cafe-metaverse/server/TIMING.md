# Bounded deployed snapshot timing diagnostic

**Do not run automatically.** Use only after explicit authorization for the exact ready candidate. This tool does not deploy or inspect provider/Redis accounts.

`node server/timing-diagnostic.mjs 'wss://explicit-approved-host/ws' 'https://approved-site-origin' sunroom`

One connection maximum, no reconnect/retry, at most15seconds including cleanup. It joins one named room, sends a fixed+X movement intent for at most2seconds, sends stop, then leaves and closes in finally. It uses the existing ws dependency and production packed/delta decoder. It does not print endpoint URLs, tokens, IDs, visitor names or raw packets. In-memory observations are capped at512 position/time records and output consists only of aggregate intervals/speeds and synthetic replay summaries. Failed joins are reported as protocol_rejected, not retried.

Metrics distinguish wall-clock state arrival intervals from authoritative server timestamp gaps. The same MotionTrack and first-receipt clock mapping as the renderer are replayed at30/60/120FPS. Replay velocity deviation is over the first2.4seconds and includes movement start/stop; held-frame count includes intentional idle time after the two-second movement. These are not browser frame-rate or subjective jitter measurements. Socket closure and elapsed duration are reported explicitly. The tool has not been run against a live endpoint during implementation; tests decode synthetic packed and delta packets offline.
