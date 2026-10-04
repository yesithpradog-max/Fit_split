/* =====================================================================
   FIT SPLIT · tools/anatomy-build.mjs
   ---------------------------------------------------------------------
   Paso 2 del modelo anatómico (Node, una sola vez):
   1. Carga las piezas extraídas (anatomy-extract.mjs).
   2. Calcula los centros articulares a partir de los huesos reales.
   3. Añade los músculos generados (anatomy-generate.mjs).
   4. Calcula los pesos de piel (qué hueso del esqueleto mueve cada vértice).
   5. Cuantiza y guarda assets/anatomy/anatomy-data.js (base64), que el
      navegador carga solo cuando hace falta una animación 3D.
   Uso: node tools/anatomy-build.mjs [--dev]
   ===================================================================== */
import fs from 'fs';
import path from 'path';
import { loadParts, V, verts, bbox, centroid, sphereFit, KD } from './anatomy-lib.mjs';
import { generate } from './anatomy-generate.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CACHE = process.env.ANATOMY_CACHE || path.join(HERE, '.cache');
const DEV = process.argv.includes('--dev');
const parts = loadParts(CACHE);
const vs = (s, side) => verts(parts.filter(p => p.structure === s && (!side || p.side === side)));

/* ---------------------------------------------------------------------
   1. Centros articulares (metros, Y arriba, Z hacia delante, +X = izquierda)
   --------------------------------------------------------------------- */
const J = {};
for (const [side, S, sg] of [['left', 'L', 1], ['right', 'R', -1]]) {
  const medial = (pts, b, w) => pts.filter(p => Math.abs(p[0]) < Math.min(Math.abs(b.mn[0]), Math.abs(b.mx[0])) + w);
  const fem = vs('femur', side), fb = bbox(fem);
  J['hip' + S] = sphereFit(medial(fem.filter(p => p[1] > fb.mx[1] - 0.06), fb, 0.045)).c;
  const kb = bbox(fem.filter(p => p[1] < fb.mn[1] + 0.03));
  J['knee' + S] = [kb.c[0], kb.mn[1] + 0.014, kb.c[2] - 0.004];
  const tal = bbox(vs('talus', side));
  J['ankle' + S] = [tal.c[0], tal.c[1] + 0.004, tal.c[2] - 0.004];
  const mts = ['first-metatarsal-bone', 'second-metatarsal', 'third-metatarsal-bone', 'fourth-metatarsal-bone', 'fifth-metatarsal-bone']
    .map(s => { const p = vs(s, side); const mz = Math.max(...p.map(q => q[2])); return centroid(p.filter(q => q[2] > mz - 0.012)); });
  J['toe' + S] = centroid(mts.slice(0, 4));
  const cal = vs('calcaneus', side); const mzc = Math.min(...cal.map(q => q[2]));
  J['heel' + S] = centroid(cal.filter(q => q[2] < mzc + 0.01));
  const hum = vs('humerus', side), hb = bbox(hum);
  J['shoulder' + S] = sphereFit(medial(hum.filter(p => p[1] > hb.mx[1] - 0.05), hb, 0.04)).c;
  const eb = bbox(hum.filter(p => p[1] < hb.mn[1] + 0.025));
  J['elbow' + S] = [eb.c[0], eb.mn[1] + 0.013, eb.c[2]];
  J['wrist' + S] = V.lerp(bbox(vs('capitate', side)).c, bbox(vs('lunate', side)).c, 0.5);
  const tip = s => { const p = vs(s, side); const my = Math.min(...p.map(q => q[1])); return centroid(p.filter(q => q[1] < my + 0.006)); };
  const top = s => { const p = vs(s, side); const my = Math.max(...p.map(q => q[1])); return centroid(p.filter(q => q[1] > my - 0.006)); };
  J['mcp' + S] = centroid(['second-metacarpal-bone', 'third-metacarpal-bone', 'fourth-metacarpal-bone', 'fifth-metacarpal-bone'].map(tip));
  J['pip' + S] = centroid(['proximal-phalanx-of-index-finger', 'proximal-phalanx-of-middle-finger', 'proximal-phalanx-of-ring-finger', 'proximal-phalanx-of-little-finger'].map(tip));
  J['thumb' + S] = top('first-metacarpal-bone');
  const cla = vs('clavicle', side);
  const mnx = Math.min(...cla.map(q => Math.abs(q[0])));
  J['sc' + S] = centroid(cla.filter(q => Math.abs(q[0]) < mnx + 0.012));
}
J.pelvis = V.lerp(J.hipL, J.hipR, 0.5);
J.neck = V.lerp(bbox(vs('seventh-cervical-vertebra')).c, bbox(vs('first-thoracic-vertebra')).c, 0.5);
const atlas = bbox(vs('atlas'));
J.head = [atlas.c[0], atlas.mx[1], atlas.c[2]];
J.floor = Math.min(...vs('calcaneus').map(p => p[1]));

