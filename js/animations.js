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

  /* --------------------------- Primitivas SVG --------------------------- */
  const f = n => Math.round(n * 10) / 10;
  const line = (a, b, cls, w) =>
    `<line class="${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"${w ? ` stroke-width="${w}"` : ''}/>`;
  const circle = (c, r, cls) => `<circle class="${cls}" cx="${f(c[0])}" cy="${f(c[1])}" r="${r}"/>`;
  const rect = (x, y, w, h, cls, r = 3) =>
    `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}"/>`;
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}"/>`;
  const ellipse = (c, rx, ry, cls) => `<ellipse class="${cls}" cx="${f(c[0])}" cy="${f(c[1])}" rx="${rx}" ry="${ry}"/>`;

  /* --------------------------- Equipamiento --------------------------- */
  const EQ = {
    plate: (c, r = 24) => circle(c, r, 'fx-plate') + circle(c, Math.max(4, Math.round(r * 0.22)), 'fx-hub'),
    dbEnd: (c, r = 11) => circle(c, r, 'fx-plate') + circle(c, 3.5, 'fx-hub'),
    dbSide(c, a, len = 30) {
      const u = unit(a), n = [-u[1], u[0]];
      const p1 = add(c, mul(u, -len / 2)), p2 = add(c, mul(u, len / 2));
      return line(p1, p2, 'fx-bar', 5) +
        line(add(p1, mul(n, -10)), add(p1, mul(n, 10)), 'fx-plate-bar', 8) +
        line(add(p2, mul(n, -10)), add(p2, mul(n, 10)), 'fx-plate-bar', 8);
    },
    cable: (from, to) => line(from, to, 'fx-cable') + circle(from, 6, 'fx-pulley'),
    grip: c => circle(c, 4.5, 'fx-grip'),
    handle: (c, a = 90, len = 18) => {
      const u = unit(a);
      return line(add(c, mul(u, -len / 2)), add(c, mul(u, len / 2)), 'fx-bar', 6);
    },
    pad: (c, r = 8) => circle(c, r, 'fx-pad-dyn')
  };

  /* ------------------------ Elementos de escena ------------------------ */
  const SC = {
    floor: () => line([-60, FLOOR], [460, FLOOR], 'fx-floor', 2),
    bench: (x1, x2, top) =>
      rect(x1, top, x2 - x1, 10, 'fx-pad', 4) +
      line([x1 + 16, top + 10], [x1 + 16, FLOOR], 'fx-frame', 6) +
      line([x2 - 16, top + 10], [x2 - 16, FLOOR], 'fx-frame', 6),
    seat: (x1, x2, top) =>
      rect(x1, top, x2 - x1, 10, 'fx-pad', 4) +
      line([(x1 + x2) / 2, top + 10], [(x1 + x2) / 2, FLOOR], 'fx-frame', 7) +
      line([(x1 + x2) / 2 - 26, FLOOR - 2], [(x1 + x2) / 2 + 26, FLOOR - 2], 'fx-frame', 5),
    /* Respaldo paralelo al torso, desde t0 hasta t1 (fracciones del torso) */
    backPad(hip, sh, t0 = -0.1, t1 = 1.2, off = 15) {
      const F = frame(hip, sh);
      const base = add(hip, mul(F.back, off));
      return line(add(base, mul(F.u, L.T * t0)), add(base, mul(F.u, L.T * t1)), 'fx-pad', 11);
    },
    post: (x, y1, y2 = FLOOR, w = 7) => line([x, y1], [x, y2], 'fx-frame', w),
    stack: (x, y, w = 34, h = FLOOR - y) => {
      let s = rect(x, y, w, h, 'fx-stack', 3);
      for (let yy = y + 12; yy < y + h - 4; yy += 12) s += line([x + 3, yy], [x + w - 3, yy], 'fx-stack-line', 1);
      return s;
    },
    rack: x => line([x, 70], [x, FLOOR], 'fx-frame', 6) + line([x, 104], [x + 14, 104], 'fx-frame', 5)
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
    'row-barbell'() {
      const hip = [166, 168], sh = pt(hip, -35, L.T);
      const A = [233, 206], B = [197, 166];
      const legs = leg(hip, [205, 264], -1);
      return {
        scene: SC.floor(), first: 'con',
        labels: { con: 'Tirón', turn: 'Contracción', ecc: 'Descenso controlado' },
        build(t) {
          const { el, ha } = arm(sh, lerpP(A, B, t), 1);
          return { sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: [227, 270], tilt: -8 }, front: EQ.plate(ha, 21) };
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
    'row-seated'() {
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
    'overhead-ext'() {
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
          const front = o.equip === 'barbell' ? EQ.plate(ha, 22) : EQ.dbEnd(ha, 10);
          const tilt = seated ? 0 : -14 * Math.sin(Math.PI * Math.min(1, t * 1.6));
          return { sk: { hip, sh, el, ha, kn: legs.kn, an: legs.an, to: add(ankle, [22, 6]), tilt }, front };
        }
      };
    },

    /* Sentadilla con barra */
    squat() {
      const ankle = [205, 264];
      return {
        scene: SC.floor(), first: 'ecc',
        labels: { ecc: 'Descenso', turn: 'Posición inferior', con: 'Subida' },
        build(t) {
          const hip = lerpP([199, 151], [156, 212], t);
          const sh = pt(hip, lerp(-88, -52, t), L.T);
          const F = frame(hip, sh);
          const bar = add(add(sh, mul(F.back, 11)), mul(F.u, -4));
          const { el, ha } = arm(sh, add(bar, mul(F.front, 4)), -1);
          const { kn, an } = leg(hip, ankle, -1);
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
    lunge() {
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
          return { sk: { hip, sh, el, ha, kn, an, to: [227, 270] }, front: EQ.plate(ha, 21) };
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
    'hip-thrust'() {
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
    'calf-standing'() {
      const toe = [228, 250];
      const scene = SC.floor() + rect(212, 252, 52, 20, 'fx-block', 2) + SC.post(292, 70, FLOOR, 7);
      return {
        scene, first: 'ecc', viewBox: VB.wide,
        labels: { start: 'Talones arriba', ecc: 'Descenso del talón', turn: 'Estiramiento', con: 'Elevación' },
        build(t) {
          const an = pt(toe, lerp(222, 168, t), 22);
          const kn = [an[0] + 3, an[1] - 56], hip = [kn[0] - 3, kn[1] - 58];
          const sh = pt(hip, -90, L.T);
          const { el, ha } = arm(sh, pt(sh, 92, 84), 1);
          const support = arm(sh, [286, sh[1] + 40], 1);
          return {
            sk: { hip, sh, el, ha, kn, an, to: toe, el2: support.el, ha2: support.ha },
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
    'lateral-raise'() {
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
    'rear-raise'() {
      return {
        view: 'rear', scene: SC.floor(), first: 'con',
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
    'reverse-fly'() {
      const scene = SC.floor() + rect(190, 16, 20, 236, 'fx-frame-fill', 3) +
        rect(160, 172, 80, 11, 'fx-pad', 4) + SC.post(200, 183, FLOOR, 8);
      return {
        view: 'rear', scene, first: 'con',
        labels: { con: 'Apertura hacia atrás', turn: 'Brazos en línea con el torso', ecc: 'Regreso controlado' },
        build(t) {
          const b = { head: [200, 52], shL: [173, 82], shR: [227, 82], hipL: [186, 168], hipR: [214, 168] };
          const elR = lerpP([238, 96], [274, 86], t), haR = lerpP([214, 92], [314, 90], t);
          return {
            sk: { ...b, elR, haR, elL: mx(elR), haL: mx(haR) },
            front: EQ.handle(haR) + EQ.handle(mx(haR))
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

    /* Cruce de poleas (vista frontal) */
    crossover() {
      const pR = [372, 16], pL = mx(pR);
      const scene = SC.floor() + SC.post(386, 4) + SC.post(14, 4);
      return {
        view: 'front', scene, first: 'con',
        labels: { con: 'Cierre del arco', turn: 'Contracción', ecc: 'Apertura controlada' },
        build(t) {
          const b = frontBody();
          const target = pt(b.shR, lerp(6, 104, t), 82);
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
     MÚSCULOS RESALTADOS
     Cada músculo se dibuja como una banda paralela a un segmento del
     cuerpo, desplazada hacia su cara anterior (front) o posterior (back).
     --------------------------------------------------------------------- */
  const SIDE_MUSCLES = {
    chest: { seg: 'torso', side: 1, t: [0.62, 0.9], off: 6, w: 10 },
    abs: { seg: 'torso', side: 1, t: [0.15, 0.5], off: 6, w: 8 },
    lats: { seg: 'torso', side: -1, t: [0.42, 0.82], off: 6, w: 11 },
    upperBack: { seg: 'torso', side: -1, t: [0.82, 1.0], off: 5, w: 10 },
    lowerBack: { seg: 'torso', side: -1, t: [0.08, 0.4], off: 6, w: 8 },
    glutes: { seg: 'torso', side: -1, t: [-0.12, 0.06], off: 7, w: 14 },
    frontDelt: { joint: 'sh', side: 1, off: 5, r: 7 },
    sideDelt: { joint: 'sh', side: 0, off: 0, r: 8 },
    rearDelt: { joint: 'sh', side: -1, off: 5, r: 7 },
    biceps: { seg: 'upperArm', side: 1, t: [0.2, 0.85], off: 3, w: 7 },
    triceps: { seg: 'upperArm', side: -1, t: [0.12, 0.85], off: 3, w: 8 },
    forearm: { seg: 'forearm', side: 1, t: [0.08, 0.55], off: 2, w: 7 },
    quads: { seg: 'thigh', side: 1, t: [0.12, 0.88], off: 4, w: 9 },
    hams: { seg: 'thigh', side: -1, t: [0.12, 0.85], off: 4, w: 9 },
    calves: { seg: 'shin', side: -1, t: [0.1, 0.55], off: 4, w: 9 }
  };

  function segFor(sk, seg) {
    switch (seg) {
      case 'torso': return [sk.hip, sk.sh];
      case 'upperArm': return [sk.sh, sk.el];
      case 'forearm': return [sk.el, sk.ha];
      case 'thigh': return [sk.hip, sk.kn];
      case 'shin': return [sk.kn, sk.an];
    }
    return null;
  }

  /* Normal anterior de un segmento. El torso apunta hacia arriba (cadera →
     hombro) y las extremidades hacia abajo, por eso la rotación difiere. */
  function frontNormal(a, b, isTorso) {
    const u = unit(ang(a, b));
    return isTorso ? [-u[1], u[0]] : [u[1], -u[0]];
  }

  function sideMuscle(sk, key, cls) {
    const m = SIDE_MUSCLES[key];
    if (!m) return '';
    if (m.joint) {
      const n = frontNormal(sk.hip, sk.sh, true);
      return circle(add(sk[m.joint], mul(n, m.side * m.off)), m.r, cls);
    }
    const [a, b] = segFor(sk, m.seg);
    const n = mul(frontNormal(a, b, m.seg === 'torso'), m.side * m.off);
    return line(add(lerpP(a, b, m.t[0]), n), add(lerpP(a, b, m.t[1]), n), cls, m.w);
  }

  const TORSO_KEYS = ['chest', 'abs', 'lats', 'upperBack', 'lowerBack', 'glutes'];
  const LEG_KEYS = ['quads', 'hams', 'calves'];
  const ARM_KEYS = ['frontDelt', 'sideDelt', 'rearDelt', 'biceps', 'triceps', 'forearm'];

  function overlays(sk, hl, keys, fn) {
    let s = '';
    for (const k of hl.s) if (keys.includes(k)) s += fn(sk, k, 'fx-hl fx-hl-s');
    for (const k of hl.p) if (keys.includes(k)) s += fn(sk, k, 'fx-hl fx-hl-p');
    return s;
  }

  /* --------------------------- Figura lateral --------------------------- */
  function sideFigure(sk, hl) {
    const F = frame(sk.hip, sk.sh);
    const tilt = sk.tilt || 0;
    const neck = pt(sk.sh, F.a + tilt, L.NECK * 0.9);
    const head = pt(sk.sh, F.a + tilt, L.NECK + L.HEAD);
    const toe = sk.to || add(sk.an, [20, 6]);
    let s = '';
    // Extremidades lejanas (más oscuras, detrás del torso)
    if (sk.kn2) {
      s += line(sk.hip, sk.kn2, 'fx-far', 13) + line(sk.kn2, sk.an2, 'fx-far', 11) +
        line(sk.an2, sk.to2 || add(sk.an2, [18, 6]), 'fx-far', 7);
    }
    if (sk.el2) s += line(sk.sh, sk.el2, 'fx-far', 10) + line(sk.el2, sk.ha2, 'fx-far', 9) + circle(sk.ha2, 5, 'fx-far-fill');
    // Torso, cuello y cabeza
    s += line(sk.hip, sk.sh, 'fx-body', 24) + circle(sk.hip, 12, 'fx-body-fill') +
      line(sk.sh, neck, 'fx-body', 10) + circle(head, L.HEAD, 'fx-head');
    s += overlays(sk, hl, TORSO_KEYS, sideMuscle);
    // Pierna cercana
    s += line(sk.hip, sk.kn, 'fx-limb', 14) + line(sk.kn, sk.an, 'fx-limb', 12) + line(sk.an, toe, 'fx-limb', 8);
    s += overlays(sk, hl, LEG_KEYS, sideMuscle);
    // Brazo cercano
    s += line(sk.sh, sk.el, 'fx-limb', 11) + line(sk.el, sk.ha, 'fx-limb', 10) + circle(sk.ha, 5.5, 'fx-hand');
    s += overlays(sk, hl, ARM_KEYS, sideMuscle);
    return s;
  }

  /* ----------------------- Figura frontal / posterior ----------------------- */
  function frontMuscle(sk, key, cls) {
    const m = lerpP(sk.shL, sk.shR, 0.5);
    switch (key) {
      case 'chest':
        return ellipse(add(m, [-13, 17]), 12, 8, cls) + ellipse(add(m, [13, 17]), 12, 8, cls);
      case 'frontDelt': case 'sideDelt': case 'rearDelt':
        return circle(sk.shL, 9, cls) + circle(sk.shR, 9, cls);
      case 'upperBack':
        // En vista frontal solo se ve el trapecio superior, junto al cuello
        if (sk.view === 'front') {
          const neck = add(m, [0, -12]);
          return line(neck, add(sk.shL, [5, -2]), cls, 7) + line(neck, add(sk.shR, [-5, -2]), cls, 7);
        }
        return poly([add(sk.shL, [9, 3]), add(sk.shR, [-9, 3]), add(m, [9, 30]), add(m, [-9, 30])], cls);
      case 'lats':
        return poly([add(sk.shL, [6, 10]), add(m, [-6, 18]), add(sk.hipL, [2, -22])], cls) +
          poly([add(sk.shR, [-6, 10]), add(m, [6, 18]), add(sk.hipR, [-2, -22])], cls);
      case 'biceps': case 'triceps':
        return line(lerpP(sk.shL, sk.elL, 0.2), lerpP(sk.shL, sk.elL, 0.85), cls, 7) +
          line(lerpP(sk.shR, sk.elR, 0.2), lerpP(sk.shR, sk.elR, 0.85), cls, 7);
    }
    return '';
  }

  function frontFigure(sk, hl) {
    let s = '';
    if (sk.knL) {
      s += line(sk.hipL, sk.knL, 'fx-limb', 14) + line(sk.knL, sk.anL, 'fx-limb', 12) +
        line(sk.hipR, sk.knR, 'fx-limb', 14) + line(sk.knR, sk.anR, 'fx-limb', 12) +
        line(sk.anL, add(sk.anL, [-12, 6]), 'fx-limb', 8) + line(sk.anR, add(sk.anR, [12, 6]), 'fx-limb', 8);
    }
    const head = circle(sk.head, L.HEAD, 'fx-head');
    if (sk.headBehind) s += head;
    if (sk.torsoEllipse) {
      s += ellipse(sk.torsoEllipse.c, sk.torsoEllipse.rx, sk.torsoEllipse.ry, 'fx-torso');
    } else {
      const m = lerpP(sk.shL, sk.shR, 0.5);
      s += poly([sk.shL, sk.shR, sk.hipR, sk.hipL], 'fx-torso');
      if (!sk.headBehind) s += line(m, add(sk.head, [0, 8]), 'fx-body', 10);
    }
    s += overlays(sk, hl, ['chest', 'upperBack', 'lats'], frontMuscle);
    if (!sk.headBehind) s += head;
    // Brazos
    s += line(sk.shL, sk.elL, 'fx-limb', 11) + line(sk.elL, sk.haL, 'fx-limb', 10) + circle(sk.haL, 5.5, 'fx-hand') +
      line(sk.shR, sk.elR, 'fx-limb', 11) + line(sk.elR, sk.haR, 'fx-limb', 10) + circle(sk.haR, 5.5, 'fx-hand');
    s += overlays(sk, hl, ['frontDelt', 'sideDelt', 'rearDelt', 'biceps', 'triceps'], frontMuscle);
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
    presets: Object.keys(PRESETS)
  };
})();
