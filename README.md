# FS 60P — The Watch

A **faithful static mirror** of <https://thewatch.60fps.fr/> plus a REA-backed
deep analysis of what the shipped site actually does. This repository documents
the real compiled application; it is not a from-scratch re-implementation.

> The site is a scroll-driven 3D product story for a single automatic watch:
> Svelte + Three.js r162 + GSAP/ScrollTrigger + Lenis, one 9 MB GLB and four
> material configurations. There is no shop, login or data API.

## Quick start

No install or build step is needed for the mirror — it replays the original
bundles that were captured from the live site.

```bash
node clone/server.mjs 4173     # or: npm run mirror
```

Then open **<http://127.0.0.1:4173/>**. A custom port can be passed as the
first argument (`node clone/server.mjs 8080`) or via `PORT`.

The server uses only Node builtins. `node_modules/`, `vite` and the root
`package.json` belong to an older hand-written interpretation kept for
reference; they are **not** required to run the mirror.

## What to try

| Interaction | What happens |
| --- | --- |
| Scroll through the 14 sections | One persistent WebGL canvas changes camera, lighting and watch parts; 9 `data-webgl` views take over from DOM content. |
| Click a colour swatch in **Colors** | Four configs (Silver Steel, Deep black, Pure Gold, Rose Gold) tween CSS palette variables and WebGL material parameters in parallel. |
| Press and hold on the hero for ~0.5 s | Lenis stops, `lenis-stopped` appears on `<html>`, the camera/shader zoom into the dial; release restores the wide view. |
| Append `?autoscroll&autoscrollspeed=30` | Built-in debug auto-scroll. `?debugTime=H:M:S` overrides the hand positions (internally gated). |

Screenshots of all of the above are in `shots/`.

## Repository layout

```
.
├── clone/                  # runnable faithful mirror (the real deliverable)
│   ├── index.html          # live document, Cloudflare injections removed
│   ├── server.mjs          # zero-dependency static server
│   ├── assets/             # original hashed JS/CSS, fonts, GLB, EXR, images
│   └── README.md           # mirror run + verification notes
├── analysis/
│   ├── DEEP-ANALYSIS.md    # full report, evidence ledger and limitations
│   ├── README.md           # index of analysis artifacts and how to regenerate
│   ├── rea-evidence.json   # exported REA evidence bundle (19 records)
│   ├── interactions.json   # measured colour/longpress values + screenshot paths
│   ├── *.pretty.js         # UTF-8 beautified bundles used as source evidence
│   ├── glb-deep.txt        # full GLB scene/material/texture inventory
│   └── locale-*.json       # extracted locale copy
├── shots/                  # live + mirror progression screenshots
├── tools/                  # CDP replay and extraction utilities
├── site/                   # raw staging capture (redundant; clone/ is authoritative)
├── src/ + index.html       # old hand-written interpretation, reference only
└── .gitignore
```

## Analysis at a glance

| Question | Answer | Evidence |
| --- | --- | --- |
| Is there a data API? | No. `analyze_web_bundle` found 0 routes and 0 endpoints; 28 "endpoint" candidates are `URLSearchParams` reads and asset-manager keys. | `ev_78e84837…` |
| Four watch models? | No. One GLB is cloned four times with renamed PBR materials; the carousel picks material variants. | `the-watch.pretty.js:3891` |
| How do colours change? | `CONFIG_CHANGE` → 1.2 s CSS-variable tween + 1 s tween of ~9 material properties. | `ev_214308af…`, `shots/colors/` |
| Does the GLB contain animation? | No. 164,938 triangles, 0 animations/skins/cameras; motion comes from JS and node extras. | `analysis/glb-deep.txt` |
| Is the French locale translated? | No. All keys are English except `meta`/`default`; `meta.description` is still a template placeholder. | `analysis/locale-fr.json` |
| Is the clone faithful? | REA accessibility trees from live and mirror are byte-identical (SHA-256 `ab2f33fe…`), and the live origin still serves the same hashes. | `clone/README.md` |

Full reasoning, observations vs inferences vs unknowns, and evidence IDs are in
[`analysis/DEEP-ANALYSIS.md`](analysis/DEEP-ANALYSIS.md).

## Documentation

- [`clone/README.md`](clone/README.md) — mirror contents, verification, interactive behaviour, check commands.
- [`analysis/README.md`](analysis/README.md) — every analysis artifact, evidence ledger and regeneration commands.
- [`analysis/DEEP-ANALYSIS.md`](analysis/DEEP-ANALYSIS.md) — the deep report (bundle graph, config system, longpress, GLB anatomy, content QA, limitations).
- [`analysis/interactions.json`](analysis/interactions.json) — machine-readable interaction measurements.

## Reproducing checks

To replay browser steps you need a Chrome with a loopback CDP endpoint, e.g.:

```bash
chrome --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/rea-chrome-watch https://thewatch.60fps.fr/
```

Then, from the project root:

```bash
node tools/cdp.mjs shots  --url http://127.0.0.1:4173/ --points 0,6000,12000
node tools/cdp.mjs flow   --script tools/flow-colors4.json --url http://127.0.0.1:4173/
node tools/extract-locale.mjs                  # refresh locale JSON from shipped chunks
node tools/glb-deep.mjs                        # refresh GLB inventory
node analysis/inspect-bundles.mjs              # static bundle/DOM fingerprints
```

## Known limitations

- Cloudflare challenge/RUM and Adobe Typekit are live-environment
  infrastructure and are deliberately excluded from the mirror.
- No source maps exist; the original Svelte sources were not recovered. The
  bundle leaks some original paths (`../Webgl/Materials/...`) and Blender
  add-on metadata, which are used as provenance evidence.
- REA's static analysis remains `partial` (byte limits, widened references);
  it does not execute captured JavaScript. Part hover, drag-to-rotate, touch
  and mobile breakpoints were not replayed — see the report's unknowns.
- The raw `site/` capture and the old Vite skeleton are retained only as
  reference and may be removed later without affecting the mirror.
