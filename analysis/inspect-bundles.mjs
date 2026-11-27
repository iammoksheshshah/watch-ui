// Static inventory of the captured live bundles and rendered DOM.
// Run: node analysis/inspect-bundles.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('site');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const jsFiles = [
  'assets/index-Ck-pEZ8v.js',
  'assets/the-watch.D6O26wKS.js',
  'assets/hotReplace.BfRBVwiW.js',
  'assets/fr_FR.DKItQTa6.js'
];
const tokens = [
  'THREE', 'WebGLRenderer', 'GLTFLoader', 'EXRLoader', 'RGBELoader', 'three.js',
  'gsap', 'ScrollTrigger', 'lenis', 'Svelte', 'svelte', 'WebMCP',
  'data-section', 'locales', 'jsons/configs', 'hotReplace', 'Inter', 'typekit'
];

const fingerprints = {};
for (const f of jsFiles) {
  const s = read(f);
  fingerprints[f] = {
    bytes: Buffer.byteLength(s),
    hits: Object.fromEntries(tokens.map((t) => [t, s.split(t).length - 1]))
  };
}

const dom = read('rendered.html');
const sections = [...dom.matchAll(/data-section="([^"]+)"/g)].map((m) => m[1]);
const dataViews = [...dom.matchAll(/data-webgl="([^"]+)"/g)].map((m) => m[1]);
const images = [...new Set([...dom.matchAll(/(?:src|srcset)="([^"]+\.(?:webp|png|jpg))"/g)].map((m) => m[1]))];
const captions = [...dom.matchAll(/class="fps-caption[^"]*">([^<]+)</g)].map((m) => m[1]);
const titles = [...dom.matchAll(/class="fps-movement-title[^"]*">([^<]+)</g)].map((m) => m[1]);
const bodyTexts = [...dom.matchAll(/class="fps-informations-content[^"]*">([^<]+)</g)].map((m) => m[1]);
const listItems = [...dom.matchAll(/<li>[\s\S]*?<p[^>]*>([^<]*)<\/p>[\s\S]*?<p[^>]*>(\d\d)<\/p>[\s\S]*?<p[^>]*>([^<]*)<\/p>[\s\S]*?<p[^>]*>([^<]*)<\/p>[\s\S]*?<\/li>/g)]
  .map((m) => ({ part: m[1].trim(), index: m[2], type: m[3], weight: m[4] }));

console.log(JSON.stringify({ fingerprints, sections, dataViews, imageCount: images.length, images, captions, titles, bodyTexts, listItems }, null, 2));
