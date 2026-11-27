// Concise deep inventory of a GLB: scene graph, mesh/material topology, embedded
// textures, animations, skins and Blender-style metadata keys (keys only).
import fs from 'node:fs';

const file = process.argv[2];
const buf = fs.readFileSync(file);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
const version = buf.readUInt32LE(4);
const total = buf.readUInt32LE(8);
let off = 12;
let json = null;
const chunks = [];
while (off < total) {
  const len = buf.readUInt32LE(off);
  const type = buf.readUInt32LE(off + 4);
  chunks.push({ type: type === 0x4e4f534a ? 'JSON' : type === 0x004e4942 ? 'BIN' : type.toString(16), len });
  if (type === 0x4e4f534a) json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8'));
  off += 8 + len;
}
const g = json;
const keysOnly = (o) => (o && typeof o === 'object') ? Object.keys(o) : o;

console.log('FILE', file);
console.log('GLB', JSON.stringify({ version, bytes: total, chunks }));
console.log('ASSET', JSON.stringify({ generator: g.asset?.generator, version: g.asset?.version, copyright: g.asset?.copyright, extrasKeys: keysOnly(g.asset?.extras) }));
console.log('COUNTS', JSON.stringify({
  scenes: g.scenes?.length ?? 0, nodes: g.nodes?.length ?? 0, meshes: g.meshes?.length ?? 0,
  materials: g.materials?.length ?? 0, textures: g.textures?.length ?? 0, images: g.images?.length ?? 0,
  samplers: g.samplers?.length ?? 0, animations: g.animations?.length ?? 0, skins: g.skins?.length ?? 0,
  cameras: g.cameras?.length ?? 0, accessors: g.accessors?.length ?? 0, bufferViews: g.bufferViews?.length ?? 0,
  buffers: g.buffers?.length ?? 0, extensionsUsed: g.extensionsUsed ?? [], extensionsRequired: g.extensionsRequired ?? [],
}));

const scene = g.scenes?.[g.scene ?? 0];
console.log('SCENE', JSON.stringify({ name: scene?.name, rootNodes: scene?.nodes, extrasKeys: keysOnly(scene?.extras) }));

const top = new Set(scene?.nodes ?? []);
const depthOf = (i, d = 0) => {
  const n = g.nodes[i];
  if (!n) return d;
  const kids = n.children ?? [];
  if (!kids.length) return d;
  return Math.max(...kids.map((c) => depthOf(c, d + 1)));
};

console.log('\nNODE TREE');
const walk = (i, depth) => {
  const n = g.nodes[i];
  if (!n) return;
  const extras = keysOnly(n.extras);
  console.log(`${'  '.repeat(depth)}${i} ${n.name ?? '(unnamed)'}${n.mesh != null ? ` mesh=${n.mesh}(${g.meshes[n.mesh]?.name ?? ''})` : ''}${n.skin != null ? ` skin=${n.skin}` : ''}${n.children?.length ? ` children=${n.children.length}` : ''}${extras ? ` extrasKeys=${JSON.stringify(extras)}` : ''}`);
  for (const c of n.children ?? []) walk(c, depth + 1);
};
for (const r of scene?.nodes ?? []) walk(r, 0);
console.log('MAX_DEPTH', Math.max(0, ...(scene?.nodes ?? []).map((i) => depthOf(i))));

console.log('\nMESHES');
for (const [i, m] of (g.meshes ?? []).entries()) {
  let tris = 0, verts = 0;
  const mats = new Set();
  for (const p of m.primitives ?? []) {
    if (p.material != null) mats.add(p.material);
    if (p.indices != null) tris += (g.accessors[p.indices]?.count ?? 0) / 3;
    const pos = p.attributes?.POSITION;
    if (pos != null) verts += g.accessors[pos]?.count ?? 0;
  }
  console.log(`${i} ${m.name ?? '(unnamed)'} prims=${m.primitives?.length ?? 0} mats=[${[...mats].join(',')}] tris=${Math.round(tris)} verts=${verts} extrasKeys=${JSON.stringify(keysOnly(m.extras))}`);
}
console.log('TOTAL_TRIS', Math.round((g.meshes ?? []).reduce((sum, m) => sum + (m.primitives ?? []).reduce((s, p) => s + (p.indices != null ? (g.accessors[p.indices]?.count ?? 0) / 3 : 0), 0), 0)));

console.log('\nMATERIALS');
for (const [i, m] of (g.materials ?? []).entries()) {
  const pbr = m.pbrMetallicRoughness ?? {};
  const tex = {};
  if (pbr.baseColorTexture) tex.base = pbr.baseColorTexture.index;
  if (pbr.metallicRoughnessTexture) tex.mr = pbr.metallicRoughnessTexture.index;
  if (m.normalTexture) tex.normal = m.normalTexture.index;
  if (m.occlusionTexture) tex.ao = m.occlusionTexture.index;
  if (m.emissiveTexture) tex.emissive = m.emissiveTexture.index;
  console.log(`${i} ${m.name ?? '(unnamed)'} baseColor=${JSON.stringify(pbr.baseColorFactor)} metallic=${pbr.metallicFactor} roughness=${pbr.roughnessFactor} alpha=${m.alphaMode ?? 'OPAQUE'}${m.alphaCutoff != null ? ` cutoff=${m.alphaCutoff}` : ''} doubleSided=${!!m.doubleSided} emissive=${JSON.stringify(m.emissiveFactor)} tex=${JSON.stringify(tex)} ext=${JSON.stringify(Object.keys(m.extensions ?? {}))}`);
}

console.log('\nTEXTURES');
for (const [i, t] of (g.textures ?? []).entries()) {
  const img = g.images?.[t.source];
  const bv = img?.bufferView != null ? g.bufferViews[img.bufferView] : null;
  console.log(`${i} source=${t.source} mime=${img?.mimeType} uri=${img?.uri ? img.uri.slice(0, 60) : null} bytes=${bv?.byteLength ?? '?'} sampler=${t.sampler}`);
}

console.log('\nANIMATIONS');
for (const [i, a] of (g.animations ?? []).entries()) {
  let maxT = 0;
  const targets = new Set();
  for (const ch of a.channels ?? []) {
    targets.add(`${ch.target?.node}:${ch.target?.path}`);
    const acc = g.accessors?.[a.samplers?.[ch.sampler]?.input];
    if (acc?.max?.[0] != null) maxT = Math.max(maxT, acc.max[0]);
  }
  console.log(`${i} ${a.name ?? '(unnamed)'} channels=${a.channels?.length ?? 0} duration=${maxT.toFixed(3)}s targets=${targets.size}`);
}

console.log('\nSKINS', JSON.stringify((g.skins ?? []).map((s) => ({ name: s.name, joints: s.joints?.length }))));
console.log('VARIANTS', JSON.stringify(Object.keys(g.extensions ?? {})));
