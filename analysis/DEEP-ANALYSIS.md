# Deep analysis — https://thewatch.60fps.fr/

Date: 2026-11-26, extended 2026-11-27. Method: REA MCP browser scenarios
(controlled replay), REA `analyze_web_bundle` and analysis views, REA AgentEnv
coverage preview, live Chrome CDP replays with screenshots, plus inert static
inspection of the site's own captured assets (beautified bundles, GLB and
locale chunks). Nothing in this report comes from executing the site's
JavaScript in a debugger; "static" means parsed as text only, and the two
locale modules were read as inert data in an isolated VM.

## Evidence ledger

| ID | What it is |
| --- | --- |
| `ev_9a623bb32a7bb13ea75c928610dc44c4c5152325ec1468a3a3e6f81101c1d5c6` | REA scenario on the live origin, DOM + accessibility captured after a 12 s settle (summary `ev_949b4ef6…`) |
| `ev_1a93166b4386575d74b199d09674046e15bf608e6f5cac11a5a0272e02e1bab5` | REA scenario on the live origin with network bodies/metadata enabled: 55 transactions (summary `ev_6733d5e2…`) |
| `ev_0d7031d421b089846f63229053ba5e762a708da3aa2af720763f6c06d509e1cd` | REA scenario against the local mirror `http://127.0.0.1:4173/` (summary `ev_aaf05522…`) |
| `ev_f8e10bd4532f2807470a021f6868f6eb151516ce93e3a7a3e9866f26a955182f` | AgentEnv bundle manifest (dry run) derived from the earlier live capture; that record preceded a harness restart and is not in the exported bundle |
| `ev_78e84837b95c2ae8c91fee8b410948fe7485589f306c110b51ccbd5ffc649835` | `analyze_web_bundle` on the live origin, 2026-11-27 re-run (view record `ev_045ed8a2…`): 6 scripts, 6 chunks, 0 routes, 0 endpoints, 30 inferences, 28 low-confidence endpoint candidates, 271,622 AST nodes, 0 parse failures |
| `ev_ff9eafee5c723c5c961a546add388a73135acc83cfb6f3439af5d370ceea2758` | Earlier variant of the same analysis with a larger alias budget; one script hit the per-script deadline, which is why the report uses the later record |
| `ev_214308af032b96f51501834d07806ed39b236f5617dc199fb0216a3af27c47a8` | REA scenario on the live origin: wait → click `g[data-config="third"]` → click `g[data-config="fourth"]`, accessibility captured after every step (summary `ev_883d1272…`) |
| `analysis/rea-evidence.json` | Exported REA bundle; re-exported 2026-11-27 with 19 retained records, 0 tracked unknowns |
| `analysis/bundle-fingerprints.json` | Static token/DOM inventory from `analysis/inspect-bundles.mjs` |
| `site/rendered.html` | Live DOM snapshot captured by the earlier CDP pass (67 KB) |
| `analysis/live-index.html` | Live served document before JS boot (Cloudflare-injected copy) |

## What the site is (observed)

A single-page, scroll-driven 3D product presentation for the "FS 60P" watch by
60fps Atelier. There is no shop, login or application data API in the recorded
traffic: every first-party transaction in both network captures is for static
documents, scripts, stylesheets, fonts, images or binary 3D assets.

### Runtime stack (static inference from shipped strings and DOM)

- **Svelte** component runtime — scoped class names such as `svelte-sljvfy`
  and `svelte-1o0ogvl` in the rendered DOM; `svelte` appears 18 and 12 times
  in the two main chunks.
- **Three.js r162** — the canvas literally reports `data-engine="three.js r162"`
  in `site/rendered.html`; the main chunk contains 154 `THREE` and 40
  `WebGLRenderer` occurrences. `GLTFLoader` (27) and `EXRLoader` (8) occur in
  the 3D worker chunk, matching the fetched `.glb` and `.exr` files.
- **GSAP + ScrollTrigger** — 71 `gsap` and 6 `ScrollTrigger` occurrences in the
  entry chunk; 3 and 2 in the page chunk. Scroll-linked animation, not a
  carousel library, drives the narrative.
