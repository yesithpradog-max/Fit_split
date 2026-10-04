/* =====================================================================
   FIT SPLIT · animations.js
   ---------------------------------------------------------------------
   Motor de animaciones de ejercicios en SVG.

   Idea general:
   1. Cada ejercicio indica un "preset" (patrón de movimiento) en
      exercise.anim.preset, por ejemplo 'bench' o 'squat'.
   2. Cada preset sabe construir el esqueleto de la figura para una
      posición t entre 0 (posición A, inicial) y 1 (posición B, punto de
      transición). Codos y rodillas se calculan con cinemática inversa
      de dos segmentos, así los brazos y piernas mantienen su longitud.
   3. Una línea de tiempo recorre las 5 fases del movimiento:
      inicial → (excéntrica | concéntrica) → transición → (la otra) → final
   4. La clase Animator dibuja cada fotograma con requestAnimationFrame
      y expone play / pause / restart / seek.

   Las coordenadas usan el sistema de SVG (y crece hacia abajo).
   Ángulos en grados: 0 = derecha, 90 = abajo, -90 = arriba.
   ===================================================================== */

const Animations = (() => {
  'use strict';

  /* ----------------------- Proporciones de la figura ----------------------- */
  const L = { T: 80, NECK: 9, HEAD: 14, UA: 46, FA: 42, TH: 58, SH: 56 };
  const FLOOR = 272;
  const VB = {
    normal: '0 0 400 300',
    wide: '-20 -30 440 330',
    tall: '-40 -60 480 360'
  };

  /* ----------------------------- Geometría ----------------------------- */
  const rad = d => d * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;
  const unit = a => [Math.cos(rad(a)), Math.sin(rad(a))];
  const pt = (o, a, len) => [o[0] + Math.cos(rad(a)) * len, o[1] + Math.sin(rad(a)) * len];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (v, k) => [v[0] * k, v[1] * k];
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = (a, b) => deg(Math.atan2(b[1] - a[1], b[0] - a[0]));
  const mx = p => [400 - p[0], p[1]]; // espejo para vistas frontales

  /* Cinemática inversa de dos segmentos: devuelve la articulación media
     (codo o rodilla) para unir "a" con "target". sign elige el lado. */
  function ik(a, target, la, lb, sign) {
    const d = Math.min(Math.max(dist(a, target), Math.abs(la - lb) + 0.5), la + lb - 0.5);
    const cos = (la * la + d * d - lb * lb) / (2 * la * d);
    const alpha = deg(Math.acos(Math.max(-1, Math.min(1, cos))));
    return pt(a, ang(a, target) + sign * alpha, la);
  }
  function arm(sh, target, sign = 1) {
    const el = ik(sh, target, L.UA, L.FA, sign);
    return { el, ha: pt(el, ang(el, target), L.FA) };
  }
  function leg(hip, target, sign = -1) {
    const kn = ik(hip, target, L.TH, L.SH, sign);
    return { kn, an: pt(kn, ang(kn, target), L.SH) };
  }
  /* Marco de referencia del torso: dirección cadera → hombro y normales */
  function frame(hip, sh) {
    const a = ang(hip, sh);
    const u = unit(a);
    const front = [-u[1], u[0]];
    return { a, u, front, back: [-front[0], -front[1]] };
  }

  /* ------------------------ Registro para la vista 3D ------------------------
     Mientras REC es una lista, cada elemento de escena o equipamiento se
     anota también como un objeto (tipo + coordenadas). animations3d.js usa
     esa lista para construir el mismo equipamiento en tres dimensiones. */
  let REC = null, recDepth = 0;
  const note = prim => { if (REC && recDepth === 0) REC.push(prim); };
  function rec(prim, draw) {
    note(prim);
    recDepth += 1;
    try { return draw(); } finally { recDepth -= 1; }
  }
  function capture(fn) {
    const prev = REC, prevDepth = recDepth;
    REC = []; recDepth = 0;
    try { const out = fn(); return { out, prims: REC }; } finally { REC = prev; recDepth = prevDepth; }
  }

  /* --------------------------- Primitivas SVG --------------------------- */
  const f = n => Math.round(n * 10) / 10;
  const line = (a, b, cls, w) => {
    note({ type: 'line', a, b, cls, w: w || 2 });
    return `<line class="${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"${w ? ` stroke-width="${w}"` : ''}/>`;
  };
  const circle = (c, r, cls) => {
    note({ type: 'circle', c, r, cls });
    return `<circle class="${cls}" cx="${f(c[0])}" cy="${f(c[1])}" r="${r}"/>`;
  };
  const rect = (x, y, w, h, cls, r = 3) => {
    note({ type: 'rect', x, y, w, h, cls });
    return `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}"/>`;
  };
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}"/>`;
  const ellipse = (c, rx, ry, cls) => `<ellipse class="${cls}" cx="${f(c[0])}" cy="${f(c[1])}" rx="${rx}" ry="${ry}"/>`;

  /* --------------------------- Equipamiento --------------------------- */
  const EQ = {
    plate: (c, r = 24) => rec({ type: 'plate', c, r }, () => circle(c, r, 'fx-plate') + circle(c, Math.max(4, Math.round(r * 0.22)), 'fx-hub')),
    dbEnd: (c, r = 11) => rec({ type: 'db-end', c, r }, () => circle(c, r, 'fx-plate') + circle(c, 3.5, 'fx-hub')),
    dbSide(c, a, len = 30) {
      return rec({ type: 'db-side', c, a, len }, () => {
        const u = unit(a), n = [-u[1], u[0]];
        const p1 = add(c, mul(u, -len / 2)), p2 = add(c, mul(u, len / 2));
        return line(p1, p2, 'fx-bar', 5) +
          line(add(p1, mul(n, -10)), add(p1, mul(n, 10)), 'fx-plate-bar', 8) +
          line(add(p2, mul(n, -10)), add(p2, mul(n, 10)), 'fx-plate-bar', 8);
      });
    },
    cable: (from, to) => rec({ type: 'cable', from, to }, () => line(from, to, 'fx-cable') + circle(from, 6, 'fx-pulley')),
    grip: c => rec({ type: 'grip', c }, () => circle(c, 4.5, 'fx-grip')),
    handle: (c, a = 90, len = 18) => rec({ type: 'handle', c, a, len }, () => {
      const u = unit(a);
      return line(add(c, mul(u, -len / 2)), add(c, mul(u, len / 2)), 'fx-bar', 6);
    }),
    pad: (c, r = 8) => rec({ type: 'roller', c, r }, () => circle(c, r, 'fx-pad-dyn'))
  };

  /* ------------------------ Elementos de escena ------------------------ */
  const SC = {
    floor: () => rec({ type: 'floor' }, () => line([-60, FLOOR], [460, FLOOR], 'fx-floor', 2)),
    bench: (x1, x2, top) => rec({ type: 'bench', x1, x2, top }, () =>
      rect(x1, top, x2 - x1, 10, 'fx-pad', 4) +
      line([x1 + 16, top + 10], [x1 + 16, FLOOR], 'fx-frame', 6) +
      line([x2 - 16, top + 10], [x2 - 16, FLOOR], 'fx-frame', 6)),
    seat: (x1, x2, top) => rec({ type: 'seat', x1, x2, top }, () =>
      rect(x1, top, x2 - x1, 10, 'fx-pad', 4) +
      line([(x1 + x2) / 2, top + 10], [(x1 + x2) / 2, FLOOR], 'fx-frame', 7) +
      line([(x1 + x2) / 2 - 26, FLOOR - 2], [(x1 + x2) / 2 + 26, FLOOR - 2], 'fx-frame', 5)),
    /* Respaldo paralelo al torso, desde t0 hasta t1 (fracciones del torso) */
    backPad(hip, sh, t0 = -0.1, t1 = 1.2, off = 15) {
      const F = frame(hip, sh);
      const base = add(hip, mul(F.back, off));
      const a = add(base, mul(F.u, L.T * t0)), b = add(base, mul(F.u, L.T * t1));
      return rec({ type: 'pad', a, b, w: 11 }, () => line(a, b, 'fx-pad', 11));
    },
    post: (x, y1, y2 = FLOOR, w = 7) => rec({ type: 'post', x, y1, y2, w }, () => line([x, y1], [x, y2], 'fx-frame', w)),
    stack: (x, y, w = 34, h = FLOOR - y) => rec({ type: 'stack', x, y, w, h }, () => {
      let s = rect(x, y, w, h, 'fx-stack', 3);
      for (let yy = y + 12; yy < y + h - 4; yy += 12) s += line([x + 3, yy], [x + w - 3, yy], 'fx-stack-line', 1);
      return s;
    }),
    rack: x => rec({ type: 'rack', x }, () => line([x, 70], [x, FLOOR], 'fx-frame', 6) + line([x, 104], [x + 14, 104], 'fx-frame', 5))
  };

  /* ---------------------------------------------------------------------
     PRESETS DE MOVIMIENTO
     Cada preset devuelve:
       view    'side' | 'front' | 'rear' | 'head'
       viewBox encuadre del SVG
       scene   elementos estáticos (banco, suelo, máquina)
       first   'ecc' si el primer movimiento es excéntrico, 'con' si es concéntrico
       labels  nombres propios de las fases
       build(t) esqueleto + equipamiento dinámico para la posición t (0..1)
     --------------------------------------------------------------------- */
  const PRESETS = {
    /* Press de banca (plano o inclinado) y press cerrado */
    bench(o) {
      const inc = o.incline || 0;
      const hip = inc ? [240, 200] : [236, 189];
      const sh = pt(hip, 180 + inc, L.T);
      const A = inc ? [180, 76] : [172, 105];
      const B = inc ? [191, 149] : (o.close ? [192, 171] : [184, 170]);
      const ankle = [300, 264];
      const legs = leg(hip, ankle, -1);
      let scene = SC.floor();
      if (inc) {
        scene += SC.backPad(hip, sh, -0.05, 1.45, 14) + SC.seat(206, 270, 211);
      } else {
        scene += SC.bench(96, 262, 200) + (o.equip === 'barbell' ? SC.rack(122) : '');
      }
      return {
        scene, first: 'ecc',
        labels: { ecc: 'Descenso', turn: 'Posición inferior', con: 'Empuje' },
        build(t) {
          const { el, ha } = arm(sh, lerpP(A, B, t), 1);
          const front = o.equip === 'barbell' ? EQ.plate(ha, 24) : EQ.dbEnd(ha, 11);
          return { sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [321, 269] }, front };
        }
      };
    },

    /* Press de pecho sentado en máquina */
    'seated-push'() {
      const hip = [170, 205], sh = pt(hip, -95, L.T);
      const A = [206, 134], B = [250, 130], pivot = [262, 36];
      const legs = leg(hip, [238, 264], -1);
      const scene = SC.floor() + SC.seat(132, 204, 214) + SC.backPad(hip, sh, 0, 1.15, 14) +
        line(pivot, [306, 36], 'fx-frame', 6) + SC.post(306, 36) + SC.stack(318, 120) + circle(pivot, 5, 'fx-pivot');
      return {
        scene, first: 'con',
        labels: { con: 'Empuje', turn: 'Brazos extendidos', ecc: 'Regreso controlado' },
        build(t) {
          const { el, ha } = arm(sh, lerpP(A, B, t), 1);
          return {
            sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [259, 270] },
            back: line(ha, pivot, 'fx-lever', 6),
            front: EQ.handle(ha)
          };
        }
      };
    },

    /* Fondos en paralelas */
    dip(o) {
      const ha = [214, 128];
      const shA = [208, 42], shB = [222, 86];
      const leanA = o.lean === 'triceps' ? 6 : 20, leanB = o.lean === 'triceps' ? 10 : 32;
      const scene = SC.floor() + line([136, 133], [296, 133], 'fx-frame', 7) + SC.post(150, 133) + SC.post(282, 133);
      return {
        scene, first: 'ecc', viewBox: VB.wide,
        labels: { start: 'Posición superior', ecc: 'Descenso', turn: 'Posición inferior', con: 'Empuje' },
        build(t) {
          const sh = lerpP(shA, shB, t);
          const hip = pt(sh, 90 + lerp(leanA, leanB, t), L.T);
          const { el } = arm(sh, ha, 1);
          const kn = pt(hip, 78, L.TH), an = pt(kn, 150, 52), to = pt(an, 110, 14);
          const kn2 = pt(hip, 86, L.TH), an2 = pt(kn2, 142, 52), to2 = pt(an2, 105, 14);
          return { sk: { hip, sh, el, ha, kn, an, to, kn2, an2, to2 } };
        }
      };
    },

    /* Dominadas */
    pullup() {
      const bar = [206, -14];
      const shA = [200, 72], shB = [192, 4];
      const scene = SC.floor() + line(bar, [338, -14], 'fx-frame', 6) + SC.post(338, -14) + circle(bar, 5, 'fx-bar-end');
      return {
        scene, first: 'con', viewBox: VB.tall,
        labels: { start: 'Colgado', con: 'Subida', turn: 'Posición superior', ecc: 'Descenso controlado' },
        build(t) {
          const sh = lerpP(shA, shB, t), lean = lerp(4, 18, t);
          const hip = pt(sh, 90 - lean, L.T);
          const { el } = arm(sh, bar, 1);
          const kn = pt(hip, 96 - lean * 0.3, L.TH), an = pt(kn, 150, L.SH), to = pt(an, 95, 14);
          return { sk: { hip, sh, el, ha: bar, kn, an, to, tilt: lerp(0, -10, t) } };
        }
      };
    },

    /* Jalón al pecho */
    pulldown() {
      const hip = [180, 205], sh = pt(hip, -100, L.T);
      const A = [178, 40], B = [190, 122], pulley = [178, -14];
      const legs = leg(hip, [238, 264], -1);
      const scene = SC.floor() + SC.seat(146, 214, 216) + SC.post(112, -24) + line([112, -24], [190, -24], 'fx-frame', 6) +
        SC.stack(64, 130) + rect(legs.kn[0] - 10, legs.kn[1] - 24, 22, 10, 'fx-pad', 5);
      return {
        scene, first: 'con', viewBox: VB.wide,
        labels: { con: 'Jalón hacia el pecho', turn: 'Contracción', ecc: 'Regreso al estiramiento' },
        build(t) {
          const { el, ha } = arm(sh, lerpP(A, B, t), 1);
          return {
            sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [260, 270] },
            back: EQ.cable(pulley, ha),
            front: EQ.grip(ha)
          };
        }
      };
    },

    /* Remo con barra (bisagra de cadera) */
    'row-barbell'(o) {
      const hip = [166, 168], sh = pt(hip, -35, L.T);
      const A = [233, 206], B = [197, 166];
      const support = !!o.support;
      const legs = leg(hip, support ? [180, 264] : [205, 264], -1);
      let scene = SC.floor();
      if (support) {
        const F = frame(hip, sh);
        const base = add(hip, mul(F.front, 28));
        const p0 = add(base, mul(F.u, -L.T * 0.1)), p1 = add(base, mul(F.u, L.T * 0.78));
        scene += line(p0, p1, 'fx-pad', 12) + line(lerpP(p0, p1, 0.35), [214, FLOOR], 'fx-frame', 6) + line([150, FLOOR - 2], [244, FLOOR - 2], 'fx-frame', 5);
      }
      return {
        scene, first: 'con',
        labels: support
          ? { con: 'Tirón con el pecho apoyado', turn: 'Contracción', ecc: 'Descenso controlado' }
          : { con: 'Tirón', turn: 'Contracción', ecc: 'Descenso controlado' },
        build(t) {
          const { el, ha } = arm(sh, lerpP(A, B, t), 1);
          return {
            sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: add(legs.an, [22, 6]), tilt: -8 },
            front: support ? EQ.dbEnd(ha, 10) : EQ.plate(ha, 21)
          };
        }
      };
    },

    /* Remo con mancuerna con apoyo en banco */
    'row-dumbbell'() {
      const hip = [150, 170], sh = pt(hip, -12, L.T);
      const A = [231, 236], B = [194, 170];
      const legs = leg(hip, [186, 264], -1);
      const support = arm(sh, [240, 228], 1);
      return {
        scene: SC.floor() + SC.bench(84, 262, 232), first: 'con',
        labels: { con: 'Tirón hacia la cadera', turn: 'Contracción', ecc: 'Descenso controlado' },
        build(t) {
          const { el, ha } = arm(sh, lerpP(A, B, t), 1);
          return {
            sk: {
              hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [208, 270], tilt: -6,
              el2: support.el, ha2: support.ha, kn2: [156, 224], an2: [104, 226], to2: [90, 236]
            },
            front: EQ.dbSide(ha, 0, 28)
          };
        }
      };
    },

    /* Remo sentado en máquina con apoyo de pecho */
    'row-seated'(o) {
      if (o.cable) {
        const hip = [168, 205], pulley = [338, 168];
        const legs = leg(hip, [244, 248], -1);
        const scene = SC.floor() + SC.seat(124, 204, 214) + line([252, 226], [258, FLOOR], 'fx-frame', 7) +
          SC.post(352, 120) + SC.stack(358, 150, 30);
        return {
          scene, first: 'con',
          labels: { con: 'Tirón hacia el abdomen', turn: 'Contracción', ecc: 'Regreso al estiramiento' },
          build(t) {
            const sh = pt(hip, lerp(-72, -92, t), L.T);
            const { el, ha } = arm(sh, lerpP([262, 176], [194, 168], t), 1);
            return {
              sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: pt(legs.an, -70, 20) },
              back: EQ.cable(pulley, ha),
              front: EQ.handle(ha)
            };
          }
        };
      }
      const hip = [170, 205], sh = pt(hip, -90, L.T);
      const A = [256, 132], B = [186, 160], pivot = [292, 64];
      const legs = leg(hip, [240, 262], -1);
      const scene = SC.floor() + SC.seat(136, 204, 214) + line([192, 116], [192, 176], 'fx-pad', 12) +
        line([192, 176], [222, 230], 'fx-frame', 6) + line(pivot, [330, 64], 'fx-frame', 6) + SC.post(330, 64) +
        SC.stack(340, 130) + circle(pivot, 5, 'fx-pivot') + rect(236, 262, 30, 8, 'fx-frame-fill', 2);
      return {
        scene, first: 'con',
        labels: { con: 'Tirón', turn: 'Contracción', ecc: 'Regreso controlado' },
        build(t) {
          const { el, ha } = arm(sh, lerpP(A, B, t), 1);
          return {
            sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [262, 262] },
            back: line(ha, pivot, 'fx-lever', 6),
            front: EQ.handle(ha)
          };
        }
      };
    },

    /* Pullover en polea */
    pullover() {
      const hip = [172, 153], sh = pt(hip, -65, L.T);
      const legs = leg(hip, [190, 264], -1);
      const pulley = [330, -14];
      const scene = SC.floor() + SC.post(344, -24) + SC.stack(352, 140, 30);
      return {
        scene, first: 'con', viewBox: VB.wide,
        labels: { con: 'Arco hacia los muslos', turn: 'Contracción', ecc: 'Regreso al estiramiento' },
        build(t) {
          const { el, ha } = arm(sh, pt(sh, lerp(-55, 75, t), 84), 1);
          return {
            sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [212, 270] },
            back: EQ.cable(pulley, ha),
            front: EQ.grip(ha)
          };
        }
      };
    },

    /* Face pull */
    'face-pull'() {
      const hip = [198, 151], sh = [198, 71];
      const legs = leg(hip, [200, 264], -1);
      const pulley = [338, 62];
      return {
        scene: SC.floor() + SC.post(352, 10) + SC.stack(360, 130, 30), first: 'con',
        labels: { con: 'Tirón hacia la cara', turn: 'Rotación externa', ecc: 'Regreso controlado' },
        build(t) {
          const el = lerpP([243, 72], [201, 63], t), ha = lerpP([285, 70], [215, 38], t);
          return {
            sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [222, 270] },
            back: EQ.cable(pulley, ha),
            front: EQ.grip(ha)
          };
        }
      };
    },

    /* Curl de bíceps: barra, mancuerna, martillo, polea o inclinado */
    curl(o) {
      if (o.preacher) return curlPreacher(o);
      if (o.bayesian) return curlBayesian();
      if (o.concentration) return curlConcentration();
      const inc = !!o.incline;
      const hip = inc ? [212, 205] : [198, 151];
      const sh = pt(hip, inc ? -128 : -90, L.T);
      const ankle = inc ? [282, 264] : [200, 264];
      const legs = leg(hip, ankle, -1);
      const pulley = [314, 258];
      let scene = SC.floor();
      if (inc) scene += SC.backPad(hip, sh, -0.05, 1.4, 15) + SC.seat(196, 252, 216);
      if (o.equip === 'cable') scene += rect(306, 230, 26, 42, 'fx-stack', 3);
      return {
        scene, first: 'con',
        labels: { con: 'Flexión del codo', turn: 'Contracción máxima', ecc: 'Descenso controlado' },
        build(t) {
          const ua = lerp(inc ? 94 : 92, inc ? 88 : 82, t);
          const fa = lerp(inc ? 88 : 82, -62, t);
          const el = pt(sh, ua, L.UA), ha = pt(el, fa, L.FA);
          let back = '', front;
          if (o.equip === 'barbell') front = EQ.plate(ha, 18);
          else if (o.equip === 'hammer') front = EQ.dbSide(ha, fa + 90, 26);
          else if (o.equip === 'cable') { back = EQ.cable(pulley, ha); front = EQ.grip(ha); }
          else front = EQ.dbEnd(ha, 10);
          return { sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: add(ankle, [22, 6]) }, back, front };
        }
      };
    },

    /* Extensión de tríceps en polea alta */
    pushdown() {
      const hip = [194, 151], sh = pt(hip, -82, L.T);
      const legs = leg(hip, [200, 264], -1);
      const pulley = [264, -14];
      const el = pt(sh, 92, L.UA);
      return {
        scene: SC.floor() + SC.post(280, -24) + SC.stack(290, 150, 30), first: 'con', viewBox: VB.wide,
        labels: { con: 'Extensión de codos', turn: 'Extensión completa', ecc: 'Regreso controlado' },
        build(t) {
          const ha = pt(el, lerp(-32, 84, t), L.FA);
          return {
            sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [222, 270] },
            back: EQ.cable(pulley, ha),
            front: EQ.grip(ha)
          };
        }
      };
    },

    /* Press francés tumbado */
    skullcrusher() {
      const hip = [236, 189], sh = pt(hip, 180, L.T);
      const el = pt(sh, -100, L.UA);
      const legs = leg(hip, [300, 264], -1);
      return {
        scene: SC.floor() + SC.bench(96, 262, 200), first: 'ecc',
        labels: { ecc: 'Flexión de codos', turn: 'Estiramiento', con: 'Extensión' },
        build(t) {
          const ha = pt(el, lerp(-86, -215, t), L.FA);
          return { sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [321, 269] }, front: EQ.plate(ha, 15) };
        }
      };
    },

    /* Extensión de tríceps por encima de la cabeza */
    'overhead-ext'(o) {
      if (o.cable) {
        const hip = [196, 156], sh = pt(hip, -66, L.T), pulley = [40, 176];
        const front = leg(hip, [250, 264], -1), backLeg = leg(hip, [146, 264], -1);
        const el = pt(sh, -38, L.UA);
        return {
          scene: SC.floor() + SC.post(26, 40) + SC.stack(6, 196, 26), first: 'ecc', viewBox: VB.wide,
          labels: { start: 'Brazos extendidos al frente', ecc: 'Flexión tras la cabeza', turn: 'Estiramiento', con: 'Extensión' },
          build(t) {
            const fa = lerp(-34, -188, t);
            const ha = pt(el, fa, L.FA);
            return {
              sk: { hip, sh, el, ha, kn: front.kn, an: front.an, to: [272, 270], kn2: backLeg.kn, an2: backLeg.an, to2: [166, 270] },
              back: EQ.cable(pulley, ha),
              front: EQ.grip(ha)
            };
          }
        };
      }
      const hip = [190, 200], sh = pt(hip, -90, L.T);
      const el = pt(sh, -96, L.UA);
      const legs = leg(hip, [250, 264], -1);
      return {
        scene: SC.floor() + SC.seat(150, 216, 211) + SC.backPad(hip, sh, 0, 1.05, 15), first: 'ecc', viewBox: VB.wide,
        labels: { ecc: 'Descenso tras la cabeza', turn: 'Estiramiento', con: 'Extensión' },
        build(t) {
          const fa = lerp(-88, -248, t);
          const ha = pt(el, fa, L.FA);
          return { sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [272, 270] }, front: EQ.dbSide(ha, fa, 30) };
        }
      };
    },

    /* Press vertical: militar con barra, mancuernas sentado o press Arnold */
    overhead(o) {
      const seated = !!o.seated;
      const hip = seated ? [190, 203] : [198, 151];
      const sh = pt(hip, seated ? -92 : -90, L.T);
      const ankle = seated ? [252, 264] : [200, 264];
      const legs = leg(hip, ankle, -1);
      const A = seated ? [197, 124] : [216, 77];
      const B = seated ? [192, 38] : [204, -12];
      let scene = SC.floor();
      if (seated) scene += SC.seat(150, 214, 214) + SC.backPad(hip, sh, 0, 1.05, 15);
      const pivot = [128, -12];
      if (o.machine) scene += SC.post(128, -12) + circle(pivot, 5, 'fx-pivot');
      return {
        scene, first: 'con', viewBox: seated ? VB.wide : VB.tall,
        labels: o.arnold
          ? { start: 'Palmas hacia ti', con: 'Rotación y empuje', turn: 'Brazos extendidos', ecc: 'Descenso con rotación' }
          : { con: 'Empuje vertical', turn: 'Brazos extendidos', ecc: 'Descenso controlado' },
        build(t) {
          let el, ha;
          if (o.arnold) {
            el = lerpP([222, 158], [190, 80], t);
            ha = lerpP([224, 116], [193, 38], t);
          } else {
            const target = add(lerpP(A, B, t), [(seated ? 4 : 7) * Math.sin(Math.PI * t), 0]);
            ({ el, ha } = arm(sh, target, 1));
          }
          const front = o.machine ? EQ.handle(ha, 90, 16) : o.equip === 'barbell' ? EQ.plate(ha, 22) : EQ.dbEnd(ha, 10);
          const back = o.machine ? line(pivot, ha, 'fx-lever', 6) : '';
          const tilt = seated ? 0 : -14 * Math.sin(Math.PI * Math.min(1, t * 1.6));
          return { sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: add(ankle, [22, 6]), tilt }, back, front };
        }
      };
    },

    /* Sentadilla con barra */
    squat(o) {
      const ankle = [205, 264];
      const upright = o.front || o.goblet;
      return {
        scene: SC.floor(), first: 'ecc',
        labels: { ecc: 'Descenso', turn: 'Posición inferior', con: 'Subida' },
        build(t) {
          const hip = lerpP([199, 151], upright ? [162, 214] : [156, 212], t);
          const sh = pt(hip, lerp(-88, upright ? -66 : -52, t), L.T);
          const F = frame(hip, sh);
          const { kn, an } = leg(hip, ankle, -1);
          if (o.front) {
            const bar = add(add(sh, mul(F.front, 12)), mul(F.u, -2));
            const el = pt(sh, F.a + 98, L.UA);
            return { sk: { hip, sh, el, ha: add(bar, mul(F.u, -3)), kn, an, to: [227, 270] }, front: EQ.plate(bar, 24) };
          }
          if (o.goblet) {
            const db = add(add(sh, mul(F.front, 17)), mul(F.u, -16));
            const { el, ha } = arm(sh, db, 1);
            return { sk: { hip, sh, el, ha, kn, an, to: [227, 270] }, front: EQ.dbSide(db, F.a, 26) };
          }
          const bar = add(add(sh, mul(F.back, 11)), mul(F.u, -4));
          const { el, ha } = arm(sh, add(bar, mul(F.front, 4)), -1);
          return { sk: { hip, sh, el, ha, kn, an, to: [227, 270] }, front: EQ.plate(bar, 24) };
        }
      };
    },

    /* Sentadilla hack en máquina */
    'hack-squat'() {
      const rail = unit(70);
      const hipA = [186, 150], hipB = add(hipA, mul(rail, 62));
      const ankle = [236, 252], toe = pt(ankle, -20, 22);
      const u = unit(-110), front = [-u[1], u[0]], back = mul(front, -1);
      const p0 = add(add(hipB, mul(back, 15)), mul(u, -14));
      const p1 = add(add(hipA, mul(back, 15)), mul(u, 102));
      const scene = SC.floor() + line(add(p0, mul(back, 16)), add(p1, mul(back, 16)), 'fx-frame', 5) +
        line(p0, p1, 'fx-pad', 12) + line([214, 266], [288, 239], 'fx-frame', 8) + line(add(p0, mul(back, 16)), [150, FLOOR], 'fx-frame', 5);
      return {
        scene, first: 'ecc',
        labels: { ecc: 'Descenso', turn: 'Posición inferior', con: 'Subida' },
        build(t) {
          const hip = lerpP(hipA, hipB, t);
          const sh = pt(hip, -110, L.T);
          const { el, ha } = arm(sh, add(add(sh, mul(front, 18)), mul(u, -6)), 1);
          const { kn, an } = leg(hip, ankle, -1);
          return { sk: { hip, sh, el, ha, kn, an, to: toe }, front: EQ.pad(add(add(sh, mul(front, 6)), mul(u, 3)), 8) };
        }
      };
    },

    /* Prensa de piernas a 45° */
    'leg-press'() {
      const hip = [150, 212], sh = pt(hip, -140, L.T);
      const railU = unit(-45), plane = unit(-135);
      const aA = pt(hip, -42, 108), aB = add(aA, mul(railU, -62));
      const hand = arm(sh, [172, 226], 1);
      const cA = add(add(aA, mul(railU, 9)), mul(plane, 6));
      const r0 = add(add(cA, mul(railU, 70)), mul(plane, -46));
      const r1 = add(add(cA, mul(railU, -150)), mul(plane, -46));
      const scene = SC.floor() + line(r0, r1, 'fx-frame', 6) + SC.backPad(hip, sh, -0.1, 1.25, 14) +
        line([128, 228], [188, 228], 'fx-pad', 10) + line([158, 233], [158, FLOOR], 'fx-frame', 7);
      return {
        scene, first: 'ecc',
        labels: { ecc: 'Flexión de rodillas', turn: 'Posición inferior', con: 'Empuje' },
        build(t) {
          const { kn, an } = leg(hip, lerpP(aA, aB, t), -1);
          const to = pt(an, ang(kn, an) - 90, 20);
          const c = add(add(an, mul(railU, 9)), mul(plane, 6));
          const plate = line(add(c, mul(plane, -30)), add(c, mul(plane, 36)), 'fx-plate-bar', 9) +
            EQ.plate(add(add(c, mul(railU, 24)), mul(plane, -12)), 18);
          return { sk: { hip, sh, el: hand.el, ha: hand.ha, kn, an, to }, back: plate };
        }
      };
    },

    /* Extensión de piernas en máquina */
    'leg-extension'() {
      const hip = [172, 200], sh = pt(hip, -98, L.T);
      const kn = pt(hip, 2, L.TH);
      const hand = arm(sh, [194, 212], 1);
      const scene = SC.floor() + SC.seat(128, 232, 211) + SC.backPad(hip, sh, 0, 1.05, 15) + circle(kn, 6, 'fx-pivot');
      return {
        scene, first: 'con',
        labels: { con: 'Extensión de rodillas', turn: 'Contracción', ecc: 'Descenso controlado' },
        build(t) {
          const s = lerp(96, 6, t);
          const an = pt(kn, s, L.SH), to = pt(an, s - 80, 18);
          const v = unit(s), fr = [v[1], -v[0]];
          const pad = add(add(an, mul(fr, 10)), mul(v, -8));
          return {
            sk: { hip, sh, el: hand.el, ha: hand.ha, kn, an, to },
            back: line(kn, pad, 'fx-lever', 6),
            front: EQ.pad(pad, 8)
          };
        }
      };
    },

    /* Zancadas con mancuernas */
    lunge(o) {
      if (o.bulgarian) {
        return {
          scene: SC.floor() + SC.bench(64, 150, 224), first: 'ecc',
          labels: { ecc: 'Descenso', turn: 'Posición inferior', con: 'Subida' },
          build(t) {
            const hip = lerpP([200, 158], [192, 206], t);
            const sh = pt(hip, lerp(-84, -70, t), L.T);
            const fr = leg(hip, [248, 264], -1), bk = leg(hip, [134, 212], -1);
            const { el, ha } = arm(sh, pt(sh, 94, 84), 1);
            return {
              sk: { hip, sh, el, ha, kn: fr.kn, an: fr.an, to: [270, 270], kn2: bk.kn, an2: bk.an, to2: [114, 219] },
              front: EQ.dbEnd(ha, 10)
            };
          }
        };
      }
      return {
        scene: SC.floor(), first: 'ecc',
        labels: { ecc: 'Descenso', turn: 'Rodilla cerca del suelo', con: 'Subida' },
        build(t) {
          const hip = lerpP([194, 166], [190, 208], t);
          const sh = pt(hip, -88, L.T);
          const fr = leg(hip, [246, 264], -1), bk = leg(hip, [140, 252], -1);
          const { el, ha } = arm(sh, pt(sh, 92, 84), 1);
          return {
            sk: { hip, sh, el, ha, kn: fr.kn, an: fr.an, to: [268, 270], kn2: bk.kn, an2: bk.an, to2: [158, 270] },
            front: EQ.dbEnd(ha, 10)
          };
        }
      };
    },

    /* Peso muerto rumano y buenos días (bar: 'back') */
    rdl(o) {
      const onBack = o.bar === 'back';
      const ankle = [205, 264];
      const hipB = onBack ? [155, 163] : [154, 166], aB = onBack ? -14 : -18;
      return {
        scene: SC.floor(), first: 'ecc',
        labels: { ecc: 'Bisagra de cadera', turn: 'Estiramiento', con: 'Extensión de cadera' },
        build(t) {
          const hip = lerpP([199, 152], hipB, t);
          const sh = pt(hip, lerp(-88, aB, t), L.T);
          const F = frame(hip, sh);
          const { kn, an } = leg(hip, ankle, -1);
          if (onBack) {
            const bar = add(add(sh, mul(F.back, 11)), mul(F.u, -4));
            const { el, ha } = arm(sh, add(bar, mul(F.front, 4)), -1);
            return { sk: { hip, sh, el, ha, kn, an, to: [227, 270] }, front: EQ.plate(bar, 22) };
          }
          const { el, ha } = arm(sh, lerpP([208, 156], [226, 224], t), 1);
          return { sk: { hip, sh, el, ha, kn, an, to: [227, 270] }, front: o.equip === 'dumbbell' ? EQ.dbEnd(ha, 10) : EQ.plate(ha, 21) };
        }
      };
    },

    /* Curl femoral tumbado */
    'leg-curl-lying'() {
      const hip = [176, 189], sh = pt(hip, 0, L.T);
      const kn = pt(hip, 180, L.TH);
      const hand = arm(sh, [298, 204], 1);
      const scene = SC.floor() + SC.bench(112, 302, 200) + circle(kn, 5, 'fx-pivot');
      return {
        scene, first: 'con',
        labels: { con: 'Flexión de rodillas', turn: 'Contracción', ecc: 'Descenso controlado' },
        build(t) {
          const s = lerp(182, 262, t);
          const an = pt(kn, s, L.SH), to = pt(an, s - 90, 18);
          const v = unit(s), bk = [-v[1], v[0]];
          const pad = add(add(an, mul(bk, 10)), mul(v, -9));
          return {
            sk: { hip, sh, el: hand.el, ha: hand.ha, kn, an, to, tilt: -22 },
            back: line(kn, pad, 'fx-lever', 6),
            front: EQ.pad(pad, 8)
          };
        }
      };
    },

    /* Curl femoral sentado */
    'leg-curl-seated'() {
      const hip = [160, 200], sh = pt(hip, -96, L.T);
      const kn = pt(hip, 0, L.TH);
      const hand = arm(sh, [178, 214], 1);
      const scene = SC.floor() + SC.seat(118, 222, 211) + SC.backPad(hip, sh, 0, 1.05, 15) +
        rect(186, 177, 40, 9, 'fx-pad', 4) + circle(kn, 5, 'fx-pivot');
      return {
        scene, first: 'con',
        labels: { con: 'Flexión de rodillas', turn: 'Contracción', ecc: 'Regreso controlado' },
        build(t) {
          const s = lerp(12, 112, t);
          const an = pt(kn, s, L.SH), to = pt(an, s - 90, 18);
          const v = unit(s), bk = [-v[1], v[0]];
          const pad = add(add(an, mul(bk, 10)), mul(v, -10));
          return {
            sk: { hip, sh, el: hand.el, ha: hand.ha, kn, an, to },
            back: line(kn, pad, 'fx-lever', 6),
            front: EQ.pad(pad, 8)
          };
        }
      };
    },

    /* Hip thrust */
    'hip-thrust'(o) {
      if (o.floor) {
        const sh = [124, 256], ankle = [256, 262];
        return {
          scene: SC.floor(), first: 'con',
          labels: { con: 'Elevación de cadera', turn: 'Extensión completa', ecc: 'Descenso controlado' },
          build(t) {
            const hip = pt(sh, lerp(0, -30, t), L.T);
            const { kn, an } = leg(hip, ankle, -1);
            const { el, ha } = arm(sh, [200, 264], 1);
            return { sk: { hip, sh, el, ha, kn, an, to: [278, 268], tilt: lerp(0, 18, t) } };
          }
        };
      }
      const sh = [146, 206], ankle = [284, 264];
      return {
        scene: SC.floor() + SC.bench(56, 152, 214), first: 'con',
        labels: { con: 'Empuje de cadera', turn: 'Extensión completa', ecc: 'Descenso controlado' },
        build(t) {
          const hip = pt(sh, lerp(40, 0, t), L.T);
          const F = frame(hip, sh);
          const bar = add(hip, mul(F.front, 18));
          const { kn, an } = leg(hip, ankle, -1);
          const { el, ha } = arm(sh, add(bar, mul(F.u, 4)), 1);
          return { sk: { hip, sh, el, ha, kn, an, to: [306, 270], tilt: lerp(0, 22, t) }, front: EQ.plate(bar, 22) };
        }
      };
    },

    /* Patada de glúteo en polea */
    kickback() {
      const hip = [186, 152], sh = pt(hip, -55, L.T);
      const support = leg(hip, [194, 264], -1);
      const hand = arm(sh, [286, 124], 1);
      const pulley = [300, 258];
      const scene = SC.floor() + SC.post(300, 40) + line([284, 124], [300, 124], 'fx-frame', 5) + rect(292, 238, 26, 34, 'fx-stack', 3);
      return {
        scene, first: 'con',
        labels: { con: 'Extensión de cadera', turn: 'Contracción', ecc: 'Regreso controlado' },
        build(t) {
          const th = lerp(84, 146, t), s = lerp(104, 156, t);
          const kn = pt(hip, th, L.TH), an = pt(kn, s, L.SH), to = pt(an, s - 72, 18);
          return {
            sk: { hip, sh, el: hand.el, ha: hand.ha, kn, an, to, kn2: support.kn, an2: support.an, to2: [216, 270] },
            back: EQ.cable(pulley, an),
            front: circle(an, 6, 'fx-strap')
          };
        }
      };
    },

    /* Elevación de talones de pie (escalón con mancuerna) */
    'calf-standing'(o) {
      const toe = [228, 250];
      const machine = !!o.machine;
      const scene = SC.floor() + rect(212, 252, 52, 20, 'fx-block', 2) +
        (machine ? SC.post(300, -10, FLOOR, 8) + SC.stack(312, 120, 30) : SC.post(292, 70, FLOOR, 7));
      return {
        scene, first: 'ecc', viewBox: VB.wide,
        labels: { start: 'Talones arriba', ecc: 'Descenso del talón', turn: 'Estiramiento', con: 'Elevación' },
        build(t) {
          const an = pt(toe, lerp(222, 168, t), 22);
          const kn = [an[0] + 3, an[1] - 56], hip = [kn[0] - 3, kn[1] - 58];
          const sh = pt(hip, -90, L.T);
          const far = o.single ? { kn2: pt(hip, 98, L.TH) } : {};
          if (far.kn2) { far.an2 = pt(far.kn2, 166, L.SH); far.to2 = pt(far.an2, 100, 16); }
          if (machine) {
            const pad = add(sh, [3, -9]);
            const grip = arm(sh, [sh[0] + 22, sh[1] - 14], 1);
            return {
              sk: { hip, sh, el: grip.el, ha: grip.ha, kn, an, to: toe, ...far },
              back: line(pad, [300, pad[1]], 'fx-lever', 7),
              front: EQ.pad(pad, 8)
            };
          }
          const { el, ha } = arm(sh, pt(sh, 92, 84), 1);
          const support = arm(sh, [286, sh[1] + 40], 1);
          return {
            sk: { hip, sh, el, ha, kn, an, to: toe, el2: support.el, ha2: support.ha, ...far },
            front: EQ.dbEnd(ha, 10)
          };
        }
      };
    },

    /* Elevación de talones sentado */
    'calf-seated'() {
      const hip = [160, 200], sh = pt(hip, -92, L.T), toe = [242, 250];
      const scene = SC.floor() + SC.seat(118, 198, 211) + rect(226, 252, 48, 20, 'fx-block', 2);
      return {
        scene, first: 'ecc',
        labels: { start: 'Talones arriba', ecc: 'Descenso del talón', turn: 'Estiramiento', con: 'Elevación' },
        build(t) {
          const { kn, an } = leg(hip, pt(toe, lerp(222, 168, t), 22), -1);
          const pad = add(kn, [2, -13]);
          const { el, ha } = arm(sh, add(pad, [-8, -4]), 1);
          return {
            sk: { hip, sh, el, ha, kn, an, to: toe },
            back: line(pad, [306, 194], 'fx-lever', 7) + EQ.plate([306, 194], 16),
            front: line(add(pad, [-12, 0]), add(pad, [12, 0]), 'fx-pad-line', 9)
          };
        }
      };
    },

    /* Elevación de talones en prensa */
    'calf-press'() {
      const hip = [150, 212], sh = pt(hip, -140, L.T);
      const railU = unit(-45), plane = unit(-135);
      const an0 = pt(hip, -42, 110);
      const legs = leg(hip, an0, -1);
      const hand = arm(sh, [172, 226], 1);
      const scene = SC.floor() + SC.backPad(hip, sh, -0.1, 1.25, 14) +
        line([128, 228], [188, 228], 'fx-pad', 10) + line([158, 233], [158, FLOOR], 'fx-frame', 7);
      return {
        scene, first: 'ecc',
        labels: { start: 'Tobillos extendidos', ecc: 'Flexión del tobillo', turn: 'Estiramiento', con: 'Extensión del tobillo' },
        build(t) {
          const to = pt(legs.an, lerp(-100, -158, t), 22);
          const c = add(to, mul(railU, 7));
          const plate = line(add(c, mul(plane, -14)), add(c, mul(plane, 52)), 'fx-plate-bar', 9) +
            EQ.plate(add(add(c, mul(railU, 24)), mul(plane, 6)), 18);
          return { sk: { hip, sh, el: hand.el, ha: hand.ha, kn: legs.kn, an: legs.an, to }, back: plate };
        }
      };
    },

    /* ------------------------- Vistas frontales ------------------------- */

    /* Elevaciones laterales (vista frontal) */
    'lateral-raise'(o) {
      if (o.cable) {
        const pulley = [96, 258];
        const scene = SC.floor() + SC.post(82, 150) + rect(64, 232, 26, 40, 'fx-stack', 3);
        return {
          view: 'front', scene, first: 'con',
          labels: { con: 'Elevación lateral', turn: 'Altura de hombros', ecc: 'Descenso controlado' },
          build(t) {
            const b = frontBody();
            const target = pt(b.shR, lerp(100, 6, t), lerp(70, 82, t));
            const elR = ik(b.shR, target, L.UA, L.FA, -1), haR = pt(elR, ang(elR, target), L.FA);
            const hang = pt(b.shR, 88, 82);
            const elH = ik(b.shR, hang, L.UA, L.FA, -1), haH = pt(elH, ang(elH, hang), L.FA);
            return {
              sk: { ...b, elR, haR, elL: mx(elH), haL: mx(haH) },
              front: EQ.cable(pulley, haR) + EQ.grip(haR)
            };
          }
        };
      }
      return {
        view: 'front', scene: SC.floor(), first: 'con',
        labels: { con: 'Elevación lateral', turn: 'Altura de hombros', ecc: 'Descenso controlado' },
        build(t) {
          const b = frontBody();
          const target = pt(b.shR, lerp(84, 4, t), 82);
          const elR = ik(b.shR, target, L.UA, L.FA, -1), haR = pt(elR, ang(elR, target), L.FA);
          return {
            sk: { ...b, elR, haR, elL: mx(elR), haL: mx(haR) },
            front: EQ.dbEnd(haR, 9) + EQ.dbEnd(mx(haR), 9)
          };
        }
      };
    },

    /* Elevaciones posteriores con torso inclinado (vista posterior) */
    'rear-raise'(o) {
      const scene = SC.floor() + (o.bench
        ? rect(182, 112, 36, 62, 'fx-frame-fill', 4) + SC.post(200, 174, FLOOR, 8) + line([170, FLOOR - 2], [230, FLOOR - 2], 'fx-frame', 5)
        : '');
      return {
        view: 'rear', scene, first: 'con',
        labels: { con: 'Apertura hacia fuera', turn: 'Brazos en línea con el torso', ecc: 'Descenso controlado' },
        build(t) {
          const b = {
            head: [200, 120], headBehind: true,
            shL: [174, 128], shR: [226, 128], hipL: [187, 166], hipR: [213, 166],
            knL: [183, 216], knR: [217, 216], anL: [182, 264], anR: [218, 264]
          };
          const target = pt(b.shR, lerp(92, 4, t), 80);
          const elR = ik(b.shR, target, L.UA, L.FA, -1), haR = pt(elR, ang(elR, target), L.FA);
          return {
            sk: { ...b, elR, haR, elL: mx(elR), haL: mx(haR) },
            front: EQ.dbEnd(haR, 9) + EQ.dbEnd(mx(haR), 9)
          };
        }
      };
    },

    /* Pájaro en máquina (vista posterior, sentado) */
    'reverse-fly'(o) {
      const cable = !!o.cable;
      const pR = [372, 84], pL = mx(pR);
      const scene = cable
        ? SC.floor() + SC.post(386, 4) + SC.post(14, 4)
        : SC.floor() + rect(190, 16, 20, 236, 'fx-frame-fill', 3) + rect(160, 172, 80, 11, 'fx-pad', 4) + SC.post(200, 183, FLOOR, 8);
      return {
        view: 'rear', scene, first: 'con',
        labels: { con: 'Apertura hacia atrás', turn: 'Brazos en línea con el torso', ecc: 'Regreso controlado' },
        build(t) {
          const b = cable ? frontBody() : { head: [200, 52], shL: [173, 82], shR: [227, 82], hipL: [186, 168], hipR: [214, 168] };
          const elR = lerpP([238, 96], [274, 86], t), haR = lerpP([214, 92], [314, 90], t);
          const haL = mx(haR);
          return {
            sk: { ...b, elR, haR, elL: mx(elR), haL },
            back: cable ? EQ.cable(pL, haR) + EQ.cable(pR, haL) : '',
            front: cable ? EQ.grip(haR) + EQ.grip(haL) : EQ.handle(haR) + EQ.handle(haL)
          };
        }
      };
    },

    /* Aperturas con mancuernas (vista desde la cabecera del banco) */
    fly() {
      const scene = SC.floor() + rect(180, 203, 40, 12, 'fx-pad', 4) + SC.post(200, 215, FLOOR, 8) +
        line([176, FLOOR - 2], [224, FLOOR - 2], 'fx-frame', 5);
      return {
        view: 'head', scene, first: 'ecc',
        labels: { ecc: 'Apertura', turn: 'Estiramiento', con: 'Cierre del arco' },
        build(t) {
          const b = { torsoEllipse: { c: [200, 190], rx: 36, ry: 13 }, head: [200, 178], shL: [168, 186], shR: [232, 186] };
          const target = pt(b.shR, lerp(-80, 12, t), 80);
          const elR = ik(b.shR, target, L.UA, L.FA, 1), haR = pt(elR, ang(elR, target), L.FA);
          return {
            sk: { ...b, elR, haR, elL: mx(elR), haL: mx(haR) },
            front: EQ.dbEnd(haR, 10) + EQ.dbEnd(mx(haR), 10)
          };
        }
      };
    },

    /* Cruce de poleas (vista frontal). low: poleas bajas, de abajo hacia arriba */
    crossover(o) {
      const low = !!o.low;
      const pR = low ? [372, 256] : [372, 16], pL = mx(pR);
      const scene = SC.floor() + SC.post(386, 4) + SC.post(14, 4);
      return {
        view: 'front', scene, first: 'con',
        labels: low
          ? { con: 'Arco hacia arriba', turn: 'Manos a la altura del pecho alto', ecc: 'Descenso controlado' }
          : { con: 'Cierre del arco', turn: 'Contracción', ecc: 'Apertura controlada' },
        build(t) {
          const b = frontBody();
          const target = low ? pt(b.shR, lerp(42, 128, t), lerp(82, 42, t)) : pt(b.shR, lerp(6, 104, t), 82);
          const elR = ik(b.shR, target, L.UA, L.FA, -1), haR = pt(elR, ang(elR, target), L.FA);
          const haL = mx(haR);
          return {
            sk: { ...b, elR, haR, elL: mx(elR), haL },
            back: EQ.cable(pR, haR) + EQ.cable(pL, haL),
            front: EQ.grip(haR) + EQ.grip(haL)
          };
        }
      };
    }
  };


  /* ---------------------- Patrones añadidos (v3) ---------------------- */
  Object.assign(PRESETS, {
    /* Flexiones: cuerpo rígido que pivota sobre los pies */
    pushup() {
      const an = [60, 258], hand = [232, 262];
      return {
        scene: SC.floor(), first: 'ecc',
        labels: { start: 'Brazos extendidos', ecc: 'Descenso', turn: 'Pecho cerca del suelo', con: 'Empuje' },
        build(t) {
          const a = lerp(-25, -7.7, t);
          const kn = pt(an, a, L.SH), hip = pt(an, a, L.SH + L.TH), sh = pt(an, a, L.SH + L.TH + L.T);
          const { el } = arm(sh, hand, 1);
          return { sk: { hip, sh, el, ha: hand, kn, an, to: [52, 270], tilt: -6 } };
        }
      };
    },

    /* Peso muerto convencional desde el suelo */
    deadlift() {
      const ankle = [205, 264];
      return {
        scene: SC.floor(), first: 'con',
        labels: { start: 'Barra en el suelo', con: 'Levantamiento', turn: 'Bloqueo de cadera', ecc: 'Descenso controlado' },
        build(t) {
          const hip = lerpP([162, 195], [199, 152], t);
          const sh = pt(hip, lerp(-26, -88, t), L.T);
          const { kn, an } = leg(hip, ankle, -1);
          const { el, ha } = arm(sh, lerpP([214, 247], [208, 156], t), 1);
          return { sk: { hip, sh, el, ha, kn, an, to: [227, 270] }, front: EQ.plate(ha, 24) };
        }
      };
    },

    /* Elevaciones frontales con mancuerna */
    'front-raise'() {
      const hip = [198, 151], sh = pt(hip, -90, L.T);
      const legs = leg(hip, [200, 264], -1);
      return {
        scene: SC.floor(), first: 'con',
        labels: { con: 'Elevación al frente', turn: 'Altura de hombros', ecc: 'Descenso controlado' },
        build(t) {
          const a = lerp(86, -4, t);
          const el = pt(sh, a, L.UA), ha = pt(el, a - 4, L.FA);
          return { sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [222, 270] }, front: EQ.dbEnd(ha, 10) };
        }
      };
    },

    /* Patada de tríceps con mancuerna, apoyado en banco */
    'tri-kickback'() {
      const hip = [150, 170], sh = pt(hip, -12, L.T);
      const legs = leg(hip, [186, 264], -1);
      const support = arm(sh, [240, 228], 1);
      const el = pt(sh, 170, L.UA);
      return {
        scene: SC.floor() + SC.bench(84, 262, 232), first: 'con',
        labels: { start: 'Codo a 90°', con: 'Extensión hacia atrás', turn: 'Brazo extendido', ecc: 'Regreso controlado' },
        build(t) {
          const ha = pt(el, lerp(92, 168, t), L.FA);
          return {
            sk: {
              hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [208, 270], tilt: -6,
              el2: support.el, ha2: support.ha, kn2: [156, 224], an2: [104, 226], to2: [90, 236]
            },
            front: EQ.dbEnd(ha, 9)
          };
        }
      };
    },

    /* Curl nórdico: de rodillas, el cuerpo cae rígido hacia delante */
    nordic() {
      const kn = [200, 256], an = [146, 262];
      const scene = SC.floor() + rect(176, 264, 52, 8, 'fx-pad', 3) + circle([142, 251], 7, 'fx-pad-dyn') +
        line([136, 251], [124, FLOOR], 'fx-frame', 6);
      return {
        scene, first: 'ecc',
        labels: { start: 'De rodillas, cuerpo recto', ecc: 'Caída controlada', turn: 'Punto más bajo controlable', con: 'Regreso con los isquios' },
        build(t) {
          const a = lerp(-86, -26, t);
          const hip = pt(kn, a, L.TH), sh = pt(hip, a, L.T);
          const F = frame(hip, sh);
          const { el, ha } = arm(sh, add(add(sh, mul(F.front, 30)), mul(F.u, -30)), 1);
          return { sk: { hip, sh, el, ha, kn, an, to: [126, 268] } };
        }
      };
    },

    /* Abducción de cadera en máquina (vista frontal, sentado) */
    'hip-abduction'() {
      const scene = SC.floor() + rect(174, 70, 52, 128, 'fx-frame-fill', 4) + rect(146, 200, 108, 11, 'fx-pad', 4) +
        SC.post(200, 211, FLOOR, 8) + line([160, FLOOR - 2], [240, FLOOR - 2], 'fx-frame', 5);
      return {
        view: 'front', scene, first: 'con',
        labels: { con: 'Apertura de piernas', turn: 'Máxima apertura', ecc: 'Regreso controlado' },
        build(t) {
          const b = {
            head: [200, 92], shL: [173, 122], shR: [227, 122], hipL: [186, 194], hipR: [214, 194],
            elR: [236, 160], haR: [240, 194]
          };
          const knR = lerpP([222, 224], [252, 220], t), anR = add(knR, [2, 40]);
          const sk = { ...b, elL: mx(b.elR), haL: mx(b.haR), knR, anR, knL: mx(knR), anL: mx(anR) };
          return { sk, front: EQ.pad(add(knR, [13, -4]), 7) + EQ.pad(add(mx(knR), [-13, -4]), 7) };
        }
      };
    },

    /* Hiperextensión a 45° */
    'back-extension'() {
      const an = [100, 240];
      const kn = pt(an, -40, L.SH), hip = pt(an, -40, L.SH + L.TH);
      const fr = unit(50);
      const pad = add(pt(an, -40, 100), mul(fr, 12));
      const scene = SC.floor() + line(add(pad, mul(unit(-40), -16)), add(pad, mul(unit(-40), 16)), 'fx-pad', 12) +
        line(pad, [pad[0] - 30, FLOOR], 'fx-frame', 6) + line(add(an, [6, 12]), [96, FLOOR], 'fx-frame', 6) +
        line(add(an, [-8, 14]), add(an, [18, -6]), 'fx-frame', 6) + line([60, FLOOR - 2], [190, FLOOR - 2], 'fx-frame', 5);
      return {
        scene, first: 'con',
        labels: { start: 'Torso abajo', con: 'Extensión de cadera', turn: 'Cuerpo en línea', ecc: 'Descenso controlado' },
        build(t) {
          const sh = pt(hip, lerp(58, -40, t), L.T);
          const F = frame(hip, sh);
          const { el, ha } = arm(sh, add(add(sh, mul(F.front, 14)), mul(F.u, -22)), 1);
          return { sk: { hip, sh, el, ha, kn, an, to: pt(an, 50, 18) } };
        }
      };
    },

    /* Contractor de pecho (pec deck), vista frontal sentado */
    'pec-deck'() {
      const scene = SC.floor() + rect(176, 30, 48, 146, 'fx-frame-fill', 4) +
        rect(160, 172, 80, 11, 'fx-pad', 4) + SC.post(200, 183, FLOOR, 8) + line([170, FLOOR - 2], [230, FLOOR - 2], 'fx-frame', 5);
      const pR = [244, 22];
      return {
        view: 'front', scene, first: 'con',
        labels: { con: 'Cierre de los brazos', turn: 'Contracción', ecc: 'Apertura controlada' },
        build(t) {
          const b = { head: [200, 52], shL: [173, 82], shR: [227, 82], hipL: [186, 168], hipR: [214, 168] };
          const elR = lerpP([270, 98], [234, 104], t), haR = lerpP([302, 84], [211, 92], t);
          const haL = mx(haR);
          return {
            sk: { ...b, elR, haR, elL: mx(elR), haL },
            back: line(pR, haR, 'fx-lever', 6) + line(mx(pR), haL, 'fx-lever', 6),
            front: EQ.handle(haR) + EQ.handle(haL)
          };
        }
      };
    }
  });

  /* Curl en banco Scott (predicador) */
  function curlPreacher(o) {
    const hip = [176, 205], sh = pt(hip, -92, L.T);
    const legs = leg(hip, [244, 264], -1);
    const el = pt(sh, 42, L.UA);
    const below = mul(unit(132), 13);
    const p0 = add(pt(sh, 42, 18), below), p1 = add(pt(sh, 42, 60), below);
    const scene = SC.floor() + SC.seat(140, 212, 214) + line(p0, p1, 'fx-pad', 11) + line(lerpP(p0, p1, 0.5), [222, FLOOR], 'fx-frame', 6);
    return {
      scene, first: 'con',
      labels: { start: 'Brazo apoyado y estirado', con: 'Flexión del codo', turn: 'Contracción', ecc: 'Descenso controlado' },
      build(t) {
        const fa = lerp(56, -70, t);
        const ha = pt(el, fa, L.FA);
        return {
          sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [266, 270] },
          front: o.equip === 'dumbbell' ? EQ.dbEnd(ha, 10) : EQ.plate(ha, 16)
        };
      }
    };
  }

  /* Curl bayesiano: polea detrás, brazo por detrás del torso */
  function curlBayesian() {
    const hip = [204, 151], sh = pt(hip, -84, L.T), pulley = [36, 206];
    const fr = leg(hip, [236, 264], -1), bk = leg(hip, [168, 264], -1);
    const el = pt(sh, 116, L.UA);
    return {
      scene: SC.floor() + SC.post(22, 60) + SC.stack(2, 200, 26), first: 'con',
      labels: { start: 'Brazo estirado por detrás', con: 'Flexión del codo', turn: 'Contracción', ecc: 'Regreso al estiramiento' },
      build(t) {
        const ha = pt(el, lerp(112, -40, t), L.FA);
        return {
          sk: { hip, sh, el, ha, kn: fr.kn, an: fr.an, to: [258, 270], kn2: bk.kn, an2: bk.an, to2: [188, 270] },
          back: EQ.cable(pulley, ha),
          front: EQ.grip(ha)
        };
      }
    };
  }

  /* Curl concentrado sentado, codo apoyado en el muslo */
  function curlConcentration() {
    const hip = [176, 205], sh = pt(hip, -56, L.T);
    const legs = leg(hip, [262, 264], -1);
    const el = pt(sh, 88, L.UA);
    return {
      scene: SC.floor() + SC.seat(132, 206, 214), first: 'con',
      labels: { con: 'Flexión del codo', turn: 'Contracción', ecc: 'Descenso controlado' },
      build(t) {
        const ha = pt(el, lerp(94, -78, t), L.FA);
        return { sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [284, 270], tilt: 14 }, front: EQ.dbEnd(ha, 9) };
      }
    };
  }

  /* Cuerpo base para vistas frontales / posteriores (de pie) */
  function frontBody() {
    return {
      head: [200, 52],
      shL: [173, 82], shR: [227, 82],
      hipL: [186, 160], hipR: [214, 160],
      knL: [184, 214], knR: [216, 214],
      anL: [183, 264], anR: [217, 264]
    };
  }

  /* ---------------------------------------------------------------------
     CUERPO TRANSPARENTE CON MÚSCULOS
     La figura se dibuja como un cuerpo "de cristal": un contorno claro y un
     relleno oscuro semitransparente. Dentro se ven los huesos (tenues) y
     todos los músculos. Los que trabaja el ejercicio se iluminan con el color
     del tipo de sesión: brillantes los principales y suaves los secundarios.
     --------------------------------------------------------------------- */

  /* Silueta: lista de formas → contorno y relleno fusionados en una pieza */
  function silhouette(shapes, extraCls = '') {
    let outline = '', fill = '';
    for (const s of shapes) {
      if (s.l) {
        outline += line(s.l[0], s.l[1], 'fx-skin-line', s.w + 3.2);
        fill += line(s.l[0], s.l[1], 'fx-skin', s.w);
      } else if (s.p) {
        outline += poly(s.p, 'fx-skin-line-poly');
        fill += poly(s.p, 'fx-skin-poly');
      } else if (s.c) {
        outline += circle(s.c, s.r + 1.6, 'fx-skin-line-fill');
        fill += circle(s.c, s.r, 'fx-skin-fill');
      } else if (s.e) {
        outline += ellipse(s.e.c, s.e.rx + 1.6, s.e.ry + 1.6, 'fx-skin-line-fill');
        fill += ellipse(s.e.c, s.e.rx, s.e.ry, 'fx-skin-fill');
      }
    }
    return `<g class="fx-sil ${extraCls}"><g>${outline}</g><g class="fx-sil-fill">${fill}</g></g>`;
  }

  /* Vientre muscular: forma de huso entre p0 y p1 con media anchura w */
  function belly(p0, p1, w, cls) {
    const mid = lerpP(p0, p1, 0.5), u = unit(ang(p0, p1)), n = [-u[1], u[0]];
    const c1 = add(mid, mul(n, w * 2)), c2 = add(mid, mul(n, -w * 2));
    return `<path class="${cls}" d="M${f(p0[0])} ${f(p0[1])}Q${f(c1[0])} ${f(c1[1])} ${f(p1[0])} ${f(p1[1])}Q${f(c2[0])} ${f(c2[1])} ${f(p0[0])} ${f(p0[1])}Z"/>`;
  }

  /* Clase de un músculo según si el ejercicio lo trabaja */
  function mc(hl, ...keys) {
    if (keys.some(k => hl.p.includes(k))) return 'fx-m fx-m-p';
    if (keys.some(k => hl.s.includes(k))) return 'fx-m fx-m-s';
    return 'fx-m';
  }

  /* Normal anterior de una extremidad (apunta hacia abajo desde la articulación) */
  const limbN = (a, b) => { const u = unit(ang(a, b)); return [u[1], -u[0]]; };
  const onSeg = (a, b, t0, t1, off, w, cls) => {
    const n = mul(limbN(a, b), off);
    return belly(add(lerpP(a, b, t0), n), add(lerpP(a, b, t1), n), w, cls);
  };
  const bones = segs =>
    segs.map(([a, b]) => line(a, b, 'fx-bone', 1.6)).join('') +
    segs.map(([a]) => circle(a, 2.2, 'fx-joint')).join('');

  /* ---- Vista lateral ---- */
  function torsoShape(hip, sh) {
    const F = frame(hip, sh);
    const P = (t, d) => add(lerpP(hip, sh, t), mul(F.front, d));
    return [P(-0.08, 10), P(0.3, 10.5), P(0.55, 12), P(0.78, 15.5), P(0.95, 12), P(1.05, 6),
      P(1.05, -7), P(0.92, -13.5), P(0.62, -12.5), P(0.38, -10), P(0.12, -13), P(-0.06, -16), P(-0.16, -9)];
  }

  function torsoMuscles(hip, sh, hl) {
    const F = frame(hip, sh);
    const P = (t, d) => add(lerpP(hip, sh, t), mul(F.front, d));
    return belly(P(0.14, -9.5), P(-0.16, -8.5), 6.2, mc(hl, 'glutes')) +
      belly(P(0.06, -6.5), P(0.44, -7), 2.6, mc(hl, 'lowerBack')) +
      belly(P(0.42, -8.2), P(0.86, -9.4), 4, mc(hl, 'lats')) +
      belly(P(0.8, -7.8), P(1.07, -3.2), 3.3, mc(hl, 'upperBack')) +
      belly(P(0.08, 6.8), P(0.56, 7.4), 2.7, mc(hl, 'abs')) +
      belly(P(0.6, 9.4), P(0.97, 8), 4.5, mc(hl, 'chest'));
  }

  function armMuscles(sh, el, ha, hl) {
    return onSeg(sh, el, 0.32, 0.9, -2.6, 3.4, mc(hl, 'triceps')) +
      onSeg(sh, el, 0.36, 0.88, 2.6, 3.2, mc(hl, 'biceps')) +
      onSeg(sh, el, -0.12, 0.36, -2.4, 3.2, mc(hl, 'rearDelt')) +
      onSeg(sh, el, -0.12, 0.36, 2.4, 3.2, mc(hl, 'frontDelt')) +
      onSeg(sh, el, -0.14, 0.32, 0, 2.8, mc(hl, 'sideDelt')) +
      onSeg(el, ha, 0.04, 0.62, 1.2, 3.1, mc(hl, 'forearm'));
  }

  function legMuscles(hip, kn, an, hl) {
    return onSeg(hip, kn, 0.14, 0.9, -3.6, 5, mc(hl, 'hams')) +
      onSeg(hip, kn, 0.08, 0.92, 3.6, 5.4, mc(hl, 'quads')) +
      onSeg(kn, an, 0.1, 0.78, 2.4, 1.8, 'fx-m') +
      onSeg(kn, an, 0.06, 0.58, -2.6, 4.3, mc(hl, 'calves'));
  }

  function sideFigure(sk, hl) {
    const F = frame(sk.hip, sk.sh);
    const tilt = sk.tilt || 0;
    const head = pt(sk.sh, F.a + tilt, L.NECK + L.HEAD);
    const neckEnd = pt(sk.sh, F.a + tilt, L.NECK + 5);
    const nose = add(head, mul(unit(F.a + tilt + 90), 12.5));
    const toe = sk.to || add(sk.an, [20, 6]);
    let s = '';
    // Extremidades del lado lejano: más tenues, detrás del cuerpo
    if (sk.kn2 || sk.el2) {
      const far = [];
      let fm = '';
      if (sk.kn2) {
        far.push({ l: [sk.hip, sk.kn2], w: 18 }, { l: [sk.kn2, sk.an2], w: 13 }, { l: [sk.an2, sk.to2 || add(sk.an2, [18, 6])], w: 7 });
        fm += legMuscles(sk.hip, sk.kn2, sk.an2, hl);
      }
      if (sk.el2) {
        far.push({ l: [sk.sh, sk.el2], w: 12 }, { l: [sk.el2, sk.ha2], w: 10 }, { c: sk.ha2, r: 5 });
        fm += armMuscles(sk.sh, sk.el2, sk.ha2, hl);
      }
      s += `<g class="fx-far">${silhouette(far)}${fm}</g>`;
    }
    // Torso, cabeza y pierna cercana como una sola silueta
    s += silhouette([
      { p: torsoShape(sk.hip, sk.sh) },
      { l: [sk.sh, neckEnd], w: 10 },
      { c: head, r: L.HEAD }, { c: nose, r: 3 },
      { l: [sk.hip, sk.kn], w: 19 }, { l: [sk.kn, sk.an], w: 14 }, { l: [sk.an, toe], w: 7.5 }
    ]);
    s += bones([[sk.hip, sk.sh], [sk.hip, sk.kn], [sk.kn, sk.an]]);
    s += torsoMuscles(sk.hip, sk.sh, hl) + legMuscles(sk.hip, sk.kn, sk.an, hl);
    // Brazo cercano, por delante del torso
    s += silhouette([{ l: [sk.sh, sk.el], w: 13 }, { l: [sk.el, sk.ha], w: 11 }, { c: sk.ha, r: 5.5 }], 'fx-arm');
    s += bones([[sk.sh, sk.el], [sk.el, sk.ha]]);
    s += armMuscles(sk.sh, sk.el, sk.ha, hl);
    return s;
  }

  /* ---- Vistas frontal, posterior y desde la cabecera ---- */
  function frontTorso(sk) {
    const h = sk.hipL[1] - sk.shL[1];
    const mh = lerpP(sk.hipL, sk.hipR, 0.5);
    return [add(sk.shL, [-3, -5]), add(sk.shR, [3, -5]), add(sk.shR, [1, h * 0.35]), add(sk.hipR, [2, -h * 0.3]),
      add(sk.hipR, [7, 4]), add(mh, [0, 10]), add(sk.hipL, [-7, 4]), add(sk.hipL, [-2, -h * 0.3]), add(sk.shL, [-1, h * 0.35])];
  }

  function frontMuscles(sk, hl) {
    const view = sk.view;
    const m = lerpP(sk.shL, sk.shR, 0.5);
    let s = '';
    if (view === 'head') {
      // Pectorales vistos desde la cabecera del banco
      const c = sk.torsoEllipse.c;
      return ellipse(add(c, [-15, -4]), 13, 6, mc(hl, 'chest')) + ellipse(add(c, [15, -4]), 13, 6, mc(hl, 'chest'));
    }
    const h = sk.hipL[1] - sk.shL[1];
    const mh = lerpP(sk.hipL, sk.hipR, 0.5);
    if (view === 'front') {
      s += belly(add(m, [0, -8]), add(sk.shL, [6, -3]), 2.3, mc(hl, 'upperBack')) +
        belly(add(m, [0, -8]), add(sk.shR, [-6, -3]), 2.3, mc(hl, 'upperBack'));
      s += ellipse(add(m, [-12.5, h * 0.2]), 12, 8, mc(hl, 'chest')) + ellipse(add(m, [12.5, h * 0.2]), 12, 8, mc(hl, 'chest'));
      for (let r = 0; r < 3; r++) {
        for (const dx of [-5.5, 5.5]) {
          s += `<rect class="${mc(hl, 'abs')}" x="${f(m[0] + dx - 4.5)}" y="${f(sk.shL[1] + h * (0.4 + r * 0.15))}" width="9" height="${f(h * 0.12)}" rx="3"/>`;
        }
      }
      s += belly(add(sk.shL, [6, h * 0.45]), add(sk.hipL, [0, -5]), 2.6, mc(hl, 'abs')) +
        belly(add(sk.shR, [-6, h * 0.45]), add(sk.hipR, [0, -5]), 2.6, mc(hl, 'abs'));
    } else {
      // Vista posterior
      s += poly([add(m, [0, -8]), add(sk.shR, [-4, 2]), add(m, [0, h * 0.55]), add(sk.shL, [4, 2])], mc(hl, 'upperBack'));
      s += belly(add(sk.shL, [3, h * 0.22]), add(sk.hipL, [3, -h * 0.22]), 4.6, mc(hl, 'lats')) +
        belly(add(sk.shR, [-3, h * 0.22]), add(sk.hipR, [-3, -h * 0.22]), 4.6, mc(hl, 'lats'));
      s += belly(add(m, [-4, h * 0.58]), add(mh, [-4, -2]), 2.4, mc(hl, 'lowerBack')) +
        belly(add(m, [4, h * 0.58]), add(mh, [4, -2]), 2.4, mc(hl, 'lowerBack'));
      if (sk.knL) s += ellipse(add(sk.hipL, [-2, 7]), 10.5, 9, mc(hl, 'glutes')) + ellipse(add(sk.hipR, [2, 7]), 10.5, 9, mc(hl, 'glutes'));
    }
    if (sk.knL && view === 'front') {
      s += belly(add(sk.hipL, [-4, -16]), add(sk.hipL, [-9, 6]), 2.6, mc(hl, 'gluteMed')) +
        belly(add(sk.hipR, [4, -16]), add(sk.hipR, [9, 6]), 2.6, mc(hl, 'gluteMed'));
    }
    if (sk.knL) {
      for (const [hp, kn, an] of [[sk.hipL, sk.knL, sk.anL], [sk.hipR, sk.knR, sk.anR]]) {
        s += view === 'front'
          ? onSeg(hp, kn, 0.1, 0.92, 0, 6, mc(hl, 'quads')) + onSeg(kn, an, 0.08, 0.6, 0, 3.6, mc(hl, 'calves'))
          : onSeg(hp, kn, 0.18, 0.9, 0, 5.6, mc(hl, 'hams')) + onSeg(kn, an, 0.06, 0.56, 0, 5, mc(hl, 'calves'));
      }
    }
    return s;
  }

  function frontArmMuscles(sk, hl) {
    let s = '';
    for (const [sh, el, ha] of [[sk.shL, sk.elL, sk.haL], [sk.shR, sk.elR, sk.haR]]) {
      s += onSeg(sh, el, 0.34, 0.88, 0, 3.5, sk.view === 'rear' ? mc(hl, 'triceps') : mc(hl, 'biceps')) +
        onSeg(el, ha, 0.05, 0.6, 0, 3, mc(hl, 'forearm')) +
        onSeg(sh, el, -0.16, 0.34, 0, 5.4, sk.view === 'rear' ? mc(hl, 'rearDelt', 'sideDelt') : mc(hl, 'frontDelt', 'sideDelt'));
    }
    return s;
  }

  function frontFigure(sk, hl) {
    const m = lerpP(sk.shL, sk.shR, 0.5);
    const body = [];
    if (sk.knL) {
      body.push(
        { l: [sk.hipL, sk.knL], w: 19 }, { l: [sk.knL, sk.anL], w: 14 }, { l: [sk.anL, add(sk.anL, [-11, 6])], w: 7.5 },
        { l: [sk.hipR, sk.knR], w: 19 }, { l: [sk.knR, sk.anR], w: 14 }, { l: [sk.anR, add(sk.anR, [11, 6])], w: 7.5 });
    }
    if (sk.torsoEllipse) body.push({ e: sk.torsoEllipse });
    else body.push({ p: frontTorso(sk) }, { l: [add(m, [0, -2]), add(sk.head, [0, 6])], w: 11 });
    body.push({ c: sk.head, r: L.HEAD });
    let s = silhouette(body);
    if (sk.knL) s += bones([[sk.hipL, sk.knL], [sk.knL, sk.anL], [sk.hipR, sk.knR], [sk.knR, sk.anR]]);
    s += frontMuscles(sk, hl);
    s += silhouette([
      { l: [sk.shL, sk.elL], w: 13 }, { l: [sk.elL, sk.haL], w: 11 }, { c: sk.haL, r: 5.5 },
      { l: [sk.shR, sk.elR], w: 13 }, { l: [sk.elR, sk.haR], w: 11 }, { c: sk.haR, r: 5.5 }
    ], 'fx-arm');
    s += bones([[sk.shL, sk.elL], [sk.elL, sk.haL], [sk.shR, sk.elR], [sk.elR, sk.haR]]);
    s += frontArmMuscles(sk, hl);
    return s;
  }

  /* ---------------------------------------------------------------------
     PRESETS RESUELTOS POR EJERCICIO (con caché)
     --------------------------------------------------------------------- */
  const cache = new Map();
  const DEFAULT_LABELS = {
    start: 'Posición inicial',
    ecc: 'Fase excéntrica',
    turn: 'Punto de transición',
    con: 'Fase concéntrica',
    end: 'Posición final'
  };
  const VIEW_LABELS = {
    side: 'Vista lateral',
    front: 'Vista frontal',
    rear: 'Vista posterior',
    head: 'Vista desde la cabecera del banco'
  };

  function resolve(ex) {
    if (cache.has(ex.id)) return cache.get(ex.id);
    const factory = PRESETS[ex.anim.preset];
    if (!factory) throw new Error('Preset de animación desconocido: ' + ex.anim.preset);
    const p = factory(ex.anim.opts || {});
    const resolved = {
      view: p.view || 'side',
      viewBox: p.viewBox || VB.normal,
      scene: p.scene || '',
      first: p.first || 'ecc',
      labels: { ...DEFAULT_LABELS, ...(p.labels || {}) },
      build: p.build,
      hl: { p: ex.anim.p || [], s: ex.anim.s || [] }
    };
    cache.set(ex.id, resolved);
    return resolved;
  }

  /* Dibuja el contenido dinámico (figura + equipamiento) para la posición t */
  function frameSVG(r, t) {
    const out = r.build(t);
    out.sk.view = r.view;
    const fig = r.view === 'side' ? sideFigure(out.sk, r.hl) : frontFigure(out.sk, r.hl);
    return (out.back || '') + fig + (out.front || '');
  }

  /* ---------------------------------------------------------------------
     LÍNEA DE TIEMPO
     5 fases: inicial, primer movimiento, transición, segundo movimiento,
     final. La excéntrica dura más que la concéntrica (bajada controlada).
     --------------------------------------------------------------------- */
  const DURATIONS = { start: 0.8, ecc: 2.0, turn: 0.6, con: 1.3, end: 0.8 };

  function phases(ex) {
    const r = resolve(ex);
    const order = r.first === 'ecc' ? ['start', 'ecc', 'turn', 'con', 'end'] : ['start', 'con', 'turn', 'ecc', 'end'];
    const pos = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
    let acc = 0;
    return order.map((key, i) => {
      const ph = { key, label: r.labels[key], dur: DURATIONS[key], t0: acc, from: pos[i][0], to: pos[i][1] };
      acc += ph.dur;
      return ph;
    });
  }

  const ease = x => -(Math.cos(Math.PI * x) - 1) / 2;

  /* ---------------------------------------------------------------------
     ANIMATOR: controla una animación en la página del ejercicio
     --------------------------------------------------------------------- */
  class Animator {
    constructor(host, ex, { onPhase, onState } = {}) {
      this.ex = ex;
      this.r = resolve(ex);
      this.phases = phases(ex);
      this.total = this.phases.reduce((s, p) => s + p.dur, 0);
      this.time = 0;
      this.speed = 1;
      this.playing = false;
      this.onPhase = onPhase || (() => {});
      this.onState = onState || (() => {});
      this.currentPhase = null;
      this._raf = null;
      this._last = 0;
      host.innerHTML =
        `<svg class="fx" viewBox="${this.r.viewBox}" role="img" aria-label="Animación del ejercicio ${ex.name}, ${VIEW_LABELS[this.r.view].toLowerCase()}">` +
        `<g class="fx-scene">${this.r.scene}</g><g class="fx-dyn"></g></svg>`;
      this.dyn = host.querySelector('.fx-dyn');
      this._tick = this._tick.bind(this);
      this.draw();
    }
    phaseAt(time) {
      for (const ph of this.phases) if (time < ph.t0 + ph.dur) return ph;
      return this.phases[this.phases.length - 1];
    }
    draw() {
      const ph = this.phaseAt(this.time);
      const local = Math.min(1, (this.time - ph.t0) / ph.dur);
      const t = lerp(ph.from, ph.to, ease(local));
      this.dyn.innerHTML = frameSVG(this.r, t);
      if (ph !== this.currentPhase) {
        this.currentPhase = ph;
        this.onPhase(ph);
      }
    }
    _tick(now) {
      if (!this.playing) return;
      const dt = Math.min(0.1, (now - this._last) / 1000);
      this._last = now;
      this.time = (this.time + dt * this.speed) % this.total;
      this.draw();
      this._raf = requestAnimationFrame(this._tick);
    }
    play() {
      if (this.playing) return;
      this.playing = true;
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
      this.onState(true);
    }
    pause() {
      this.playing = false;
      cancelAnimationFrame(this._raf);
      this.onState(false);
    }
    toggle() { this.playing ? this.pause() : this.play(); }
    restart() {
      this.time = 0;
      this.currentPhase = null;
      this.draw();
      this.play();
    }
    /* Salta al inicio de una fase y deja la animación en pausa allí */
    seek(key) {
      const ph = this.phases.find(p => p.key === key);
      if (!ph) return;
      this.pause();
      this.time = ph.t0 + (ph.from === ph.to ? ph.dur * 0.5 : 0.001);
      this.draw();
    }
    setSpeed(v) { this.speed = v; }
    destroy() { this.pause(); }
  }

  /* Miniatura estática para tarjetas */
  function thumbnail(ex, t = 0.55) {
    const r = resolve(ex);
    return `<svg class="fx fx-thumb" viewBox="${r.viewBox}" aria-hidden="true" focusable="false">` +
      `<g class="fx-scene">${r.scene}</g><g>${frameSVG(r, t)}</g></svg>`;
  }

  return {
    create: (host, ex, opts) => new Animator(host, ex, opts),
    thumbnail,
    phases,
    viewLabel: ex => VIEW_LABELS[resolve(ex).view],
    presets: Object.keys(PRESETS),
    /* Acceso interno para el motor 3D (animations3d.js) */
    _internal: {
      FLOOR, L, ease,
      resolve,
      /* Crea el preset de nuevo anotando la escena como objetos */
      capturePreset(ex) {
        const factory = PRESETS[ex.anim.preset];
        const { out, prims } = capture(() => factory(ex.anim.opts || {}));
        return { preset: out, scene: prims };
      },
      capture,
      frame, unit, pt, ang
    }
  };
})();
