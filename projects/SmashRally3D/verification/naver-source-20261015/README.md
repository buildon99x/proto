# Reference article access — blocked before source analysis

Requested source: [mobile public article](https://m.blog.naver.com/puccaya81/223284014631), with the normal [desktop public article](https://blog.naver.com/puccaya81/223284014631) also checked.

Fetched origin/codex/smash-rally-3d and confirmed it matches local08b423b3166bc2c8e6a001dea0314992bf3e607c. Root/project AGENTS and project CLAUDE instructions were read. The worktree was clean before this investigation. The installed Chromium browser and the existing approved proto checkout were available.

## Direct observations

- Both ordinary Chromium navigations failed with `net::ERR_TUNNEL_CONNECTION_FAILED`, ending on `chrome-error://chromewebdata/`. [Mobile error screenshot](mobile.png), [desktop error screenshot](desktop.png), and the JSON snapshots are preserved here.
- A normal curl request to the requested mobile URL confirmed `CONNECT tunnel failed, response 403`, with an envoy `403 Forbidden` response during HTTPS tunnel establishment. See mobile-http.txt. This does not establish that the Naver article itself is private, deleted, or authentication protected: no Naver origin page was reached.
- The web tool separately reported the mobile URL as a non-retryable open error and the desktop URL as inaccessible through that tool.
- No article text, embedded images, frame URLs, or movement examples were retrieved. The inspected pixels belong to the browser's connection error screen, **not** to the article. The article's subject, game rules, mechanics, image content and motion cannot be inferred from its URL.

No proxy configuration changes, alternate identity, authentication attempt, cached-content bypass, stealth or access-restriction workaround was used.

## Implementation boundary

The requested source-first comparison is blocked. No reference-derived improvement claims or gameplay changes were made. Existing simple controls, close camera, smash impact response, shared physics and fair AI remain intact. Since runtime source is unchanged, gameplay/build tests were not rerun merely to repeat the prior qualification. The existing smash-feel-20261015/qualification.json is prior evidence only.

Only this access investigation is committed. There is no new implementation video or before/after gameplay comparison to present as a result of reading this article. No cb-ll source edit, main merge, public-default promotion or manual deployment occurred.

## Source material needed to resume

Provide the full article body as pasted text, HTML export or PDF, together with its readable images/screenshots in order and their captions. If the article demonstrates movement using GIFs or video, include those original clips; a still screenshot cannot establish swing or rally timing.

With those materials, the next step is to inspect the actual image pixels and motion, map each observed mechanism to the current game, and document the source-grounded differences before selecting and implementing a core-rally improvement. Then repeat browser rally, mobile input, shot-selection, attack/defence transition and AI balance validation, and deliver actual video/screenshots.
