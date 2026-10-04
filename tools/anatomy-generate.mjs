/* =====================================================================
   FIT SPLIT · tools/anatomy-generate.mjs
   ---------------------------------------------------------------------
   Músculos y estructuras que faltan en el conjunto de datos de
   BodyParts3D usado (dorsal ancho, trapecio medio e inferior, recto
   abdominal visible, esternón, cuello, cara y cabeza).

   Técnica: "shrink-wrap". Cada músculo se define como una superficie
   paramétrica cerca de su posición anatómica; cada punto se proyecta
   con un rayo sobre las estructuras reales que tiene debajo (huesos y
   músculos) y se separa de ellas según el grosor del músculo, que se
   reduce a cero en los bordes. Así la pieza queda pegada a la anatomía
   real sin huecos.
   ===================================================================== */
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { V, verts, bbox, centroid } from './anatomy-lib.mjs';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* BVH de un conjunto de piezas para lanzar rayos */
export function bvhOf(parts) {
  let n = 0, m = 0;
  for (const p of parts) { n += p.pos.length; m += p.idx.length; }
  const pos = new Float32Array(n), idx = new Uint32Array(m);
  let o = 0, q = 0;
  for (const p of parts) {
    pos.set(p.pos, o);
    for (let i = 0; i < p.idx.length; i++) idx[q + i] = p.idx[i] + o / 3;
    o += p.pos.length; q += p.idx.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return new MeshBVH(g);
}

/* Intersección más lejana (superficie exterior) a lo largo de un rayo */
const _ray = new THREE.Ray();
function farHit(bvh, origin, dir, maxDist) {
  _ray.origin.set(...origin); _ray.direction.set(...dir).normalize();
  const hits = bvh.raycast(_ray, THREE.DoubleSide);
  let best = null;
  for (const h of hits) if (h.distance <= maxDist && (!best || h.distance > best.distance)) best = h;
  return best ? { p: [best.point.x, best.point.y, best.point.z], d: best.distance } : null;
}

/* Malla de rejilla (nu × nv) a partir de una función de puntos y máscara */
function gridMesh(nu, nv, pointAt, maskAt) {
  const pos = [], keep = [], map = new Int32Array((nu + 1) * (nv + 1)).fill(-1);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv;
    if (maskAt(u, v) < 0) continue;
    map[j * (nu + 1) + i] = pos.length / 3;
    pos.push(...pointAt(u, v));
  }
  const idx = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = map[j * (nu + 1) + i], b = map[j * (nu + 1) + i + 1], c = map[(j + 1) * (nu + 1) + i], d = map[(j + 1) * (nu + 1) + i + 1];
    if (a >= 0 && b >= 0 && c >= 0) idx.push(a, b, c);
    if (b >= 0 && d >= 0 && c >= 0) idx.push(b, d, c);
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

/* Suavizado laplaciano de una malla (mantiene los bordes) */
function laplace(mesh, iters = 2, k = 0.5) {
  const n = mesh.pos.length / 3, nb = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < mesh.idx.length; i += 3) {
    const t = [mesh.idx[i], mesh.idx[i + 1], mesh.idx[i + 2]];
    for (const a of t) for (const b of t) if (a !== b) nb[a].add(b);
  }
  for (let it = 0; it < iters; it++) {
    const P = mesh.pos.slice();
    for (let v = 0; v < n; v++) {
      if (nb[v].size < 6) continue; // borde
      let s = [0, 0, 0];
      for (const w of nb[v]) s = V.add(s, [P[w * 3], P[w * 3 + 1], P[w * 3 + 2]]);
      s = V.mul(s, 1 / nb[v].size);
      for (let c = 0; c < 3; c++) mesh.pos[v * 3 + c] = P[v * 3 + c] * (1 - k) + s[c] * k;
    }
  }
  return mesh;
}

/* Normales por vértice */
function normals(mesh) {
  const n = new Float32Array(mesh.pos.length), P = mesh.pos, I = mesh.idx;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], w = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const f = V.cross(u, w);
    for (const x of [a, b, c]) { n[x] += f[0]; n[x + 1] += f[1]; n[x + 2] += f[2]; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  return n;
}

/* Superficie envolvente: cada punto de la rejilla se proyecta desde
   origin(u,v) en la dirección hacia el punto y se coloca sobre la
   superficie exterior encontrada, separado "thick(u,v)". */
