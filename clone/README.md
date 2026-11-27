# Faithful mirror of https://thewatch.60fps.fr/

This directory is a byte-faithful static mirror of the shipped site, captured
with REA browser scenarios and the site's own served assets. It is **not** the
earlier hand-written re-implementation in the project root.

## Run

```bash
npm run mirror            # from the project root, serves at http://127.0.0.1:4173/
# or
node clone/server.mjs 4173
```

`server.mjs` uses only Node builtins and sends correct MIME types for
`.js`, `.css`, `.woff2`, `.webp`, `.exr` and `.glb`.

## What is inside

- `index.html` — the live document with the Cloudflare challenge/telemetry
  injection removed. It keeps the original loader, module entry
  (`/assets/index-Ck-pEZ8v.js`) and stylesheet (`/assets/index-DSKOTUpi.css`).
- `assets/` — the live hashed bundles, CSS chunks, fonts, EXR environment
  maps, GLB watch model, noise texture and all WebP/JPEG images.
- `favicon.png`, `share-image.webp` — original site images.

## Verification

A REA `capture_browser_scenario` against the live origin
(`ev_9a623bb3…`, 12 s settling) and one against the mirror
(`ev_0d7031d4…`, 5 s settling) produced **byte-identical** accessibility
trees: 3306 bytes each, SHA-256 `ab2f33fe628d779c67edde460c0979595b3233e4ea19f7d879da696d43887304`.
Every section, heading, control and part entry matched. CDP screenshots at scroll
0, 2500, 6000 and 12000 px are in `../shots/mirror/` and show the original
3D watch hero and the dark particle "highly precise automatic movement"
scene rendering with the shipped bundles. See `../analysis/DEEP-ANALYSIS.md`.

The mirror ships the same hashed entry bundles the live origin still serves
(`index-Ck-pEZ8v.js`, `index-DSKOTUpi.css`). A later live capture differs from
`clone/index.html` only in the removed Cloudflare scripts, absolute vs relative
`og:`/`twitter:` image URLs and whitespace.

## Interactive behaviour in the mirror

The compiled app is replayed unchanged, so all interactions work offline:

- **Scroll narrative** — 14 sections / 9 WebGL views, ~34.6 k px at 1440×900.
- **Colour carousel** — four swatches swap one GLB's cloned materials plus the
  CSS palette. Verified in `../shots/colors/`: silver `#2B282E`, gold
  `#B3A07C`, rose `#D7CFC8`, black `#000000` as `--first-color`, with matching
  counters 01–04.
- **Longpress** — press and hold for 500 ms; Lenis stops, `lenis-stopped`
  appears on `<html>` and the watch zooms. Verified in `../shots/longpress/`.
- **Debug flags** — `?autoscroll&autoscrollspeed=N` and `?debugTime=H:M:S`
  are shipped in the bundle and work in the mirror too.

`../analysis/interactions.json` records the measured values and artifact paths.

## Re-running the checks

```bash
node ../tools/cdp.mjs shots --url http://127.0.0.1:4173/ --points 0,6000,12000
node ../tools/cdp.mjs flow  --script ../tools/flow-colors4.json --url http://127.0.0.1:4173/
node ../analysis/inspect-bundles.mjs
```

Requires a Chrome instance started with `--remote-debugging-port=9222`.

## Notes / limitations

- Third-party runtime requests observed on the live site (Cloudflare
  challenge + RUM + Insights, Adobe Typekit CSS/fonts) are intentionally not
  reproduced. They are infrastructure/telemetry, not site content.
- The mirror replays the original compiled application. No source of the
  original Svelte project is claimed or reconstructed here.
