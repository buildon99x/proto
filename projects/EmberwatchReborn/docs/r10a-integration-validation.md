# R10a integrated candidate validation

2026-10-10 UTC. App version0.10.0-reimplementation.1 / labelR10a. This is the new reimplementation, not recovery of the lost Reborn source. Public root remainsR7a4; the intended separate public candidate is /qa-r10/.

- Full final app suite: **1237/1237 passed**, zero failures/cancelled/skipped/todo,148.392seconds with test concurrency1. Existing938 R9a3 checks retained; 299 additional checks cover T/economy/world/UI/visual integration.
- Source and test syntax: passed. Static app build:71 hashed files,16229499bytes before the build manifest. All180 local built JS import references resolve.
- Original0.4.7: all167 Gitblob and SHA256 entries match. Reference catalog53 IDs are still just a checked inventory, not proof that53 skills run.
- git diff --check passed. Monorepo pnpm sync:registry and build:vercel remain blocked by ENOENT creating /home/agent/.local/share/pnpm; corresponding raw logs are retained. The isolated static build uses no launcher or Vercel pipeline.

## Evidence limits

The tests execute production reducers/controllers/store, battle steps, main UI handlers or renderer geometry with scripted inputs and substituted browser boundaries. Scripted route positions/kills are not human-like gameplay. Two explicitly named UI-economic fixtures synthesize only gold/spent values to hit120/0 limits; they are not organically earned spending routes. The full T report routes themselves earn XP/level/tools through production commands. Hard's L14→L15 report is automatic-fixture evidence, not a played Hard route.

No Tomb browser/screen/ordinary-input acceptance has happened at this checkpoint. Expert promotion/15-node effects, Master13-node effects, late itemization, real repeat expeditions and whole-campaign review remain open. See docs/r10-normal-input-qa-plan.md and docs/requirements/warrior-gap-update-r10.md. The successful R9 cover/channel/fire screen evidence remains separately archived and cannot pass T.
