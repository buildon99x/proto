# Vendored upstream
- Repository: https://github.com/educlopez/diorama
- Revision: 21363b694a5c87f461ed5f86ede21ee158cdc000
- Source subtree: skills/diorama-worlds
- Destination: projects/diorama-gallery/.agents/skills/diorama-worlds
- License: MIT; original LICENSE reproduced as diorama-MIT.txt. Upstream THIRD_PARTY_NOTICES.txt retained.
- Local source modification: scripts/browser.mjs explicitly sets chromiumSandbox: true and excludes Playwright's --enable-unsafe-swiftshader default. This safety-only local patch prevents upstream launch defaults weakening restrictions. Additional local rendering patch in kit/world.js: optional per-world camera/background/light/shadow/MSAA/focus profile, with adaptive mobile shadow/sample budgets. Existing world definitions retain default profile; harbor opts in. Rendering appearance still requires GPU review.
- Dependencies are the upstream package-lock exact pins: three 0.186.1, esbuild 0.28.2, playwright 1.64.1, pngjs 7.0.0. Installed with npm ci --ignore-scripts. No global dependencies.
- Singapore-only performance opt-in in kit/world.js: staticScene batching separates immutable architecture from explicitly listed dynamic roots and uploads static instance matrices once. Legacy worlds retain dynamic behavior. CPU regression covers immutable upload count; actual frame performance remains a browser measurement.
