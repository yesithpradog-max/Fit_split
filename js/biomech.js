/* =====================================================================
   FIT SPLIT · biomech.js
   ---------------------------------------------------------------------
   Solucionador biomecánico de posturas para el cuerpo anatómico 3D.

   Una postura se describe con pocas cosas, como lo haría un entrenador:
     torso   orientación del tronco (inclinación, giro) y posición de la pelvis
     head    flexión del cuello (0 = alineado con el tronco)
     arms    para cada brazo: punto de agarre, hacia dónde apunta el codo,
             orientación de la palma y cierre de la mano
     legs    para cada pierna: posición del tobillo (o de la punta del pie),
             orientación del pie y hacia dónde apunta la rodilla

   A partir de ahí se calcula cada hueso con las longitudes reales del
   modelo (cinemática inversa de dos segmentos en 3D), con el ritmo
   escapulohumeral (la escápula rota al elevar el brazo), la pronación del
   antebrazo y el agarre de los dedos.

   También mide la postura resultante (ángulos articulares, alcance,
   centro de masas) para que el validador compruebe la técnica.
   ===================================================================== */

const Biomech = (() => {
  'use strict';
  const T = window.THREE;
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const v = a => (a instanceof T.Vector3 ? a.clone() : V3(a[0], a[1], a[2]));
  const DEG = Math.PI / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  let R = null; // datos de reposo

  /* ----------------------------- Reposo ----------------------------- */
  function init(rest) {
    const J = {};
    for (const [k, p] of Object.entries(rest.joints)) if (Array.isArray(p)) J[k] = v(p);
    const B = {};
    for (const b of rest.bones) B[b.name] = { pos: v(b.pos), parent: b.parent };
    const orth = (a, y) => a.clone().addScaledVector(y, -a.dot(y)).normalize();
    const dir = (a, b) => V3().subVectors(b, a).normalize();
    const X = V3(1, 0, 0), NX = V3(-1, 0, 0);
    const side = {};
    for (const S of ['L', 'R']) {
      const ua = dir(J['shoulder' + S], J['elbow' + S]), fa = dir(J['elbow' + S], J['wrist' + S]);
      const hd = dir(J['wrist' + S], J['mcp' + S]);
      const th = dir(J['hip' + S], J['knee' + S]), sh = dir(J['knee' + S], J['ankle' + S]);
      const ft = dir(J['ankle' + S], J['toe' + S]);
      side[S] = {
        ua: { y: ua, f: orth(NX, ua) }, fa: { y: fa, f: orth(NX, fa) }, hand: { y: hd, f: orth(NX, hd) },
        th: { y: th, f: orth(X, th) }, sh: { y: sh, f: orth(X, sh) }, foot: { y: ft, f: orth(X, ft) },
        L: {
          ua: J['shoulder' + S].distanceTo(J['elbow' + S]), fa: J['elbow' + S].distanceTo(J['wrist' + S]),
          hand: J['wrist' + S].distanceTo(J['mcp' + S]),
          th: J['hip' + S].distanceTo(J['knee' + S]), sh: J['knee' + S].distanceTo(J['ankle' + S]),
          foot: J['ankle' + S].distanceTo(J['toe' + S])
        }
      };
    }
    const shoulderMid = V3().addVectors(J.shoulderL, J.shoulderR).multiplyScalar(0.5);
    R = {
      J, B, side,
      torsoLen: J.pelvis.distanceTo(shoulderMid),
      shoulderHalf: J.shoulderL.x,
      hipHalf: J.hipL.x,
      ankleH: J.ankleL.y,
      toeH: J.toeL.y,
      shoulderMid
    };
    return R;
  }

  /* -------------------------- Utilidades -------------------------- */
  const qAxis = (axis, ang) => new T.Quaternion().setFromAxisAngle(axis.clone().normalize(), ang);
  const _m = new T.Matrix4();
  /* Rotación que lleva el marco de reposo (y0, f0) al marco destino (y1, f1) */
  function fromFrames(y0, f0, y1, f1) {
    const z0 = V3().crossVectors(f0, y0).normalize(), fz0 = V3().crossVectors(y0, z0).normalize();
    const f1o = f1.clone().addScaledVector(y1, -f1.dot(y1)).normalize();
    const z1 = V3().crossVectors(f1o, y1).normalize(), fz1 = V3().crossVectors(y1, z1).normalize();
    const M0 = new T.Matrix4().makeBasis(fz0, y0, z0), M1 = new T.Matrix4().makeBasis(fz1, y1, z1);
    return new T.Quaternion().setFromRotationMatrix(M1.multiply(M0.transpose()));
  }
  /* Cinemática inversa de dos segmentos: devuelve la articulación media */
  function twoBone(a, target, l1, l2, pole) {
    const d = V3().subVectors(target, a);
    const dist = d.length();
    const reach = clamp(dist, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
    d.normalize();
    const cosA = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
    const ang = Math.acos(clamp(cosA, -1, 1));
    let p = pole.clone().addScaledVector(d, -pole.dot(d));
    if (p.lengthSq() < 1e-8) p = V3(0, 0, 1).addScaledVector(d, -d.z);
    p.normalize();
    return { mid: a.clone().addScaledVector(d, Math.cos(ang) * l1).addScaledVector(p, Math.sin(ang) * l1), short: dist - reach };
  }
  const signedAngle = (a, b, axis) => Math.atan2(V3().crossVectors(a, b).dot(axis), a.dot(b));

  /* Posición en el mundo de un punto de reposo que se mueve con un hueso */
  function worldPoint(pose, bone, restPoint) {
    const o = pose.origin[bone];
    return V3().subVectors(v(restPoint), R.B[bone].pos).applyQuaternion(pose.q[bone]).add(o);
  }
  function setBone(pose, name, q) {
    pose.q[name] = q;
    const parent = R.B[name].parent;
    pose.origin[name] = parent
      ? V3().subVectors(R.B[name].pos, R.B[parent].pos).applyQuaternion(pose.q[parent]).add(pose.origin[parent])
      : pose.origin[name];
  }

  /* --------------------------- Tronco --------------------------- */
  function torsoQuat(t) {
    if (t.up) {
      const up = v(t.up).normalize(), fwd = v(t.fwd || [0, 0, 1]);
      return fromFrames(V3(0, 1, 0), V3(1, 0, 0), up, V3().crossVectors(up, fwd).normalize());
    }
    const q = new T.Quaternion().setFromEuler(new T.Euler((t.pitch || 0) * DEG, (t.yaw || 0) * DEG, (t.roll || 0) * DEG, 'YXZ'));
    return q;
  }

  /* --------------------------- Brazos --------------------------- */
  const GRIP_ALONG = 0.075, GRIP_PALM = 0.022;
  /* Distancia hombro → centro del agarre con el codo flexionado "flex" grados */
  function reachFor(L, flex) {
    const fe = Math.hypot(L.fa + GRIP_ALONG, GRIP_PALM);
    return Math.sqrt(L.ua * L.ua + fe * fe + 2 * L.ua * fe * Math.cos(flex * DEG)) - 0.002;
  }
  function solveArm(pose, S, a, info) {
    const sx = S === 'L' ? 1 : -1, sd = R.side[S], L = sd.L;
    const qT = pose.q.torso;
    const up = V3(0, 1, 0).applyQuaternion(qT), fwd = V3(0, 0, 1).applyQuaternion(qT);
    let grip = a.grip ? v(a.grip) : null;
    const palm = v(a.palm || [0, 0, 1]).normalize(), pole = v(a.pole || [0, -1, -1]).normalize();
    // 1) Escápula: rota hacia arriba al elevar el brazo y se adelanta al empujar
    setBone(pose, 'scap' + S, qT.clone());
    const sh0 = worldPoint(pose, 'scap' + S, R.J['shoulder' + S]);
    // Modo "dirección + flexión de codo": el agarre se calcula desde el hombro real
    const armDir = a.dir ? v(a.dir).normalize() : V3().subVectors(grip, sh0).normalize();
    const elev = Math.acos(clamp(-armDir.dot(up), -1, 1));
    const upRot = (a.upRot != null ? a.upRot * DEG : clamp(0.4 * (elev - 30 * DEG), 0, 52 * DEG)) + (a.shrug || 0) * DEG;
    const reach = armDir.dot(fwd);
    const pro = clamp((a.protract != null ? a.protract : 13 * reach), -18, 18) * DEG;
    const qScap = qAxis(fwd, sx * upRot).multiply(qAxis(up, -sx * pro)).multiply(qT);
    setBone(pose, 'scap' + S, qScap);
    const sh = worldPoint(pose, 'scap' + S, R.J['shoulder' + S]);
    if (a.dir) grip = sh.clone().addScaledVector(armDir, reachFor(L, a.flex || 0));
    // 2) Muñeca a partir del agarre (dos pasadas para la dirección de la mano)
    let handDir = V3().subVectors(grip, sh).normalize(), wrist, ik;
    for (let k = 0; k < 3; k++) {
      const palmPerp = palm.clone().addScaledVector(handDir, -palm.dot(handDir));
      if (palmPerp.lengthSq() > 1e-6) palmPerp.normalize();
      wrist = grip.clone().addScaledVector(handDir, -GRIP_ALONG).addScaledVector(palmPerp, -GRIP_PALM);
      ik = twoBone(sh, wrist, L.ua, L.fa, pole);
      handDir = V3().subVectors(wrist, ik.mid).normalize().lerp(handDir, 0.25).normalize();
      if (a.handDir) handDir = v(a.handDir).normalize();
    }
    const el = ik.mid;
    const yU = V3().subVectors(el, sh).normalize(), yF = V3().subVectors(wrist, el).normalize();
    let flex = V3().crossVectors(yU, yF);
    if (flex.length() < 0.2) flex = V3().crossVectors(yU, pole.clone().negate());
    flex.normalize();
    setBone(pose, 'upperArm' + S, fromFrames(sd.ua.y, sd.ua.f, yU, flex));
    setBone(pose, 'forearm' + S, fromFrames(sd.fa.y, sd.fa.f, yF, flex));
    // 3) Pronación / supinación para orientar la palma
    const palmNow = V3(0, 0, 1).applyQuaternion(pose.q['forearm' + S]);
    const pa = palmNow.clone().addScaledVector(yF, -palmNow.dot(yF)).normalize();
    const pb = palm.clone().addScaledVector(yF, -palm.dot(yF)).normalize();
    let phi = signedAngle(pa, pb, yF);
    // Rango: desde supinación completa (reposo) hasta ~165° de pronación
    phi = sx > 0 ? clamp(phi, -12 * DEG, 168 * DEG) : clamp(phi, -168 * DEG, 12 * DEG);
    setBone(pose, 'twist' + S, qAxis(yF, phi).multiply(pose.q['forearm' + S]));
    // 4) Muñeca: neutra (con flexión/extensión opcional) o, si se indica la
    //    dirección de la mano, orientada con ella y con la palma
    let qH = pose.q['twist' + S].clone();
    if (a.handDir) {
      const hy = v(a.handDir).normalize();
      const pp = palm.clone().addScaledVector(hy, -palm.dot(hy));
      if (pp.lengthSq() > 1e-6) qH = fromFrames(sd.hand.y, sd.hand.f, hy, V3().crossVectors(hy, pp.normalize()));
    } else if (a.wrist) qH = qAxis(V3().copy(sd.hand.f).applyQuaternion(qH), a.wrist * DEG).multiply(qH);
    setBone(pose, 'hand' + S, qH);
    // 5) Dedos: agarre
    const c = a.curl != null ? a.curl : 0.15;
    const fAx = V3().copy(sd.hand.f).applyQuaternion(qH);
    setBone(pose, 'fingers' + S, qAxis(fAx, c * 82 * DEG).multiply(qH));
    setBone(pose, 'tips' + S, qAxis(fAx, c * 98 * DEG).multiply(pose.q['fingers' + S]));
    const hy = V3().copy(sd.hand.y).applyQuaternion(qH);
    setBone(pose, 'thumb' + S, qAxis(hy, -sx * c * 38 * DEG).multiply(qAxis(fAx, c * 22 * DEG)).multiply(qH));
    // Medidas para el validador
    info.arms[S] = {
      shoulder: sh, elbow: el, wrist, grip,
      reachError: Math.max(0, ik.short),
      elbowFlex: 180 - V3().subVectors(sh, el).angleTo(V3().subVectors(wrist, el)) / DEG,
      pronation: Math.abs(phi) / DEG
    };
  }

  /* --------------------------- Piernas --------------------------- */
  function solveLeg(pose, S, l, info) {
    const sx = S === 'L' ? 1 : -1, sd = R.side[S], L = sd.L;
    const hip = worldPoint(pose, 'torso', R.J['hip' + S]);
    const yaw = (l.footYaw || 0) * DEG * sx, pitch = (l.footPitch || 0) * DEG, roll = (l.footRoll || 0) * DEG;
    // Orientación del pie (reposo = apoyado plano en el suelo)
    const qYaw = qAxis(V3(0, 1, 0), yaw);
    let qFoot = l.footQuat ? l.footQuat.clone() : qAxis(V3(1, 0, 0).applyQuaternion(qYaw), -pitch).multiply(qYaw);
    if (roll) qFoot = qAxis(V3(0, 0, 1).applyQuaternion(qFoot), roll * sx).multiply(qFoot);
    let ankle;
    if (l.toe) { // apoyo en la punta: el tobillo depende del giro del pie
      ankle = v(l.toe).sub(V3().subVectors(R.J['toe' + S], R.J['ankle' + S]).applyQuaternion(qFoot));
    } else ankle = v(l.ankle);
    const pole = v(l.pole || V3(0, 0, 1).applyQuaternion(qYaw)).normalize();
    const ik = twoBone(hip, ankle, L.th, L.sh, pole);
    const kn = ik.mid;
    const yT = V3().subVectors(kn, hip).normalize(), yS = V3().subVectors(ankle, kn).normalize();
    let flex = V3().crossVectors(yT, yS);
    if (flex.length() < 0.2) flex = V3().crossVectors(yT, pole.clone().negate());
    flex.normalize();
    setBone(pose, 'thigh' + S, fromFrames(sd.th.y, sd.th.f, yT, flex));
    setBone(pose, 'shin' + S, fromFrames(sd.sh.y, sd.sh.f, yS, flex));
    setBone(pose, 'foot' + S, qFoot);
    setBone(pose, 'toes' + S, l.toesFlat ? qYaw.clone() : qFoot.clone());
    const shinNow = yS.clone().negate();
    const footUp = V3(0, 1, 0).applyQuaternion(qFoot);
    info.legs[S] = {
      hip, knee: kn, ankle, reachError: Math.max(0, ik.short),
      kneeFlex: 180 - V3().subVectors(hip, kn).angleTo(V3().subVectors(ankle, kn)) / DEG,
      // Dorsiflexión: ángulo entre la tibia y la vertical del pie
      dorsi: 90 - Math.acos(clamp(shinNow.dot(V3(0, 0, 1).applyQuaternion(qFoot)), -1, 1)) / DEG
    };
  }

  /* --------------------------- Postura --------------------------- */
  function solve(spec) {
    const pose = { q: {}, origin: {}, root: v(spec.pelvis) };
    const info = { arms: {}, legs: {} };
    pose.origin.torso = pose.root.clone();
    setBone(pose, 'torso', torsoQuat(spec.torso || {}));
    const qT = pose.q.torso;
    const lat = V3(1, 0, 0).applyQuaternion(qT);
    const hp = (spec.head || 0) * DEG;
    setBone(pose, 'neck', qAxis(lat, hp * 0.55).multiply(qT));
    setBone(pose, 'head', qAxis(lat, hp).multiply(qT));
    for (const S of ['L', 'R']) {
      const a = spec.arms && spec.arms[S];
      if (a) solveArm(pose, S, a, info);
      else restArm(pose, S);
      const l = spec.legs && spec.legs[S];
      if (l) solveLeg(pose, S, l, info);
    }
    info.torsoUp = V3(0, 1, 0).applyQuaternion(qT);
    info.torsoFwd = V3(0, 0, 1).applyQuaternion(qT);
    info.shoulderMid = worldPoint(pose, 'torso', R.shoulderMid);
    info.headPos = worldPoint(pose, 'head', R.J.head);
    info.com = centerOfMass(pose, info, spec.load || []);
    return { pose, info };
  }
  function restArm(pose, S) {
    for (const b of ['scap', 'upperArm', 'forearm', 'twist', 'hand', 'fingers', 'tips', 'thumb']) setBone(pose, b + S, pose.q.torso.clone());
  }

  /* Centro de masas aproximado (masas segmentarias de De Leva, 1996) */
  function centerOfMass(pose, info, loads) {
    const pts = [];
    const mid = (a, b, k = 0.5) => V3().lerpVectors(a, b, k);
    const W = (b, p) => worldPoint(pose, b, p);
    const J = R.J;
    pts.push([0.497, mid(W('torso', J.pelvis), info.shoulderMid || W('torso', R.shoulderMid), 0.55)]);
    pts.push([0.081, W('head', V3(0, J.head.y + 0.075, J.head.z + 0.03))]);
    for (const S of ['L', 'R']) {
      const sh = W('upperArm' + S, J['shoulder' + S]), el = W('forearm' + S, J['elbow' + S]), wr = W('hand' + S, J['wrist' + S]);
      pts.push([0.028, mid(sh, el, 0.43)], [0.016, mid(el, wr, 0.43)], [0.006, W('hand' + S, J['mcp' + S])]);
      if (pose.q['thigh' + S]) {
        const hp = W('thigh' + S, J['hip' + S]), kn = W('shin' + S, J['knee' + S]), an = W('foot' + S, J['ankle' + S]);
        pts.push([0.1, mid(hp, kn, 0.43)], [0.0465, mid(kn, an, 0.43)], [0.0145, W('foot' + S, J['toe' + S]).lerp(an, 0.5)]);
      }
    }
    let m = 0; const c = V3();
    for (const [w, p] of pts) { c.addScaledVector(p, w); m += w; }
    // Carga externa en kg relativa a una persona de ~75 kg
    for (const ld of loads) { const w = ld.kg / 75; c.addScaledVector(v(ld.at), w); m += w; }
    return c.multiplyScalar(1 / m);
  }

  return {
    init,
    get rest() { return R; },
    solve,
    reach: (flex, S = 'L') => reachFor(R.side[S].L, flex),
    worldPoint: (pose, bone, p) => worldPoint(pose, bone, p),
    DEG
  };
})();