/* ---------------------------------------------------------------------
   2. Músculos generados
   --------------------------------------------------------------------- */
const gen = generate(parts, J);
const all = parts.concat(gen);
console.log('generadas', gen.length, 'piezas;', gen.reduce((s, p) => s + p.idx.length / 3, 0), 'triángulos');

/* Clave de resaltado de cada músculo (coincide con anim.p / anim.s de los ejercicios) */
const KEY = {
  'pectoralis-major': 'chest', 'external-oblique': 'abs', 'linea-alba': null,
  'latissimus-dorsi': 'lats', 'teres-major': 'lats',
  trapezius: 'upperBack', 'trapezius-lower': 'upperBack', 'rhomboid-major': 'upperBack', infraspinatus: 'upperBack', 'teres-minor': 'upperBack', supraspinatus: 'upperBack', 'levator-scapulae': 'upperBack',
  'erector-spinae': 'lowerBack', 'biceps-brachii': 'biceps', 'triceps-brachii': 'triceps',
  brachioradialis: 'forearm', 'flexor-carpi-radialis': 'forearm', 'palmaris-longus': 'forearm', 'finger-flexors': 'forearm', 'extensor-digitorum': 'forearm',
  'extensor-carpi-ulnaris': 'forearm', 'extensor-carpi-radialis-longus': 'forearm', 'extensor-carpi-radialis-brevis': 'forearm',
  'gluteus-maximus': 'glutes', 'gluteus-medius': 'gluteMed', quadriceps: 'quads',
  'biceps-femoris': 'hams', semitendinosus: 'hams', semimembranosus: 'hams',
  gastrocnemius: 'calves', soleus: 'calves', 'adductor-brevis': 'adductors', 'adductor-longus': 'adductors', 'adductor-magnus': 'adductors', gracilis: 'adductors'
};
// Las tres porciones del deltoides, por su posición
const deltParts = all.filter(p => p.structure === 'deltoid');
for (const side of ['left', 'right']) {
  const d = deltParts.filter(p => p.side === side).map(p => ({ p, z: centroid(verts([p]))[2] })).sort((a, b) => a.z - b.z);
  d[0].p.key = 'rearDelt'; d[1].p.key = 'sideDelt'; d[2].p.key = 'frontDelt';
}
for (const p of all) if (!p.key) p.key = p.type === 'muscle' ? (KEY[p.structure] || 'plain') : p.type;

/* ---------------------------------------------------------------------
   3. Esqueleto y pesos de piel
   --------------------------------------------------------------------- */
const BONES = [
  ['torso', null, J.pelvis], ['neck', 'torso', J.neck], ['head', 'neck', J.head],
  ...['L', 'R'].flatMap(S => [
    ['scap' + S, 'torso', J['sc' + S]], ['upperArm' + S, 'scap' + S, J['shoulder' + S]], ['forearm' + S, 'upperArm' + S, J['elbow' + S]],
    ['twist' + S, 'forearm' + S, J['elbow' + S]], ['hand' + S, 'twist' + S, J['wrist' + S]], ['fingers' + S, 'hand' + S, J['mcp' + S]],
    ['tips' + S, 'fingers' + S, J['pip' + S]], ['thumb' + S, 'hand' + S, J['thumb' + S]],
    ['thigh' + S, 'torso', J['hip' + S]], ['shin' + S, 'thigh' + S, J['knee' + S]], ['foot' + S, 'shin' + S, J['ankle' + S]], ['toes' + S, 'foot' + S, J['toe' + S]]
  ])
];
const BI = Object.fromEntries(BONES.map((b, i) => [b[0], i]));

