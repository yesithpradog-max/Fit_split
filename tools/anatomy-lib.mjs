/* Utilidades compartidas por las herramientas del modelo anatómico */
import fs from 'fs';
import path from 'path';

export function loadParts(cacheDir) {
  const meta = JSON.parse(fs.readFileSync(path.join(cacheDir, 'parts.json')));
  const bin = fs.readFileSync(path.join(cacheDir, 'parts.bin'));
  return meta.map(m => ({
    ...m,
    pos: new Float32Array(bin.buffer.slice(bin.byteOffset + m.posOff, bin.byteOffset + m.posOff + m.posLen * 4)),
    idx: new Uint32Array(bin.buffer.slice(bin.byteOffset + m.idxOff, bin.byteOffset + m.idxOff + m.idxLen * 4))
  }));
}

export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
};

export function verts(parts) {
  const out = [];
  for (const p of parts) for (let i = 0; i < p.pos.length; i += 3) out.push([p.pos[i], p.pos[i + 1], p.pos[i + 2]]);
  return out;
}
export function bbox(pts) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of pts) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
  return { mn, mx, c: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2] };
}
export const centroid = pts => V.mul(pts.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / pts.length);

/* Ajuste de esfera por mínimos cuadrados */
export function sphereFit(pts) {
  // Resolver x²+y²+z² = 2ax + 2by + 2cz + d
  const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], B = [0, 0, 0, 0];
  for (const p of pts) {
    const r = [2 * p[0], 2 * p[1], 2 * p[2], 1], f = p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
    for (let i = 0; i < 4; i++) { B[i] += r[i] * f; for (let j = 0; j < 4; j++) A[i][j] += r[i] * r[j]; }
  }
  for (let i = 0; i < 4; i++) {
    let mx = i; for (let k = i + 1; k < 4; k++) if (Math.abs(A[k][i]) > Math.abs(A[mx][i])) mx = k;
    [A[i], A[mx]] = [A[mx], A[i]]; [B[i], B[mx]] = [B[mx], B[i]];
    for (let k = i + 1; k < 4; k++) { const f = A[k][i] / A[i][i]; for (let j = i; j < 4; j++) A[k][j] -= f * A[i][j]; B[k] -= f * B[i]; }
  }
  const x = [0, 0, 0, 0];
  for (let i = 3; i >= 0; i--) { let s = B[i]; for (let j = i + 1; j < 4; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
  const c = [x[0], x[1], x[2]];
  return { c, r: Math.sqrt(x[3] + V.dot(c, c)) };
}

/* Árbol KD estático para el punto más cercano */
export class KD {
  constructor(pts) {
    this.pts = pts;
    const idx = pts.map((_, i) => i);
    this.root = this.build(idx, 0);
  }
  build(idx, d) {
    if (idx.length <= 8) return { leaf: idx };
    const ax = d % 3;
    idx.sort((a, b) => this.pts[a][ax] - this.pts[b][ax]);
    const m = idx.length >> 1;
    return { ax, v: this.pts[idx[m]][ax], l: this.build(idx.slice(0, m), d + 1), r: this.build(idx.slice(m), d + 1) };
  }
  nearest(q) {
    let best = Infinity, bi = -1;
    const visit = n => {
      if (n.leaf) { for (const i of n.leaf) { const p = this.pts[i]; const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < best) { best = d; bi = i; } } return; }
      const diff = q[n.ax] - n.v;
      const [a, b] = diff < 0 ? [n.l, n.r] : [n.r, n.l];
      visit(a);
      if (diff * diff < best) visit(b);
    };
    visit(this.root);
    return { d: Math.sqrt(best), i: bi };
  }
}
