# Actual deployed WebSocket failure — 2026-11-01

- Source: 93ab2ea44cfc48fc6fe8ccd3121f026e117c99ee
- Preview deployment: dpl_GtgPZhAkYPXJuD8DZoCmDgwRW7gJ
- URL: https://loop-fozbrs0x1-silentstacks-projects.vercel.app/runs/cat-cafe-metaverse/index.html
- Status API returned HTTP 200, available:true, betaCapacity:6. This did not prove a usable WebSocket.
- Actual cloud Chrome UI join produced reconnect notice, not a welcome. Operator clicked leave to stop retries.
- Runtime log at 2026-11-01T04:25:24.858Z: TypeError: b.unmask is not a function, .next/server/chunks/14.js:1:30209, ws receive/getData path. No secret/token data logged.
- Region evidence inconsistent: source preferredRegion hnd1; deployment metadata regions icn1; status response x-vercel-id indicates icn1; WS runtime log labels sfo1. Executed WS region must be resolved, not inferred from source.
- Live environment flag changed to 0; safe inactive redeployment dpl_Gwuxn6CZGmnxoyWPUHJan8Bgn8Bx started. Environment changes alone do not alter the old immutable deployment.
- Actual two-client harness held; no capacity/cadence success claim. WebGL unavailable in this cloud browser, so no new 3D visual or listening evidence.
