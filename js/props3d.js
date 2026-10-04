/* =====================================================================
   FIT SPLIT · props3d.js
   ---------------------------------------------------------------------
   Equipamiento de gimnasio en 3D, a escala real (metros):
   barra olímpica, barra Z, mancuernas, bancos, rack, poleas, cables,
   asas, barra de dominadas, paralelas y máquinas guiadas.

   Cada pieza es un THREE.Object3D. Las piezas que se mueven durante el
   ejercicio (barra, mancuernas, cables, palancas) se crean una vez y se
   recolocan en cada fotograma con las funciones place* de abajo.
   ===================================================================== */

const Props3D = (() => {
  'use strict';
  const T = window.THREE;
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const v = a => (a instanceof T.Vector3 ? a.clone() : V3(a[0], a[1], a[2]));

  let M = null;
  function mats() {
    if (M) return M;
    const std = (color, metalness, roughness, extra = {}) => new T.MeshStandardMaterial({ color, metalness, roughness, ...extra });
    M = {
      steel: std('#c7ccd3', 0.75, 0.32),
      chrome: std('#dde2e8', 0.85, 0.22),
      plate: std('#25282d', 0.15, 0.68),
      plateRim: std('#3a3f47', 0.3, 0.55),
      plateRed: std('#8f2c2c', 0.1, 0.6),
      plateBlue: std('#24477a', 0.1, 0.6),
      rubber: std('#1b1d21', 0.05, 0.85),
      pad: std('#2c3038', 0.05, 0.62),
      padSeam: std('#3b404a', 0.05, 0.6),
      frame: std('#3d4451', 0.55, 0.42),
      frameLight: std('#59616f', 0.5, 0.42),
      stack: std('#2a2e35', 0.45, 0.5),
      cable: std('#d9dde3', 0.6, 0.35),
      grip: std('#141618', 0.1, 0.9),
      wood: std('#7b5a3c', 0.05, 0.7),
      floor: std('#1d2129', 0.05, 0.92)
    };
    return M;
  }

  /* --------------------------- Primitivas --------------------------- */
  const cylGeo = new T.CylinderGeometry(1, 1, 1, 28, 1);
  const cylGeoLo = new T.CylinderGeometry(1, 1, 1, 14, 1);
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  const sphGeo = new T.SphereGeometry(1, 20, 14);
  const hexGeo = new T.CylinderGeometry(1, 1, 1, 6, 1);
  function mesh(geo, mat, shadow = true) {
    const m = new T.Mesh(geo, mat);
    m.castShadow = shadow; m.receiveShadow = true;
    return m;
  }
  /* Cilindro entre dos puntos */
  function cylBetween(a, b, r, mat, lo = false) {
    const m = mesh(lo ? cylGeoLo : cylGeo, mat);
    placeCyl(m, a, b, r);
    return m;
  }
  function placeCyl(m, a, b, r) {
    a = v(a); b = v(b);
    const d = V3().subVectors(b, a), len = d.length() || 1e-4;
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
    m.scale.set(r, len, r);
  }
  /* Caja: centro, tamaño [x, y, z] y rotación opcional (Euler en grados) */
  function box(c, size, mat, rot) {
    const m = mesh(boxGeo, mat);
    m.position.set(...c); m.scale.set(...size);
    if (rot) m.rotation.set(rot[0] * Math.PI / 180, (rot[1] || 0) * Math.PI / 180, (rot[2] || 0) * Math.PI / 180);
    return m;
  }
  /* Cojín acolchado: caja con bordes redondeados (aprox.) */
  function pad(c, size, rot, mat) {
    const g = new T.Group();
    const [w, h, d] = size;
    const r = Math.min(h * 0.45, 0.03);
    g.add(box([0, 0, 0], [w - 2 * r, h, d], mat || mats().pad));
    g.add(box([0, 0, 0], [w, h - 2 * r, d - 0.002], mat || mats().pad));
    for (const sx of [-1, 1]) {
      const c2 = cylBetween([sx * (w / 2 - r), 0, -d / 2], [sx * (w / 2 - r), 0, d / 2], r, mat || mats().pad, true);
      c2.scale.x = r; c2.scale.z = r; c2.scale.y = d;
      c2.position.set(sx * (w / 2 - r), 0, 0);
      c2.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(0, 0, 1));
      g.add(c2);
    }
    g.position.set(...c);
    if (rot) g.rotation.set(rot[0] * Math.PI / 180, (rot[1] || 0) * Math.PI / 180, (rot[2] || 0) * Math.PI / 180);
    return g;
  }
  const tube = (a, b, r = 0.022, mat) => cylBetween(a, b, r, mat || mats().frame, true);

  /* ------------------------------ Barras ------------------------------ */
  /* Barra olímpica a lo largo del eje X local. plates: lista de radios */
  function barbell({ plates = [0.225], shaft = 1.31, sleeve = 0.41, ez = false } = {}) {
    const m = mats(), g = new T.Group();
    const half = shaft / 2;
    if (ez) {
      // Barra Z: tramo central con dos quiebros
      const pts = [[-half, 0, 0], [-0.17, 0, 0], [-0.13, 0, 0.022], [-0.07, 0, 0.022], [-0.035, 0, 0], [0.035, 0, 0], [0.07, 0, 0.022], [0.13, 0, 0.022], [0.17, 0, 0], [half, 0, 0]];
      for (let i = 0; i < pts.length - 1; i++) g.add(cylBetween(pts[i], pts[i + 1], 0.0135, m.chrome));
    } else {
      g.add(cylBetween([-half, 0, 0], [half, 0, 0], 0.0142, m.chrome));
      // Moleteado (zonas de agarre más oscuras)
      for (const s of [-1, 1]) g.add(cylBetween([s * 0.21, 0, 0], [s * 0.55, 0, 0], 0.0146, m.steel));
    }
    for (const s of [-1, 1]) {
      g.add(cylBetween([s * half, 0, 0], [s * (half + 0.03), 0, 0], 0.038, m.steel)); // tope
      g.add(cylBetween([s * (half + 0.03), 0, 0], [s * (half + sleeve), 0, 0], 0.025, m.chrome));
      let x = half + 0.04;
      for (const r of plates) {
        const w = r > 0.2 ? 0.055 : r > 0.15 ? 0.04 : 0.028;
        g.add(cylBetween([s * x, 0, 0], [s * (x + w), 0, 0], r, r > 0.2 ? m.plate : m.plateRim));
        g.add(cylBetween([s * (x - 0.002), 0, 0], [s * (x + w + 0.002), 0, 0], 0.03, m.steel, true));
        x += w + 0.004;
      }
      g.add(cylBetween([s * x, 0, 0], [s * (x + 0.025), 0, 0], 0.034, m.frameLight, true)); // cierre
    }
    return g;
  }
  /* Mancuerna a lo largo del eje X local */
  function dumbbell({ head = 0.062, len = 0.34, hex = true } = {}) {
    const m = mats(), g = new T.Group();
    g.add(cylBetween([-0.07, 0, 0], [0.07, 0, 0], 0.0165, m.chrome));
    for (const s of [-1, 1]) {
      const h = mesh(hex ? hexGeo : cylGeo, m.rubber);
      h.scale.set(head, 0.085, head);
      h.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(1, 0, 0));
      h.position.set(s * (0.07 + 0.0425), 0, 0);
      g.add(h);
      g.add(cylBetween([s * 0.07, 0, 0], [s * 0.078, 0, 0], 0.03, m.steel, true));
    }
    return g;
  }
  /* Orienta un objeto (eje X local) entre dos direcciones: centro, eje X y "arriba" */
  function orient(obj, center, xAxis, up = [0, 1, 0]) {
    const x = v(xAxis).normalize();
    let y = v(up); y.addScaledVector(x, -y.dot(x));
    if (y.lengthSq() < 1e-6) y = V3(0, 0, 1).addScaledVector(x, -x.z);
    y.normalize();
    const z = V3().crossVectors(x, y);
    obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    obj.position.copy(v(center));
    return obj;
  }

  /* ------------------------------ Asas ------------------------------ */
  function handle(type) {
    const m = mats(), g = new T.Group();
    if (type === 'rope') {
      for (const s of [-1, 1]) {
        g.add(cylBetween([0, 0.02, 0], [s * 0.13, -0.02, 0], 0.012, m.rubber));
        const k = mesh(sphGeo, m.rubber); k.scale.setScalar(0.022); k.position.set(s * 0.14, -0.025, 0); g.add(k);
      }
      g.add(cylBetween([0, 0.02, 0], [0, 0.07, 0], 0.008, m.steel));
    } else if (type === 'v') {
      for (const s of [-1, 1]) g.add(cylBetween([0, 0.06, 0], [s * 0.045, -0.06, 0], 0.013, m.chrome));
      for (const s of [-1, 1]) g.add(cylBetween([s * 0.045, -0.06, -0.06], [s * 0.045, -0.06, 0.06], 0.017, m.grip));
    } else if (type === 'lat') {
      g.add(cylBetween([-0.6, 0, 0], [0.6, 0, 0], 0.0145, m.chrome));
      for (const s of [-1, 1]) { g.add(cylBetween([s * 0.6, 0, 0], [s * 0.66, -0.06, 0], 0.0145, m.chrome)); g.add(cylBetween([s * 0.36, 0, 0], [s * 0.58, 0, 0], 0.018, m.grip)); }
      g.add(cylBetween([0, 0, 0], [0, 0.06, 0], 0.008, m.steel));
    } else if (type === 'straight') {
      g.add(cylBetween([-0.25, 0, 0], [0.25, 0, 0], 0.0145, m.chrome));
      g.add(cylBetween([0, 0, 0], [0, 0.05, 0], 0.008, m.steel));
    } else { // D: asa individual
      g.add(cylBetween([-0.06, 0, 0], [0.06, 0, 0], 0.016, m.grip));
      for (const s of [-1, 1]) g.add(cylBetween([s * 0.06, 0, 0], [0, 0.07, 0], 0.006, m.steel));
    }
    return g;
  }

  /* ------------------------------ Bancos ------------------------------ */
  /* Banco plano: pad a lo largo de Z, desde z0 hasta z1, altura del pad h */
  function benchFlat(z0, z1, h = 0.43, x = 0, width = 0.3) {
    const g = new T.Group(), m = mats();
    const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2;
    g.add(pad([x, h - 0.035, zc], [width, 0.07, len]));
    g.add(box([x, h - 0.085, zc], [0.08, 0.03, len - 0.1], m.frame));
    for (const z of [Math.min(z0, z1) + 0.12, Math.max(z0, z1) - 0.12]) {
      g.add(tube([x, 0.03, z], [x, h - 0.09, z], 0.025));
      g.add(tube([x - 0.24, 0.03, z], [x + 0.24, 0.03, z], 0.025));
    }
    return g;
  }
  /* Banco inclinable: asiento y respaldo (ángulo del respaldo desde horizontal) */
  function benchIncline({ seatZ, seatH = 0.45, back = 30, backLen = 0.85, seatLen = 0.36, x = 0 }) {
    const g = new T.Group(), m = mats();
    g.add(pad([x, seatH - 0.035, seatZ], [0.3, 0.07, seatLen]));
    const a = back * Math.PI / 180;
    const hingeZ = seatZ - seatLen / 2;
    const cz = hingeZ - Math.cos(a) * backLen / 2, cy = seatH + Math.sin(a) * backLen / 2;
    const b = pad([x, cy, cz], [0.3, 0.07, backLen], [back, 0, 0]); // sube hacia -z (detrás de quien se sienta)
    g.add(b);
    g.add(tube([x, 0.03, seatZ], [x, seatH - 0.08, seatZ], 0.028));
    g.add(tube([x, 0.03, hingeZ - 0.5], [x, 0.03, seatZ + 0.3], 0.028));
    g.add(tube([x, seatH - 0.08, hingeZ], [x, 0.03, hingeZ - Math.cos(a) * backLen * 0.75], 0.024));
    for (const z of [hingeZ - 0.45, seatZ + 0.25]) g.add(tube([x - 0.24, 0.03, z], [x + 0.24, 0.03, z], 0.025));
    return g;
  }

  /* ------------------------------ Estructuras ------------------------------ */
  function rack({ z = 0, w = 0.55, h = 2.1, hook = 1.05, safety = null } = {}) {
    const g = new T.Group(), m = mats();
    for (const sx of [-1, 1]) {
      for (const dz of [-0.3, 0.3]) g.add(box([sx * w, h / 2, z + dz], [0.07, h, 0.07], m.frame));
      g.add(box([sx * w, 0.03, z], [0.09, 0.06, 0.75], m.frame));
      g.add(box([sx * w, h - 0.03, z], [0.09, 0.06, 0.68], m.frame));
      g.add(box([sx * (w - 0.06), hook, z + 0.3], [0.06, 0.03, 0.09], m.frameLight)); // gancho
      if (safety != null) g.add(box([sx * (w - 0.04), safety, z], [0.05, 0.04, 0.68], m.frameLight));
    }
    g.add(box([0, h - 0.03, z - 0.3], [w * 2, 0.06, 0.06], m.frame));
    return g;
  }
  function pullupBar(y, z = 0, w = 0.65) {
    const g = new T.Group(), m = mats();
    g.add(cylBetween([-w, y, z], [w, y, z], 0.016, m.chrome));
    for (const sx of [-1, 1]) {
      g.add(box([sx * (w + 0.04), (y + 0.15) / 2, z - 0.25], [0.07, y + 0.15, 0.07], m.frame));
      g.add(tube([sx * (w + 0.04), y, z - 0.25], [sx * w, y, z], 0.02));
      g.add(box([sx * (w + 0.04), 0.03, z - 0.25], [0.1, 0.06, 0.8], m.frame));
    }
    return g;
  }
  function dipBars(y, x = 0.26, z0 = -0.35, z1 = 0.35) {
    const g = new T.Group(), m = mats();
    for (const sx of [-1, 1]) {
      g.add(cylBetween([sx * x, y, z0], [sx * x, y, z1], 0.02, m.chrome));
      for (const z of [z0 + 0.05, z1 - 0.05]) g.add(box([sx * (x + 0.02), y / 2, z], [0.06, y, 0.06], m.frame));
      g.add(box([sx * (x + 0.02), 0.03, (z0 + z1) / 2], [0.1, 0.06, z1 - z0 + 0.1], m.frame));
    }
    return g;
  }
  /* Torre de polea: columna con polea a cierta altura.
     face: 1 / -1 (mira hacia +z / -z) o [fx, fz] (dirección horizontal) */
  function cableTower(x, z, pulleyY, { stack = true, face = 1 } = {}) {
    const g = new T.Group(), m = mats();
    const f = Array.isArray(face) ? V3(face[0], 0, face[1]).normalize() : V3(0, 0, face);
    const yaw = Math.atan2(f.x, f.z);
    const local = new T.Group(); // construida mirando a +z y girada
    local.add(box([0, 1.1, 0], [0.09, 2.2, 0.09], m.frame));
    local.add(box([0, 0.03, 0], [0.5, 0.06, 0.5], m.frame));
    if (stack) {
      const sz = -0.18;
      local.add(box([0, 0.45, sz], [0.24, 0.8, 0.12], m.stack));
      for (let y = 0.1; y < 0.85; y += 0.05) local.add(box([0, y, sz + 0.062], [0.25, 0.006, 0.004], m.frameLight));
      local.add(tube([-0.1, 0.05, sz], [-0.1, 2.1, sz], 0.012));
      local.add(tube([0.1, 0.05, sz], [0.1, 2.1, sz], 0.012));
    }
    const p = mesh(cylGeo, m.chrome); p.scale.set(0.045, 0.025, 0.045);
    p.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(1, 0, 0));
    p.position.set(0, pulleyY, 0.06);
    local.add(p);
    local.add(box([0, pulleyY, 0.03], [0.06, 0.1, 0.06], m.frameLight));
    local.rotation.y = yaw;
    local.position.set(x, 0, z);
    g.add(local);
    return g;
  }
  /* Banco inclinado para apoyar el pecho (sin asiento): el respaldo sube
     hacia +z desde (z0, h0) con "incl" grados */
  function inclinePad({ z0 = -0.1, h0 = 0.5, incl = 30, len = 0.85, x = 0 } = {}) {
    const g = new T.Group(), m = mats();
    const a = incl * Math.PI / 180;
    const cz = z0 + Math.cos(a) * len / 2, cy = h0 + Math.sin(a) * len / 2;
    g.add(pad([x, cy, cz], [0.3, 0.07, len], [-incl, 0, 0]));
    const zt = z0 + Math.cos(a) * len * 0.8, yt = h0 + Math.sin(a) * len * 0.8;
    g.add(tube([x, 0.03, z0 + 0.05], [x, h0 - 0.05, z0 + 0.05], 0.028));
    g.add(tube([x, 0.03, zt], [x, yt - 0.06, zt], 0.028));
    g.add(tube([x, 0.03, z0 - 0.15], [x, 0.03, zt + 0.2], 0.028));
    for (const z of [z0 - 0.1, zt + 0.15]) g.add(tube([x - 0.26, 0.03, z], [x + 0.26, 0.03, z], 0.025));
    return g;
  }
  /* Bloque o escalón */
  function block(c, size) { return box(c, size, mats().frameLight); }
  /* Plataforma / suelo de goma */
  function platform(size = 3.2) {
    const g = new T.Group();
    const m = mesh(new T.CircleGeometry(size / 2, 64), mats().floor, false);
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
    g.add(m);
    return g;
  }

  return {
    mats, mesh, cylBetween, placeCyl, box, pad, tube, orient,
    barbell, dumbbell, handle, benchFlat, benchIncline, inclinePad, rack, pullupBar, dipBars, cableTower, block, platform,
    geo: { cyl: cylGeo, box: boxGeo, sph: sphGeo }
  };
})();