- **Lenis** smooth scrolling — 28 `lenis` occurrences in the page chunk and
  `html.lenis.lenis-smooth` on the live document element.
- **Vite-style hashed bundle layout** with module preloading — the document
  loads `/assets/index-Ck-pEZ8v.js` and `/assets/index-DSKOTUpi.css`, and
  preloads `the-watch.D6O26wKS.js`, `hotReplace.BfRBVwiW.js` and
  `index-BDKORhKJ.css`.
- **Inter** is served locally (`/assets/fonts/Inter/Inter-Regular.woff2`).
  Adobe Typekit (`use.typekit.net/qgk0diq.css`, `p.typekit.net/p.css`) and
  Cloudflare are third-party runtime infrastructure observed in network capture.

### First-party resource graph (observed in the network transaction views; re-captured in `ev_1a93166b…`)

| Path | Role |
| --- | --- |
| `/` | document, 200 |
| `/assets/index-Ck-pEZ8v.js` | entry module, 200 |
| `/assets/index-DSKOTUpi.css` | entry stylesheet, 200 |
| `/assets/the-watch.D6O26wKS.js` | page/Svelte chunk (16 `data-section` hits), 200 |
| `/assets/hotReplace.BfRBVwiW.js` | 3D worker chunk (GLTF/EXR loaders), 200 |
| `/assets/hotReplace.BfRBVwiW.js` companion `/assets/index-BDKORhKJ.css` | second stylesheet, 200 |
| `/assets/fr_FR.DKItQTa6.js` | locale chunk, 200 |
| `/assets/fonts/Inter/Inter-Regular.woff2` | font, 200 |
| `/assets/noise-solid-Lw93M9Kl.png` | grain texture, 200 |
| `/assets/envmap-kW4EmG7W.exr` | environment map, 200 (3.9 s) |
| `/assets/metal-B47qzO42.exr` | metal map, 200 (2.1 s) |
| `/assets/watch-DXFPNOEl.glb` | watch model, 200, still downloading when capture ended |
| `/favicon.png` | icon, 200 |

Third-party/telemetry observed: Cloudflare challenge JS (302 → 200), a
challenge `POST` (`xhr`), `POST /cdn-cgi/rum` (204), Cloudflare Insights
beacon, Typekit CSS and Typekit pixel CSS. Two blob: image requests come from
client-side generated images, not the server.

### Structure and content (observed)

The rendered DOM declares 14 sections:

`Intro`, `Timeless`, `VerticalText`, `Disassembly`, `Mechanism`, `Movement`,
`Curves`, `MovementWatchRight`, `Hands`, `Straps`, `Images`, `Colors`, `Parts`,
`Footer`.

Nine `data-webgl` views (`Intro`, `Disassembly`, `Particles`, `Presentation`,
`Straps`, `Images`, `Colors`, `Parts`, `Footer`) mark where the persistent
Three.js canvas takes over from regular DOM content.

Interactive/visible copy includes: the `SWAP` and `HOLD TO EXPLORE` prompts,
`SELECT MODEL`, the `F S 6 0 P` hero, four colour choices (Silver Steel,
Deep black, Pure Gold, Rose Gold), `Model 146gr`, the "timeless automatic
60mm watch" narrative, Chronograph / Automatic Movement / Self-Winding
Movement / Reliability / Classic Edition / Sport Chronograph notes, and a
ten-row parts table with gram weights:

Dial 01 / 11 Gr, Hands 02 / 1 Gr, Crystal 03 / 12 Gr, Bezel 04 / 16 Gr,
Lugs 05 / 18 Gr, Strap 06 / 34 Gr, Buckle 07 / 8 Gr, Crown 08 / 3 Gr,
Caseback 09 / 14 Gr, Movement 10 / 29 Gr.

The DOM references 15 content images: five `images-section/first_*.webp`
files and ten `parts/*.jpg` close-ups. The site ships more image sets
(`second_*`, `third_*`, `fourth_*`) that are used when the scroll state or
selected model changes; they were not all requested during the short capture.

## Clone verification (observed)

REA captured the same accessibility structure from the live origin and from
the local mirror:

