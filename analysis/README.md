# Analysis artifacts

Index of everything in `analysis/`, what it proves, and how to regenerate it.
The narrative report is [`DEEP-ANALYSIS.md`](DEEP-ANALYSIS.md); this file is the
inventory. All files are UTF-8. Nothing here comes from executing the site's
JavaScript in a debugger.

## Start here

| File | Purpose |
| --- | --- |
| `DEEP-ANALYSIS.md` | Full report: stack, bundle graph, config system, longpress, GLB anatomy, content QA, clone verification, unknowns. |
| `interactions.json` | Machine-readable measurements for colour swaps and longpress, with screenshot paths. |
| `rea-evidence.json` | Exported REA bundle: 19 retained records, 0 tracked unknowns. |
| `bundle-fingerprints.json` | Static token/DOM inventory produced by `inspect-bundles.mjs`. |

## Source-level evidence

| File | What it is |
| --- | --- |
| `the-watch.pretty.js` (296 KB) | Beautified page/Svelte chunk. Section classes, event bus, asset manifest, config palettes, clone logic, longpress, scroll timelines. |
| `index.pretty.js` (1.0 MB) | Beautified entry chunk: three.js, GSAP/ScrollTrigger, Lenis, Vite runtime. |
| `hotReplace.pretty.js` (158 KB) | Beautified 3D worker chunk: GLTF/EXR loaders, shader chunks, post-processing. |
| `locale-en.json`, `locale-fr.json` | Locale copy re-extracted from the shipped `en_GB.*.js` / `fr_FR.*.js` data modules. |
| `glb-deep.txt` (25 KB) | GLB inventory: 128 nodes, 99 meshes, 23 materials, 27 textures, 164,938 triangles, 0 animations. |
| `live-index.html`, `live-index-now.html` | Document served by the live origin at the initial and re-verification captures. |
| `live-hero.png` | Early hero screenshot from the live origin. |
| `bundle-fingerprints.json` | Reproducible counts of framework strings, DOM hooks and asset paths. |

Working dumps that are **gitignored** and not cited by the report:
`rea-session.json` (raw REA session state), `js-analysis.json` (output of the
heavy static-analysis path that exceeded REA's retention allowance).

## REA evidence ledger (short form)

| Evidence ID | Observation |
| --- | --- |
| `ev_9a623bb3…` | Live-origin scenario: DOM + accessibility after 12 s settle. |
| `ev_1a93166b…` | Live-origin scenario with network metadata: 55 transactions. |
| `ev_0d7031d4…` | Mirror scenario; accessibility tree byte-identical to the live one. |
| `ev_250bf9cf…` | Earlier `analyze_web_bundle` (6 scripts, 30 inferences). |
| `ev_78e84837…` | Final `analyze_web_bundle`: 6/6 scripts parsed, 0 endpoints, 0 routes, 30 inferences, 28 low-confidence candidates, completeness `partial`. |
| `ev_214308af…` | Scenario clicking Gold then Rose; accessibility captured after each step (summary `ev_883d1272…`). |
| `ev_045ed8a2…` | View record of the final bundle analysis. |
| `ev_28d131a0…` | `analyze_javascript_application` — **unretained**; not citable. |

The exported bundle contains 19 records in total. All are described in the
report's ledger.

## Runtime screenshots (`../shots/`)

| Directory | Frames | What it shows |
| --- | --- | --- |
| `live-sections/` | 15 | Whole scroll narrative at 1440×900, 0–31,200 px. |
| `live-sections2/` | 5 | Tail of the narrative, 27,500–34,000 px. |
| `colors/` | 4 cited | Silver → Gold → Rose → Deep Black, same camera and scroll position. |
| `longpress/` | 3 | Idle → holding (zoomed, `lenis-stopped`) → released. |
| `mirror/` | 4 | Earlier local-mirror progression check. |

Probe frames from the first colour experiments were removed during cleanup; the
four cited frames are the measurements in `interactions.json`.

## Regeneration

Run from the project root. Browser steps assume Chrome is listening on CDP
port 9222 (see the root README).

```bash
node analysis/inspect-bundles.mjs          # bundle-fingerprints.json
node tools/glb-deep.mjs                    # glb-deep.txt (reads clone/assets/watch-DXFPNOEl.glb)
node tools/extract-locale.mjs              # locale-en.json + locale-fr.json
node tools/cdp.mjs eval    --expr 'document.title'
node tools/cdp.mjs shots  --url http://127.0.0.1:4173/ --points 0,6000,12000
node tools/cdp.mjs flow   --script tools/flow-colors4.json --url http://127.0.0.1:4173/
node tools/cdp.mjs flow   --script tools/flow-longpress.json --url http://127.0.0.1:4173/
```

To refresh the exported REA evidence, call `export_evidence_bundle` with
`path` set to `analysis/rea-evidence.json` and `overwrite: true`.

## Interpretation rules used in the report

- **Observed** — read from REA evidence, the served DOM, screenshots or raw
  asset bytes.
- **Inferred** — derived from static control flow in the beautified bundles;
  the source line is given where possible.
- **Unknown** — not exercised or not resolvable statically (part hover, drag,
  touch, mobile breakpoints, the `_i` flag, extension-level WebP texture
  source). An unresolved lookup is not proof of absence.
