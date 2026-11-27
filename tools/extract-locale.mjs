// Extract locale data modules as inert data (no DOM/network APIs used).
// The chunks are const/string literals plus a final `export{...}` alias map.
import fs from 'node:fs';
import vm from 'node:vm';

function extract(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/export\s*\{([^}]*)\};?\s*$/);
  if (!m) throw new Error('no export map in ' + file);
  const aliases = {};
  for (const part of m[1].split(',')) {
    const mm = part.trim().match(/^(\w+)\s+as\s+(\w+)$/);
    if (!mm) throw new Error('bad alias: ' + part);
    aliases[mm[2]] = mm[1];
  }
  const body = src.slice(0, m.index);
  const ctx = vm.createContext(Object.create(null));
  vm.runInContext(body + '\n;globalThis.__out={' + Object.entries(aliases).map(([name, local]) => `${JSON.stringify(name)}:${local}`).join(',') + '};', ctx, { timeout: 2000 });
  return ctx.__out;
}

const en = extract('clone/assets/en_GB.CAgLt01W.js');
const fr = extract('clone/assets/fr_FR.DKItQTa6.js');
fs.writeFileSync('analysis/locale-en.json', JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync('analysis/locale-fr.json', JSON.stringify(fr, null, 2) + '\n', 'utf8');

const keys = Object.keys(en);
console.log('keys', keys.length, keys.join(','));
const diff = keys.filter((k) => JSON.stringify(en[k]) !== JSON.stringify(fr[k]));
console.log('differing keys:', diff.join(',') || '(none)');
console.log('en meta:', JSON.stringify(en.meta));
console.log('fr meta:', JSON.stringify(fr.meta));
console.log('en timeless.secondText:', JSON.stringify(en.timeless.secondText));
console.log('unique disassembly descriptions:', new Set(en.disassembly.parts.map((p) => p.description)).size, '/', en.disassembly.parts.length);
console.log('part types:', [...new Set(en.parts.map((p) => p.type))].join(','));
console.log('mechanism.secondText:', JSON.stringify(en.mechanism.secondText));
console.log('bracelet.description:', JSON.stringify(en.bracelet.description));