/* Hueso del esqueleto al que pertenece cada hueso anatómico */
function rigBoneOfBone(p) {
  const s = p.structure, S = p.side === 'left' ? 'L' : p.side === 'right' ? 'R' : null;
  if (/cervical|axis/.test(s)) return 'neck';
  if (/atlas|occiput|frontal|parietal|temporal-bone|sphenoid|zygomatic|maxilla|nasal|mandible|lacrimal/.test(s)) return 'head';
  if (!S) return 'torso';
  if (/clavicle|scapula/.test(s)) return 'scap' + S;
  if (s === 'humerus') return 'upperArm' + S;
  if (s === 'radius' || s === 'ulna') return 'forearm' + S;
  if (/thumb|first-metacarpal/.test(s)) return 'thumb' + S;
  if (/phalanx-of-(big|second|third|fourth|little)-toe|sesamoid/.test(s)) return 'toes' + S;
  if (/proximal-phalanx-of-(index|middle|ring|little)/.test(s)) return 'fingers' + S;
  if (/(middle|distal)-phalanx-of-(index|middle|ring|little)/.test(s)) return 'tips' + S;
  if (/capitate|lunate|scaphoid|hamate|pisiform|trapezium|trapezoid|triquetral|metacarpal/.test(s)) return 'hand' + S;
  if (s === 'femur') return 'thigh' + S;
  if (s === 'patella' || s === 'tibia' || s === 'fibula') return 'shin' + S;
  if (/phalanx-of-(big|second|third|fourth|little)-toe|sesamoid/.test(s)) return 'toes' + S;
  if (/talus|calcaneus|navicular|cuboid|cuneiform|metatarsal/.test(s)) return 'foot' + S;
  if (/rib|hip-bone|sacrum|vertebra|sternum/.test(s)) return 'torso';
  return 'torso';
}

// Nubes de puntos de cada hueso del esqueleto (desde los huesos reales)
const clouds = {};
for (const p of all.filter(q => q.type === 'bone')) {
  const b = rigBoneOfBone(p);
  (clouds[b] = clouds[b] || []).push(...verts([p]));
}
// Puntos guía extra donde no hay hueso cerca (cartílagos, cuello, cabeza)
const addGuide = (b, pts) => { (clouds[b] = clouds[b] || []).push(...pts); };
addGuide('neck', [...Array(8)].map((_, i) => V.lerp(J.neck, J.head, i / 7)));
const kd = {}, cb = {};
for (const [b, pts] of Object.entries(clouds)) { kd[b] = new KD(pts); cb[b] = bbox(pts); }
const distBox = (p, b) => Math.hypot(Math.max(b.mn[0] - p[0], 0, p[0] - b.mx[0]), Math.max(b.mn[1] - p[1], 0, p[1] - b.mx[1]), Math.max(b.mn[2] - p[2], 0, p[2] - b.mx[2]));