- live (12 s settle): 3306 bytes, sha256 `ab2f33fe…387304`
- mirror (5 s settle): 3306 bytes, sha256 `ab2f33fe…387304`

The accessibility trees are **byte-identical**, including every section,
heading, button, swatch and parts row (`F S 6 0 P`, all four colours, all ten
parts and every paragraph). An earlier shorter live capture still contained
the fading loader nodes, which disappeared once the page fully settled — a
timing effect, not a content difference. This supports the claim that `clone/`
reproduces the observed live
presentation, not the earlier hand-written interpretation in the project root.
CDP screenshots at scroll 0, 2500, 6000 and 12000 px (`shots/mirror/`) further
show the original 3D watch hero and the particle-based dark movement scene
rendering from the shipped bundles.

## Bundle graph (static, `ev_78e84837…`)

A re-run of `analyze_web_bundle` on the live origin now parses **all six
captured scripts** (0 parse failures, 271,622 AST nodes) and reports:

| Fact | Value |
| --- | --- |
| scripts / chunks | 6 / 6 |
| routes | 0 |
| endpoints | 0 |
| inferences | 30 |
| endpoint candidates (low confidence) | 28 |
| completeness | `partial` — source-level, byte-limited and conservatively widened |

The 28 endpoint candidates are all false positives, now confirmed against
source: `scroll` and `autoscrollspeed` are `URLSearchParams` reads of the
site's own debug flags, and `noise`, `model`, `envmap`, `metalEnvmap`,
`particlesGradient` are `assetsManager.get()` keys. The asset manifest
(`the-watch.pretty.js:6287`) contains exactly four URL entries plus one inline
`data:` gradient, so there is no application data API, no shop, no auth and no
persistence beyond `localStorage`-style debug config in the studio framework.

The bundle also leaks its original project layout as strings:

- 26 first-party material modules under `../Webgl/Materials/…`
  (`TheWatchMaterial`, `PBR`, `Metal Brushed Ext`, `MetalCircles`, `Ruby`,
  `Glass`, `Numbers`, `ParticlesMaterial`, `ParticlesPlaneMaterial`,
  `ShadowPlanes`, `StickerMaterial`, `PostProcessing/material`, …).
- Three in-house shader injections that patch three.js chunks:
  `#define SIXTY_RADIANCE`, `SIXTY_UNIFORMS_AREA`, `SIXTY_START_AREA`
  (`the-watch.pretty.js:3820–3826`).
- A 16-entry event bus plus two store keys:
  `INIT/ATTACH/DETACH/DESTROY_PROJECT`, `CONFIG_CHANGE`, `SET_CURSOR_ICON`,
  `SET_CLICKED_MESH`, `LEAVE_CLICKED_MESH`, `NEXT_PREVIOUS_CLICKED_MESH`,
  `XPLOD_ALL`, `LONGPRESS_TOGGLE`, `UPDATE_ROTATIONS`, `HOVER_POSITION`,
  `LOADING_PROGRESS`, `OPEN_PROJECT`, `SVELTE_READY_PROJECT`;
  `CURRENT_CONFIG`, `IS_ALL_XPLODED`.

## How the "four models" actually work (static + observed)

There is **one** 9 MB GLB and no second model. `addWatches()`
(`the-watch.pretty.js:3891`) clones `theWatch` four times, once per config ID
`first|second|third|fourth`, renames the four cloneable PBR materials to
`<config><material>` and lays the clones out in a row at
`x = (i − 2) × 1.5 + 0.75`, scale 25 (desktop) or 20, or in a 2×2 grid at
`(±0.6, ±0.9)` on mobile. Each clone gets an invisible box used by a
`Raycaster`, so the "model selection" is a pick-and-scroll carousel over four
material variants of the same mesh.

Selecting a swatch emits `CONFIG_CHANGE` with `duration: 1`
(`the-watch.pretty.js:1087`). Two things then animate in parallel:

1. **CSS layer** — a 1.2 s tween of `--first-color` / `--second-color` on the
   section and the current project root, plus a hard set of the text colour
   and a cross-fade between the config captions.
