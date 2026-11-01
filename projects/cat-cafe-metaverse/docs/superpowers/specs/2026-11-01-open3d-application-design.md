# Applying open-3d-skills without replacing the café

Source: Moh4696/open-3d-skills at 7b04ab491d5bcbd920cbffbf06ebae3f9429d8e3; read threejs-scene/SKILL.md, references/performance.md and site-check/SKILL.md from the verified static audit. External repository installers/scripts are not executed.

## Intent and approach
Preserve existing cozy space, quiet authoritative cats, PC/touch controls and free beta. Apply the documented recommendations to batch static shared-material geometry, respect reduced motion and distinguish successful rendering from mere animation callbacks. Do not import the starter, change Three version, add AO/bloom/high-resolution shadows or modify hosting.

## Changes
1. Batch only static café geometry by identical material and shadow flags. Preserve world-space positions, normals, UVs, triangles and bounds. Cats/players/toys remain independently animated. Record object-graph counts and memory tradeoffs, not claimed GPU draw calls/FPS.
2. Honor prefers-reduced-motion for cosmetic cat oscillation and player bob/limbs while keeping server positions, camera control and recognizable user-action feedback. Preference changes must take effect without recreating the world.
3. Expose only safe aggregate successful-render diagnostics on the canvas; no sockets, tokens or raw state. Do not count RAF callbacks as rendered FPS when WebGL failed or context was lost.

## Alternatives
Full starter/post-processing replacement conflicts with the user's existing-space preference and performance constraints. Removing tiny-object shadows may help but is deferred without real visual approval. No new quality-control UI or network protocol is needed.

## Verification
Actual Three object graphs under a stub renderer, deterministic policy tests and production-main interruption tests. Existing supported browser can verify recovery/UI only; real GPU frame time, Safari/phone rendering and visual equivalence remain unverified. No local usage-limit bypass, browser security flags, provider load or quota reset.
