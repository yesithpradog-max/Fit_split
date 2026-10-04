/* =====================================================================
   FIT SPLIT · tools/anatomy-extract.mjs
   ---------------------------------------------------------------------
   Paso 1 del modelo anatómico (se ejecuta una sola vez, en Node):
   - Lee los GLB de BodyParts3D (paquete @somakine/bodyparts3d-musculoskeletal,
     CC BY 4.0) y aplica las transformaciones de cada nodo.
   - Clasifica cada pieza: músculo, hueso o tendón; descarta las profundas
     que no se ven.
   - Simplifica la malla (meshoptimizer) con un presupuesto por superficie.
   - Guarda el resultado en tools/.cache/parts.json + parts.bin
   Uso: node tools/anatomy-extract.mjs <carpeta-con-los-glb> <pack.json>
   ===================================================================== */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';
import path from 'path';

const [dir, packFile] = process.argv.slice(2);
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '.cache');
fs.mkdirSync(OUT, { recursive: true });
await MeshoptSimplifier.ready;

const pack = JSON.parse(fs.readFileSync(packFile));
const typeOf = {}; for (const s of pack.structures) typeOf[s.id.split(':').pop()] = s.type;
const sideOf = {}; for (const i of pack.meshInstances) sideOf[i.selector.value] = i.laterality;

/* Músculos profundos o piezas que no se ven en un modelo sin piel */
const SKIP = new Set(['subscapularis', 'iliacus', 'psoas-major', 'obturator-internus', 'piriformis', 'gluteus-minimus',
  'pectoralis-minor', 'tibialis-posterior', 'popliteus', 'plantaris', 'supinator', 'pronator-quadratus', 'multifidus',
  'interosseous-membrane-of-forearm', 'interosseous-membrane-of-leg', 'stylohyoid-ligament', 'long-plantar-ligament',
  'flexor-digitorum-longus', 'hyoid-bone', 'vomer', 'ethmoid', 'palatine-bone', 'inferior-nasal-concha', 'lacrimal-bone']);
const BONE_RE = /vertebra|occiput|atlas|axis|sacrum|ethmoid|frontal-bone|hyoid|mandible|nasal-bone|sphenoid|vomer|sesamoid|coccyx|sternum/;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const parts = [];
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.glb')).sort()) {
  const doc = await io.read(path.join(dir, f));
  for (const n of doc.getRoot().listNodes()) {
    const mesh = n.getMesh(); if (!mesh) continue;
    const name = n.getName();
    const structure = name.split(':')[1];
    let type = typeOf[structure] || (BONE_RE.test(structure) ? 'bone' : /sternocleidomastoid/.test(structure) ? 'muscle' : null);
    if (!type || type === 'joint' || SKIP.has(structure)) continue;
    if (type === 'ligament') type = 'tendon';
    const M = n.getWorldMatrix();
    const pos = [], idx = [];
    for (const p of mesh.listPrimitives()) {
      const a = p.getAttribute('POSITION'), ind = p.getIndices();
      const base = pos.length / 3, e = [];
      for (let i = 0; i < a.getCount(); i++) {
        a.getElement(i, e);
        pos.push(M[0] * e[0] + M[4] * e[1] + M[8] * e[2] + M[12], M[1] * e[0] + M[5] * e[1] + M[9] * e[2] + M[13], M[2] * e[0] + M[6] * e[1] + M[10] * e[2] + M[14]);
      }
      for (let i = 0; i < ind.getCount(); i++) idx.push(base + ind.getScalar(i));
    }
    // Soldar vértices duplicados (misma posición) para un sombreado suave
    const key = new Map(), wpos = [], remap = new Int32Array(pos.length / 3);
    for (let i = 0; i < pos.length / 3; i++) {
      const k = Math.round(pos[i * 3] * 2e5) + ',' + Math.round(pos[i * 3 + 1] * 2e5) + ',' + Math.round(pos[i * 3 + 2] * 2e5);
      let v = key.get(k);
      if (v === undefined) { v = wpos.length / 3; key.set(k, v); wpos.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); }
      remap[i] = v;
    }
    const widx = [];
    for (let i = 0; i < idx.length; i += 3) {
      const a = remap[idx[i]], b = remap[idx[i + 1]], c = remap[idx[i + 2]];
      if (a !== b && b !== c && a !== c) widx.push(a, b, c);
    }
    pos.length = 0; for (const x of wpos) pos.push(x); idx.length = 0; for (const x of widx) idx.push(x);
    let cx = 0; for (let i = 0; i < pos.length; i += 3) cx += pos[i];
    cx /= pos.length / 3;
    const side = sideOf[name] || (Math.abs(cx) < 0.012 ? 'center' : cx > 0 ? 'left' : 'right');
    parts.push({ name, structure, type, side, pos: new Float32Array(pos), idx: new Uint32Array(idx) });
  }
}

/* Área de cada pieza para repartir el presupuesto de triángulos */
function area(p) {
  let A = 0; const P = p.pos, I = p.idx;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    A += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return A;
}
const DENSITY = { muscle: 40000, bone: 20000, tendon: 24000 }; // triángulos por m²
const MIN = { muscle: 160, bone: 60, tendon: 60 };
let before = 0, after = 0;
for (const p of parts) {
  const tris = p.idx.length / 3;
  before += tris;
  const target = Math.min(tris, Math.max(MIN[p.type], Math.round(area(p) * DENSITY[p.type])));
  if (target < tris) {
    const [ni] = MeshoptSimplifier.simplify(p.idx, p.pos, 3, target * 3, 0.02, ['LockBorder']);
    // Compactar vértices usados
    const map = new Int32Array(p.pos.length / 3).fill(-1); const np = [];
    const out = new Uint32Array(ni.length);
    for (let i = 0; i < ni.length; i++) {
      let v = map[ni[i]];
      if (v < 0) { v = map[ni[i]] = np.length / 3; np.push(p.pos[ni[i] * 3], p.pos[ni[i] * 3 + 1], p.pos[ni[i] * 3 + 2]); }
      out[i] = v;
    }
    p.pos = new Float32Array(np); p.idx = out;
  }
  after += p.idx.length / 3;
}
console.log('piezas', parts.length, 'triángulos', before, '→', after);
const byType = {}; for (const p of parts) byType[p.type] = (byType[p.type] || 0) + p.idx.length / 3;
console.log(byType);

/* Guardar en caché */
const meta = []; const bufs = []; let off = 0;
for (const p of parts) {
  meta.push({ name: p.name, structure: p.structure, type: p.type, side: p.side, posOff: off, posLen: p.pos.length, idxOff: off + p.pos.byteLength, idxLen: p.idx.length });
  bufs.push(Buffer.from(p.pos.buffer), Buffer.from(p.idx.buffer));
  off += p.pos.byteLength + p.idx.byteLength;
}
fs.writeFileSync(path.join(OUT, 'parts.json'), JSON.stringify(meta));
fs.writeFileSync(path.join(OUT, 'parts.bin'), Buffer.concat(bufs));