2. **WebGL layer** — a 1 s tween per material over `color`, `roughness`,
   `metalness`, `envMapIntensity`, `additiveEnvMapIntensity`, `opacity`,
   `normalScale`, `metalnessMapIntensity`, `roughnessMapIntensity`
   (`the-watch.pretty.js:4480–4590`).

Palette table (`ot`, `the-watch.pretty.js:1078`), five colours per config:

| Config | `--first-color` | `--second-color` | text | hover text | accent |
| --- | --- | --- | --- | --- | --- |
| `first` Silver Steel | `#2B282E` | `#B9B6BD` | `#ffffff` | `#B9B6BD` | `#2B282E` |
| `second` Deep black | `#000000` | `#2B2B2B` | `#ffffff` | `#2B2B2B` | `#000000` |
| `third` Pure Gold | `#B3A07C` | `#FFFFE1` | `#ffffff` | `#FFFFE1` | `#B3A07C` |
| `fourth` Rose Gold | `#D7CFC8` | `#B3A99F` | `#333333` | `#B3A99F` | `#D7CFC8` |

The material side comes from an inlined config object with 18 matching keys:
four unprefixed base presets (`metal-glossy-ext`, `metal-brushed-ext`,
`single-metal-glossy`, `single-metal-brushed`) used by `first`, 12 prefixed
variants for the other three, and two empty `first…` duplicates. Example:
gold brushed `#ffebc6`, roughness 0.21, metalness 1, `envMapIntensity` 0.5,
`normalScale` `[0.4, −0.4]`; rose glossy `#fdd8c3`, roughness 0,
metalness 1. `first` inherits the base values, which is why silver is the only
config whose look is defined by absence of overrides.

## Longpress ("HOLD TO EXPLORE")

`the-watch.pretty.js:6194–6225` builds a `longpress` helper with
`activationDelay: 500`, `duration: 2000`, `ease: "power3.inOut"`. The helper
listens for `mousedown`/`touchstart`, starts a 500 ms timer, and only latches
while the pointer has not moved (`maxStartDelta`). On latch:

- `LONGPRESS_TOGGLE(true)` is emitted,
- Lenis is **stopped** (`lenis.stop()`),
- a `longpress` class is added to the app root,
- the intensity feeds `uLongpress` and `longpressZoomMultiplier`, so camera and
  shader zoom together; releasing ramps back and restarts Lenis.

The site also ships two debug URL flags: `?autoscroll` (with
`autoscrollspeed`, a GSAP tween of `autoScrollAdditivePx`, default 20) and
`?debugTime=H:M[:S]`, which overrides the clock time used to place the hands
(guarded by an internal `_i` flag that could not be resolved statically).

## Runtime interaction evidence (CDP replay, 2026-11-27)

Chrome 158 was driven over CDP against the live origin at 1440×900. Four
sweeps were recorded; all artifacts are local PNGs, and every claim below is a
direct read of the live DOM or a screenshot, not an inference.

Scroll narrative — `shots/live-sections/` and `shots/live-sections2/`
(20 frames at 0 … 34 000 px): hero watch with `FS 60P`, exploded movement with
laser sweep, dark particle "automatic movement" scene, case/curve close-ups,
side profile, bracelet flattening, editorial image panels, then the four-watch
colour carousel, the parts table and the footer. Document height reflows with
viewport height (31 335 px at 804 px viewport, 34 586 px at 900 px); most
content sections are ~2 412 px scroll blocks (range 1 609–3 618 px) whose GSAP
timeline is normalised by `tlD = offsetHeight + viewport.height`.

Colour swap — `shots/colors/31-silver.png` … `34-black.png`, measured before
and after each click:

| Click | `--first-color` | `--second-color` | Selected caption | Counter |
| --- | --- | --- | --- | --- |
| (initial) | `#2B282E` | `#B9B6BD` | Silver Steel | 01 / 04 |
| `third` | `#B3A07C` | `#FFFFE1` | Pure Gold | 03 / 04 |
| `fourth` | `#D7CFC8` | `#B3A99F` | Rose Gold | 04 / 04 |
| `second` | `#000000` | `#2B2B2B` | Deep Black | 02 / 04 |