function wrap({ bvh, nu, nv, guide, origin, mask = () => 1, thick, maxDist = 0.4, smoothIters = 3, flip = false }) {
  const raw = [];
  const mesh = gridMesh(nu, nv, (u, v) => {
    const g = guide(u, v), o = origin(u, v, g);
    const dir = V.norm(V.sub(g, o));
    // Lanzar desde fuera hacia dentro para obtener la superficie exterior
    const far = V.add(o, V.mul(dir, maxDist));
    const h = farHit(bvh, o, dir, maxDist);
    const base = h ? h.p : g;
    raw.push({ u, v, dir });
    return base;
  }, mask);
  laplace(mesh, smoothIters, 0.5);
  // Desplazar según el grosor a lo largo de la normal de la superficie
  const n = normals(mesh);
  let k = 0;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv;
    if (mask(u, v) < 0) continue;
    const r = raw[k];
    let nx = n[k * 3], ny = n[k * 3 + 1], nz = n[k * 3 + 2];
    // La normal debe apuntar hacia fuera (misma dirección que el rayo)
    if (nx * r.dir[0] + ny * r.dir[1] + nz * r.dir[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const t = thick(u, v) * Math.max(0, Math.min(1, mask(u, v)));
    mesh.pos[k * 3] += nx * t; mesh.pos[k * 3 + 1] += ny * t; mesh.pos[k * 3 + 2] += nz * t;
    k++;
  }
  laplace(mesh, 1, 0.35);
  if (flip) for (let i = 0; i < mesh.idx.length; i += 3) { const a = mesh.idx[i]; mesh.idx[i] = mesh.idx[i + 1]; mesh.idx[i + 1] = a; }
  return orientOutward(mesh, (u) => u);
}

/* Asegura que los triángulos miran hacia fuera (respecto al centroide) */
function orientOutward(mesh, _) {
  return mesh;
}

/* Interpolación de Coons entre cuatro curvas */
function coons(c0, c1, d0, d1) {
  // c0(u): v=0, c1(u): v=1, d0(v): u=0, d1(v): u=1
  const P00 = c0(0), P10 = c0(1), P01 = c1(0), P11 = c1(1);
  return (u, v) => {
    const a = V.add(V.mul(c0(u), 1 - v), V.mul(c1(u), v));
    const b = V.add(V.mul(d0(v), 1 - u), V.mul(d1(v), u));
    const c = V.add(V.add(V.mul(P00, (1 - u) * (1 - v)), V.mul(P10, u * (1 - v))), V.add(V.mul(P01, (1 - u) * v), V.mul(P11, u * v)));
    return V.sub(V.add(a, b), c);
  };
}
/* Curva Catmull-Rom por puntos de control */
function curve(pts) {
  return t => {
    const n = pts.length - 1, x = Math.max(0, Math.min(0.99999, t)) * n, i = Math.floor(x), f = x - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
    const out = [];
    for (let k = 0; k < 3; k++) {
      out.push(0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f * f + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f * f * f));
    }
    return out;
  };
}
const mirror = m => {
  const pos = m.pos.slice();
  for (let i = 0; i < pos.length; i += 3) pos[i] = -pos[i];
  const idx = m.idx.slice();
  for (let i = 0; i < idx.length; i += 3) { const a = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = a; }
  return { pos, idx };
};

