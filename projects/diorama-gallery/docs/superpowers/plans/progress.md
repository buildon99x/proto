# SDD ledger — plan: docs/superpowers/plans/2026-11-02-harbor.md
Parent reviewed spec/plan and approved implementation on 2026-11-02.
Pre-flight: gallery and scene share defineWorld/mountWorld runtime contract.
Ruling: use upstream mountWorld directly instead of new mountHarbor wrapper — preserves tested lifetime, clock, finish support and faithful skill use; cost: fixed upstream camera/shadow settings.
Ruling: actual paused canvas thumbnail rather than pre-captured image — guarantees reference is not substituted and remains actual render; cost: preview requires WebGL, fallback is text.
Task 1: session lifecycle test RED (missing implementation) → GREEN 3/3. Gallery, offline bundler and scoped metadata written.
Tooling: npm ci --ignore-scripts passed with /tmp cache; original home cache absent. Corepack cache likewise /tmp.
Browser launch: ordinary sandbox-enabled existing Chromium blocked by OS local socket restriction. Standard exec escalation failed infrastructure bwrap setup; no browser started, no bypass retry. Parent will inspect supported existing CUA browser.
Task 2: authored boxed harbor and pinned vendor complete. Geometry/contact tests pass; GPU review blocked locally.
Final review fixes: clean CI setup added; gallery renders registered cards and captures/releases each thumbnail sequentially; capture lifetime regression RED→GREEN; truck separated and wake regression handled by scene implementer; browser probe moved after live launch.
Ruling: preserve unrelated registry entries' original updatedAt values after sync — avoids unrelated project metadata churn; cost: pre-existing stale times remain until their own sync.
Ruling: use node --import tsx for equivalent aggregate steps after CLI IPC EPERM — does not weaken security; cost: exact aggregate command remains environment-blocked.