const SIGMA = 0.011;
function weightsFor(p) {
  const n = p.pos.length / 3;
  const W = [];
  const sideOk = b => !/[LR]$/.test(b) || p.side === 'center' || b.endsWith(p.side === 'left' ? 'L' : 'R');
  // Huesos sobre los que puede moverse cada estructura (según su anatomía)
  const st = p.structure;
  const ARM_HAND = ['upperArm', 'forearm', 'twist', 'hand', 'fingers', 'tips', 'thumb'];
  const LEG_LOW = ['thigh', 'shin', 'foot', 'toes'];
  let set = null;
  if (p.type === 'eye' || /^(nose|nose-ala|ear|ear-helix)$/.test(st)) set = ['head'];
  else if (/temporalis|masseter|cheek|frontalis|procerus|galea|occipitalis|orbicularis|mentalis|zygomaticus|levator-labii|depressor-anguli/.test(st)) set = ['head'];
  else if (st === 'larynx' || st === 'infrahyoid') set = ['neck', 'torso'];
  else if (st === 'neck-muscles') set = ['torso', 'neck', 'head'];
  else if (st === 'sternocleidomastoid') set = ['torso', 'neck', 'head'];
  else if (st === 'trapezius' || st === 'levator-scapulae') set = ['torso', 'scap', 'neck', 'head'];
  else if (/rhomboid|trapezius-lower|serratus/.test(st)) set = ['torso', 'scap'];
  else if (/^(deltoid|supraspinatus|infraspinatus|teres-minor|teres-major|subscapularis)$/.test(st)) set = ['scap', 'upperArm', 'torso'];
  else if (/pectoralis|latissimus/.test(st)) set = ['torso', 'scap', 'upperArm'];
  else if (st === 'biceps-brachii') set = ['scap', 'upperArm', 'forearm', 'twist'];
  else if (st === 'triceps-brachii') set = ['scap', 'upperArm', 'forearm'];
  else if (/brachioradialis|carpi|palmaris|finger|extensor-digitorum$|flexor-retinaculum|pronator|supinator/.test(st)) set = ARM_HAND;
  else if (/erector|oblique|sternum|linea-alba|rectus-abdominis/.test(st)) set = ['torso'];
  else if (/gluteus/.test(st)) set = ['torso', 'thigh'];
  else if (/quadriceps|biceps-femoris|semitendinosus|semimembranosus|sartorius|gracilis/.test(st)) set = ['torso', 'thigh', 'shin'];
  else if (/adductor/.test(st)) set = ['torso', 'thigh'];
  else if (/gastrocnemius|plantaris|popliteus/.test(st)) set = ['thigh', 'shin', 'foot'];
  else if (/soleus|tibialis|fibularis|extensor-digitorum-longus|calcaneal/.test(st)) set = ['shin', 'foot', 'toes'];
  else if (/flexor-digitorum-brevis|foot|plantar/.test(st)) set = ['foot', 'toes'];
  else if (p.type === 'muscle' || p.type === 'tendon') {
    // Por posición: brazo/mano, pierna/pie o tronco
    const c = centroid(verts([p]));
    if (Math.abs(c[0]) > 0.17 && c[1] < 1.15) set = ARM_HAND;
    else if (c[1] < 0.42) set = LEG_LOW;
  }
  const allowed = b => {
    if (!sideOk(b)) return false;
    if (!set) return true;
    const base = b.replace(/[LR]$/, '');
    return set.includes(base);
  };
  for (let i = 0; i < n; i++) {
    const q = [p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]];
    if (p.type === 'bone') { W.push([[BI[rigBoneOfBone(p)], 1]]); continue; }
    const cands = [];
    for (const b of Object.keys(kd)) {
      if (!allowed(b) || distBox(q, cb[b]) > 0.12) continue;
      cands.push([b, kd[b].nearest(q).d]);
    }
    if (!cands.length) { W.push([[BI.torso, 1]]); continue; }
    const dmin = Math.min(...cands.map(c => c[1]));
    let ws = cands.map(([b, d]) => [BI[b], Math.exp(-(d - dmin) / SIGMA)]).filter(w => w[1] > 0.02);
    ws.sort((a, b) => b[1] - a[1]); ws = ws.slice(0, 4);
    const s = ws.reduce((a, w) => a + w[1], 0);
    W.push(ws.map(([b, w]) => [b, w / s]));
  }
  // Suavizado sobre la malla
  if (p.type !== 'bone') {
    const nb = Array.from({ length: n }, () => new Set());
    for (let i = 0; i < p.idx.length; i += 3) { const t = [p.idx[i], p.idx[i + 1], p.idx[i + 2]]; for (const a of t) for (const b of t) if (a !== b) nb[a].add(b); }
    let dense = W.map(w => { const m = new Map(); for (const [b, x] of w) m.set(b, x); return m; });
    for (let it = 0; it < 3; it++) {
      dense = dense.map((m, v) => {
        const acc = new Map();
        for (const [b, x] of m) acc.set(b, (acc.get(b) || 0) + x * 0.5);
        const k = 0.5 / (nb[v].size || 1);
        for (const w of nb[v]) for (const [b, x] of dense[w]) acc.set(b, (acc.get(b) || 0) + x * k);
        return acc;
      });
    }
    for (let v = 0; v < n; v++) {
      let ws = [...dense[v].entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const s = ws.reduce((a, w) => a + w[1], 0);
      W[v] = ws.map(([b, w]) => [b, w / s]);
    }
  }
  // Pronación: el antebrazo reparte su peso con el hueso de giro hacia la muñeca
  for (let v = 0; v < n; v++) {
    const q = [p.pos[v * 3], p.pos[v * 3 + 1], p.pos[v * 3 + 2]];
    W[v] = W[v].flatMap(([b, w]) => {
      const name = BONES[b][0];
      if (!name.startsWith('forearm')) return [[b, w]];
      const S = name.slice(-1), e = J['elbow' + S], wr = J['wrist' + S];
      const axis = V.sub(wr, e), t = V.dot(V.sub(q, e), axis) / V.dot(axis, axis);
      const k = Math.max(0, Math.min(1, (t - 0.1) / 0.85));
      const tw = k * k * (3 - 2 * k);
      return [[b, w * (1 - tw)], [BI['twist' + S], w * tw]];
    }).filter(x => x[1] > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const s = W[v].reduce((a, w) => a + w[1], 0);
    W[v] = W[v].map(([b, w]) => [b, w / s]);
  }
  return W;
}

/* ---------------------------------------------------------------------
   4. Exportar
   --------------------------------------------------------------------- */
const b = bbox(verts(all));
const span = [b.mx[0] - b.mn[0], b.mx[1] - b.mn[1], b.mx[2] - b.mn[2]];
const meta = [], posQ = [], skinI = [], skinW = [], idxQ = [];
let vOff = 0, iOff = 0;
const order = { bone: 0, cartilage: 1, tendon: 2, eye: 3, muscle: 4 };
all.sort((a, c) => order[a.type] - order[c.type]);
for (const p of all) {
  const n = p.pos.length / 3;
  if (n > 65535) throw new Error('pieza demasiado grande ' + p.name);
  const W = DEV ? null : weightsFor(p);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) posQ.push(Math.round(((p.pos[i * 3 + k] - b.mn[k]) / span[k]) * 65535) - 32768);
    if (W) {
      const w = W[i].concat([[0, 0], [0, 0], [0, 0]]).slice(0, 4);
      let q = w.map(x => Math.round(x[1] * 255));
      const diff = 255 - q.reduce((a, c) => a + c, 0); q[0] += diff;
      skinI.push(...w.map(x => x[0])); skinW.push(...q);
    }
  }
  for (let i = 0; i < p.idx.length; i++) idxQ.push(p.idx[i]);
  meta.push([p.structure, p.type, p.key, p.side, vOff, n, iOff, p.idx.length]);
  vOff += n; iOff += p.idx.length;
}
const bin = Buffer.concat([
  Buffer.from(new Int16Array(posQ).buffer), Buffer.from(new Uint16Array(idxQ).buffer),
  Buffer.from(new Uint8Array(skinI)), Buffer.from(new Uint8Array(skinW))
]);
const manifest = {
  version: 1, vertices: vOff, indices: iOff, min: b.mn, span, floor: J.floor,
  bones: BONES.map(([n, parent, pos]) => [n, parent, pos.map(x => +x.toFixed(5))]),
  joints: Object.fromEntries(Object.entries(J).map(([k, v]) => [k, Array.isArray(v) ? v.map(x => +x.toFixed(5)) : v])),
  parts: meta,
  credit: 'BodyParts3D, © The Database Center for Life Science, CC BY 4.0. Simplificado, con esqueleto animable y músculos añadidos por FIT SPLIT.'
};
console.log('vértices', vOff, 'triángulos', iOff / 3, 'binario', (bin.length / 1048576).toFixed(2), 'MB');
const outDir = DEV ? CACHE : path.join(HERE, '..', 'assets', 'anatomy');
fs.mkdirSync(outDir, { recursive: true });
if (DEV) {
  fs.writeFileSync(path.join(outDir, 'dev.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(outDir, 'dev.bin'), bin);
} else {
  const js = `/* Modelo anatómico de FIT SPLIT (generado por tools/anatomy-build.mjs).\n   ${manifest.credit} */\n` +
    `window.FITSPLIT_ANATOMY = { manifest: ${JSON.stringify(manifest)}, data: "${bin.toString('base64')}" };\n`;
  fs.writeFileSync(path.join(outDir, 'anatomy-data.js'), js);
  console.log('escrito', (js.length / 1048576).toFixed(2), 'MB');
}