The screenshots confirm the full-scene swap: metal, dial lighting, gradient
backdrop, giant outline word (`SILVER STEEL` → `PURE GOLD` → `ROSE GOLD` →
`DEEP BLACK`) and typography all change, and the black config also flips the
page to a dark theme. REA's own scenario `ev_214308af…` independently recorded
the same two clicks and their post-step accessibility trees.

Longpress — `shots/longpress/01-idle.png`, `02-holding.png`, `03-released.png`:
a synthetic `mousedown` on the app root, held 3.2 s, produced
`html.lenis.lenis-smooth.lenis-stopped` and the watch zoomed from a full-body
view to a dial-filling close-up; `mouseup` restored
`html.lenis.lenis-smooth` and the wide framing. The `longpress` class observed
in source was not present on `<html>` — the callback runs (Lenis stops, zoom
happens), so the class must be applied to another root, or that line is dead.

## Model anatomy (`analysis/glb-deep.txt`)

| Property | Value |
| --- | --- |
| container | glTF 2.0 binary, 9,008,924 B (266,716 B JSON + 8,742,180 B BIN) |
| generator | `Khronos glTF Blender I/O v5.1.20` |
| scene | one, named `baking`; roots `[125, 126, 127]` |
| nodes / meshes / materials / textures / images | 128 / 99 / 23 / 27 / 17 |
| primitives / accessors / bufferViews | 129 / 450 / 467 |
| triangles | 164,938 |
| animations / skins / cameras | 0 / 0 / 0 |
| extensions | `KHR_materials_transmission`, `KHR_materials_ior`, `KHR_texture_transform`, `EXT_texture_webp` |

`theWatch` (node 125) has 14 children including `crystal-front`,
`empty-strap`, `dial-front.002`, `dial-outline`, `hand-hours-shadow`,
`hand-minutes-shadow`, screws and `xploded*` groups. The disassembly groups are
`xploded-10` (backplate/gear train, 12 children), `xploded` (6 children),
`xplodedSide-1a/1b/2` and the strap parts, matching the six copy entries
`tourbillon`, `mainplate`, `dial`, `barrel`, `backplate`, `weight`. Explosion
offsets are also hard-coded in the bundle: `En = {tourbillon: 0.5,
mainplate: 1.7, dial: 0.5}`. Meshes carry three.js userData such as
`rotationTick`, `rotationBackForth`, `rotationStep`, `hover`, `colorValue` —
all motion logic lives in the app, not in glTF animations.

Provenance: the scene `extras` still contain Blender add-on bookkeeping
(`dream_textures_prompt`, `NWBusyDrawing`, `zen_uv`, `ZBBQ_PresetsIncluded`,
`UVPackerProps`, `UnwrellaProps`, `SUBSTANCE_SGI_…`, `measureit_*`). This is
shipped production data from the asset pipeline, not site functionality.

## Content and QA observations (static, from the shipped locale chunks)

The locale modules are plain data (`clone/assets/en_GB.CAgLt01W.js`,
`fr_FR.DKItQTa6.js`); `tools/extract-locale.mjs` re-extracts them as inert data
into `analysis/locale-en.json` / `locale-fr.json` (an earlier extraction had a
mojibake apostrophe; the served strings use `’`).

- 20 top-level keys. **French is untranslated**: every key is byte-identical to
  English except `meta` and `default`.
- `meta.description` is still the template placeholder: "My project
  description" / "Description de mon projet".