/* Loft: secciones elípticas a lo largo de una curva */
function loftAlong(points, radii, { seg = 20, up = [0, 0, 1], closed = true, profile = null } = {}) {
  const pos = [], idx = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const t = V.norm(V.sub(points[Math.min(n - 1, i + 1)], points[Math.max(0, i - 1)]));
    let a = V.norm(V.sub(up, V.mul(t, V.dot(up, t))));
    const b = V.cross(t, a);
    const [ra, rb] = radii[i];
    for (let k = 0; k <= seg; k++) {
      const th = (k / seg) * Math.PI * 2;
      const pr = profile ? profile(i / (n - 1), th) : 1;
      pos.push(...V.add(points[i], V.add(V.mul(a, Math.cos(th) * ra * pr), V.mul(b, Math.sin(th) * rb * pr))));
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) {
    const a = i * (seg + 1) + k, b = a + seg + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  if (closed) {
    for (const [ring, flip] of [[0, true], [n - 1, false]]) {
      const c = pos.length / 3; pos.push(...points[ring]);
      for (let k = 0; k < seg; k++) {
        const a = ring * (seg + 1) + k;
        flip ? idx.push(c, a + 1, a) : idx.push(c, a, a + 1);
      }
    }
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

function sphereMesh(c, r, seg = 18, sx = 1, sy = 1, sz = 1) {
  const pos = [], idx = [];
  for (let j = 0; j <= seg; j++) {
    const th = (j / seg) * Math.PI;
    for (let i = 0; i <= seg * 2; i++) {
      const ph = (i / (seg * 2)) * Math.PI * 2;
      pos.push(c[0] + r * sx * Math.sin(th) * Math.cos(ph), c[1] + r * sy * Math.cos(th), c[2] + r * sz * Math.sin(th) * Math.sin(ph));
    }
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg * 2; i++) {
    const a = j * (seg * 2 + 1) + i, b = a + seg * 2 + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

/* =====================================================================
   GENERACIÓN
   ===================================================================== */
export function generate(parts, J) {
  const out = [];
  const add = (structure, type, side, mesh) => out.push({ name: 'gen:' + structure + ':' + side, structure, type, side, pos: mesh.pos, idx: mesh.idx });
  const pick = (re, side) => parts.filter(p => re.test(p.structure) && (!side || p.side === side || p.side === 'center'));
  const vs = (s, side) => verts(parts.filter(p => p.structure === s && (!side || p.side === side)));

  /* ---------- Cabeza ----------
     Coordenadas medidas sobre el cráneo real (vistas ortográficas):
     órbitas en x ±0.034, y 1.507; arco cigomático y≈1.50; rama de la
     mandíbula z 0.10–0.13; frente z≈0.17; centro de la boca y≈1.462. */
  const skullRe = /^(frontal-bone|parietal-bone|temporal-bone|occiput|sphenoid-bone|zygomatic-bone|maxilla|nasal-bone|mandible)$/;
  const skullBVH = bvhOf(pick(skullRe));
  J.orbitL = [0.034, 1.507, 0.152]; J.orbitR = [-0.034, 1.507, 0.152];

  /* Parche en forma de disco (bordes suaves) proyectado sobre el cráneo.
     plane: 'side' (rayos hacia dentro desde el lateral), 'front', 'back', 'top'.
     c: centro en el plano; r: radios; rot: giro; rin: radio interior (anillo). */
  function disk(name, type, side, { plane, c, r, rot = 0, n = 2.2, rin = 0, thick, rings = 14, seg = 56, base = null }) {
    const sx = side === 'right' ? -1 : 1;
    const pos = [], idx = [], dirs = [], prof = [];
    const toWorld = (a, b) => {
      // a,b: coordenadas del plano → origen y dirección del rayo
      if (plane === 'side') return { o: [sx * 0.25, b, a], d: [-sx, 0, 0] };
      if (plane === 'front') return { o: [sx * a, b, 0.4], d: [0, 0, -1] };
      if (plane === 'back') return { o: [sx * a, b, -0.3], d: [0, 0, 1] };
      return { o: [sx * a, 1.9, b], d: [0, -1, 0] }; // top
    };
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const ringR = k => rin + (1 - rin) * (k / rings);
    const start = rin > 0 ? 0 : 1;
    const hitD = [];
    if (rin === 0) { // vértice central
      const { o, d } = toWorld(c[0], c[1]);
      const h = farHitNear(skullBVH, o, d, 0.6);
      pos.push(...(h ? h.p : o)); dirs.push(d); prof.push([0, 0]); hitD.push(h ? h.d : Infinity);
    }
    for (let k = start; k <= rings; k++) {
      const rr = ringR(k);
      for (let i = 0; i < seg; i++) {
        const th = (i / seg) * Math.PI * 2;
        const ct = Math.cos(th), st = Math.sin(th);
        const e = 1 / Math.pow(Math.pow(Math.abs(ct), n) + Math.pow(Math.abs(st), n), 1 / n);
        const lu = r[0] * rr * ct * e, lv = r[1] * rr * st * e;
        const a = c[0] + lu * cr - lv * sr, b = c[1] + lu * sr + lv * cr;
        const { o, d } = toWorld(a, b);
        const h = farHitNear(skullBVH, o, d, 0.6);
        pos.push(...(h ? h.p : o)); dirs.push(d); prof.push([rr, th]); hitD.push(h ? h.d : Infinity);
      }
    }
    const ringStart = k => (rin === 0 ? 1 : 0) + (k - start) * seg;
    if (rin === 0) for (let i = 0; i < seg; i++) idx.push(0, ringStart(1) + i, ringStart(1) + (i + 1) % seg);
    for (let k = Math.max(start, rin === 0 ? 1 : 0); k < rings; k++) for (let i = 0; i < seg; i++) {
      const a = ringStart(k) + i, b = ringStart(k) + (i + 1) % seg, c2 = ringStart(k + 1) + i, d2 = ringStart(k + 1) + (i + 1) % seg;
      idx.push(a, c2, b, b, c2, d2);
    }
    const mesh = { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
    // Rayos que no tocan el cráneo o se cuelan por un hueco (boca, órbita):
    // se rellenan con la media de sus vecinos válidos
    const finite = hitD.filter(Number.isFinite).sort((a, b) => a - b);
    const med = finite[Math.floor(finite.length / 2)] || 0;
    const bad = hitD.map(d => !Number.isFinite(d) || d > med + (base || 0.022));
    fillHoles(mesh, bad);
    laplace(mesh, 3, 0.5);
    const nn = normals(mesh);
    for (let v = 0; v < pos.length / 3; v++) {
      const d = dirs[v];
      let nx = nn[v * 3], ny = nn[v * 3 + 1], nz = nn[v * 3 + 2];
      if (nx * d[0] + ny * d[1] + nz * d[2] > 0) { nx = -nx; ny = -ny; nz = -nz; }
      const [rr, th] = prof[v];
      const t = Math.max(0.0005, thick(rr, th));
      mesh.pos[v * 3] += nx * t; mesh.pos[v * 3 + 1] += ny * t; mesh.pos[v * 3 + 2] += nz * t;
    }
    laplace(mesh, 1, 0.3);
    const inner = plane === 'side' ? [0, c[1], c[0]] : plane === 'front' ? [0, c[1], 0.05] : plane === 'back' ? [0, c[1], 0.1] : [0, 1.5, c[1]];
    fixWinding(mesh, inner);
    add(name, type, side, mesh);
  }
  const bump = (rr, p = 2) => Math.pow(Math.max(0, 1 - rr * rr), p);

  for (const side of ['left', 'right']) {
    const sx = side === 'right' ? -1 : 1;
    // Temporal: abanico en la fosa temporal, más grueso abajo y delante
    disk('temporalis', 'muscle', side, { plane: 'side', c: [0.093, 1.553], r: [0.062, 0.047], rot: -0.08, n: 2.4,
      thick: (rr, th) => 0.0085 * bump(rr, 0.8) * (0.55 + 0.45 * Math.max(0, -Math.sin(th))) });
    // Masetero: del arco cigomático al ángulo de la mandíbula
    disk('masseter', 'muscle', side, { plane: 'side', c: [0.122, 1.463], r: [0.022, 0.035], rot: 0.22, n: 2.3,
      thick: rr => 0.0085 * bump(rr, 0.7) });
    // Orbicular del ojo (anillo alrededor de la órbita)
    disk('orbicularis-oculi', 'muscle', side, { plane: 'front', c: [0.035, 1.509], r: [0.031, 0.027], rin: 0.43, n: 2.2, rings: 9,
      thick: rr => 0.0034 * Math.sin(Math.PI * (rr - 0.43) / 0.57) + 0.0007 });
    // Mejilla (buccinador y elevadores del labio)
    disk('cheek', 'muscle', side, { plane: 'front', c: [0.04, 1.478], r: [0.022, 0.021], n: 2.2,
      thick: rr => 0.0065 * bump(rr, 0.8) });
    // Occipital
    disk('occipitalis', 'muscle', side, { plane: 'back', c: [0.031, 1.567], r: [0.027, 0.017], n: 2.2,
      thick: rr => 0.0026 * bump(rr, 0.6) });
    // Ojo
    add('eye', 'eye', side, sphereMesh([sx * 0.0335, 1.5065, 0.151], 0.0118, 16));
    // Cigomático mayor, elevador del labio y depresor del ángulo de la boca (bandas)
    const proj = (x, y, off = 0.003) => { const h = farHitNear(skullBVH, [x, y, 0.4], [0, 0, -1], 0.45); return h ? [x, y, h.p[2] + off] : [x, y, 0.17]; };
    const band = (nm, a, b, w, t) => {
      const pts = [...Array(8)].map((_, i) => { const q = V.lerp(a, b, i / 7); return proj(q[0], q[1], 0.0035 + 0.002 * Math.sin(Math.PI * i / 7)); });
      add(nm, 'muscle', side, loftAlong(pts, pts.map((_, i) => [w * (0.6 + 0.4 * Math.sin(Math.PI * i / 7)), t]), { up: [sx, 0, 0.5], seg: 10 }));
    };
    band('zygomaticus', [sx * 0.053, 1.492], [sx * 0.027, 1.463], 0.0042, 0.0022);
    band('levator-labii', [sx * 0.024, 1.492], [sx * 0.014, 1.469], 0.0038, 0.0018);
    band('depressor-anguli', [sx * 0.034, 1.426], [sx * 0.027, 1.458], 0.0045, 0.0022);
  }
  // Frontal y galea aponeurótica
  disk('frontalis', 'muscle', 'center', { plane: 'front', c: [0, 1.57], r: [0.057, 0.035], n: 3,
    thick: rr => 0.0028 * bump(rr, 0.5) });
  disk('procerus', 'muscle', 'center', { plane: 'front', c: [0, 1.527], r: [0.0095, 0.016], n: 2.2,
    thick: rr => 0.0025 * bump(rr, 0.6) });
  disk('galea', 'tendon', 'center', { plane: 'top', c: [0, 0.05], r: [0.06, 0.078], n: 2.3, rings: 18, seg: 64, base: 0.06,
    thick: rr => 0.0021 * bump(rr, 0.35) });
  // Labios (orbicular de la boca) con la línea de cierre
  disk('orbicularis-oris', 'muscle', 'center', { plane: 'front', c: [0, 1.4615], r: [0.03, 0.0215], n: 2.4, rings: 16, seg: 64,
    thick: (rr, th) => { const y = Math.sin(th) * rr, x = Math.cos(th) * rr; return 0.011 * bump(rr, 0.7) - 0.0022 * Math.exp(-((y / 0.06) ** 2)) * (1 - Math.abs(x)); } });
  // Mentón
  disk('mentalis', 'muscle', 'center', { plane: 'front', c: [0, 1.435], r: [0.023, 0.015], n: 2.2,
    thick: rr => 0.0052 * bump(rr, 0.7) });

  // Nariz: cartílago (dorso, punta y alas)
  const noseP = [[0, 1.509, 0.191], [0, 1.499, 0.195], [0, 1.489, 0.2], [0, 1.481, 0.205], [0, 1.474, 0.2], [0, 1.469, 0.19]];
  const noseR = [[0.0045, 0.004], [0.0055, 0.0048], [0.0065, 0.0058], [0.0078, 0.0068], [0.0072, 0.0058], [0.0055, 0.0045]];
  add('nose', 'cartilage', 'center', fixTube(loftAlong(noseP, noseR, { up: [1, 0, 0], seg: 20 }), noseP));
  for (const sx of [1, -1]) add('nose-ala', 'cartilage', sx > 0 ? 'left' : 'right', sphereMesh([sx * 0.0098, 1.476, 0.191], 0.0058, 12, 0.9, 0.85, 1.25));

  // Orejas: pabellón de cartílago con grosor, borde redondeado y concha
  for (const [side, sx] of [['left', 1], ['right', -1]]) {
    const cz = 0.054, cy = 1.503, x0 = sx * 0.07, N = 32;
    const outline = [...Array(N)].map((_, i) => {
      const a = (i / N) * Math.PI * 2;
      const top = Math.sin(a) > 0;
      const rz = (top ? 0.0175 : 0.0135) + 0.002 * Math.cos(a), ry = top ? 0.031 : 0.026;
      return [cz - rz * Math.cos(a) + 0.005 * Math.sin(a), cy + ry * Math.sin(a)];
    });
    const flare = z => sx * 0.011 * Math.max(0, Math.min(1, (cz + 0.004 - z) / 0.02));
    const pos = [], idx = [];
    const layers = [[0.0028, 1], [-0.0018, 0.86]]; // exterior e interior
    for (const [off, k] of layers) {
      pos.push(x0 + sx * (off - 0.004), cy, cz);         // centro (concha, hundido)
      for (const [z, y] of outline) {
        const zz = cz + (z - cz) * k, yy = cy + (y - cy) * k;
        pos.push(x0 + flare(zz) + sx * off, yy, zz);
      }
    }
    const L = N + 1;
    for (let i = 0; i < N; i++) {
      idx.push(0, 1 + i, 1 + (i + 1) % N);                // cara exterior
      idx.push(L, L + 1 + (i + 1) % N, L + 1 + i);        // cara interior
      const a = 1 + i, b = 1 + (i + 1) % N;               // borde
      idx.push(a, L + a, b, b, L + a, L + b);
    }
    const ear = { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
    laplace(ear, 2, 0.3);
    fixWinding(ear, [x0 - sx * 0.02, cy, cz]);
    add('ear', 'cartilage', side, doubleSided(ear));
  }

  /* ---------- Cuello ---------- */
  const vC = ['axis', 'third-cervical-vertebra', 'fourth-cervical-vertebra', 'fifth-cervical-vertebra', 'sixth-cervical-vertebra', 'seventh-cervical-vertebra', 'first-thoracic-vertebra'];
  const cen = vC.map(s => bbox(vs(s)).c).sort((a, b) => b[1] - a[1]);
  // Músculos profundos del cuello (escalenos, esplenio, semiespinoso) alrededor de las vértebras
  const neckPts = [[0, 1.5, 0.054], ...cen.map(c => [0, c[1], c[2] + 0.003])];
  const neckR = neckPts.map((p, i) => { const t = i / (neckPts.length - 1); return [0.046 + 0.016 * t * t, 0.043 + 0.005 * t]; });
  add('neck-muscles', 'muscle', 'center', fixTube(loftAlong(neckPts, neckR, { up: [0, 0, 1], seg: 32 }), neckPts));
  // Laringe y tráquea + músculos infrahioideos
  const tra = [[0, 1.452, 0.112], [0, 1.43, 0.118], [0, 1.405, 0.117], [0, 1.37, 0.12], [0, 1.335, 0.124]];
  add('larynx', 'cartilage', 'center', fixTube(loftAlong(tra, [[0.016, 0.013], [0.019, 0.016], [0.016, 0.013], [0.012, 0.011], [0.012, 0.011]], { up: [0, 0, 1], seg: 18 }), tra));
  for (const [side, s] of [['left', 1], ['right', -1]]) {
    const strap = [[s * 0.008, 1.452, 0.123], [s * 0.011, 1.41, 0.133], [s * 0.012, 1.37, 0.134], [s * 0.014, 1.33, 0.137]];
    add('infrahyoid', 'muscle', side, fixTube(loftAlong(strap, strap.map(() => [0.0075, 0.0028]), { up: [0, 0, 1], seg: 12 }), strap));
  }

  /* ---------- Tronco ---------- */
  const torsoBVH = bvhOf(pick(/rib$|vertebra|sacrum|hip-bone|erector-spinae|serratus-anterior|external-oblique|teres-major|teres-minor|infraspinatus|rhomboid-major|scapula|trapezius|gluteus-medius|gluteus-maximus|latissimus|supraspinatus|levator-scapulae/));
  const spinous = s => { const p = vs(s); const mz = Math.min(...p.map(q => q[2])); return [0, centroid(p.filter(q => q[2] < mz + 0.006))[1], mz]; };

  // Dorsal ancho
  for (const [side, s] of [['left', 1], ['right', -1]]) {
    const sp7 = spinous('seventh-thoracic-vertebra'), spL5 = spinous('fifth-lumbar-vertebra');
    const hum = vs('humerus', side), hb = bbox(hum);
    const ins = [s * (Math.abs(J['shoulder' + (s > 0 ? 'L' : 'R')][0]) - 0.012), J['shoulder' + (s > 0 ? 'L' : 'R')][1] - 0.075, 0.072];
    const ilio = [s * 0.125, 0.965, 0.062], psis = [s * 0.035, 0.93, -0.005];
    const c0 = curve([spL5, [s * 0.02, 0.928, -0.01], psis, [s * 0.085, 0.958, 0.02], ilio]);                 // inferior
    const c1 = curve([sp7, [s * 0.05, 1.165, -0.035], [s * 0.1, 1.185, -0.025], [s * 0.135, 1.215, 0.02], ins]); // superior
    const d0 = curve([spL5, spinous('second-lumbar-vertebra'), spinous('eleventh-thoracic-vertebra'), spinous('ninth-thoracic-vertebra'), sp7]); // medial
    const d1 = curve([ilio, [s * 0.145, 1.03, 0.07], [s * 0.15, 1.11, 0.06], [s * 0.15, 1.17, 0.06], ins]);      // lateral
    const P = coons(c0, c1, d0, d1);
    const mesh = wrapOut(torsoBVH, 30, 36, P,
      (u, v, g) => [0, g[1], 0.06],
      () => 1,
      (u, v) => (0.0035 + 0.006 * smooth(0.25, 0.7, u) * (1 - smooth(0.8, 1, v))) * (0.4 + 0.6 * smooth(0, 0.12, u)));
    fixWinding(mesh, [0, 1.05, 0.07]);
    add('latissimus-dorsi', 'muscle', side, mesh);
  }

  // Trapecio medio e inferior
  for (const [side, s] of [['left', 1], ['right', -1]]) {
    const sc = vs('scapula', side), scb = bbox(sc);
    const acro = J['shoulder' + (s > 0 ? 'L' : 'R')];
    const spineRoot = [s * 0.075, 1.275, -0.012];
    const spC7 = spinous('seventh-cervical-vertebra'), spT12 = spinous('twelfth-thoracic-vertebra'), spT3 = spinous('third-thoracic-vertebra'), spT7 = spinous('seventh-thoracic-vertebra');
    const c0 = curve([spT12, [s * 0.035, 1.11, -0.03], [s * 0.06, 1.2, -0.03], spineRoot]);                 // borde inferior-lateral
    const c1 = curve([spC7, [s * 0.06, 1.355, 0.005], [s * 0.12, 1.345, 0.03], [acro[0] + s * 0.005, acro[1] + 0.025, acro[2] - 0.02]]); // superior
    const d0 = curve([spT12, spT7, spT3, spC7]);                                                             // columna
    const d1 = curve([spineRoot, [s * 0.11, 1.29, -0.006], [s * 0.145, 1.31, 0.01], [acro[0] + s * 0.005, acro[1] + 0.025, acro[2] - 0.02]]); // espina de la escápula
    const P = coons(c0, c1, d0, d1);
    const mesh = wrapOut(torsoBVH, 26, 30, P, (u, v, g) => [0, g[1], 0.07], () => 1,
      (u, v) => 0.0035 + 0.004 * smooth(0.1, 0.5, u) * smooth(0.1, 0.5, v));
    fixWinding(mesh, [0, 1.2, 0.08]);
    add('trapezius-lower', 'muscle', side, mesh);
  }

  // Esternón y línea alba (centro del pecho y abdomen)
  const midStrip = (name, type, y0, y1, width, refRe, dz, thick) => {
    const ref = verts(pick(refRe));
    const pts = [], radii = [];
    for (let i = 0; i <= 14; i++) {
      const y = y0 + (y1 - y0) * (i / 14);
      const near = ref.filter(p => Math.abs(p[1] - y) < 0.01 && Math.abs(p[0]) < 0.03);
      const zf = near.length ? Math.max(...near.map(p => p[2])) : 0.15;
      pts.push([0, y, zf - dz]);
      radii.push([width, thick]);
    }
    add(name, type, 'center', loftAlong(pts, radii, { up: [1, 0, 0], seg: 16 }));
  };
  midStrip('sternum', 'bone', 1.105, 1.322, 0.011, /pectoralis-major/, 0.012, 0.008);
  midStrip('linea-alba', 'tendon', 0.875, 1.12, 0.0075, /external-oblique/, 0.006, 0.005);

  return out;
}

/* Rayo desde fuera hacia dentro: devuelve el primer impacto (superficie exterior) */
function farHitNear(bvh, origin, dir, maxDist = 0.5) {
  _ray.origin.set(...origin); _ray.direction.set(...dir).normalize();
  const hits = bvh.raycast(_ray, THREE.DoubleSide);
  let best = null;
  for (const h of hits) if (h.distance <= maxDist && (!best || h.distance < best.distance)) best = h;
  return best ? { p: [best.point.x, best.point.y, best.point.z], d: best.distance } : null;
}

/* Envolvente "desde dentro hacia fuera": rayo desde un eje interior hacia
   el punto guía, se queda con la intersección más lejana (exterior) */
function wrapOut(bvh, nu, nv, P, origin, mask, thick) {
  const dirs = [];
  const mesh = gridMesh(nu, nv, (u, v) => {
    const g = P(u, v), o = origin(u, v, g);
    const d = V.norm(V.sub(g, o));
    dirs.push(d);
    const dist = V.dist(g, o);
    const h = farHit(bvh, o, d, dist + 0.05);
    return h && h.d > dist - 0.06 ? h.p : g;
  }, mask);
  laplace(mesh, 4, 0.5);
  const nn = normals(mesh);
  let k = 0;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv;
    if (mask(u, v) < 0) continue;
    const d = dirs[k];
    let nx = nn[k * 3], ny = nn[k * 3 + 1], nz = nn[k * 3 + 2];
    if (nx * d[0] + ny * d[1] + nz * d[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const t = thick(u, v);
    mesh.pos[k * 3] += nx * t; mesh.pos[k * 3 + 1] += ny * t; mesh.pos[k * 3 + 2] += nz * t;
    k++;
  }
  laplace(mesh, 1, 0.3);
  return mesh;
}

/* Rellena vértices inválidos con la media de sus vecinos válidos */
function fillHoles(mesh, bad) {
  const n = mesh.pos.length / 3, nb = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < mesh.idx.length; i += 3) { const t = [mesh.idx[i], mesh.idx[i + 1], mesh.idx[i + 2]]; for (const a of t) for (const b of t) if (a !== b) nb[a].add(b); }
  const known = bad.map(b => !b);
  for (let it = 0; it < 200 && known.some(k => !k); it++) {
    for (let v = 0; v < n; v++) {
      if (known[v]) continue;
      const ok = [...nb[v]].filter(w => known[w]);
      if (!ok.length) continue;
      for (let c = 0; c < 3; c++) mesh.pos[v * 3 + c] = ok.reduce((s, w) => s + mesh.pos[w * 3 + c], 0) / ok.length;
      known[v] = true;
    }
  }
  // Suavizar solo los rellenados
  for (let it = 0; it < 6; it++) for (let v = 0; v < n; v++) {
    if (!bad[v]) continue;
    for (let c = 0; c < 3; c++) mesh.pos[v * 3 + c] = [...nb[v]].reduce((s, w) => s + mesh.pos[w * 3 + c], 0) / nb[v].size;
  }
}

/* Duplica una superficie con las dos caras (vértices propios para que las
   normales de cada cara sean correctas) */
function doubleSided(m) {
  const nv = m.pos.length / 3, n = m.idx.length;
  const pos = new Float32Array(m.pos.length * 2); pos.set(m.pos); pos.set(m.pos, m.pos.length);
  const idx = new Uint32Array(n * 2); idx.set(m.idx);
  for (let i = 0; i < n; i += 3) { idx[n + i] = nv + m.idx[i]; idx[n + i + 1] = nv + m.idx[i + 2]; idx[n + i + 2] = nv + m.idx[i + 1]; }
  return { pos, idx };
}

/* Orienta un tubo (loft) hacia fuera respecto a su eje */
function fixTube(mesh, axisPts) {
  const P = mesh.pos, I = mesh.idx;
  let score = 0;
  const nearestAxis = q => axisPts.reduce((b, a) => (V.dist(a, q) < V.dist(b, q) ? a : b), axisPts[0]);
  for (let i = 0; i < Math.min(I.length, 3000); i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const n = V.cross([P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]);
    const q = [P[a], P[a + 1], P[a + 2]];
    score += Math.sign(V.dot(n, V.sub(q, nearestAxis(q))));
  }
  if (score < 0) for (let i = 0; i < I.length; i += 3) { const t = I[i]; I[i] = I[i + 1]; I[i + 1] = t; }
  return mesh;
}

/* Gira los triángulos para que su normal apunte lejos de un punto interior */
function fixWinding(mesh, inner) {
  const P = mesh.pos, I = mesh.idx;
  let score = 0;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const n = V.cross([P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]);
    score += Math.sign(V.dot(n, [P[a] - inner[0], P[a + 1] - inner[1], P[a + 2] - inner[2]]));
  }
  if (score < 0) for (let i = 0; i < I.length; i += 3) { const t = I[i]; I[i] = I[i + 1]; I[i + 1] = t; }
  return mesh;
}
