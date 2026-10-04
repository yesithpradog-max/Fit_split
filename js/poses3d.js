/* =====================================================================
   FIT SPLIT · poses3d.js
   ---------------------------------------------------------------------
   Técnica de cada ejercicio en 3D. Cada patrón describe la posición
   inicial (t = 0) y el punto de transición (t = 1) con criterios de
   entrenador:
   - equilibrio: en los ejercicios de pie, el centro de masas (cuerpo +
     carga) se mantiene sobre el mediopié;
   - trayectoria de la barra: vertical sobre el mediopié en sentadilla,
     peso muerto y press militar; en "J" en el press de banca;
   - rodillas en la dirección de las puntas de los pies;
   - columna neutra (el tronco no se curva), cuello alineado;
   - rangos articulares seguros (los comprueba Poses3D.validate).

   Cada patrón devuelve:
     setup(scene)          crea el equipamiento (fijo y móvil)
     pose(t)               postura para Biomech.solve
     update(t, solved)     recoloca el equipamiento móvil
     cam                   ángulo de cámara inicial recomendado
     standing              true si el cuerpo se apoya solo en los pies
   ===================================================================== */

const Poses3D = (() => {
  'use strict';
  const T = window.THREE;
  const P = () => Props3D;
  const D = Math.PI / 180;
  const sin = a => Math.sin(a * D), cos = a => Math.cos(a * D);
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpA = (a, b, t) => a.map((x, i) => lerp(x, b[i], t));
  const ease = t => t * t * (3 - 2 * t);
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const v = a => (a instanceof T.Vector3 ? a.clone() : V3(a[0], a[1], a[2]));
  const arr = a => [a.x, a.y, a.z];

  /* ------------------------- Medidas del cuerpo ------------------------- */
  let R = null, L = null;
  function measure() {
    R = Biomech.rest;
    const s = R.side.L.L;
    const J = R.J;
    L = {
      sh: s.sh, th: s.th, ua: s.ua, fa: s.fa, hand: s.hand, foot: s.foot,
      to: R.torsoLen, ankleH: R.ankleH, hipW: R.hipHalf, shW: R.shoulderHalf,
      toeFront: J.toeL.z - J.ankleL.z, heelBack: J.ankleL.z - J.heelL.z,
      arm: s.ua + s.fa + 0.075
    };
    // Mediopié: centro del pie (del talón a la punta de los dedos) respecto al tobillo
    L.mid = ((J.heelL.z - 0.004) + (J.toeL.z + 0.059)) / 2 - J.ankleL.z;
    return L;
  }
  /* Punto del tronco (coordenadas de reposo relativas a la pelvis) → mundo */
  const torsoQ = torso => new T.Quaternion().setFromEuler(new T.Euler((torso.pitch || 0) * D, (torso.yaw || 0) * D, (torso.roll || 0) * D, 'YXZ'));
  function tp(pelvis, torso, loc) { return v(loc).applyQuaternion(torsoQ(torso)).add(v(pelvis)); }
  const rel = name => V3().subVectors(R.J[name], R.J.pelvis);
  /* Puntos de referencia del tronco (en reposo, relativos a la pelvis) */
  const LM = {
    shoulderL: () => rel('shoulderL'),
    highBar: () => V3(0, 0.545, -0.078),     // barra alta sobre el trapecio
    frontRack: () => V3(0, 0.505, 0.098),    // barra sobre los deltoides anteriores
    chestLow: () => V3(0, 0.36, 0.152),      // parte baja del pecho (contacto en press de banca)
    chestUp: () => V3(0, 0.44, 0.148),       // pecho alto (press inclinado)
    sternumTop: () => V3(0, 0.49, 0.13),
    navel: () => V3(0, 0.16, 0.13),
    hipCrease: () => V3(0, -0.03, 0.115),    // pliegue de la cadera (barra del hip thrust)
    upperBack: () => V3(0, 0.38, -0.115),    // apoyo en el banco (hip thrust)
    chin: () => V3(0, 0.68, 0.11)
  };

  /* Cadena de la pierna en el plano sagital, desde el tobillo.
     s: inclinación de la tibia (+ hacia delante); q: inclinación del muslo
     (+ cadera por detrás de la rodilla). La flexión de rodilla es s + q. */
  function legChain(ankleZ, s, q, ankleY, widen = 0) {
    const k = Math.cos(widen * D); // piernas abiertas: proyección sagital
    const ky = ankleY + L.sh * cos(s) * k, kz = ankleZ + L.sh * sin(s);
    return { knee: [kz, ky], hip: [kz - L.th * sin(q), ky + L.th * cos(q) * k] };
  }
  /* Piernas de pie: tobillos a ±w, puntas abiertas "toe" grados,
     rodillas en la dirección de los pies */
  function standLegs(w, z, toe = 10, extra = {}) {
    const mk = sx => ({
      ankle: [sx * w, L.ankleH, z], footYaw: toe,
      pole: [sx * sin(toe + 4), 0, cos(toe + 4)], ...extra
    });
    return { L: mk(1), R: mk(-1) };
  }
  /* Espejo izquierda → derecha de una especificación de brazo */
  const mirrorV = a => (a ? [-a[0], a[1], a[2]] : a);
  function arms(a, b) {
    const right = b || { ...a, grip: mirrorV(a.grip), dir: mirrorV(a.dir), palm: mirrorV(a.palm), pole: mirrorV(a.pole), handDir: mirrorV(a.handDir) };
    return { L: a, R: right };
  }
  /* Bisección para resolver una condición de equilibrio */
  function solve1(f, lo, hi, it = 32) {
    let flo = f(lo);
    const fhi = f(hi);
    if ((flo > 0) === (fhi > 0)) return Math.abs(flo) < Math.abs(fhi) ? lo : hi; // sin cambio de signo: el extremo más cercano
    for (let i = 0; i < it; i++) {
      const m = (lo + hi) / 2, fm = f(m);
      if ((fm > 0) === (flo > 0)) { lo = m; flo = fm; } else hi = m;
    }
    return (lo + hi) / 2;
  }
  /* Centro de masas aproximado (para el equilibrio al diseñar la postura) */
  function comZ(spec) { return Biomech.solve(spec).info.com.z; }

  /* -------------------- Contorno anterior de la pierna --------------------
     Distancia (m) desde el eje óseo hasta la superficie delantera, medida en
     el modelo: u = 0 tobillo → 1 rodilla (tibia) y 0 rodilla → 1 cadera (muslo).
     Sirve para que la barra baje rozando las piernas sin atravesarlas. */
  const SHIN_FRONT = [[0, 0.025], [0.25, 0.022], [0.5, 0.03], [0.75, 0.038], [1, 0.05]];
  const THIGH_FRONT = [[0, 0.05], [0.15, 0.056], [0.3, 0.068], [0.5, 0.074], [0.7, 0.07], [0.9, 0.057], [1, 0.06]];
  function table(tab, u) {
    for (let i = 1; i < tab.length; i++) if (u <= tab[i][0]) return lerp(tab[i - 1][1], tab[i][1], (u - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]));
    return tab[tab.length - 1][1];
  }
  /* Puntos sagitales [z, y]: tobillo A, rodilla K, cadera H */
  function legFront(y, A, K, H) {
    const pts = [];
    const seg = (P0, P1, tab) => {
      const dz = P1[0] - P0[0], dy = P1[1] - P0[1], l = Math.hypot(dz, dy);
      const nz = dy / l, ny = -dz / l; // normal hacia delante
      for (let u = 0; u <= 1.0001; u += 0.05) {
        const o = table(tab, u);
        pts.push([P0[0] + dz * u + nz * o, P0[1] + dy * u + ny * o]);
      }
    };
    seg(A, K, SHIN_FRONT); seg(K, H, THIGH_FRONT);
    let best = -1;
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) best = Math.max(best, lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1])));
    }
    return best > -1 ? best : Math.max(...pts.map(p => p[0]));
  }
  /* Cadena sagital de la pierna a partir de los ángulos de tibia (s) y muslo (q) */
  function sagLeg(s, q, ankleZ = 0) {
    const A = [ankleZ, L.ankleH];
    const K = [A[0] + L.sh * sin(s), A[1] + L.sh * cos(s)];
    const H = [K[0] - L.th * sin(q), K[1] + L.th * cos(q)];
    return { A, K, H };
  }
  /* Cadera a partir de tobillo y objetivo (IK sagital, rodilla hacia delante) */
  function sagIK(A, H) {
    const dz = H[0] - A[0], dy = H[1] - A[1];
    const d = Math.min(Math.hypot(dz, dy), L.sh + L.th - 1e-4);
    const a = Math.acos(Math.max(-1, Math.min(1, (L.sh * L.sh + d * d - L.th * L.th) / (2 * L.sh * d))));
    const base = Math.atan2(dz, dy); // ángulo desde la vertical
    const sAng = base + a; // la rodilla queda por delante
    const K = [A[0] + L.sh * Math.sin(sAng), A[1] + L.sh * Math.cos(sAng)];
    return { K, s: sAng / D, q: Math.atan2(K[0] - H[0], H[1] - K[1]) / D };
  }
  /* Barra colgando de los brazos extendidos que roza las piernas:
     devuelve [z, y] del centro de la barra */
  function hangOnLegs(S, leg, r, armEff, zMin = -1) {
    let z = Math.max(zMin, leg.K[0] + 0.06), y = S[1] - armEff;
    for (let i = 0; i < 6; i++) {
      z = Math.max(zMin, legFront(y, leg.A, leg.K, leg.H) + r);
      const dz = S[0] - z;
      y = S[1] - Math.sqrt(Math.max(0, armEff * armEff - dz * dz));
    }
    return [z, y];
  }
  /* Longitud efectiva hombro → centro del agarre con el codo extendido */
  const armEff = () => Math.hypot(L.ua + L.fa + 0.075, 0.022) - 0.004;

  /* ---------------------- Marco local del tronco ----------------------
     Coordenadas de reposo relativas a la pelvis: x = izquierda, y = hacia
     la cabeza, z = hacia delante. Así brazos y agarres se describen igual
     esté el cuerpo de pie, sentado, inclinado o tumbado. */
  const SH = () => rel('shoulderL');
  function armLocal(pelvis, torso, a) {
    const q = torsoQ(torso), dir = d => (d ? arr(v(d).applyQuaternion(q)) : d);
    return { ...a, grip: a.grip ? arr(tp(pelvis, torso, a.grip)) : undefined, dir: dir(a.dir), palm: dir(a.palm), pole: dir(a.pole), handDir: dir(a.handDir) };
  }
  const mirrorA = a => ({ ...a, grip: mirrorV(a.grip), dir: mirrorV(a.dir), palm: mirrorV(a.palm), pole: mirrorV(a.pole), handDir: mirrorV(a.handDir) });
  /* Brazos en el marco local (b: brazo derecho propio; si falta, espejo del izquierdo) */
  function armsL(pelvis, torso, a, b) { return { L: armLocal(pelvis, torso, a), R: armLocal(pelvis, torso, b || mirrorA(a)) }; }
  /* Dirección en el plano sagital local: ángulo desde "abajo" hacia delante */
  const sagDir = (ang, x = 0) => V3(x, -Math.cos(ang * D), Math.sin(ang * D)).normalize();
  /* De pie y en equilibrio: la tibia se inclina lo justo para que el centro
     de masas (cuerpo + carga) quede sobre el mediopié (+ shift).
     build(pelvis) → especificación (sin piernas, o con ellas) */
  function stand(o, build) {
    const k = o.k != null ? o.k : 4, w = o.w || 0.11, toe = o.toe != null ? o.toe : 7, shift = o.shift || 0, z = o.z || 0;
    const mk = s => {
      const leg = sagLeg(s, k - s, z);
      const sp = build([0, leg.H[1], leg.H[0]]);
      if (!sp.legs) sp.legs = standLegs(w, 0, toe);
      return sp;
    };
    return mk(solve1(s => comZ(mk(s)) - (z + L.mid + shift), -14, 22, 20));
  }
  /* Carga en las manos; en modo dirección se estima desde el hombro */
  /* Agarre real (mundo) que produce una especificación (p. ej. en modo dirección) */
  const probeGrip = (spec, S = 'L') => Biomech.solve(spec).info.arms[S].grip.clone();
  /* Hombro real (marco local) con el brazo apuntando en "dir" (la escápula se mueve) */
  function shoulderFor(torso, dirLocal, extra = {}) {
    const pel = [0, 1, 0];
    const sp = { pelvis: pel, torso, arms: armsL(pel, torso, { dir: dirLocal, flex: 10, palm: [0, 0, 1], pole: [0, 0, -1], ...extra }) };
    return toLocal(pel, torso, Biomech.solve(sp).info.arms.L.shoulder);
  }
  const toLocal = (pelvis, torso, p) => v(p).sub(v(pelvis)).applyQuaternion(torsoQ(torso).invert());
  /* Agarre (marco local) con los brazos extendidos por encima de la cabeza (codo ~6°) */
  function overheadTop(torso, gx, extra = {}) {
    const pel = [0, 1, 0], r = Biomech.reach(6), dx = gx - SH().x;
    const g = probeGrip({ pelvis: pel, torso, arms: armsL(pel, torso, { dir: [dx, Math.sqrt(r * r - dx * dx), -0.01], flex: 6, ...extra }) });
    return toLocal(pel, torso, g);
  }
  const dbLoad = (a, kg, pelvis, torso) => ['L', 'R'].map(S => {
    if (a[S].grip) return { kg, at: a[S].grip };
    const sh = tp(pelvis, torso, S === 'L' ? SH() : mirrorV(arr(SH())));
    return { kg, at: arr(sh.addScaledVector(v(a[S].dir), Biomech.reach(a[S].flex || 0))) };
  });

  /* Piernas sentado: pies apoyados delante (rodillas hacia delante y arriba) */
  function seatLegs(pelvis, w = 0.14, reach = 0.45, toe = 8) {
    const z = pelvis[2] + reach;
    return {
      L: { ankle: [w, L.ankleH, z], footYaw: toe, pole: [0.15, 0.6, 1] },
      R: { ankle: [-w, L.ankleH, z], footYaw: toe, pole: [-0.15, 0.6, 1] }
    };
  }
  /* Pies escalonados: izquierdo delante (planta apoyada), derecho detrás sobre la punta */
  function splitLegs(frontZ, backZ, toe = 8, backPitch = 18) {
    return {
      L: { ankle: [0.11, L.ankleH, frontZ], footYaw: toe, pole: [0.1, 0, 1] },
      R: { toe: [-0.11, R.toeH, backZ + 0.1], footPitch: -backPitch, footYaw: toe, pole: [-0.1, 0, 1] }
    };
  }
  /* Banco inclinado para apoyar el pecho: superficie que sube hacia +z */
  const PRONE = { z0: -0.2, h0: 0.5, len: 0.85 };
  function proneBench(incl) { return P().inclinePad({ z0: PRONE.z0, h0: PRONE.h0, incl, len: PRONE.len }); }
  /* Pelvis de una persona boca abajo sobre ese banco (pecho apoyado) */
  function inclineProne(incl, along = 0.06) {
    const a = incl * D, dir = V3(0, Math.sin(a), Math.cos(a)), n = V3(0, Math.cos(a), -Math.sin(a));
    const p = V3(0, PRONE.h0, PRONE.z0).addScaledVector(dir, along).addScaledVector(n, 0.035 + 0.125);
    return arr(p);
  }
  /* Piernas hacia atrás con las puntas de los pies en el suelo */
  function proneLegs(pelvis, back = 0.5) {
    return {
      L: { toe: [0.12, R.toeH, pelvis[2] - back], footPitch: -38, pole: [0.05, -0.4, 1] },
      R: { toe: [-0.12, R.toeH, pelvis[2] - back], footPitch: -38, pole: [-0.05, -0.4, 1] }
    };
  }
  /* Máquina de press de hombro: palancas desde un eje tras el respaldo */
  function machineArms(scene) { return leverArms(scene, [0.44, 0.92, -0.32], { post: true }); }
  /* Máquina de gemelos de pie: almohadillas sobre los hombros */
  function calfMachine(scene) {
    const m = P().mats();
    const padL = P().pad([0, 0, 0], [0.12, 0.08, 0.2]), padR = P().pad([0, 0, 0], [0.12, 0.08, 0.2]);
    const beam = P().mesh(P().geo.cyl, m.frameLight);
    scene.add(padL, padR, beam, P().box([0, 1.0, -0.42], [0.1, 2.0, 0.1], m.frame), P().box([0, 0.03, -0.3], [0.7, 0.06, 0.6], m.frame));
    return solved => {
      const sL = solved.info.arms.L.shoulder, sR = solved.info.arms.R.shoulder;
      padL.position.set(sL.x - 0.035, sL.y + 0.085, sL.z - 0.01); padR.position.set(sR.x + 0.035, sR.y + 0.085, sR.z - 0.01);
      P().placeCyl(beam, V3(0, sL.y + 0.13, -0.42), V3(0, sL.y + 0.13, sL.z), 0.03);
    };
  }

  /* Sentado con la espalda en un respaldo de "back" grados (90 = vertical):
     pelvis sobre el asiento y espalda en contacto con el cojín */
  function seatPose({ seatH = 0.46, seatZ = 0.06, back = 90, seatLen = 0.36 }) {
    const b = back * D, hinge = seatZ - seatLen / 2;
    return { pelvis: [0, seatH + 0.088, hinge + (0.13 - 0.088 * Math.cos(b)) / Math.sin(b)], torso: { pitch: back - 90 } };
  }
  /* Asas en palancas que giran alrededor de un eje (press de pecho y de hombro,
     remo). La palanca va por fuera del cuerpo, en el plano x = ±pivot.x, y un
     travesaño corto la une al asa: así nunca atraviesa hombros ni brazos. */
  function leverArms(scene, pivot, { vertical = true, post = true } = {}) {
    const m = P().mats(), parts = [];
    for (const sx of [1, -1]) {
      const lever = P().mesh(P().geo.cyl, m.frameLight), link = P().mesh(P().geo.cyl, m.frameLight), grip = P().handle('D');
      scene.add(lever, link, grip); parts.push({ sx, lever, link, grip });
      if (post) scene.add(P().box([sx * pivot[0], pivot[1] / 2, pivot[2]], [0.07, pivot[1], 0.07], m.frame));
      const hub = P().mesh(P().geo.cyl, m.chrome); P().placeCyl(hub, [sx * (pivot[0] - 0.05), pivot[1], pivot[2]], [sx * (pivot[0] + 0.05), pivot[1], pivot[2]], 0.035); scene.add(hub);
    }
    return solved => {
      for (const p of parts) {
        const g = solved.info.arms[p.sx > 0 ? 'L' : 'R'].grip;
        const end = V3(p.sx * pivot[0], g.y, g.z);
        P().placeCyl(p.lever, V3(p.sx * pivot[0], pivot[1], pivot[2]), end, 0.022);
        P().placeCyl(p.link, end, V3(g.x + p.sx * 0.065, g.y, g.z), 0.016);
        P().orient(p.grip, g, vertical ? V3(0, 1, 0) : V3(1, 0, 0), V3(p.sx, 0, 0));
      }
    };
  }
  const leverHandles = (scene, pivot) => leverArms(scene, pivot, { vertical: true });
  const rowHandles = scene => leverArms(scene, [0.42, 1.68, 0.52], { vertical: true });
  /* Brazos del contractor / pájaro: giran alrededor de ejes verticales sobre los hombros */
  function flyArms(scene, seat, rev) {
    const m = P().mats(), parts = [];
    for (const sx of [1, -1]) {
      const lever = P().mesh(P().geo.cyl, m.frameLight), post = P().mesh(P().geo.cyl, m.frameLight), grip = P().mesh(P().geo.cyl, m.grip);
      scene.add(lever, post, grip); parts.push({ sx, lever, post, grip });
    }
    scene.add(P().box([0, 1.0, rev ? 0.42 : -0.38], [0.1, 2.0, 0.1], m.frame), P().box([0, 1.95, rev ? 0.3 : -0.25], [0.6, 0.07, 0.3], m.frame));
    return solved => {
      for (const p of parts) {
        const a = solved.info.arms[p.sx > 0 ? 'L' : 'R'];
        const piv = V3(p.sx * 0.17, 1.95, a.shoulder.z + (rev ? 0.02 : -0.02));
        const top = a.grip.clone().add(V3(0, 0.1, 0));
        P().placeCyl(p.grip, a.grip.clone().add(V3(0, -0.08, 0)), top, 0.016);
        P().placeCyl(p.post, piv, V3(piv.x, top.y, piv.z), 0.02);
        P().placeCyl(p.lever, V3(piv.x, top.y, piv.z), top, 0.018);
      }
    };
  }
  /* Pies contra la plataforma del remo en polea (rodillas algo flexionadas) */
  function footPlate(pelvis, dist, h) {
    return {
      L: { ankle: [0.12, h + 0.1, pelvis[2] + dist - 0.08], footPitch: 62, footYaw: 4, pole: [0.15, 1, 0.1] },
      R: { ankle: [-0.12, h + 0.1, pelvis[2] + dist - 0.08], footPitch: 62, footYaw: 4, pole: [-0.15, 1, 0.1] }
    };
  }
  /* Rodillo sobre la parte baja de la espinilla (extensión / curl sentado) */
  function shinRoller(scene, side, thighPadToo) {
    const m = P().mats();
    const roll = P().mesh(P().geo.cyl, m.pad), lever = P().mesh(P().geo.cyl, m.frameLight);
    scene.add(roll, lever);
    let tp2 = null;
    if (thighPadToo) { tp2 = P().pad([0, 0, 0], [0.42, 0.07, 0.14]); scene.add(tp2); }
    return solved => {
      const lL = solved.info.legs.L, lR = solved.info.legs.R;
      const sd = V3().subVectors(lL.ankle, lL.knee).normalize();
      const fwd = V3(0, sd.z, -sd.y).multiplyScalar(side === 'front' ? 1 : -1); // perpendicular a la tibia (delante o detrás)
      const c = V3().addVectors(lL.ankle, lR.ankle).multiplyScalar(0.5).addScaledVector(sd, -0.07).addScaledVector(fwd, 0.065);
      P().placeCyl(roll, c.clone().setX(-0.2), c.clone().setX(0.2), 0.045);
      const pivot = V3(0.3, lL.knee.y, lL.knee.z);
      P().placeCyl(lever, pivot, c.clone().setX(0.3), 0.02);
      if (tp2) { const k = V3().addVectors(lL.knee, lR.knee).multiplyScalar(0.5); tp2.position.set(0, k.y + 0.1, k.z - 0.1); }
    };
  }
  /* Almohadillas por fuera de las rodillas (abducción) */
  function kneePads(scene) {
    const pads = [1, -1].map(sx => { const p = P().pad([0, 0, 0], [0.07, 0.16, 0.12]); scene.add(p); return p; });
    const levers = [1, -1].map(() => { const l = P().mesh(P().geo.cyl, P().mats().frameLight); scene.add(l); return l; });
    return solved => {
      [1, -1].forEach((sx, i) => {
        const k = solved.info.legs[sx > 0 ? 'L' : 'R'].knee;
        pads[i].position.set(k.x + sx * 0.08, k.y, k.z - 0.02);
        P().placeCyl(levers[i], V3(sx * 0.12, 0.32, 0.0), V3(k.x + sx * 0.09, k.y - 0.06, k.z - 0.02), 0.02);
      });
    };
  }
  /* Almohadilla sobre la parte baja de los muslos (gemelos sentado) */
  function thighPad(scene) {
    const p = P().pad([0, 0, 0], [0.46, 0.08, 0.16]), lever = P().mesh(P().geo.cyl, P().mats().frameLight);
    scene.add(p, lever, P().box([0.33, 0.5, 0.2], [0.07, 1.0, 0.07], P().mats().frame));
    return solved => {
      const k = V3().addVectors(solved.info.legs.L.knee, solved.info.legs.R.knee).multiplyScalar(0.5);
      p.position.set(0, k.y + 0.085, k.z - 0.09);
      P().placeCyl(lever, V3(0.33, k.y + 0.09, k.z - 0.09), V3(0.23, k.y + 0.09, k.z - 0.09), 0.02);
    };
  }

  /* --------------------------- Equipamiento --------------------------- */
  function bar(scene, opts) { const b = P().barbell(opts); scene.add(b); return b; }
  function dbs(scene, opts) { const a = P().dumbbell(opts), b = P().dumbbell(opts); scene.add(a, b); return [a, b]; }
  /* Coloca la barra entre los dos agarres */
  function placeBar(b, solved) {
    const gL = solved.info.arms.L.grip, gR = solved.info.arms.R.grip;
    P().orient(b, V3().addVectors(gL, gR).multiplyScalar(0.5), V3().subVectors(gL, gR));
  }
  /* Mancuernas en las manos: el mango sigue el eje transversal de la mano */
  function placeDB(d, solved, S, axis) {
    const a = solved.info.arms[S];
    P().orient(d, a.grip, axis || V3(1, 0, 0), V3().subVectors(a.wrist, a.elbow));
  }
  const handAxis = (solved, S) => {
    const q = solved.pose.q['hand' + S];
    return V3(1, 0, 0).applyQuaternion(q);
  };
  /* Cable entre una polea y un punto */
  function cable(scene) { const c = P().mesh(P().geo.cyl, P().mats().cable); c.castShadow = false; scene.add(c); return c; }
  const setCable = (c, a, b) => P().placeCyl(c, a, b, 0.0035);
  /* Cuerda de tríceps: nudo + dos cabos hasta las manos */
  function rope(scene) {
    const m = P().mats();
    const r = { a: P().mesh(P().geo.cyl, m.rubber), b: P().mesh(P().geo.cyl, m.rubber), c: cable(scene) };
    scene.add(r.a, r.b);
    return r;
  }
  function setRope(r, pulley, gL, gR, drop = 0.1) {
    const mid = V3().addVectors(gL, gR).multiplyScalar(0.5);
    const knot = mid.clone().add(V3().subVectors(v(pulley), mid).setLength(drop));
    P().placeCyl(r.a, knot, gL, 0.011); P().placeCyl(r.b, knot, gR, 0.011);
    setCable(r.c, pulley, knot);
  }
  /* Asa recta o en D enganchada a un cable */
  function placeHandle(h, c, pulley, gL, gR) {
    const mid = gR ? V3().addVectors(gL, gR).multiplyScalar(0.5) : v(gL);
    P().orient(h, mid, gR ? V3().subVectors(gL, gR) : V3(1, 0, 0), V3().subVectors(v(pulley), mid));
    setCable(c, pulley, mid);
  }

  /* =====================================================================
     PATRONES
     ===================================================================== */
  const PATTERNS = {};

  /* ---------------- SENTADILLAS ---------------- */
  /* Sentadilla con barra alta / frontal / goblet: las rodillas avanzan en la
     dirección de los pies, la cadera baja hasta algo por debajo de la
     rodilla y el tronco se inclina lo justo para que barra y centro de
     masas queden sobre el mediopié. */
  PATTERNS.squat = o => {
    const front = !!o.front, goblet = !!o.goblet;
    const w = goblet ? 0.19 : 0.17, toe = goblet ? 24 : 18, widen = 7;
    const load = goblet ? 24 : front ? 50 : 70;
    const barLoc = front ? LM.frontRack() : LM.highBar();
    const S0 = [3, 2], S1 = goblet ? [38, 92] : front ? [37, 84] : [34, 86];
    function spec(t) {
      const e = ease(t);
      const s = lerp(S0[0], S1[0], e), q = lerp(S0[1], S1[1], e);
      const ch = legChain(0, s, q, L.ankleH, widen);
      const pelvis = [0, ch.hip[1], ch.hip[0]];
      const base = { pelvis, legs: standLegs(w, 0, toe), head: -4 };
      const armsFor = torso => {
        if (goblet) {
          const c = tp(pelvis, torso, V3(0, 0.36, 0.2));
          return arms({ grip: [0.045, c.y + 0.03, c.z - 0.005], palm: [-0.7, 0.55, 0.45], pole: [0.25, -1, 0.15], curl: 0.55 });
        }
        const b = tp(pelvis, torso, barLoc);
        if (front) {
          const fwd = V3(0, 0, 1).applyQuaternion(torsoQ(torso)), up = V3(0, 1, 0).applyQuaternion(torsoQ(torso));
          return arms({ grip: [0.235, b.y + 0.0, b.z + 0.04], palm: arr(up.clone().multiplyScalar(0.8).add(fwd.clone().multiplyScalar(-0.6))), pole: arr(fwd.clone().add(V3(0.15, 0, 0))), curl: 0.45, wrist: -62 });
        }
        return arms({ grip: [0.42, b.y + 0.005, b.z], palm: [0, -0.35, 1], pole: [0.2, -1, -0.75], curl: 0.92 });
      };
      // Equilibrio: el centro de masas (con la carga) sobre el mediopié
      const p = solve1(pp => {
        const torso = { pitch: pp };
        const sp = { ...base, torso, arms: armsFor(torso) };
        const loadAt = goblet ? tp(pelvis, torso, V3(0, 0.36, 0.22)) : tp(pelvis, torso, barLoc);
        sp.load = [{ kg: load, at: loadAt }];
        return comZ(sp) - L.mid;
      }, -5, 70);
      const torso = { pitch: p };
      return { ...base, torso, arms: armsFor(torso), load: [{ kg: load, at: goblet ? tp(pelvis, torso, V3(0, 0.36, 0.22)) : tp(pelvis, torso, barLoc) }] };
    }
    return {
      standing: true, cam: { yaw: -58, pitch: 10 },
      setup(scene) {
        const d = {};
        if (goblet) { d.db = P().dumbbell({ head: 0.075 }); scene.add(d.db); }
        else { d.bar = bar(scene, { plates: front ? [0.225] : [0.225, 0.2] }); scene.add(P().rack({ z: -0.5, hook: 1.35, safety: 0.55 })); }
        return d;
      },
      pose: spec,
      update(d, t, solved) {
        if (goblet) {
          const c = V3().addVectors(solved.info.arms.L.grip, solved.info.arms.R.grip).multiplyScalar(0.5);
          P().orient(d.db, c.add(V3(0, -0.11, 0.02)), solved.info.torsoUp, solved.info.torsoFwd);
        } else {
          const sp = solved.spec;
          const b = tp(sp.pelvis, sp.torso, front ? LM.frontRack() : LM.highBar());
          P().orient(d.bar, b, V3(1, 0, 0));
        }
      }
    };
  };

  /* ---------------- PESO MUERTO RUMANO / BUENOS DÍAS ----------------
     Rodillas ligeramente flexionadas (casi fijas); la cadera va hacia atrás
     mientras la espalda se mantiene neutra. La flexión de cadera se detiene
     en torno a 90° (estiramiento de isquios), con la barra (o mancuernas)
     bajando pegada a muslos y tibias. Las tibias quedan casi verticales y el
     centro de masas (cuerpo + carga) siempre sobre el mediopié. */
  PATTERNS.rdl = o => {
    const onBack = o.bar === 'back', db = o.equip === 'dumbbell';
    const k1 = onBack ? 20 : 18, hipFlex = onBack ? 88 : 92;
    const w = 0.105, load = db ? 30 : onBack ? 40 : 60;
    const gw = db ? 0.12 : 0.245, r = db ? 0.066 : 0.0145;
    function spec(t) {
      const e = ease(t);
      const k = lerp(5, k1, e), flex = lerp(3, hipFlex, e);
      const build = s => {
        const q = k - s, p = flex - q;
        const leg = sagLeg(s, q);
        const pelvis = [0, leg.H[1], leg.H[0]];
        const torso = { pitch: p };
        let armsSpec, loadAt;
        if (onBack) {
          const b = tp(pelvis, torso, LM.highBar());
          armsSpec = arms({ grip: [0.42, b.y + 0.005, b.z], palm: [0, -0.35, 1], pole: [0.2, -1, -0.75], curl: 0.92 });
          loadAt = b;
        } else {
          const sh = tp(pelvis, torso, LM.shoulderL());
          const [bz, by] = hangOnLegs([sh.z, sh.y], leg, r, armEff());
          armsSpec = arms({ grip: [gw, by, bz], palm: [0, 0, -1], pole: [0.25, 0, -1], curl: 0.95, upRot: 0, protract: 0 });
          loadAt = V3(0, by, bz);
        }
        return { pelvis, torso, legs: standLegs(w, 0, 5), arms: armsSpec, head: -5 - 10 * e, load: [{ kg: load, at: loadAt }] };
      };
      // Equilibrio: inclinación de la tibia que deja el centro de masas sobre el mediopié
      const s = solve1(sv => comZ(build(sv)) - L.mid, -12, 16);
      return build(s);
    }
    return {
      standing: true, cam: { yaw: -72, pitch: 8 },
      setup(scene) {
        if (db) { const [a, b] = dbs(scene, { head: 0.066 }); return { a, b }; }
        return { bar: bar(scene, { plates: onBack ? [0.2] : [0.225] }) };
      },
      pose: spec,
      update(d, t, solved) {
        if (db) { placeDB(d.a, solved, 'L', V3(1, 0, 0)); placeDB(d.b, solved, 'R', V3(1, 0, 0)); }
        else if (onBack) P().orient(d.bar, tp(solved.spec.pelvis, solved.spec.torso, LM.highBar()), V3(1, 0, 0));
        else placeBar(d.bar, solved);
      }
    };
  };

  /* ---------------- PESO MUERTO CONVENCIONAL ----------------
     Inicio: barra sobre el mediopié rozando las tibias; hombros un poco
     por delante de la barra; brazos extendidos; cadera entre rodillas y
     hombros; espalda neutra. La barra sube en línea recta: hasta la
     rodilla el ángulo de la espalda se mantiene (empujan las piernas) y
     después la cadera se extiende hasta quedar erguido, sin echarse atrás. */
  PATTERNS.deadlift = () => {
    const plateR = 0.225, r = 0.0145, gw = 0.245, load = 100;
    const top = tp([0, R.J.pelvis.y, 0], { pitch: 0 }, LM.shoulderL()).y - armEff() + 0.004;
    const kneeY = L.ankleH + L.sh;
    /* Para una altura de barra y una flexión de rodilla: la tibia (s) se
       ajusta para equilibrar el sistema y el tronco (p) para que los brazos,
       extendidos, lleguen a la barra, que roza las piernas. */
    function build(barY, knee, s) {
      const leg = sagLeg(s, knee - s);
      const zb = legFront(barY, leg.A, leg.K, leg.H) + r + 0.003;
      const pelvis = [0, leg.H[1], leg.H[0]];
      const p = solve1(pp => { const S = tp(pelvis, { pitch: pp }, LM.shoulderL()); return Math.hypot(S.z - zb, S.y - barY) - armEff(); }, -8, 88, 26);
      return {
        pelvis, torso: { pitch: p }, legs: standLegs(0.115, 0, 6),
        head: lerp(-12, -2, (barY - plateR) / (top - plateR)),
        arms: arms({ grip: [gw, barY, zb], palm: [0, 0, -1], pole: [0.25, 0, -1], curl: 0.97, upRot: 0, protract: 0 }),
        load: [{ kg: load, at: [0, barY, zb] }]
      };
    }
    // Flexión de rodilla según la altura de la barra: casi extendidas al pasar la rodilla
    const KEYS = [[plateR, 84], [kneeY + 0.03, 22], [(kneeY + top) / 2 + 0.02, 8], [top, 1]];
    const knee = y => {
      for (let i = 1; i < KEYS.length; i++) if (y <= KEYS[i][0] + 1e-6) return lerp(KEYS[i - 1][1], KEYS[i][1], (y - KEYS[i - 1][0]) / (KEYS[i][0] - KEYS[i - 1][0]));
      return 1;
    };
    function spec(t) {
      const barY = lerp(plateR, top, ease(t)), k = knee(barY);
      const s = solve1(sv => comZ(build(barY, k, sv)) - L.mid, -10, 30, 22);
      return build(barY, k, s);
    }
    return {
      standing: true, cam: { yaw: -70, pitch: 8 },
      setup(scene) { return { bar: bar(scene, { plates: [0.225, 0.225] }) }; },
      pose: spec,
      update(d, t, solved) { placeBar(d.bar, solved); }
    };
  };

  /* ---------------- PRESS DE BANCA (plano, inclinado, cerrado) ----------------
     Tumbado con cinco apoyos: pies firmes, glúteos, espalda alta y cabeza en
     el banco; escápulas juntas. La barra baja con control hasta la parte
     baja del pecho (o el pecho alto en inclinado) con los codos a ~45–70°
     del tronco y los antebrazos verticales; sube hacia la línea de los
     hombros. */
  PATTERNS.bench = o => {
    const inc = o.incline || 0, close = !!o.close, dumb = o.equip === 'dumbbell';
    const benchH = 0.43;
    const seat = { seatH: 0.45, seatZ: 0.14, back: inc, seatLen: 0.36 };
    const body = inc ? seatPose(seat) : { pelvis: [0, benchH + 0.098, 0.0], torso: { pitch: -88 } };
    const { pelvis, torso } = body;
    const legs = inc ? seatLegs(pelvis, 0.24, 0.5, 14) : {
      L: { ankle: [0.3, L.ankleH, pelvis[2] + 0.4], footYaw: 16, pole: [0.45, 1, 0.3] },
      R: { ankle: [-0.3, L.ankleH, pelvis[2] + 0.4], footYaw: 16, pole: [-0.45, 1, 0.3] }
    };
    const gw = close ? 0.19 : dumb ? 0.2 : 0.27;
    const scap = { upRot: 0, protract: -8 };
    const palmL = dumb ? [0.15, -1, 0.1] : [0, -1, 0.15];
    const poleL = close ? [0.35, -1, -0.35] : dumb ? [1, -0.7, -0.3] : [0.85, -0.65, -0.35];
    // Arriba: brazos casi extendidos y verticales sobre la línea de los hombros
    const sx0 = tp(pelvis, torso, SH()).x;
    const r = Biomech.reach(9), dx = gw - sx0;
    const topSpec = { pelvis, torso, legs, arms: arms({ dir: [dx, Math.sqrt(r * r - dx * dx), 0], flex: 9, palm: palmL, pole: poleL, curl: 0.92, ...scap }) };
    const top = Biomech.solve(topSpec).info.arms.L.grip.clone();
    // Abajo: barra en la parte baja del pecho (alta en inclinado); mancuernas a la altura del pecho
    const touch = dumb ? V3(0.25, inc ? 0.43 : 0.37, 0.115) : V3(gw, inc ? 0.44 : close ? 0.33 : 0.36, 0.165);
    const bottom = tp(pelvis, torso, touch);
    function spec(t) {
      const e = ease(t);
      // Trayectoria en "J": al bajar se desplaza pronto hacia el pecho y llega casi en vertical
      const hz = Math.sin(e * Math.PI / 2);
      const g = V3(lerp(top.x, bottom.x, e), lerp(top.y, bottom.y, e), lerp(top.z, bottom.z, hz));
      return { pelvis, torso, legs, head: 0, arms: arms({ grip: arr(g), palm: palmL, pole: poleL, curl: 0.92, ...scap }) };
    }
    return {
      cam: { yaw: -55, pitch: 22 },
      setup(scene) {
        const d = {};
        if (inc) scene.add(P().benchIncline({ seatZ: seat.seatZ, seatH: seat.seatH, back: inc, backLen: 0.95, seatLen: seat.seatLen }));
        else scene.add(P().benchFlat(-0.85, 0.35, benchH));
        if (dumb) { const [a, b] = dbs(scene, {}); d.a = a; d.b = b; }
        else {
          d.bar = bar(scene, { plates: [0.225] });
          const hookY = top.y - 0.06, hookZ = top.z - 0.1;
          for (const sx of [1, -1]) {
            scene.add(P().box([sx * 0.6, hookY / 2, hookZ - 0.05], [0.07, hookY + 0.05, 0.07], P().mats().frame));
            scene.add(P().box([sx * 0.56, hookY - 0.02, hookZ - 0.0], [0.06, 0.03, 0.1], P().mats().frameLight));
            scene.add(P().box([sx * 0.6, 0.03, hookZ - 0.05], [0.1, 0.06, 0.5], P().mats().frame));
          }
        }
        return d;
      },
      pose: spec,
      update(d, t, solved) {
        if (dumb) { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
        else placeBar(d.bar, solved);
      }
    };
  };

  /* ---------------- CURL DE BÍCEPS ----------------
     De pie y sin balanceo: los codos se quedan junto a los costados (solo
     avanzan un poco al final) y se mueve el antebrazo. Muñecas neutras.
     Con mancuernas la palma gira de mirar al cuerpo a mirar hacia arriba. */
  PATTERNS.curl = o => {
    if (o.preacher) return PATTERNS.curlPreacher(o);
    if (o.bayesian) return PATTERNS.curlBayesian(o);
    if (o.concentration) return PATTERNS.curlConcentration(o);
    if (o.incline) return PATTERNS.curlIncline(o);
    const eq = o.equip || 'dumbbell';
    const gx = eq === 'barbell' || eq === 'cable' ? 0.2 : 0.19;
    const kg = eq === 'barbell' ? 15 : eq === 'cable' ? 10 : 12;
    const pulley = V3(0, 0.12, 0.5);
    function spec(t) {
      const e = ease(t), th = lerp(7, 136, e);
      const sh = SH();
      const el = V3(sh.x + 0.02, sh.y - L.ua * 0.975, sh.z + 0.02 + 0.04 * e);
      const r = L.fa + 0.068;
      const grip = [gx, el.y - cos(th) * r, el.z + sin(th) * r];
      let palm;
      if (eq === 'hammer') palm = [-1, 0, 0.05];
      else if (eq === 'dumbbell') palm = arr(V3(-1, 0, 0.1).lerp(V3(0, sin(th), cos(th)), Math.min(1, e * 1.5)).normalize());
      else palm = [0, sin(th), cos(th)];
      return stand({ k: 4, shift: eq === 'cable' ? -0.015 : 0 }, pelvis => {
        const torso = { pitch: 1 };
        const a = armsL(pelvis, torso, { grip, palm, pole: [0.2, -0.25, -1], curl: 0.92, upRot: 0 });
        return { pelvis, torso, head: 3, arms: a, load: eq === 'cable' ? [] : dbLoad(a, kg) };
      });
    }
    return {
      standing: true, cam: { yaw: -62, pitch: 8 },
      setup(scene) {
        const d = {};
        if (eq === 'barbell') d.bar = bar(scene, { plates: [0.13], shaft: 1.2, sleeve: 0.22 });
        else if (eq === 'cable') { scene.add(P().cableTower(0, pulley.z + 0.06, pulley.y, { face: -1 })); d.h = P().handle('straight'); scene.add(d.h); d.c = cable(scene); }
        else { const [a, b] = dbs(scene, { head: 0.055 }); d.a = a; d.b = b; }
        return d;
      },
      pose: spec,
      update(d, t, solved) {
        if (d.bar) placeBar(d.bar, solved);
        else if (d.h) placeHandle(d.h, d.c, pulley, solved.info.arms.L.grip, solved.info.arms.R.grip);
        else { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
      }
    };
  };
  /* ---------------- DOMINADAS ----------------
     Desde colgado con los brazos extendidos (escápulas activas) hasta que
     la barbilla supera la barra; codos hacia abajo; cuerpo estable. */
  PATTERNS.pullup = (o, ex) => {
    const supine = !!o.supine || !!(ex && /supin/.test(ex.id));
    return pullPattern(supine);
  };
  function pullPattern(supine) {
    const barY = 2.32, gw = supine ? 0.2 : 0.34;
    function build(e, dy) {
      const torso = { pitch: lerp(-4, -16, e) };
      const off = tp([0, 0, 0], torso, SH());
      // Hombro: colgado ≈ brazos extendidos; arriba ≈ barbilla por encima de la barra
      const shY = barY - lerp(0.5, 0.075, e) + dy;
      const pelvis = [0, shY - off.y, lerp(-0.02, -0.11, e) - off.z];
      const hip = tp(pelvis, torso, rel('hipL'));
      const kneeA = lerp(18, 30, e) * D;
      const leg = sx => {
        const knee = V3(sx * 0.1, hip.y - L.th * Math.cos(kneeA * 0.4), hip.z + L.th * Math.sin(kneeA * 0.4));
        const ankle = knee.clone().add(V3(0, -L.sh * Math.cos(kneeA), -L.sh * Math.sin(kneeA)));
        return { ankle: arr(ankle), footPitch: -32, pole: [0, 0, 1] };
      };
      const arm = sx => ({ grip: [sx * gw, barY, 0], palm: supine ? [0, 0.1, -1] : [0, 0.1, 1], pole: [sx * (supine ? 0.3 : 0.75), -1, supine ? 0.5 : 0.15], curl: 0.95 });
      return { pelvis, torso, head: lerp(-4, -10, e), arms: { L: arm(1), R: arm(-1) }, legs: { L: leg(1), R: leg(-1) } };
    }
    function spec(t) {
      const e = ease(t);
      // La altura del cuerpo se ajusta a la flexión de codo: casi extendido colgado (10°) y ~130° arriba
      const want = lerp(10, 132, e);
      const dy = solve1(d => Biomech.solve(build(e, d)).info.arms.L.elbowFlex - want, -0.45, 0.0, 22);
      return build(e, dy);
    }
    return {
      cam: { yaw: -40, pitch: 6 },
      setup(scene) { scene.add(P().pullupBar(barY)); return {}; },
      pose: spec,
      update() {}
    };
  }

  /* ---------------- ELEVACIONES LATERALES ----------------
     Torso apenas inclinado; brazos en el plano de la escápula (unos 25–30°
     por delante del cuerpo), codos algo flexionados y elevación hasta la
     altura de los hombros, sin encoger. Con polea: un brazo, el cable cruza
     por delante del cuerpo y la otra mano se sujeta a la máquina. */
  PATTERNS['lateral-raise'] = o => {
    const cab = !!o.cable;
    const tower = V3(-0.62, 0, 0.02), pulley = V3(-0.56, 0.12, 0.08);
    function armAt(e) {
      const sh = SH(), reach = armEff() - 0.035;
      const plane = (cab ? 18 : 28) * D;
      const ab = lerp(cab ? 0 : 12, 86, e) * D;
      let dir = V3(Math.sin(ab) * Math.cos(plane), -Math.cos(ab), Math.sin(ab) * Math.sin(plane));
      if (cab) dir = V3(-0.32, -1, 0.3).normalize().lerp(dir, Math.min(1, e * 1.25)).normalize();
      const palm = V3(-1, 0, 0).lerp(V3(0, -1, 0.12), e).normalize();
      return { dir: arr(dir), flex: 14, palm: arr(palm), pole: [0.15, 0.45, -1], curl: 0.9 };
    }
    function spec(t) {
      const e = ease(t);
      return stand({ k: 5 }, pelvis => {
        const torso = { pitch: cab ? 3 : 7 };
        const a = armsL(pelvis, torso, armAt(e), cab ? { grip: [tower.x + 0.08, 1.05 - pelvis[1] + 0.0, 0.03 - pelvis[2]], palm: [1, 0, 0], pole: [-0.3, -1, -0.4], curl: 0.85 } : null);
        if (cab) a.R = { ...a.R, grip: [tower.x + 0.075, 0.98, tower.z + 0.02], palm: [1, 0, 0], pole: [-0.2, -1, -0.5], upRot: 0, protract: 0 };
        return { pelvis, torso, head: 2, arms: a, load: cab ? [] : dbLoad(a, 7, pelvis, torso) };
      });
    }
    return {
      standing: true, cam: { yaw: cab ? -25 : -28, pitch: 8 },
      setup(scene) {
        if (cab) {
          scene.add(P().cableTower(tower.x, tower.z, pulley.y, { face: 1 }));
          const h = P().handle('D'); scene.add(h);
          return { h, c: cable(scene) };
        }
        const [a, b] = dbs(scene, { head: 0.048 }); return { a, b };
      },
      pose: spec,
      update(d, t, solved) {
        if (d.h) placeHandle(d.h, d.c, pulley, solved.info.arms.L.grip);
        else { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
      }
    };
  };

  /* ---------------- ELEVACIONES FRONTALES ----------------
     Mancuernas delante de los muslos con las palmas hacia ellos; se suben
     al frente con los codos casi extendidos hasta la altura de los hombros,
     sin balancear el tronco. */
  PATTERNS['front-raise'] = () => {
    function spec(t) {
      const e = ease(t), f = lerp(6, 88, e);
      const sh = SH(), reach = armEff() - 0.03;
      const dir = sagDir(f, 0.12);
      return stand({ k: 5 }, pelvis => {
        const torso = { pitch: 2 };
        const a = armsL(pelvis, torso, { dir: arr(dir), flex: 10, palm: [0, -sin(f), -cos(f)], pole: [0.3, 1, -0.6], curl: 0.9, upRot: lerp(0, 8, e) });
        return { pelvis, torso, head: 2, arms: a, load: dbLoad(a, 7, pelvis, torso) };
      });
    }
    return {
      standing: true, cam: { yaw: -62, pitch: 8 },
      setup(scene) { const [a, b] = dbs(scene, { head: 0.05 }); return { a, b }; },
      pose: spec,
      update(d, t, solved) { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
    };
  };

  /* ---------------- PRESS MILITAR / PRESS DE HOMBRO ----------------
     De pie: la barra parte de la parte alta del pecho con los antebrazos
     verticales y los codos algo por delante; sube en línea recta (la cabeza
     se aparta un poco y vuelve "a través de la ventana") hasta bloquear con
     la barra sobre la mitad del pie. Sentado: respaldo casi vertical y
     mancuernas desde la altura de los hombros. */
  PATTERNS.overhead = o => {
    const seated = !!o.seated, dumb = o.equip === 'dumbbell', machine = !!o.machine, arnold = !!o.arnold;
    const seatY = 0.46;
    const torsoV = { pitch: seated ? -6 : 0 };
    const gxTop = !dumb && !machine ? 0.245 : arnold ? 0.2 : 0.17;
    const top = overheadTop(torsoV, gxTop, { palm: [0, 0.1, 1], pole: [1, 0, 0.05] });
    function armAt(e) {
      const sh = SH();
      const topY = top.y;
      if (!dumb && !machine) {
        // Barra: trayectoria que libra la cara
        const y = lerp(sh.y - 0.005, topY, e);
        const clear = 0.185;
        const z = y < 0.84 ? Math.max(clear, lerp(0.165, clear, (y - sh.y) / 0.12)) : lerp(clear, top.z, Math.min(1, (y - 0.84) / (topY - 0.84)));
        return { grip: [0.245, y, z], palm: [0, 0.25, 1], pole: arr(V3(1, -0.4, 0.75).lerp(V3(1, 0, 0.05), e).normalize()), curl: 0.92 };
      }
      if (arnold) {
        // Arnold: de palmas hacia la cara y codos al frente a palmas al frente arriba
        const y = lerp(sh.y + 0.1, topY, e), x = lerp(0.12, top.x, e), z = lerp(0.17, top.z, e);
        const rot = Math.min(1, e * 1.4);
        return { grip: [x, y, z], palm: arr(V3(0, 0, -1).lerp(V3(0, 0.05, 1), rot).normalize()), pole: arr(V3(0.15, -0.4, 1).lerp(V3(1, -0.1, 0.1), rot).normalize()), curl: 0.9 };
      }
      // Mancuernas o máquina: desde los hombros, codos algo por delante del torso
      const y = lerp(sh.y + (machine ? 0.17 : 0.2), topY, e), x = lerp(machine ? 0.33 : 0.34, top.x, e), z = lerp(machine ? 0.12 : 0.1, top.z, e);
      return { grip: [x, y, z], palm: [0, 0.1, 1], pole: arr(V3(1, -0.35, 0.55).lerp(V3(1, 0, 0.1), e).normalize()), curl: 0.92 };
    }
    function spec(t) {
      const e = ease(t);
      const head = !dumb && !machine && !seated ? (e < 0.55 ? -7 * Math.sin(e / 0.55 * Math.PI) : 0) + 2 : 0;
      if (seated) {
        const torso = torsoV;
        const pelvis = [0, seatY + 0.088, 0];
        const a = armsL(pelvis, torso, armAt(e));
        return { pelvis, torso, head, arms: a, legs: seatLegs(pelvis, 0.15, 0.46) };
      }
      return stand({ k: 4, w: 0.115 }, pelvis => {
        const torso = { pitch: 0 };
        const a = armsL(pelvis, torso, armAt(e));
        return { pelvis, torso, head, arms: a, load: [{ kg: 40, at: arr(V3().addVectors(v(a.L.grip), v(a.R.grip)).multiplyScalar(0.5)) }] };
      });
    }
    return {
      standing: !seated, cam: { yaw: -58, pitch: 8 },
      setup(scene) {
        const d = {};
        if (seated) scene.add(P().benchIncline({ seatZ: 0.06, seatH: seatY, back: 84, backLen: 0.78, seatLen: 0.34 }));
        if (machine) { d.mach = machineArms(scene); }
        else if (dumb) { const [a, b] = dbs(scene, { head: 0.06 }); d.a = a; d.b = b; }
        else { d.bar = bar(scene, { plates: [0.2] }); scene.add(P().rack({ z: -0.12, hook: 1.38, h: 2.1, w: 0.62 })); }
        return d;
      },
      pose: spec,
      update(d, t, solved) {
        if (d.bar) placeBar(d.bar, solved);
        else if (d.a) { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
        else if (d.mach) d.mach(solved);
      }
    };
  };

  /* ---------------- ELEVACIONES POSTERIORES ----------------
     De pie: bisagra de cadera con el torso casi horizontal y la espalda
     neutra; las mancuernas suben hacia los lados con los codos algo
     flexionados hasta la línea del cuerpo. En banco inclinado (30°): pecho
     apoyado y el mismo gesto. */
  PATTERNS['rear-raise'] = o => {
    const bench = !!o.bench;
    const incl = 30;
    function arm(pelvis, torso, e) {
      const sh = tp(pelvis, torso, SH()), reach = armEff() - 0.045;
      const dir = V3(0.1, -1, 0.06).normalize().lerp(V3(1, -0.1, 0.12).normalize(), e).normalize();
      const left = { dir: arr(dir), flex: 16, palm: arr(V3(-1, 0, 0).lerp(V3(0, -1, 0.15), e).normalize()), pole: [0.55, 0.85, -0.2], curl: 0.9 };
      return { L: left, R: { ...left, dir: mirrorV(left.dir), palm: mirrorV(left.palm), pole: mirrorV(left.pole) } };
    }
    function spec(t) {
      const e = ease(t);
      if (bench) {
        const torso = { pitch: 90 - incl };
        const pelvis = inclineProne(incl);
        const a = arm(pelvis, torso, e);
        return { pelvis, torso, head: -12, arms: a, legs: proneLegs(pelvis) };
      }
      return stand({ k: 20 }, pelvis => {
        const torso = { pitch: 72 };
        const a = arm(pelvis, torso, e);
        return { pelvis, torso, head: -14, arms: a, load: dbLoad(a, 5, pelvis, torso) };
      });
    }
    return {
      standing: !bench, cam: { yaw: -40, pitch: 16 },
      setup(scene) {
        if (bench) scene.add(proneBench(incl));
        const [a, b] = dbs(scene, { head: 0.045 }); return { a, b };
      },
      pose: spec,
      update(d, t, solved) { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
    };
  };

  /* ---------------- FACE PULL ----------------
     Polea a la altura de la cara con cuerda; brazos extendidos al frente y,
     al tirar, los codos suben a la altura de los hombros y las manos llegan
     junto a las orejas (rotación externa). Cuerpo estable. */
  PATTERNS['face-pull'] = () => {
    const pulley = V3(0, 1.6, 1.05);
    function spec(t) {
      const e = ease(t);
      return stand({ k: 6, shift: -0.03 }, pelvis => {
        const torso = { pitch: -3 };
        const sh = SH();
        const g0 = toLocal(pelvis, torso, probeGrip({ pelvis, torso, arms: armsL(pelvis, torso, { dir: [-0.16, 0.22, 1], flex: 10, palm: [-1, 0, 0.05], pole: [1, -0.6, 0], curl: 0.9 }) }));
        const g1 = V3(0.24, sh.y + 0.12, sh.z + 0.19);
        const grip = g0.clone().lerp(g1, e);
        const a = armsL(pelvis, torso, {
          grip: arr(grip), palm: arr(V3(-1, 0, 0.05).lerp(V3(-0.35, 0.1, 1), e).normalize()),
          pole: arr(V3(1, -0.6, 0).lerp(V3(1, 0.1, -0.6), e).normalize()), curl: 0.9
        });
        return { pelvis, torso, head: 0, arms: a, legs: standLegs(0.12, 0, 8) };
      });
    }
    return {
      standing: true, cam: { yaw: -50, pitch: 10 },
      setup(scene) { scene.add(P().cableTower(0, pulley.z + 0.06, pulley.y, { face: -1 })); return { r: rope(scene) }; },
      pose: spec,
      update(d, t, solved) { setRope(d.r, pulley, solved.info.arms.L.grip, solved.info.arms.R.grip, 0.14); }
    };
  };

  /* ---------------- EXTENSIÓN DE TRÍCEPS EN POLEA ----------------
     Codos pegados a los costados y quietos; el antebrazo baja desde algo
     por encima de la horizontal hasta extender el codo. Tronco algo
     inclinado y estable. */
  PATTERNS.pushdown = () => {
    const pulley = V3(0, 2.02, 0.42);
    function spec(t) {
      const e = ease(t), th = lerp(100, 6, e); // flexión del codo
      return stand({ k: 8, shift: 0.0 }, pelvis => {
        const torso = { pitch: 12 };
        const sh = SH();
        const el = V3(sh.x + 0.015, sh.y - L.ua * 0.975, sh.z + 0.035);
        const r = L.fa + 0.07;
        const fd = sagDir(th);
        const grip = el.clone().addScaledVector(fd, r); grip.x = lerp(0.07, 0.12, e);
        const a = armsL(pelvis, torso, { grip: arr(grip), palm: arr(V3(-1, 0, 0).lerp(V3(-0.6, 0, -0.8), e * 0.6).normalize()), pole: [0.15, -0.2, -1], curl: 0.9, upRot: 0 });
        return { pelvis, torso, head: 6, arms: a };
      });
    }
    return {
      standing: true, cam: { yaw: -65, pitch: 8 },
      setup(scene) { scene.add(P().cableTower(0, pulley.z + 0.06, pulley.y, { face: -1 })); return { r: rope(scene) }; },
      pose: spec,
      update(d, t, solved) { setRope(d.r, pulley, solved.info.arms.L.grip, solved.info.arms.R.grip, 0.12); }
    };
  };

  /* ---------------- EXTENSIÓN DE TRÍCEPS SOBRE LA CABEZA ----------------
     Brazos junto a la cabeza que no se mueven; el codo se flexiona llevando
     las manos detrás de la cabeza (estiramiento) y se extiende. Con polea:
     de espaldas a la polea, paso al frente y tronco algo inclinado.
     Sentado con mancuerna: respaldo vertical, mancuerna sujeta con ambas
     manos por el disco superior. */
  PATTERNS['overhead-ext'] = o => {
    const cab = !!o.cable;
    const pulley = V3(0, 1.55, -0.55), seatY = 0.46;
    function armSpec(e) {
      const phi = cab ? 18 : 10; // brazo respecto al eje del tronco (hacia delante)
      const up = V3(0, Math.cos(phi * D), Math.sin(phi * D));
      const sh = shoulderFor({ pitch: cab ? 28 : -4 }, [-0.1, up.y, up.z]);
      const el = sh.clone().add(V3(-0.035, 0, 0.02)).addScaledVector(up, L.ua * 0.97);
      const th = lerp(8, cab ? 118 : 125, e); // flexión del codo
      const fa = V3(0, Math.cos((phi - th) * D), Math.sin((phi - th) * D));
      const grip = el.clone().addScaledVector(fa, L.fa + 0.07);
      grip.x = cab ? 0.07 : 0.035;
      return { grip: arr(grip), palm: cab ? [-1, 0, 0.1] : [-0.85, 0, 0.5], pole: [0.2, 0.45, 1], curl: 0.9 };
    }
    function spec(t) {
      const e = ease(t);
      if (!cab) {
        const torso = { pitch: -4 }, pelvis = [0, seatY + 0.088, 0];
        const a = armsL(pelvis, torso, armSpec(e));
        return { pelvis, torso, head: 4, arms: a, legs: seatLegs(pelvis, 0.15, 0.46) };
      }
      return stand({ k: 12, z: 0.3, shift: -0.18 }, pelvis => {
        const torso = { pitch: 28 };
        const a = armsL(pelvis, torso, armSpec(e));
        return { pelvis, torso, head: -4, arms: a, legs: splitLegs(0.3, -0.16, 10, 18) };
      });
    }
    return {
      standing: cab, cam: { yaw: -70, pitch: 10 },
      setup(scene) {
        if (cab) { scene.add(P().cableTower(0, pulley.z - 0.06, pulley.y, { face: 1 })); return { r: rope(scene) }; }
        scene.add(P().benchIncline({ seatZ: 0.06, seatH: seatY, back: 86, backLen: 0.75, seatLen: 0.34 }));
        const db = P().dumbbell({ head: 0.075, hex: true }); scene.add(db); return { db };
      },
      pose: spec,
      update(d, t, solved) {
        const gL = solved.info.arms.L.grip, gR = solved.info.arms.R.grip;
        if (d.r) setRope(d.r, pulley, gL, gR, 0.1);
        else {
          // Mancuerna vertical sujeta por el disco superior
          const c = V3().addVectors(gL, gR).multiplyScalar(0.5);
          const ax = V3().subVectors(solved.info.arms.L.wrist, solved.info.arms.L.elbow).normalize();
          P().orient(d.db, c.addScaledVector(ax, -0.1), ax, V3(0, 0, 1));
        }
      }
    };
  };

  /* ---------------- CRUCE DE POLEAS (alto / bajo) ----------------
     Paso al frente, tronco algo inclinado y codos ligeramente flexionados
     y fijos: los brazos se cierran en arco hasta juntar las manos delante
     del cuerpo, sin encoger los hombros. */
  PATTERNS.crossover = o => {
    const low = !!o.low;
    const py = low ? 0.16 : 2.02, tx = 1.02, tz = -0.12;
    function armAt(e) {
      // Dirección del brazo (marco del tronco): de abierto a manos juntas delante
      const d0 = low ? V3(0.42, -0.9, -0.08) : V3(0.8, 0.52, 0.08);
      const d1 = low ? V3(-0.2, 0.12, 0.97) : V3(-0.2, -0.42, 0.88);
      const dir = d0.normalize().lerp(d1.normalize(), e).add(V3(0, 0, 0.3 * Math.sin(e * Math.PI))).normalize();
      const palm = low ? V3(-0.2, 1, 0.2).lerp(V3(-1, 0.6, 0), e).normalize() : V3(0, -0.15, 1).lerp(V3(-1, -0.2, 0.1), e).normalize();
      return { dir: arr(dir), flex: 22, palm: arr(palm), pole: low ? [0.6, -1, -0.3] : [0.5, 0.15, -1], curl: 0.9, upRot: low ? 4 : 10, protract: lerp(-6, 10, e) };
    }
    function spec(t) {
      const e = ease(t);
      return stand({ k: 12, z: 0.22, shift: -0.19 }, pelvis => {
        const torso = { pitch: low ? 6 : 17 };
        const a = armsL(pelvis, torso, armAt(e));
        return { pelvis, torso, head: low ? 0 : 4, arms: a, legs: splitLegs(0.22, -0.2, 12, 14) };
      });
    }
    const pL = V3(tx - 0.06, py, tz), pR = V3(-tx + 0.06, py, tz);
    return {
      standing: true, cam: { yaw: -35, pitch: 12 },
      setup(scene) {
        scene.add(P().cableTower(tx, tz, py, { face: [-1, 0] }), P().cableTower(-tx, tz, py, { face: [1, 0] }));
        const hL = P().handle('D'), hR = P().handle('D'); scene.add(hL, hR);
        return { hL, hR, cL: cable(scene), cR: cable(scene) };
      },
      pose: spec,
      update(d, t, solved) { placeHandle(d.hL, d.cL, pL, solved.info.arms.L.grip); placeHandle(d.hR, d.cR, pR, solved.info.arms.R.grip); }
    };
  };

  /* ---------------- PULLOVER EN POLEA ----------------
     Bisagra de cadera con la espalda neutra; brazos casi extendidos que
     bajan en arco desde por encima de la cabeza hasta los muslos. */
  PATTERNS.pullover = () => {
    const pulley = V3(0, 2.05, 1.05);
    function spec(t) {
      const e = ease(t), f = lerp(162, 12, e); // flexión del hombro respecto al tronco
      return stand({ k: 14, shift: -0.02 }, pelvis => {
        const torso = { pitch: 38 };
        const sh = SH();
        const a = armsL(pelvis, torso, { dir: arr(sagDir(f, 0.12)), flex: 12, palm: [0, -sin(f), -cos(f)], pole: [0.3, 1, -0.4], curl: 0.92, upRot: lerp(40, 4, e) });
        return { pelvis, torso, head: -6, arms: a, legs: standLegs(0.12, 0, 8) };
      });
    }
    return {
      standing: true, cam: { yaw: -72, pitch: 8 },
      setup(scene) { scene.add(P().cableTower(0, pulley.z + 0.06, pulley.y, { face: -1 })); const h = P().handle('straight'); scene.add(h); return { h, c: cable(scene) }; },
      pose: spec,
      update(d, t, solved) { placeHandle(d.h, d.c, pulley, solved.info.arms.L.grip, solved.info.arms.R.grip); }
    };
  };

  /* ---------------- PATADA DE GLÚTEO EN POLEA ----------------
     Tronco algo inclinado y sujeto a la máquina; la cadera se extiende
     llevando la pierna atrás con la rodilla un poco flexionada, sin arquear
     la zona lumbar (la extensión termina cerca de la línea del tronco). */
  PATTERNS.kickback = () => {
    const pulley = V3(0.1, 0.1, 0.62);
    function spec(t) {
      const e = ease(t);
      const p = 22;
      const torso = { pitch: p };
      const beta = lerp(28, -18, e); // flexión de cadera (− = extensión)
      const kneeF = lerp(35, 14, e);
      // Pierna de apoyo (derecha) y equilibrio sobre ella
      const mk = sh => {
        const leg = sagLeg(sh, 10 - sh);
        const pelvis = [0, leg.H[1], leg.H[0]];
        const hip = tp(pelvis, torso, rel('hipL'));
        const thA = (beta - p) * D, shA = thA - kneeF * D;
        const knee = hip.clone().add(V3(0.0, -Math.cos(thA) * L.th, Math.sin(thA) * L.th));
        const ankle = knee.clone().add(V3(0.0, -Math.cos(shA) * L.sh, Math.sin(shA) * L.sh));
        const a = armsL(pelvis, torso, { grip: [0.2, 0.0, 0.0], palm: [0, 0, 1], pole: [0.5, -1, -0.5], curl: 0.9 });
        a.L = { ...a.L, grip: [0.24, 1.12, 0.5], palm: [-0.2, 0, -1], pole: [0.5, -1, -0.3] };
        a.R = { ...a.R, grip: [-0.24, 1.12, 0.5], palm: [0.2, 0, -1], pole: [-0.5, -1, -0.3] };
        return {
          pelvis, torso, head: -4, arms: a,
          legs: {
            R: { ankle: [-0.1, L.ankleH, 0], footYaw: 6, pole: [-0.1, 0, 1] },
            L: { ankle: [0.1, ankle.y, ankle.z], footPitch: lerp(5, -25, e), pole: [0.05, 0, 1] }
          }
        };
      };
      // El centro de masas sobre el pie de apoyo
      const sh = solve1(x => comZ(mk(x)) - (L.mid - 0.01), -14, 22, 18);
      return mk(sh);
    }
    return {
      standing: true, cam: { yaw: -75, pitch: 8 },
      setup(scene) {
        scene.add(P().cableTower(0.1, pulley.z + 0.06, pulley.y, { face: -1 }));
        scene.add(P().tube([-0.3, 1.12, 0.5], [0.3, 1.12, 0.5], 0.018), P().tube([-0.3, 0.02, 0.62], [-0.3, 1.12, 0.5], 0.02), P().tube([0.3, 0.02, 0.62], [0.3, 1.12, 0.5], 0.02));
        const cuff = P().mesh(P().geo.cyl, P().mats().grip); scene.add(cuff);
        return { cuff, c: cable(scene) };
      },
      pose: spec,
      update(d, t, solved) {
        const an = solved.info.legs.L.ankle, kn = solved.info.legs.L.knee;
        const dir = V3().subVectors(an, kn).normalize();
        P().placeCyl(d.cuff, an.clone().addScaledVector(dir, -0.05), an.clone().addScaledVector(dir, 0.0), 0.05);
        setCable(d.c, pulley, an);
      }
    };
  };

  /* ---------------- ELEVACIÓN DE TALONES DE PIE ----------------
     Parte delantera del pie en el borde de un escalón; rodillas extendidas
     sin bloquear. Sube hasta la máxima flexión plantar y baja hasta un
     estiramiento cómodo, sin rebote. */
  PATTERNS['calf-standing'] = o => {
    const single = !!o.single, machine = !!o.machine;
    const stepH = machine ? 0.1 : 0.12, edgeZ = 0.0;
    function spec(t) {
      const e = ease(t), pitch = lerp(-34, 16, e); // − talón arriba, + talón abajo
      const toeY = stepH + R.toeH;
      const legL = { toe: [0.11, toeY, edgeZ + 0.03], footPitch: pitch, footYaw: 4, pole: [0.05, 0, 1] };
      const legR = single ? null : { toe: [-0.11, toeY, edgeZ + 0.03], footPitch: pitch, footYaw: 4, pole: [-0.05, 0, 1] };
      // Tobillo según el giro del pie; cadera encima (piernas casi extendidas)
      const probe = Biomech.solve({ pelvis: [0, 1, 0], legs: { L: legL } });
      const ank = probe.info.legs.L.ankle;
      const mk = s => {
        const k = 4, A = [ank.z, ank.y];
        const K = [A[0] + L.sh * sin(s), A[1] + L.sh * cos(s)];
        const H = [K[0] - L.th * sin(k - s), K[1] + L.th * cos(k - s)];
        const pelvis = [0, H[1], H[0]];
        const torso = { pitch: 2 };
        let a;
        if (machine) {
          const sh = tp(pelvis, torso, SH());
          a = armsL(pelvis, torso, { grip: [0.21, SH().y + 0.03, 0.12], palm: [0, -0.2, -1], pole: [0.4, -1, -0.2], curl: 0.92 });
          a.L.grip = [0.21, sh.y + 0.04, sh.z + 0.1]; a.R.grip = [-0.21, sh.y + 0.04, sh.z + 0.1];
        } else {
          a = armsL(pelvis, torso, { grip: [0.2, 0.0, 0.05], palm: [-1, 0, 0], pole: [0.3, -0.2, -1], curl: 0.92 });
          const shL = tp(pelvis, torso, SH());
          a.L.grip = [0.21, shL.y - armEff() + 0.02, shL.z + 0.02];
          a.R = { grip: [-0.3, 1.0, 0.28], palm: [0.2, 0, 1], pole: [-0.5, -1, -0.2], curl: 0.85 }; // se sujeta
          if (single) a.L = { grip: [0.3, 1.0, 0.28], palm: [-0.2, 0, 1], pole: [0.5, -1, -0.2], curl: 0.85 };
        }
        const legs = { L: legL };
        if (legR) legs.R = legR;
        else {
          const hipR = tp(pelvis, torso, rel('hipR'));
          legs.R = { ankle: [-0.07, hipR.y - 0.62, hipR.z - 0.3], footPitch: -35, pole: [0, 0, 1] };
        }
        return { pelvis, torso, head: 2, arms: a, legs, load: !machine && !single ? [{ kg: 12, at: a.L.grip }] : [] };
      };
      const s = solve1(x => comZ(mk(x)) - (ank.z + (single ? 0.06 : 0.05)), -12, 14, 18);
      return mk(s);
    }
    return {
      standing: true, cam: { yaw: -68, pitch: 8 },
      setup(scene) {
        const d = {};
        scene.add(P().block([0, stepH / 2, edgeZ - 0.12], [0.62, stepH, 0.24]));
        if (machine) d.mach = calfMachine(scene);
        else { scene.add(P().tube([-0.42, 0.02, 0.3], [-0.42, 1.2, 0.3], 0.022), P().tube([0.42, 0.02, 0.3], [0.42, 1.2, 0.3], 0.022), P().tube([-0.42, 1.0, 0.28], [0.42, 1.0, 0.28], 0.02)); }
        if (!machine && !single) { d.db = P().dumbbell({ head: 0.062 }); scene.add(d.db); }
        return d;
      },
      pose: spec,
      update(d, t, solved) {
        if (d.db) placeDB(d.db, solved, 'L', handAxis(solved, 'L'));
        if (d.mach) d.mach(solved);
      }
    };
  };

  /* ---------------- ZANCADAS / SENTADILLA BÚLGARA ----------------
     Pie delantero completo en el suelo, rodilla en la dirección del pie;
     tronco erguido (algo inclinado en la búlgara). Se baja en vertical
     hasta que la rodilla trasera queda cerca del suelo, con el peso sobre
     la pierna delantera. */
  PATTERNS.lunge = o => {
    const bulg = !!o.bulgarian;
    const benchZ = -0.62, benchH = 0.44;
    const F = [0.1, L.ankleH, bulg ? 0.14 : 0.3];
    const backLeg = e => bulg
      ? { ankle: [-0.12, benchH + 0.055, benchZ + 0.05], footPitch: -158, pole: [0, -0.2, 1] }
      : { toe: [-0.1, R.toeH, -0.36], footPitch: lerp(-34, -64, e), pole: [0, 0, 1] };
    function build(e, y, z) {
      const pelvis = [0, y, z];
      const torso = { pitch: bulg ? lerp(8, 30, e) : lerp(2, 6, e) };
      const sh = tp(pelvis, torso, SH());
      const a = armsL(pelvis, torso, { grip: [0.2, 0.0, 0.03], palm: [-1, 0, 0], pole: [0.3, -0.2, -1], curl: 0.92 });
      a.L.grip = [0.215, sh.y - armEff() + 0.02, sh.z + 0.02];
      a.R.grip = [-0.215, sh.y - armEff() + 0.02, sh.z + 0.02];
      return { pelvis, torso, head: 2, arms: a, legs: { L: { ankle: F, footYaw: 4, pole: [0.08, 0, 1] }, R: backLeg(e) }, load: dbLoad(a, 10, pelvis, torso) };
    }
    const target = F[2] + L.mid - (bulg ? 0.03 : 0.3);
    const balance = (e, y) => solve1(z => comZ(build(e, y, z)) - target, F[2] - 0.6, F[2] + 0.1, 18);
    const reachOk = (e, y) => { const sp = build(e, y, balance(e, y)), i = Biomech.solve(sp).info.legs; return Math.max(i.L.reachError, i.R.reachError) < 0.002 && i.L.kneeFlex > 5 && i.R.kneeFlex > 6; };
    // Arriba: la cadera lo más alta posible con ambas rodillas apenas flexionadas
    const yTop = solve1(y => (reachOk(0, y) ? -1 : 1), 0.55, 0.95, 16) - 0.008;
    // Abajo: la rodilla trasera queda a unos 8 cm del suelo (búlgara: 12 cm)
    const kneeR = y => Biomech.solve(build(1, y, balance(1, y))).info.legs.R.knee.y;
    const kneeF = y => Biomech.solve(build(1, y, balance(1, y))).info.legs.L.kneeFlex;
    const yBot = bulg ? solve1(y => kneeF(y) - 100, 0.45, yTop, 16) : solve1(y => kneeR(y) - 0.085, 0.3, yTop, 16);
    function spec(t) {
      const e = ease(t), y = lerp(yTop, yBot, e);
      return build(e, y, balance(e, y));
    }
    return {
      standing: true, cam: { yaw: -78, pitch: 8 },
      setup(scene) {
        if (bulg) scene.add(P().benchFlat(benchZ - 0.55, benchZ + 0.2, benchH));
        const [a, b] = dbs(scene, { head: 0.058 }); return { a, b };
      },
      pose: spec,
      update(d, t, solved) { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
    };
  };

  /* =================== SENTADO Y MÁQUINAS =================== */

  /* ---------------- CURL INCLINADO ----------------
     Banco a ~55°: espalda apoyada y brazos colgando verticales por detrás
     del tronco (estiramiento del bíceps). El codo no avanza; solo sube el
     antebrazo con la palma hacia delante. */
  PATTERNS.curlIncline = () => {
    const seat = { seatH: 0.46, seatZ: 0.1, back: 55 };
    function spec(t) {
      const e = ease(t), th = lerp(6, 122, e);
      const { pelvis, torso } = seatPose(seat);
      const shL = tp(pelvis, torso, SH());
      const mk = sx => {
        const sh = sx > 0 ? shL : tp(pelvis, torso, mirrorV(arr(SH())));
        const el = sh.clone().add(V3(sx * 0.025, -L.ua * 0.98, 0.0));
        const grip = el.clone().addScaledVector(sagDir(th), L.fa + 0.068); grip.x = sx * 0.2;
        return { grip: arr(grip), palm: [0, sin(th), cos(th)], pole: [sx * 0.15, -0.2, -1], curl: 0.92, upRot: 0 };
      };
      return { pelvis, torso, head: 6, arms: { L: mk(1), R: mk(-1) }, legs: seatLegs(pelvis, 0.15, 0.5) };
    }
    return {
      cam: { yaw: -70, pitch: 8 },
      setup(scene) { scene.add(P().benchIncline({ seatZ: seat.seatZ, seatH: seat.seatH, back: seat.back, backLen: 0.9 })); const [a, b] = dbs(scene, { head: 0.052 }); return { a, b }; },
      pose: spec,
      update(d, t, solved) { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
    };
  };

  /* ---------------- CURL EN BANCO PREDICADOR ----------------
     Axilas cerca del borde del cojín y la parte posterior de los brazos
     apoyada; desde el codo casi extendido (sin bloquear) hasta que el
     antebrazo queda casi vertical, sin llevar la barra a los hombros. */
  PATTERNS.curlPreacher = () => {
    const seatH = 0.5, padAng = 42; // inclinación del cojín (bajo la horizontal)
    function spec(t) {
      const e = ease(t), th = lerp(8, 96, e);
      const torso = { pitch: 14 }, pelvis = [0, seatH + 0.088, -0.12];
      const mk = sx => {
        const sh = tp(pelvis, torso, sx > 0 ? SH() : mirrorV(arr(SH())));
        const up = sagDir(90 - padAng);
        const el = sh.clone().addScaledVector(up, L.ua * 0.97); el.x = sx * 0.17;
        const grip = el.clone().addScaledVector(sagDir(90 - padAng + th), L.fa + 0.068); grip.x = sx * 0.17;
        const fa = sagDir(90 - padAng + th);
        const palm = V3(0, -fa.y, fa.z).set(0, fa.z, -fa.y); // perpendicular al antebrazo, hacia arriba
        if (palm.y < 0) palm.negate();
        return { grip: arr(grip), palm: arr(palm), pole: [sx * 0.1, -0.7, -0.3], curl: 0.92, upRot: 8 };
      };
      return { pelvis, torso, head: 10, arms: { L: mk(1), R: mk(-1) }, legs: seatLegs(pelvis, 0.16, 0.42) };
    }
    return {
      cam: { yaw: -68, pitch: 10 },
      setup(scene) {
        const d = {};
        const sp = spec(0), s = Biomech.solve(sp);
        const sh = s.info.arms.L.shoulder, el = s.info.arms.L.elbow;
        const dir = V3().subVectors(el, sh).normalize(), n = V3(0, dir.z, -dir.y); // normal hacia arriba
        const c = V3().addVectors(sh, el).multiplyScalar(0.5).setX(0).addScaledVector(n, -0.07).addScaledVector(dir, 0.02);
        scene.add(P().pad(arr(c), [0.62, 0.07, 0.36], [-Math.atan2(dir.y, dir.z) / D, 0, 0]));
        scene.add(P().tube([0, 0.03, c.z + 0.05], [0, c.y - 0.08, c.z - 0.02], 0.03), P().tube([-0.25, 0.03, c.z + 0.05], [0.25, 0.03, c.z + 0.05], 0.025));
        scene.add(P().pad([0, seatH - 0.035, -0.14], [0.34, 0.07, 0.32]), P().tube([0, 0.03, -0.14], [0, seatH - 0.07, -0.14], 0.03), P().tube([0, 0.03, -0.14], [0, 0.03, c.z + 0.05], 0.03));
        d.bar = bar(scene, { plates: [0.11], shaft: 1.2, sleeve: 0.2, ez: true });
        return d;
      },
      pose: spec,
      update(d, t, solved) { placeBar(d.bar, solved); }
    };
  };

  /* ---------------- CURL BAYESIANO ----------------
     De espaldas a una polea baja y con un paso al frente: el brazo queda
     por detrás del tronco (hombro extendido) y no se mueve; el antebrazo
     sube hasta que la mano llega cerca del hombro. */
  PATTERNS.curlBayesian = () => {
    const pulley = V3(0.18, 0.35, -0.62);
    function spec(t) {
      const e = ease(t), th = lerp(6, 128, e), back = -26;
      return stand({ k: 10, z: 0.24, shift: -0.18 }, pelvis => {
        const torso = { pitch: 8 };
        const sh = SH();
        const el = sh.clone().add(V3(0.02, 0, 0)).addScaledVector(sagDir(back), L.ua * 0.98);
        const fa = sagDir(back + th);
        const grip = el.clone().addScaledVector(fa, L.fa + 0.068); grip.x = 0.19;
        const a = armsL(pelvis, torso, { grip: arr(grip), palm: [0, -fa.z, fa.y].map(x => -x), pole: [0.15, -0.2, -1], curl: 0.92, upRot: 0 },
          { grip: [-0.235, 0.0, 0.1], palm: [1, 0, 0], pole: [-0.3, -0.2, -1], curl: 0.4 });
        const shR = tp(pelvis, torso, mirrorV(arr(SH())));
        a.R.grip = [-0.215, shR.y - armEff() + 0.04, shR.z + 0.04];
        return { pelvis, torso, head: 2, arms: a, legs: splitLegs(0.24, -0.2, 8, 16) };
      });
    }
    return {
      standing: true, cam: { yaw: -75, pitch: 8 },
      setup(scene) { scene.add(P().cableTower(pulley.x, pulley.z - 0.06, pulley.y, { face: 1 })); const h = P().handle('D'); scene.add(h); return { h, c: cable(scene) }; },
      pose: spec,
      update(d, t, solved) { placeHandle(d.h, d.c, pulley, solved.info.arms.L.grip); }
    };
  };

  /* ---------------- CURL CONCENTRADO ----------------
     Sentado con las piernas separadas y el tronco inclinado: la parte
     posterior del brazo se apoya en el interior del muslo, el brazo
     cuelga vertical y solo se mueve el antebrazo. */
  PATTERNS.curlConcentration = () => {
    const seatH = 0.45;
    function spec(t) {
      const e = ease(t), th = lerp(8, 126, e);
      const torso = { pitch: 36, yaw: -8 }, pelvis = [0, seatH + 0.088, -0.05];
      const sh = tp(pelvis, torso, SH());
      const el = sh.clone().add(V3(0.0, -L.ua * 0.97, 0.03));
      const fa = V3(-0.28, -Math.cos(th * D), Math.sin(th * D)).normalize();
      const grip = el.clone().addScaledVector(fa, L.fa + 0.068);
      const palm = V3(-0.5, Math.sin(th * D), Math.cos(th * D)).normalize();
      const knR = tp(pelvis, torso, mirrorV(arr(SH())));
      return {
        pelvis, torso, head: 14,
        arms: {
          L: { grip: arr(grip), palm: arr(palm), pole: [0.4, -0.2, -1], curl: 0.92, upRot: 0 },
          R: { grip: [-0.26, 0.6, 0.3], palm: [0, -1, 0.1], pole: [-0.6, 0.1, -1], curl: 0.35, handDir: [0, -0.3, 1] }
        },
        legs: {
          L: { ankle: [0.34, L.ankleH, 0.38], footYaw: 24, pole: [0.6, 0.4, 1] },
          R: { ankle: [-0.34, L.ankleH, 0.38], footYaw: 24, pole: [-0.6, 0.4, 1] }
        }, _knR: knR
      };
    }
    return {
      cam: { yaw: -30, pitch: 14 },
      setup(scene) { scene.add(P().benchFlat(-0.6, 0.2, seatH).rotateY(Math.PI / 2)); const db = P().dumbbell({ head: 0.055 }); scene.add(db); return { db }; },
      pose: spec,
      update(d, t, solved) { placeDB(d.db, solved, 'L', handAxis(solved, 'L')); }
    };
  };

  /* ---------------- PRESS DE PECHO EN MÁQUINA ----------------
     Espalda apoyada, asas a la altura de la parte media del pecho, codos
     algo por debajo de los hombros y muñecas rectas; se extienden los
     brazos al frente sin bloquear los codos de golpe. */
  PATTERNS['seated-push'] = () => {
    const seat = { seatH: 0.47, seatZ: 0.06, back: 82 };
    function spec(t) {
      const e = ease(t);
      const { pelvis, torso } = seatPose(seat);
      const hand = { palm: [-0.8, 0, 0.6], pole: [0.75, -1, -0.15], curl: 0.92, upRot: 0 };
      // Final: brazos extendidos al frente sin bloquear (codo ~12°), a la altura del pecho medio
      const end = toLocal(pelvis, torso, probeGrip({ pelvis, torso, arms: armsL(pelvis, torso, { dir: [0.0, -0.22, 1], flex: 12, protract: 8, ...hand }) }));
      const g = V3(0.24, 0.36, 0.2).lerp(end, e);
      const a = armsL(pelvis, torso, { grip: arr(g), protract: lerp(-6, 8, e), ...hand });
      return { pelvis, torso, head: 0, arms: a, legs: seatLegs(pelvis, 0.15, 0.46) };
    }
    return {
      cam: { yaw: -55, pitch: 12 },
      setup(scene) {
        scene.add(P().benchIncline({ seatZ: seat.seatZ, seatH: seat.seatH, back: seat.back, backLen: 0.8 }));
        return { m: leverHandles(scene, [0.46, 1.58, -0.22]) };
      },
      pose: spec,
      update(d, t, solved) { d.m(solved); }
    };
  };

  /* ---------------- CONTRACTOR DE PECHO (PEC DECK) ----------------
     Espalda apoyada y pecho alto; brazos a la altura del pecho con los
     codos algo flexionados que se cierran en arco hasta juntar las manos.
     Al abrir, los brazos no pasan de la línea del cuerpo. */
  PATTERNS['pec-deck'] = () => {
    const seat = { seatH: 0.47, seatZ: 0.06, back: 85 };
    function spec(t) {
      const e = ease(t);
      const { pelvis, torso } = seatPose(seat);
      const h = lerp(4, 80, e) * D; // aducción horizontal desde la línea del cuerpo
      const dir = V3(Math.cos(h), -0.12, Math.sin(h)).normalize();
      const a = armsL(pelvis, torso, { dir: arr(dir), flex: 22, palm: arr(V3(0, 0, 1).lerp(V3(-1, 0, 0.3), e).normalize()), pole: [0, -0.4, -1], curl: 0.8, upRot: 6, protract: lerp(-8, 8, e) });
      return { pelvis, torso, head: 0, arms: a, legs: seatLegs(pelvis, 0.15, 0.46) };
    }
    return {
      cam: { yaw: -30, pitch: 18 },
      setup(scene) { scene.add(P().benchIncline({ seatZ: seat.seatZ, seatH: seat.seatH, back: seat.back, backLen: 0.8 })); return { m: flyArms(scene, seat) }; },
      pose: spec,
      update(d, t, solved) { d.m(solved); }
    };
  };

  /* ---------------- PÁJARO (máquina / polea) ----------------
     Máquina: sentado con el pecho apoyado, brazos al frente a la altura de
     los hombros con los codos casi extendidos; se abren hasta la línea del
     cuerpo sin juntar en exceso las escápulas. Polea: de pie, cables
     cruzados a la altura de los hombros. */
  PATTERNS['reverse-fly'] = o => {
    const cab = !!o.cable;
    const tz = 0.62, tx = 0.95, py = 1.42;
    function armAt(e) {
      const h = lerp(cab ? 108 : 86, 4, e) * D;
      const dir = V3(Math.cos(h), cab ? -0.05 : -0.1, Math.sin(h)).normalize();
      return { dir: arr(dir), flex: 14, palm: cab ? [0, -1, 0] : [-1, 0, 0], pole: [0, 0.5, -1], curl: 0.85, upRot: 6, protract: lerp(10, -10, e) };
    }
    function spec(t) {
      const e = ease(t);
      if (cab) return stand({ k: 6 }, pelvis => ({ pelvis, torso: { pitch: 2 }, head: 0, arms: armsL(pelvis, { pitch: 2 }, armAt(e)) }));
      const seat = { seatH: 0.47, seatZ: -0.05, back: 90 };
      const torso = { pitch: 6 }, pelvis = [0, seat.seatH + 0.088, -0.02];
      return { pelvis, torso, head: 0, arms: armsL(pelvis, torso, armAt(e)), legs: seatLegs(pelvis, 0.16, 0.36) };
    }
    const pL = V3(-tx + 0.06, py, tz), pR = V3(tx - 0.06, py, tz);
    return {
      standing: cab, cam: { yaw: cab ? -150 : -150, pitch: 18 },
      setup(scene) {
        if (cab) {
          scene.add(P().cableTower(tx, tz, py, { face: [-1, 0] }), P().cableTower(-tx, tz, py, { face: [1, 0] }));
          const hL = P().handle('D'), hR = P().handle('D'); scene.add(hL, hR);
          return { hL, hR, cL: cable(scene), cR: cable(scene) };
        }
        // Máquina: asiento y cojín para el pecho
        scene.add(P().pad([0, 0.435, -0.05], [0.34, 0.07, 0.34]), P().tube([0, 0.03, -0.05], [0, 0.4, -0.05], 0.03));
        scene.add(P().pad([0, 1.12, 0.2], [0.3, 0.5, 0.08]), P().tube([0, 0.03, 0.3], [0, 0.9, 0.26], 0.03), P().tube([0, 0.03, -0.05], [0, 0.03, 0.4], 0.03));
        return { m: flyArms(scene, { seatH: 0.47 }, true) };
      },
      pose: spec,
      update(d, t, solved) {
        if (d.m) d.m(solved);
        else { placeHandle(d.hL, d.cL, pL, solved.info.arms.L.grip); placeHandle(d.hR, d.cR, pR, solved.info.arms.R.grip); }
      }
    };
  };

  /* ---------------- JALÓN AL PECHO / JALÓN NEUTRO ----------------
     Muslos fijos bajo el rodillo y tronco algo inclinado atrás; la barra
     baja hasta la parte alta del pecho con los codos hacia abajo y atrás,
     juntando las escápulas sin encoger los hombros. */
  PATTERNS.pulldown = (o, ex) => {
    const neutral = ex && /neutro/.test(ex.id);
    const seatH = 0.47, pulley = V3(0, 2.32, 0.12);
    const pelvis = [0, seatH + 0.088, -0.02], legs = seatLegs(pelvis, 0.15, 0.42);
    const gx = neutral ? 0.045 : 0.37;
    const hand = { palm: neutral ? [-1, 0, 0.1] : [0, 0.1, 1], pole: neutral ? [0.5, -0.5, 0.2] : [1, -0.4, -0.25], curl: 0.92 };
    // Arriba: brazos casi extendidos (el codo ~12°) hacia la barra
    const t0 = { pitch: -8 };
    const r = Biomech.reach(12), dx = gx - 0.164;
    const top = probeGrip({ pelvis, torso: t0, legs, arms: armsL(pelvis, t0, { dir: [dx, Math.sqrt(r * r - dx * dx), 0.08], flex: 12, ...hand }) });
    function spec(t) {
      const e = ease(t);
      const torso = { pitch: lerp(-8, -16, e) };
      const bottom = tp(pelvis, torso, neutral ? V3(gx, 0.4, 0.2) : V3(gx, 0.47, 0.18));
      // la barra baja por delante de la cara
      const g = top.clone().lerp(bottom, e).add(V3(0, 0, 0.07 * Math.sin(e * Math.PI)));
      const a = armsL(pelvis, torso, { grip: [0, 0, 0], ...hand });
      a.L.grip = [g.x, g.y, g.z]; a.R.grip = [-g.x, g.y, g.z];
      return { pelvis, torso, head: lerp(-4, -6, e), arms: a, legs };
    }
    return {
      cam: { yaw: -55, pitch: 10 },
      setup(scene) {
        scene.add(P().pad([0, seatH - 0.035, -0.02], [0.36, 0.07, 0.34]), P().tube([0, 0.03, -0.02], [0, seatH - 0.07, -0.02], 0.032), P().tube([0, 0.03, -0.3], [0, 0.03, 0.5], 0.03));
        // Rodillos sobre la parte baja de los muslos (fijan el cuerpo al tirar)
        const lg = Biomech.solve(spec(0)).info.legs.L;
        const rp = V3().lerpVectors(lg.hip, lg.knee, 0.78).add(V3(0, 0.12, 0));
        for (const sx of [1, -1]) scene.add(P().cylBetween([sx * 0.02, rp.y, rp.z], [sx * 0.24, rp.y, rp.z], 0.048, P().mats().pad));
        scene.add(P().tube([0, rp.y, rp.z], [0, rp.y, rp.z + 0.12], 0.028), P().tube([0, rp.y, rp.z + 0.12], [0, 0.03, rp.z + 0.2], 0.028), P().box([0, 1.2, -0.42], [0.09, 2.4, 0.09], P().mats().frame), P().tube([0, 2.36, -0.42], [0, 2.36, 0.15], 0.03));
        const h = P().handle(neutral ? 'v' : 'lat'); scene.add(h);
        return { h, c: cable(scene) };
      },
      pose: spec,
      update(d, t, solved) {
        const gL = solved.info.arms.L.grip, gR = solved.info.arms.R.grip, mid = V3().addVectors(gL, gR).multiplyScalar(0.5);
        if (neutral) P().orient(d.h, mid.clone().add(V3(0, 0.06, 0)), V3(1, 0, 0), V3(0, 1, 0));
        else P().orient(d.h, mid, V3(1, 0, 0), V3(0, 1, 0));
        setCable(d.c, pulley, mid.clone().add(V3(0, neutral ? 0.12 : 0.06, 0)));
      }
    };
  };

  /* ---------------- REMO EN MÁQUINA / REMO EN POLEA SENTADO ----------------
     Máquina: pecho apoyado; los codos van hacia atrás pegados al cuerpo
     hasta pasar la línea del tronco y se juntan las escápulas.
     Polea: rodillas algo flexionadas, el tronco pasa de ligeramente
     inclinado a erguido (sin balanceo exagerado) y el agarre llega al
     abdomen alto. */
  PATTERNS['row-seated'] = o => {
    const cab = !!o.cable;
    const pulley = V3(0, 0.28, 1.08);
    function spec(t) {
      const e = ease(t);
      if (cab) {
        const torso = { pitch: lerp(14, -4, e) }, pelvis = [0, 0.3 + 0.088, 0];
        const hand = { palm: [-1, 0, 0], pole: [0.3, -0.4, -1], curl: 0.92, upRot: 0 };
        const t0 = { pitch: 14 };
        const g0 = toLocal(pelvis, t0, probeGrip({ pelvis, torso: t0, arms: armsL(pelvis, t0, { dir: [-0.2, -0.12, 1], flex: 12, protract: 12, ...hand }) }));
        const g1 = V3(0.045, 0.3, 0.17);
        const a = armsL(pelvis, torso, { grip: arr(g0.lerp(g1, e)), protract: lerp(12, -10, e), ...hand });
        // la carga tira de las manos hacia la polea
        return { pelvis, torso, head: lerp(4, 0, e), arms: a, legs: footPlate(pelvis, 0.8, 0.22) };
      }
      const torso = { pitch: 4 }, pelvis = [0, 0.46 + 0.088, -0.1], legs = seatLegs(pelvis, 0.15, 0.4);
      const hand = { palm: [-1, 0, 0], pole: [0.25, -0.3, -1], curl: 0.92, upRot: 0 };
      // Brazos extendidos al frente (escápulas adelantadas) → codos atrás junto al cuerpo
      const g0 = probeGrip({ pelvis, torso, legs, arms: armsL(pelvis, torso, { dir: [0.06, -0.16, 1], flex: 12, protract: 12, ...hand }) });
      const g1 = tp(pelvis, torso, V3(0.21, 0.33, 0.06));
      const g = g0.lerp(g1, e);
      const a = armsL(pelvis, torso, { grip: [0, 0, 0], protract: lerp(12, -12, e), ...hand });
      a.L.grip = [g.x, g.y, g.z]; a.R.grip = [-g.x, g.y, g.z];
      return { pelvis, torso, head: 0, arms: a, legs };
    }
    return {
      cam: { yaw: -65, pitch: 10 },
      setup(scene) {
        if (cab) {
          scene.add(P().benchFlat(-0.45, 0.62, 0.3, 0, 0.28));
          scene.add(P().pad([0, 0.32, 0.86], [0.42, 0.34, 0.06], [-24, 0, 0]), P().box([0, 0.7, 1.15], [0.1, 1.4, 0.1], P().mats().frame));
          const h = P().handle('v'); scene.add(h); return { h, c: cable(scene) };
        }
        scene.add(P().pad([0, 0.425, -0.1], [0.34, 0.07, 0.34]), P().tube([0, 0.03, -0.1], [0, 0.39, -0.1], 0.03), P().tube([0, 0.03, -0.1], [0, 0.03, 0.6], 0.03));
        scene.add(P().pad([0, 1.0, 0.105], [0.3, 0.42, 0.07]), P().tube([0, 0.03, 0.3], [0, 0.82, 0.16], 0.03));
        return { m: rowHandles(scene) };
      },
      pose: spec,
      update(d, t, solved) {
        if (d.m) d.m(solved);
        else {
          const gL = solved.info.arms.L.grip, gR = solved.info.arms.R.grip, mid = V3().addVectors(gL, gR).multiplyScalar(0.5);
          P().orient(d.h, mid.clone().add(V3(0, 0, 0.06)), V3(1, 0, 0), V3(0, 0, 1));
          setCable(d.c, pulley, mid.clone().add(V3(0, 0, 0.12)));
        }
      }
    };
  };

  /* ---------------- EXTENSIÓN DE PIERNAS ----------------
     Rodilla alineada con el eje de la máquina y rodillo en la parte baja de
     la espinilla; la rodilla se extiende hasta casi bloquear y baja con
     control hasta unos 90°. */
  PATTERNS['leg-extension'] = () => {
    const seat = { seatH: 0.52, seatZ: 0.0, back: 72, seatLen: 0.46 };
    function spec(t) {
      const e = ease(t), k = lerp(88, 6, e);
      const { pelvis, torso } = seatPose(seat);
      const leg = sx => {
        const hip = tp(pelvis, torso, rel(sx > 0 ? 'hipL' : 'hipR'));
        const knee = V3(sx * 0.1, hip.y - 0.045, hip.z + L.th * 0.995);
        const a = (90 - k) * D; // tibia desde la vertical hacia delante
        const ankle = knee.clone().add(V3(0, -L.sh * Math.cos(a), L.sh * Math.sin(a)));
        return { ankle: arr(ankle), footPitch: (90 - k) + 6, footYaw: 4, pole: [sx * 0.05, 1, 0.2] };
      };
      const a = armsL(pelvis, torso, { grip: [0.27, -0.02, 0.13], palm: [-1, 0, 0], pole: [0.4, -0.3, -1], curl: 0.92 });
      return { pelvis, torso, head: 0, arms: a, legs: { L: leg(1), R: leg(-1) } };
    }
    return {
      cam: { yaw: -70, pitch: 10 },
      setup(scene) {
        scene.add(P().benchIncline({ seatZ: seat.seatZ, seatH: seat.seatH, back: seat.back, backLen: 0.72, seatLen: seat.seatLen }));
        for (const sx of [1, -1]) scene.add(P().tube([sx * 0.28, 0.45, 0.1], [sx * 0.28, 0.45, -0.12], 0.016));
        return { m: shinRoller(scene, 'front') };
      },
      pose: spec,
      update(d, t, solved) { d.m(solved); }
    };
  };

  /* ---------------- CURL FEMORAL SENTADO ----------------
     Rodilla alineada con el eje y muslos sujetos por la almohadilla; desde
     las rodillas casi extendidas, los talones bajan hacia el asiento. */
  PATTERNS['leg-curl-seated'] = () => {
    const seat = { seatH: 0.52, seatZ: 0.0, back: 75, seatLen: 0.46 };
    function spec(t) {
      const e = ease(t), k = lerp(10, 100, e);
      const { pelvis, torso } = seatPose(seat);
      const leg = sx => {
        const hip = tp(pelvis, torso, rel(sx > 0 ? 'hipL' : 'hipR'));
        const knee = V3(sx * 0.1, hip.y - 0.03, hip.z + L.th * 0.995);
        const a = (90 - k) * D;
        const ankle = knee.clone().add(V3(0, -L.sh * Math.cos(a), L.sh * Math.sin(a)));
        return { ankle: arr(ankle), footPitch: (90 - k) + 8, footYaw: 3, pole: [sx * 0.05, 1, 0.2] };
      };
      const a = armsL(pelvis, torso, { grip: [0.27, -0.02, 0.13], palm: [-1, 0, 0], pole: [0.4, -0.3, -1], curl: 0.92 });
      return { pelvis, torso, head: 0, arms: a, legs: { L: leg(1), R: leg(-1) } };
    }
    return {
      cam: { yaw: -70, pitch: 10 },
      setup(scene) {
        scene.add(P().benchIncline({ seatZ: seat.seatZ, seatH: seat.seatH, back: seat.back, backLen: 0.72, seatLen: seat.seatLen }));
        return { m: shinRoller(scene, 'back', true) };
      },
      pose: spec,
      update(d, t, solved) { d.m(solved); }
    };
  };

  /* ---------------- ABDUCCIÓN DE CADERA EN MÁQUINA ----------------
     Espalda apoyada, rodillas a ~90° y almohadillas por fuera de las
     rodillas; las piernas se abren sin mover el tronco. */
  PATTERNS['hip-abduction'] = () => {
    const seat = { seatH: 0.5, seatZ: 0.0, back: 70, seatLen: 0.42 };
    function spec(t) {
      const e = ease(t), ab = lerp(2, 34, e);
      const { pelvis, torso } = seatPose(seat);
      const leg = sx => {
        const hip = tp(pelvis, torso, rel(sx > 0 ? 'hipL' : 'hipR'));
        const tdir = V3(sx * Math.sin(ab * D), -0.08, Math.cos(ab * D)).normalize();
        const knee = hip.clone().addScaledVector(tdir, L.th);
        const ankle = knee.clone().add(V3(sx * 0.02, -L.sh * 0.94, -L.sh * 0.33));
        return { ankle: arr(ankle), footYaw: ab * 0.8, footPitch: 8, pole: [sx * Math.sin(ab * D) * 0.6, 0.6, 1] };
      };
      const a = armsL(pelvis, torso, { grip: [0.27, 0.0, 0.18], palm: [-1, 0, 0], pole: [0.4, -0.3, -1], curl: 0.92 });
      return { pelvis, torso, head: 0, arms: a, legs: { L: leg(1), R: leg(-1) } };
    }
    return {
      cam: { yaw: -20, pitch: 26 },
      setup(scene) {
        scene.add(P().benchIncline({ seatZ: seat.seatZ, seatH: seat.seatH, back: seat.back, backLen: 0.72, seatLen: seat.seatLen }));
        return { m: kneePads(scene) };
      },
      pose: spec,
      update(d, t, solved) { d.m(solved); }
    };
  };

  /* ---------------- GEMELOS SENTADO ----------------
     Rodillas a ~90° con la almohadilla sobre la parte baja de los muslos y
     la parte delantera de los pies en la plataforma: los talones suben al
     máximo y bajan hasta el estiramiento. */
  PATTERNS['calf-seated'] = () => {
    const seatH = 0.47, stepH = 0.08, toeZ = 0.47;
    function spec(t) {
      const e = ease(t), pitch = lerp(-30, 16, e);
      const torso = { pitch: 6 }, pelvis = [0, seatH + 0.088, 0];
      const leg = sx => ({ toe: [sx * 0.11, stepH + R.toeH, toeZ], footPitch: pitch, footYaw: 4, pole: [sx * 0.05, 0.6, 1] });
      const a = { L: { grip: [0.27, 0.66, 0.3], palm: [-1, 0, 0], pole: [0.4, -0.3, -1], curl: 0.92 }, R: { grip: [-0.27, 0.66, 0.3], palm: [1, 0, 0], pole: [-0.4, -0.3, -1], curl: 0.92 } };
      return { pelvis, torso, head: 4, arms: a, legs: { L: leg(1), R: leg(-1) } };
    }
    return {
      cam: { yaw: -72, pitch: 10 },
      setup(scene) {
        scene.add(P().pad([0, seatH - 0.035, -0.02], [0.36, 0.07, 0.36]), P().tube([0, 0.03, -0.02], [0, seatH - 0.07, -0.02], 0.03));
        scene.add(P().block([0, stepH / 2, toeZ + 0.06], [0.4, stepH, 0.2]), P().tube([0, 0.03, -0.2], [0, 0.03, toeZ + 0.1], 0.03));
        for (const sx of [1, -1]) scene.add(P().tube([sx * 0.27, 0.6, 0.22], [sx * 0.27, 0.6, 0.4], 0.018));
        return { m: thighPad(scene) };
      },
      pose: spec,
      update(d, t, solved) { d.m(solved); }
    };
  };

  /* ---------------- PRENSA DE PIERNAS 45° / GEMELOS EN PRENSA ----------------
     Espalda y cadera apoyadas; pies a la anchura de la cadera en el centro
     de la plataforma. Se baja hasta unos 90° de rodilla, antes de que la
     zona lumbar se despegue, y se empuja sin bloquear las rodillas. */
  PATTERNS['leg-press'] = o => {
    const calf = !!o.calf;
    const back = 40; // respaldo respecto a la horizontal
    const sled = V3(0, Math.sin(45 * D), Math.cos(45 * D)), up = V3(0, Math.cos(45 * D), -Math.sin(45 * D));
    const seat = { seatH: 0.42, seatZ: 0.0, back, seatLen: 0.4 };
    function plateAt(dist, pelvis) { return V3(0, pelvis[1] - 0.12, pelvis[2] + 0.05).addScaledVector(sled, dist); }
    const { pelvis, torso } = seatPose(seat);
    const arm = armsL(pelvis, torso, { grip: [0.28, 0.05, 0.05], palm: [-1, 0, 0], pole: [0.4, -0.3, -1], curl: 0.92 });
    const along = 0.2;
    const flatLeg = (pc, sx) => ({ ankle: arr(pc.clone().addScaledVector(up, along).addScaledVector(sled, -0.065).add(V3(sx * 0.12, 0, 0))), footPitch: 135, footYaw: 6, pole: [sx * 0.25, 1, 0.2] });
    const flat = dist => { const pc = plateAt(dist, pelvis); return { pelvis, torso, head: 8, arms: arm, legs: { L: flatLeg(pc, 1), R: flatLeg(pc, -1) }, _plate: arr(pc) }; };
    // Distancia de la plataforma para una flexión de rodilla dada
    const distFor = k => solve1(d => Biomech.solve(flat(d)).info.legs.L.kneeFlex - k, 0.25, 1.2, 22);
    const dTop = calf ? distFor(4) - 0.04 : distFor(10), dBot = calf ? dTop : distFor(92);
    function spec(t) {
      const e = ease(t);
      if (!calf) return flat(lerp(dTop, dBot, e));
      // Gemelos: solo la parte delantera del pie en el borde inferior; el tobillo
      // pasa de flexión plantar completa a un estiramiento cómodo
      const pa = lerp(-26, 14, e), dist = dTop - 0.1 * Math.sin(pa * D);
      const pc = plateAt(dist, pelvis);
      const toeAt = sx => pc.clone().addScaledVector(up, -0.16).add(V3(sx * 0.11, 0, 0)).addScaledVector(sled, -0.01);
      const want = lerp(-28, 14, e);
      const fp = solve1(f => Biomech.solve({ pelvis, torso, legs: { L: { toe: arr(toeAt(1)), footPitch: f, footYaw: 4, pole: [0.1, 1, 0] } } }).info.legs.L.dorsi - want, 60, 200, 18);
      const leg = sx => ({ toe: arr(toeAt(sx)), footPitch: fp, footYaw: 4, pole: [sx * 0.1, 1, 0] });
      return { pelvis, torso, head: 8, arms: arm, legs: { L: leg(1), R: leg(-1) }, _plate: arr(pc) };
    }
    return {
      cam: { yaw: -75, pitch: 14 },
      setup(scene) {
        scene.add(P().benchIncline({ seatZ: seat.seatZ, seatH: seat.seatH, back, backLen: 0.85, seatLen: seat.seatLen }));
        const m = P().mats();
        const sp = spec(0);
        const p0 = V3(...sp._plate);
        // Guías paralelas al recorrido, por debajo de la plataforma, con sus apoyos
        const pl = plateAt(0, pelvis);
        const r0 = pl.clone().addScaledVector(sled, 0.25).addScaledVector(up, -0.42), r1 = r0.clone().addScaledVector(sled, 1.25);
        for (const sx of [1, -1]) {
          const a = r0.clone().setX(sx * 0.24), b = r1.clone().setX(sx * 0.24);
          scene.add(P().tube(arr(a), arr(b), 0.035), P().tube(arr(b), [b.x, 0.03, b.z], 0.04), P().tube(arr(a), [a.x, 0.03, a.z], 0.035));
        }
        scene.add(P().tube([0, 0.03, r0.z], [0, 0.03, r1.z], 0.035));
        const plate = new T.Group();
        // Plataforma (la cara mira hacia la persona) y carro que desliza por las guías
        plate.add(P().box([0, 0.05, 0.02], [0.62, 0.66, 0.04], m.frameLight), P().box([0, 0.05, 0.07], [0.74, 0.72, 0.06], m.frame));
        plate.add(P().box([0, -0.36, 0.2], [0.56, 0.06, 0.3], m.frame), P().box([0, -0.2, 0.14], [0.08, 0.3, 0.08], m.frame));
        scene.add(plate);
        return { plate };
      },
      pose: spec,
      update(d, t, solved) {
        const pc = V3(...solved.spec._plate);
        P().orient(d.plate, pc, V3(1, 0, 0), up);
      }
    };
  };
  PATTERNS['calf-press'] = () => PATTERNS['leg-press']({ calf: true });

  /* ---------------- SENTADILLA HACK ----------------
     Espalda y hombros apoyados en el respaldo que se desliza por las guías;
     pies en la parte media de la plataforma; rodillas en la dirección de
     los pies hasta la profundidad que permita mantener la espalda apoyada. */
  PATTERNS['hack-squat'] = () => {
    const lean = 26; // respaldo respecto a la vertical
    const rail = V3(0, Math.cos(lean * D), -Math.sin(lean * D)); // hacia arriba por las guías
    function spec(t) {
      const e = ease(t);
      const torso = { pitch: -lean };
      const feetZ = 0.36, feetY = 0.12;
      const leg = (sx, pelvis) => ({ ankle: [sx * 0.13, feetY + L.ankleH * 0.9, feetZ], footYaw: 10, footPitch: 16, pole: [sx * 0.25, 0, 1] });
      // la cadera recorre la guía: profundidad por flexión de rodilla
      const k = lerp(8, 100, e);
      const pelvisFor = d => V3(0, 0.9, -0.16).addScaledVector(rail, -d);
      const d = solve1(dd => {
        const p = pelvisFor(dd), sp = { pelvis: arr(p), torso, legs: { L: leg(1), R: leg(-1) } };
        return Biomech.solve(sp).info.legs.L.kneeFlex - k;
      }, -0.1, 0.6, 22);
      const pelvis = arr(pelvisFor(d));
      const sh = tp(pelvis, torso, SH());
      const a = armsL(pelvis, torso, { grip: [0.24, SH().y + 0.06, 0.12], palm: [0, -0.3, -1], pole: [0.4, -1, -0.2], curl: 0.92 });
      return { pelvis, torso, head: 4, arms: a, legs: { L: leg(1), R: leg(-1) }, _sh: arr(sh) };
    }
    return {
      cam: { yaw: -72, pitch: 10 },
      setup(scene) {
        const m = P().mats();
        scene.add(P().box([0, 0.06, 0.22], [0.7, 0.12, 0.55], m.frameLight));
        for (const sx of [1, -1]) scene.add(P().tube(V3(sx * 0.3, 0.14, -0.05).toArray(), V3(sx * 0.3, 0.14, -0.05).addScaledVector(rail, 2.0).toArray(), 0.035));
        const sled = new T.Group();
        sled.add(P().pad([0, 0, 0], [0.42, 0.95, 0.07]), P().pad([0.16, 0.5, 0.11], [0.1, 0.08, 0.2]), P().pad([-0.16, 0.5, 0.11], [0.1, 0.08, 0.2]));
        scene.add(sled);
        return { sled };
      },
      pose: spec,
      update(d, t, solved) {
        const sh = solved.info.shoulderMid;
        const back = V3().copy(solved.info.torsoFwd).multiplyScalar(-0.13);
        P().orient(d.sled, sh.clone().add(back).addScaledVector(solved.info.torsoUp, -0.38), V3(1, 0, 0), solved.info.torsoUp);
      }
    };
  };

  /* =================== TUMBADO, APOYOS Y SUSPENSIÓN =================== */

  /* Codo con flexión fija: distancia hombro → agarre */
  const reachAt = th => Math.sqrt(L.ua * L.ua + (L.fa + 0.07) ** 2 + 2 * L.ua * (L.fa + 0.07) * cos(th));
  /* Tumbado boca arriba en banco plano (cabeza hacia -z) */
  const SUP = { benchH: 0.43 };
  const supinePelvis = () => [0, SUP.benchH + 0.098, 0.0];
  function supineLegs(pelvis) {
    return {
      L: { ankle: [0.3, L.ankleH, pelvis[2] + 0.4], footYaw: 16, pole: [0.45, 1, 0.3] },
      R: { ankle: [-0.3, L.ankleH, pelvis[2] + 0.4], footYaw: 16, pole: [-0.45, 1, 0.3] }
    };
  }

  /* ---------------- APERTURAS CON MANCUERNAS ----------------
     Tumbado en banco plano, palmas enfrentadas y codos ligeramente
     flexionados y fijos: los brazos se abren en arco hasta la altura del
     tronco (sin pasar mucho por debajo) y vuelven sobre el pecho. */
  PATTERNS.fly = () => {
    function spec(t) {
      const e = ease(t);
      const torso = { pitch: -88 }, pelvis = supinePelvis();
      const h = lerp(80, 6, e) * D; // 90 = brazos verticales sobre el pecho
      const dir = V3(Math.cos(h), -0.16, Math.sin(h)).normalize();
      const a = armsL(pelvis, torso, { dir: arr(dir), flex: lerp(14, 24, e), palm: arr(V3(-1, 0, 0).lerp(V3(-0.15, 0, 1), e).normalize()), pole: [0.2, -0.5, -1], curl: 0.92, upRot: 0, protract: 0 });
      return { pelvis, torso, head: 0, arms: a, legs: supineLegs(pelvis) };
    }
    return {
      cam: { yaw: -30, pitch: 26 },
      setup(scene) { scene.add(P().benchFlat(-0.85, 0.35, SUP.benchH)); const [a, b] = dbs(scene, { head: 0.055 }); return { a, b }; },
      pose: spec,
      update(d, t, solved) { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
    };
  };

  /* ---------------- PRESS FRANCÉS ----------------
     Tumbado, brazos algo inclinados hacia la cabeza y fijos; solo se
     flexiona el codo, bajando la barra hacia la frente sin abrir los
     codos. */
  PATTERNS.skullcrusher = () => {
    function spec(t) {
      const e = ease(t);
      const torso = { pitch: -88 }, pelvis = supinePelvis();
      const phi = 16, th = lerp(8, 112, e);
      const up = V3(0, Math.sin(phi * D), Math.cos(phi * D));
      const sh = shoulderFor(torso, arr(up), { upRot: 20 });
      const el = sh.clone().add(V3(-0.035, 0, 0)).addScaledVector(up, L.ua * 0.98);
      const fd = V3(0, Math.sin((phi + th) * D), Math.cos((phi + th) * D));
      const grip = el.clone().addScaledVector(fd, L.fa + 0.07); grip.x = 0.12;
      const a = armsL(pelvis, torso, { grip: arr(grip), palm: arr(V3(0, -fd.z, fd.y).multiplyScalar(-1)), pole: [0.1, -0.3, 1], curl: 0.92, upRot: 20 });
      return { pelvis, torso, head: 0, arms: a, legs: supineLegs(pelvis) };
    }
    return {
      cam: { yaw: -70, pitch: 22 },
      setup(scene) { scene.add(P().benchFlat(-0.85, 0.35, SUP.benchH)); return { bar: bar(scene, { plates: [0.11], shaft: 1.2, sleeve: 0.2, ez: true }) }; },
      pose: spec,
      update(d, t, solved) { placeBar(d.bar, solved); }
    };
  };

  /* ---------------- FLEXIONES ----------------
     Manos algo más abiertas que los hombros; cuerpo en línea recta de la
     cabeza a los talones (abdomen y glúteos activos); se baja hasta que el
     pecho queda cerca del suelo con los codos a unos 45° del tronco. */
  PATTERNS.pushup = () => {
    const toe = V3(0, R.toeH, -0.95);
    function body(alpha) {
      const dir = V3(0, Math.sin(alpha * D), Math.cos(alpha * D));
      const footPitch = -(90 - alpha) + 25;
      const probe = Biomech.solve({ pelvis: [0, 1, 0], legs: { L: { toe: [0.09, toe.y, toe.z], footPitch } } }).info.legs.L.ankle;
      const pelvis = V3(0, probe.y, probe.z).addScaledVector(dir, L.sh + L.th - 0.005);
      const torso = { pitch: 90 - alpha };
      return { pelvis: arr(pelvis), torso, footPitch };
    }
    // Arriba: brazos extendidos y verticales bajo los hombros
    const aTop = solve1(a => tp(body(a).pelvis, body(a).torso, SH()).y - (0.02 + Math.sqrt((armEff() - 0.035) ** 2 - 0.086 ** 2)), 2, 40, 24);
    const top = body(aTop), shTop = tp(top.pelvis, top.torso, SH());
    const hand = V3(0.25, 0.02, shTop.z + 0.02);
    const aBot = solve1(a => tp(body(a).pelvis, body(a).torso, V3(0, 0.36, 0.15)).y - 0.075, 0, aTop, 24);
    function spec(t) {
      const b = body(lerp(aTop, aBot, ease(t)));
      const arms = {
        L: { grip: [hand.x, hand.y, hand.z], palm: [0, -1, 0], handDir: [0.15, 0, 1], pole: [0.55, 0.3, -0.8], curl: 0.05, wrist: 0 },
        R: { grip: [-hand.x, hand.y, hand.z], palm: [0, -1, 0], handDir: [-0.15, 0, 1], pole: [-0.55, 0.3, -0.8], curl: 0.05, wrist: 0 }
      };
      return {
        pelvis: b.pelvis, torso: b.torso, head: -6, arms,
        legs: { L: { toe: [0.09, toe.y, toe.z], footPitch: b.footPitch, pole: [0, -1, 0.1], toesFlat: true }, R: { toe: [-0.09, toe.y, toe.z], footPitch: b.footPitch, pole: [0, -1, 0.1], toesFlat: true } }
      };
    }
    return { cam: { yaw: -70, pitch: 14 }, setup() { return {}; }, pose: spec, update() {} };
  };

  /* ---------------- FONDOS EN PARALELAS ----------------
     Brazos extendidos con los hombros lejos de las orejas; se baja con el
     torso algo inclinado (énfasis en pecho) hasta que el brazo queda
     paralelo al suelo, sin rebote, con los codos hacia atrás. */
  PATTERNS.dip = () => {
    const barY = 1.22, bx = 0.25;
    function spec(t) {
      const e = ease(t);
      const torso = { pitch: lerp(10, 26, e) };
      const wristY = barY + 0.06;
      const S0 = V3(0.164, wristY + Math.sqrt((L.ua + L.fa - 0.012) ** 2 - (bx - 0.164) ** 2), -0.02), S1 = V3(0.164, wristY + L.fa + 0.02, 0.1);
      const S = S0.clone().lerp(S1, e);
      const off = tp([0, 0, 0], torso, SH());
      const pelvis = [0, S.y - off.y, S.z - off.z];
      const hip = tp(pelvis, torso, rel('hipL'));
      const thA = lerp(10, 22, e) * D, shA = thA - 95 * D;
      const leg = sx => {
        const knee = V3(sx * 0.1, hip.y - L.th * Math.cos(thA), hip.z + L.th * Math.sin(thA));
        const ankle = knee.clone().add(V3(sx * -0.03, -L.sh * Math.cos(shA), L.sh * Math.sin(shA)));
        return { ankle: arr(ankle), footPitch: -55 + (thA - 95 * D) / D * 0, pole: [0, 0, 1] };
      };
      const arm = sx => ({ grip: [sx * bx, barY + 0.02, 0.0], palm: [-sx * 0.75, -0.65, 0], handDir: [-sx * 0.55, -0.8, 0.2], pole: [sx * 0.15, 0, -1], curl: 0.95, upRot: 0, protract: lerp(0, 8, e) });
      return { pelvis, torso, head: lerp(2, 8, e), arms: { L: arm(1), R: arm(-1) }, legs: { L: leg(1), R: leg(-1) } };
    }
    return { cam: { yaw: -65, pitch: 8 }, setup(scene) { scene.add(P().dipBars(barY, bx)); return {}; }, pose: spec, update() {} };
  };

  /* ---------------- REMO CON BARRA / REMO CON PECHO APOYADO ----------------
     Bisagra de cadera (tronco a 30–45° sobre la horizontal), rodillas
     flexionadas y espalda neutra fija: la barra sube desde las rodillas
     hasta la parte baja del pecho/abdomen alto, con los codos hacia atrás
     (unos 45° respecto al tronco). Apoyado: pecho en un banco a ~38° y
     mancuernas con agarre neutro. */
  PATTERNS['row-barbell'] = o => {
    const support = !!o.support, incl = 38;
    function armFor(pelvis, torso, e, sx, legs) {
      const hand = { palm: support ? [-sx, 0, 0] : [0, 0, -1], pole: [sx * (support ? 0.25 : 0.55), 0.6, -0.7], curl: 0.95, upRot: 0 };
      // Abajo: brazos colgando casi extendidos; arriba: agarre junto al abdomen alto
      const hang = { dir: [sx * (support ? 0.05 : 0.14), -1, 0.03], flex: 8, protract: 8, ...hand };
      const g0 = probeGrip({ pelvis, torso, legs, arms: { L: hang, R: hang } }, sx > 0 ? 'L' : 'R');
      const g1 = tp(pelvis, torso, support ? V3(sx * 0.2, 0.27, 0.05) : V3(sx * 0.25, 0.25, 0.17));
      return { grip: arr(g0.lerp(g1, e)), protract: lerp(8, -12, e), ...hand };
    }
    function spec(t) {
      const e = ease(t);
      if (support) {
        const torso = { pitch: 90 - incl }, pelvis = inclineProne(incl, 0.02);
        const legs = proneLegs(pelvis, 0.42);
        return { pelvis, torso, head: -12, arms: { L: armFor(pelvis, torso, e, 1, legs), R: armFor(pelvis, torso, e, -1, legs) }, legs };
      }
      return stand({ k: 24, w: 0.12 }, pelvis => {
        const torso = { pitch: 52 };
        const a = { L: armFor(pelvis, torso, e, 1), R: armFor(pelvis, torso, e, -1) };
        return { pelvis, torso, head: -12, arms: a, load: [{ kg: 50, at: arr(V3(...a.L.grip).setX(0)) }] };
      });
    }
    return {
      standing: !support, cam: { yaw: -72, pitch: 10 },
      setup(scene) {
        if (support) { scene.add(proneBench(incl)); const [a, b] = dbs(scene, { head: 0.06 }); return { a, b }; }
        return { bar: bar(scene, { plates: [0.225] }) };
      },
      pose: spec,
      update(d, t, solved) {
        if (d.bar) placeBar(d.bar, solved);
        else { placeDB(d.a, solved, 'L', handAxis(solved, 'L')); placeDB(d.b, solved, 'R', handAxis(solved, 'R')); }
      }
    };
  };

  /* Apoyo de rodilla y mano derechas en un banco plano (remo a una mano y patada de tríceps) */
  const KB = { benchH: 0.43, pitch: 79 };
  function kneelOnBench() {
    const torso = { pitch: KB.pitch }, pelvis = [0, 0.86, -0.3];
    // Mano derecha en el banco, algo por delante del hombro y con el brazo extendido
    const shR = tp(pelvis, torso, mirrorV(arr(SH())));
    const hy = KB.benchH + 0.02, hx = -0.19;
    // (la muñeca queda 7,5 cm por detrás del centro de la palma y algo por encima)
    const hz = 0.075 + shR.z + Math.sqrt(Math.max(0, (L.ua + L.fa - 0.014) ** 2 - (shR.y - hy - 0.022) ** 2 - (shR.x - hx) ** 2));
    const hipR = tp(pelvis, torso, rel('hipR'));
    // Rodilla derecha apoyada en el banco y tibia sobre él
    const kneeY = KB.benchH + 0.06;
    const kz = hipR.z - Math.sqrt(Math.max(0, L.th * L.th - (hipR.y - kneeY) ** 2));
    const legs = {
      R: { ankle: [-0.12, kneeY + 0.01, kz - L.sh], footPitch: -86, pole: [0, -1, 0.5] },
      L: { ankle: [0.21, L.ankleH, pelvis[2] + 0.08], footYaw: 12, pole: [0.3, 0, 1] }
    };
    const R0 = { grip: [hx, hy, hz], palm: [0, -1, 0], handDir: [0.1, 0, 1], pole: [-0.2, 0, -1], curl: 0.05, upRot: 0, protract: 0 };
    return { pelvis, torso, legs, armR: R0, benchZ: [kz - L.sh - 0.12, hz + 0.16] };
  }
  function kneelBench(scene) { const k = kneelOnBench(); scene.add(P().benchFlat(k.benchZ[0], k.benchZ[1], KB.benchH, -0.12, 0.3)); }

  /* ---------------- REMO CON MANCUERNA A UNA MANO ----------------
     Rodilla y mano del mismo lado en el banco, espalda neutra casi
     paralela al suelo; la mancuerna sube hacia la cadera con el codo
     pegado al cuerpo hasta pasar la línea del tronco. */
  PATTERNS['row-dumbbell'] = () => {
    function spec(t) {
      const e = ease(t);
      const k = kneelOnBench();
      const hand = { palm: [-1, 0, 0], pole: [0.15, 0.6, -0.8], curl: 0.95, upRot: 0 };
      const g0 = probeGrip({ pelvis: k.pelvis, torso: k.torso, legs: k.legs, arms: { L: { dir: [0.03, -1, 0.05], flex: 8, protract: 10, ...hand }, R: k.armR } });
      const g1 = tp(k.pelvis, k.torso, V3(0.19, 0.2, 0.06));
      const L1 = { grip: arr(g0.lerp(g1, e)), protract: lerp(10, -14, e), ...hand };
      return { pelvis: k.pelvis, torso: k.torso, head: -10, arms: { L: L1, R: k.armR }, legs: k.legs };
    }
    return {
      cam: { yaw: -110, pitch: 14 },
      setup(scene) { kneelBench(scene); const db = P().dumbbell({ head: 0.065 }); scene.add(db); return { db }; },
      pose: spec,
      update(d, t, solved) { placeDB(d.db, solved, 'L', handAxis(solved, 'L')); }
    };
  };

  /* ---------------- PATADA DE TRÍCEPS ----------------
     Espalda paralela al suelo; el brazo pegado al costado y paralelo al
     tronco no se mueve; el codo pasa de 90° a la extensión completa. */
  PATTERNS['tri-kickback'] = () => {
    function spec(t) {
      const e = ease(t);
      const k = kneelOnBench();
      const sh = tp(k.pelvis, k.torso, SH());
      const ud = tp([0, 0, 0], k.torso, V3(0.02, -1, -0.12)).normalize();
      const el = sh.clone().addScaledVector(ud, L.ua * 0.98);
      const fd = V3(0, -1, 0).lerp(ud, e).normalize();
      const L1 = { grip: arr(el.clone().addScaledVector(fd, L.fa + 0.07)), palm: [-1, 0, 0], pole: [0.1, 1, 0.1], curl: 0.95, upRot: 0, protract: -10 };
      return { pelvis: k.pelvis, torso: k.torso, head: -10, arms: { L: L1, R: k.armR }, legs: k.legs };
    }
    return {
      cam: { yaw: -110, pitch: 14 },
      setup(scene) { kneelBench(scene); const db = P().dumbbell({ head: 0.05 }); scene.add(db); return { db }; },
      pose: spec,
      update(d, t, solved) { placeDB(d.db, solved, 'L', handAxis(solved, 'L')); }
    };
  };

  /* ---------------- CURL FEMORAL TUMBADO ----------------
     Boca abajo con la rodilla alineada con el eje y el rodillo sobre los
     talones; los talones van hacia los glúteos sin levantar la cadera. */
  PATTERNS['leg-curl-lying'] = () => {
    const padH = 0.72;
    function spec(t) {
      const e = ease(t), k = lerp(6, 112, e);
      const torso = { pitch: 84 }, pelvis = [0, padH + 0.105, 0.0];
      const knee = sx => V3(sx * 0.1, padH + 0.075, pelvis[2] - L.th * 0.99);
      const leg = sx => {
        const kn = knee(sx), a = k * D;
        const ankle = kn.clone().add(V3(0, L.sh * Math.sin(a), -L.sh * Math.cos(a)));
        return { ankle: arr(ankle), footPitch: -92 - k, pole: [0, -1, 0] };
      };
      const sh = tp(pelvis, torso, SH());
      const arm = sx => ({ grip: [sx * 0.22, padH - 0.02, sh.z + 0.36], palm: [-sx, 0, 0.2], pole: [sx * 0.6, -0.3, 0.1], curl: 0.9 });
      return { pelvis, torso, head: -14, arms: { L: arm(1), R: arm(-1) }, legs: { L: leg(1), R: leg(-1) } };
    }
    return {
      cam: { yaw: -80, pitch: 18 },
      setup(scene) {
        scene.add(P().pad([0, padH - 0.035, 0.25], [0.34, 0.07, 1.25]), P().tube([0, 0.03, 0.6], [0, padH - 0.07, 0.6], 0.03), P().tube([0, 0.03, -0.3], [0, padH - 0.07, -0.3], 0.03), P().tube([0, 0.03, -0.5], [0, 0.03, 0.8], 0.03));
        for (const sx of [1, -1]) scene.add(P().tube([sx * 0.22, padH - 0.02, 0.86], [sx * 0.22, padH - 0.15, 0.8], 0.018));
        return { m: shinRoller(scene, 'back') };
      },
      pose: spec,
      update(d, t, solved) { d.m(solved); }
    };
  };

  /* ---------------- HIP THRUST / PUENTE DE GLÚTEO ----------------
     Parte alta de la espalda en el borde del banco (o en el suelo) y pies
     a la anchura de la cadera; la cadera sube hasta alinear tronco y muslos
     con las tibias verticales, la barbilla algo recogida y sin arquear la
     zona lumbar. */
  PATTERNS['hip-thrust'] = o => {
    const floor = !!o.floor;
    const benchH = 0.42;
    const contact = floor ? V3(0, 0.0, -0.32) : V3(0, benchH, -0.02);
    const pivotLocal = V3(0, 0.38, -0.105);
    const pelvisFor = p => { const off = tp([0, 0, 0], { pitch: p }, pivotLocal); return arr(V3().subVectors(contact, off)); };
    const pTop = floor ? -118 : -90, pBot = floor ? -92 : -45;
    function build(p, feetZ) {
      const pelvis = pelvisFor(p), torso = { pitch: p };
      const leg = sx => ({ ankle: [sx * 0.13, L.ankleH, feetZ], footYaw: 8, pole: [sx * 0.15, 1, 0.3] });
      let a;
      if (floor) {
        const g = sx => tp(pelvis, torso, V3(sx * 0.25, 0.05, -0.04)).setY(0.02);
        a = { L: { grip: arr(g(1)), palm: [0, -1, 0], handDir: [0, 0, 1], pole: [0.3, 0.4, -0.2], curl: 0.1 }, R: { grip: arr(g(-1)), palm: [0, -1, 0], handDir: [0, 0, 1], pole: [-0.3, 0.4, -0.2], curl: 0.1 } };
      } else {
        const b = tp(pelvis, torso, LM.hipCrease()).add(V3(0, 0.035, 0));
        a = { L: { grip: [0.3, b.y + 0.012, b.z], palm: [0, -1, 0.2], pole: [0.6, 0.6, -0.3], curl: 0.95 }, R: { grip: [-0.3, b.y + 0.012, b.z], palm: [0, -1, 0.2], pole: [-0.6, 0.6, -0.3], curl: 0.95 } };
      }
      return { pelvis, torso, arms: a, legs: { L: leg(1), R: leg(-1) } };
    }
    // Pies: arriba, rodillas a ~90° (tibias casi verticales)
    const feetZ = solve1(z => Biomech.solve(build(pTop, z)).info.legs.L.kneeFlex - (floor ? 95 : 88), 0.0, 1.2, 22);
    function spec(t) {
      const e = ease(t), p = lerp(pBot, pTop, e);
      const sp = build(p, feetZ);
      sp.head = floor ? 0 : lerp(0, 16, e); // barbilla recogida arriba
      return sp;
    }
    return {
      cam: { yaw: -70, pitch: 12 },
      setup(scene) {
        const d = {};
        if (!floor) {
          scene.add(P().pad([0, benchH - 0.035, -0.18], [1.05, 0.07, 0.32]));
          for (const sx of [1, -1]) scene.add(P().tube([sx * 0.4, 0.03, -0.18], [sx * 0.4, benchH - 0.07, -0.18], 0.028));
          d.bar = bar(scene, { plates: [0.225] });
        }
        return d;
      },
      pose: spec,
      update(d, t, solved) {
        if (d.bar) { const sp = solved.spec; P().orient(d.bar, tp(sp.pelvis, sp.torso, LM.hipCrease()).add(V3(0, 0.035, 0)), V3(1, 0, 0)); }
      }
    };
  };

  /* ---------------- HIPEREXTENSIÓN A 45° ----------------
     Almohadilla justo por debajo de la cadera y pies fijos; el tronco baja
     doblando la cadera con la espalda neutra y sube hasta quedar en línea
     con las piernas, sin hiperextender la zona lumbar. */
  PATTERNS['back-extension'] = () => {
    const legDir = V3(0, Math.sin(45 * D), Math.cos(45 * D)); // de los pies hacia la cadera
    const ankle = V3(0, 0.22, -0.55);
    const hip = ankle.clone().addScaledVector(legDir, L.sh + L.th - 0.002);
    function spec(t) {
      const e = ease(t), flex = lerp(78, 0, e);
      const torso = { pitch: 45 + flex };
      const pelvis = arr(hip);
      const arm = sx => {
        const c = tp(pelvis, torso, V3(-sx * 0.1, 0.42, 0.2));
        return { grip: arr(c), palm: arr(tp([0, 0, 0], torso, V3(0, 0, -1))), pole: [sx * 1, -0.5, 0.3], curl: 0.6, handDir: arr(tp([0, 0, 0], torso, V3(-sx, 0.2, 0)).normalize()) };
      };
      const leg = sx => ({ ankle: [sx * 0.11, ankle.y, ankle.z], footPitch: -45, pole: [sx * 0.05, -0.7, 0.7] });
      return { pelvis, torso, head: lerp(10, 0, e), arms: { L: arm(1), R: arm(-1) }, legs: { L: leg(1), R: leg(-1) } };
    }
    return {
      cam: { yaw: -78, pitch: 10 },
      setup(scene) {
        const m = P().mats();
        const padC = hip.clone().addScaledVector(legDir, -0.12).add(V3(0, -0.07, 0.07));
        scene.add(P().pad(arr(padC), [0.38, 0.07, 0.3], [-45 + 90 - 90, 0, 0]));
        scene.add(P().pad(arr(ankle.clone().add(V3(0, 0.06, 0.07))), [0.4, 0.07, 0.07]));
        scene.add(P().box([0, ankle.y - 0.08, ankle.z - 0.02], [0.42, 0.03, 0.3], m.frameLight, [-45, 0, 0]));
        scene.add(P().tube([0, 0.03, -0.85], [0, 0.03, padC.z + 0.25], 0.032), P().tube(arr(ankle.clone().add(V3(0, -0.1, 0))), arr(padC.clone().add(V3(0, -0.06, 0.04))), 0.032), P().tube(arr(padC.clone().add(V3(0, -0.06, 0.04))), [0, 0.03, padC.z + 0.25], 0.032));
        return {};
      },
      pose: spec,
      update() {}
    };
  };

  /* ---------------- CURL NÓRDICO ----------------
     De rodillas con los tobillos sujetos y el cuerpo recto de las rodillas
     a la cabeza (glúteos y abdomen activos): el cuerpo cae hacia delante
     frenando con los isquios; cuando ya no se puede frenar, las manos se
     preparan para apoyarse. */
  PATTERNS.nordic = () => {
    const padH = 0.05;
    function spec(t) {
      const e = ease(t), lam = lerp(4, 56, e);
      const knee = sx => V3(sx * 0.1, padH + 0.06, 0.0);
      const hip = V3(0, knee(1).y + L.th * Math.cos(lam * D), L.th * Math.sin(lam * D));
      const torso = { pitch: lam };
      const pelvis = arr(hip);
      const leg = sx => ({ ankle: [sx * 0.1, padH + 0.075, -L.sh * 0.99], footPitch: -82, pole: [0, -1, 0.05] });
      const sh = tp(pelvis, torso, SH());
      const arm = sx => {
        const c = tp(pelvis, torso, V3(-sx * 0.06, 0.4, 0.2)); // brazos cruzados
        const ready = V3(sx * 0.24, sh.y - 0.45, sh.z + 0.26);
        const g = c.lerp(ready, Math.max(0, (e - 0.55) / 0.45));
        return { grip: arr(g), palm: arr(V3(0, 0, -1).lerp(V3(0, -0.7, 0.7), e)), pole: [sx, -0.5, -0.2], curl: lerp(0.6, 0.15, e) };
      };
      return { pelvis, torso, head: lerp(0, 6, e), arms: { L: arm(1), R: arm(-1) }, legs: { L: leg(1), R: leg(-1) } };
    }
    return {
      cam: { yaw: -78, pitch: 10 },
      setup(scene) {
        scene.add(P().pad([0, padH / 2, -0.1], [0.5, padH, 0.7], P().mats().pad));
        scene.add(P().cylBetween([-0.25, padH + 0.13, -L.sh + 0.02], [0.25, padH + 0.13, -L.sh + 0.02], 0.045, P().mats().pad), P().tube([0, 0.03, -L.sh - 0.1], [0, padH + 0.13, -L.sh + 0.02], 0.025));
        return {};
      },
      pose: spec,
      update() {}
    };
  };

  /* =====================================================================
     API
     ===================================================================== */
  function get(ex) {
    if (!L) measure();
    const f = PATTERNS[ex.anim.preset];
    return f ? f(ex.anim.opts || {}, ex) : null;
  }

  return { get, measure, patterns: () => Object.keys(PATTERNS), _tp: tp, _LM: LM };
})();