- All six disassembly descriptions are the same crown sentence ("The crown of
  a watch…"), including for Tourbillon, Mainplate, Dial, Barrel, Backplate and
  Weight.
- All ten parts rows have `"type": "Mechanism"`.
- Weights are internally consistent: 11+1+12+16+18+34+8+3+14+29 = **146 g**,
  matching `Model 146gr` and `146GR`.
- The copy calls the case **60 mm**, which is implausibly large for a 146 g
  automatic watch and is best read as template filler.
- Navigation copy says `SELECT MODEL` and `SWAP`, but only one model exists;
  both strings serve the config carousel.

## REA AgentEnv coverage (observed, dry run)

`export_environment_bundle` derived **2 tool candidates and 0 served tools**.
The only write candidates were the Cloudflare challenge POST and
`POST /cdn-cgi/rum`, both withheld as `no-state-target`; there were no
application reads to serve because the app exposes no data API. A replayable
AgentEnv bundle therefore adds no useful capability for this target. The
faithful static mirror is the appropriate clone form. The dry run also warned
about `credential-named-members` (a `/siteToken` body member and an
`access-control-allow-credentials` header from the Cloudflare telemetry); the
bundle was not exported, so no credential-like values were written to disk.

## Unknowns and limitations

- **Static analysis completeness is `partial`.** `analyze_web_bundle` parsed all
  six scripts without failures (`ev_78e84837…`), but the provider still reports
  partial completeness: returned-reference projections were conservatively
  widened, some source is byte-limited, and string-built routes/endpoints and
  server-side behaviour remain outside static reach. The zero-endpoint result is
  nevertheless consistent with the manifest: the app only fetches its own
  assets.
- **The alias budget was not the only blocker.** Raising
  `semantic_precision.alias_selections` to 4096 (`ev_ff9eafee…`) still left one
  script at the 30 s per-script deadline; the final run used
  `analysis_timeout_ms: 120000` and `total_analysis_timeout_ms: 600000`.
- **Earlier heavy path still unretained.** `analyze_javascript_application` on
  the three main chunks exceeded REA's retention allowance (~545 MB requested
  delta) and is not citable; the module inventory above comes from
  `analyze_web_bundle` plus strings in the beautified bundle.
- **Interactions partially exercised.** Scroll, colour selection and longpress
  were replayed and screenshotted. Not yet replayed: disassembly part
  hover/click, the image `SWAP` hover, drag-to-rotate, touch gestures, mobile
  breakpoints, keyboard focus order. Claims about those rest on source reads.
- **The `longpress` class and `debugTime` gate are unresolved.** Source adds a
  `longpress` class and gates `?debugTime` behind a module flag `_i`; neither
  was observed resolving at runtime (Lenis stop and zoom were).
- **Third-party scripts are excluded from the mirror.** Cloudflare challenge,
  RUM/Insights and Typekit are runtime infrastructure in the live environment;
  the clone deliberately does not ship them.
- **Time-bounded capture.** The GLB and EXR loads take seconds; a longer capture
  could reveal additional lazy assets. `blob:` images are client-generated and
  their source bytes are not retained.
- **One texture has no static source.** Texture entry 4 in
  `analysis/glb-deep.txt` has `source: undefined` because it is supplied through
  `EXT_texture_webp`; the parser does not resolve extension-level image sources.
- Some saved `*.json` paths in `site/` (`locales/...`, `jsons/configs/...`,
  `packages/.../routes.json`) are actually HTML responses from an earlier
  fetch, not locale/config data. They are unused by the mirror.

## Deliverables

- `clone/` — faithful static mirror + zero-dependency server (`npm run mirror`).
- `clone/README.md` — run/verify notes.
- `analysis/rea-evidence.json` — exported REA evidence bundle.
- `analysis/the-watch.pretty.js`, `index.pretty.js`, `hotReplace.pretty.js` —
  UTF-8 beautified bundles used for the source-level claims.
- `analysis/glb-deep.txt` + `tools/glb-deep.mjs` — full GLB scene/material/
  texture inventory.
- `analysis/locale-en.json`, `locale-fr.json` + `tools/extract-locale.mjs` —
  re-extracted locale copy.
- `tools/cdp.mjs` (`dump`, `eval`, `shots`, `flow`) and `tools/flow-*.json` —
  reproducible live CDP replays (scroll, colour, longpress).
- `shots/live-sections/`, `shots/live-sections2/`, `shots/colors/`,
  `shots/longpress/` — 35 live runtime screenshots plus 4 earlier mirror shots.
- `analysis/bundle-fingerprints.json`, `analysis/inspect-bundles.mjs` —
  reproducible static inventory.
- `analysis/DEEP-ANALYSIS.md` — this report.

The original hand-written Vite interpretation (`index.html`, `src/`,
`package.json` dependencies) was left untouched for reference; it is not the
faithful clone and its `src/main.js` is missing.
