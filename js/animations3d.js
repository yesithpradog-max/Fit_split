/* =====================================================================
   FIT SPLIT · animations3d.js
   ---------------------------------------------------------------------
   Animaciones en 3D con three.js (incluido en assets/vendor).

   Cómo funciona:
   1. Reutiliza los patrones de movimiento de animations.js: cada preset
      calcula el esqueleto en 2D (vista lateral, frontal o posterior)
      y anota su escena y su equipamiento como objetos.
   2. Ese esqueleto se convierte a 3D: en la vista lateral se añade la
      anchura del cuerpo; en las vistas frontales la profundidad se
      reconstruye a partir de la longitud real de cada segmento.
   3. Sobre el esqueleto se monta un maniquí anatómico: piel de cristal
      transparente (solo se dibuja la superficie exterior, con brillo en
      los bordes), músculos con fibras, huesos y equipamiento.
   4. La cámara se puede girar arrastrando, acercar con la rueda o con
      dos dedos, y tiene ángulos predefinidos (lateral, frontal, 3/4...).

   Si el navegador no admite WebGL, se usa la animación 2D.
   ===================================================================== */

const Animations3D = (() => {
  'use strict';

  const T = window.THREE;
  const supported = (() => {
    if (!T || typeof Animations === 'undefined') return false;
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  })();
  if (!supported) return { supported: false };

  const { FLOOR, L, ease, resolve, capturePreset, capture, frame, pt, ang } = Animations._internal;
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const deg = Math.PI / 180;

  /* ------------------------- Medidas del cuerpo ------------------------- */
  const W = { sh: 22, el: 24, ha: 24, hip: 12, kn: 13, an: 13, toe: 15, wide: 31 };

  /* =====================================================================
     GEOMETRÍAS COMPARTIDAS
     ===================================================================== */

  /* Malla "loft": secciones superelípticas a lo largo del eje Y.
     sec: [y, radio lateral, radio anterior, desplazamiento anterior] */
  function loft(sections, { seg = 30, rings = 40, n = 2.25, unitY = false } = {}) {
    const ys = sections.map(s => s[0]);
    const y0 = ys[0], y1 = ys[ys.length - 1];
    const sample = y => {
      let i = 0;
      while (i < sections.length - 2 && y > sections[i + 1][0]) i++;
      const a = sections[Math.max(0, i - 1)], b = sections[i], c = sections[i + 1], d = sections[Math.min(sections.length - 1, i + 2)];
      const t = (y - b[0]) / ((c[0] - b[0]) || 1);
      const cr = k => {
        const p0 = a[k] ?? 0, p1 = b[k] ?? 0, p2 = c[k] ?? 0, p3 = d[k] ?? 0;
        const t2 = t * t, t3 = t2 * t;
        return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
      };
      return [Math.max(0.2, cr(1)), Math.max(0.2, cr(2)), cr(3), cr(4)];
    };
    const pos = [], uv = [], idx = [];
    for (let r = 0; r <= rings; r++) {
      const y = y0 + (y1 - y0) * (r / rings);
      const [rx, rz, zo, xo] = sample(y);
      for (let k = 0; k <= seg; k++) {
        const th = (k / seg) * Math.PI * 2;
        const c = Math.cos(th), s = Math.sin(th);
        const px = rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / n) + (xo || 0);
        const pz = rz * Math.sign(s) * Math.pow(Math.abs(s), 2 / n) + (zo || 0);
        pos.push(px, y, pz);
        uv.push(k / seg, r / rings);
      }
    }
    for (let r = 0; r < rings; r++) {
      for (let k = 0; k < seg; k++) {
        const a = r * (seg + 1) + k, b = a + seg + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  /* Limbs: la Y va de 0 a 1 (se escala con la longitud del segmento);
     los radios son absolutos. */
  const limbLoft = (secs, opts) => loft(secs, { ...opts, rings: 44 });
  let GEO = null;
  function geometries() {
    if (GEO) return GEO;
    GEO = {
      torso: loft([
        [-19, 1, 1, -1], [-16, 13, 9, -1.5], [-9, 21, 13.6, -2.2], [0, 22.8, 14, -1.4], [8, 21.6, 12.4, 0],
        [18, 18.6, 11.6, 0.6], [28, 19.4, 12.2, 1.2], [38, 21.6, 13.6, 1.8], [50, 23.4, 14.8, 2.2],
        [60, 24.6, 14.4, 1.6], [69, 25, 12.2, 0.2], [76, 21.5, 10, -1.2], [81, 14, 8.6, -1.6], [85, 8, 7, -1], [88, 1, 1, -1]
      ], { seg: 40, rings: 70, n: 2.35 }),
      neck: limbLoft([[-0.15, 4, 4], [0, 6, 6.2], [0.5, 5.3, 5.6, 0.4], [1, 5.6, 6], [1.15, 4, 4]]),
      upperArm: limbLoft([
        [-0.17, 1.5, 1.5], [-0.12, 6.4, 6.6], [0, 8.4, 8.6], [0.16, 7.8, 7.8, 0.2], [0.34, 6.3, 6.6, 0.4],
        [0.55, 5.9, 6.6, 0.7], [0.78, 5.2, 5.6, 0.3], [0.94, 4.6, 4.7], [1.05, 3.8, 3.8], [1.1, 0.6, 0.6]
      ]),
      forearm: limbLoft([
        [-0.08, 1, 1], [-0.04, 4.4, 4.2], [0.1, 5, 4.6, 0.2], [0.3, 4.9, 4.3, 0.4], [0.6, 3.9, 3.3],
        [0.88, 3.1, 2.4], [1, 2.9, 2.1], [1.05, 0.5, 0.5]
      ]),
      hand: limbLoft([[-0.05, 1, 1], [0, 2.8, 1.8], [0.2, 3.7, 1.9], [0.55, 4.1, 1.7], [0.85, 3.8, 1.5], [1, 3, 1.3], [1.06, 0.5, 0.5]], { n: 2.6 }),
      thigh: limbLoft([
        [-0.15, 1, 1], [-0.09, 9, 9], [0, 11, 10.8], [0.2, 10.3, 10.2, 0.6], [0.5, 8.7, 8.9, 0.9],
        [0.8, 7, 7.3, 0.6], [0.95, 6, 6.3], [1.04, 5.6, 5.9], [1.1, 1, 1]
      ]),
      shin: limbLoft([
        [-0.06, 1, 1], [-0.02, 5.5, 5.8], [0.1, 5.8, 6.3, -0.9], [0.28, 5.8, 6.7, -1.8], [0.5, 4.6, 4.9, -0.9],
        [0.75, 3.5, 3.6], [0.95, 3, 3.2], [1.03, 2.9, 3], [1.07, 0.5, 0.5]
      ]),
      foot: limbLoft([
        [-0.3, 0.6, 0.6, -0.5], [-0.24, 3.1, 3.3, -0.6], [0, 3.5, 4, 0], [0.4, 4.1, 3, -1], [0.75, 4.5, 2, -2],
        [1, 3.8, 1.5, -2.4], [1.06, 0.5, 0.5, -2.4]
      ], { n: 2.6 }),
      sphere: new T.SphereGeometry(1, 28, 20),
      muscle: (() => {
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const t = i / 16;
          pts.push(new T.Vector2(Math.max(0.04, Math.pow(Math.sin(Math.PI * t), 1.05)), t - 0.5));
        }
        return new T.LatheGeometry(pts, 22);
      })(),
      cyl: new T.CylinderGeometry(1, 1, 1, 22, 1),
      box: new T.BoxGeometry(1, 1, 1),
      rib: new T.TorusGeometry(1, 0.035, 6, 40)
    };
    return GEO;
  }

  /* =====================================================================
     MATERIALES
     ===================================================================== */
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#ffffff';
  const TONE_VAR = { push: '--push', pull: '--pull', legs: '--legs', upper: '--upper', full: '--full' };

  let fiberTex = null;
  function fiberTexture() {
    if (fiberTex) return fiberTex;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 64, 256);
    for (let x = 0; x < 64; x += 2) {
      const v = 200 + Math.floor(Math.random() * 55);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, 0, 1, 256);
    }
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, 'rgba(255,255,255,.55)'); grd.addColorStop(0.15, 'rgba(255,255,255,0)');
    grd.addColorStop(0.85, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(255,255,255,.55)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 256);
    fiberTex = new T.CanvasTexture(c);
    fiberTex.wrapS = fiberTex.wrapT = T.RepeatWrapping;
    fiberTex.repeat.set(3, 1);
    return fiberTex;
  }

  function materials(toneId) {
    const tone = new T.Color(css(TONE_VAR[toneId] || '--push'));
    const base = new T.Color('#a33244');
    const sec = base.clone().lerp(tone, 0.45);
    tone.lerp(new T.Color('#ffffff'), 0.08);
    const muscle = (color, emissive, ei) => new T.MeshStandardMaterial({
      color, map: fiberTexture(), roughness: 0.42, metalness: 0.08, emissive, emissiveIntensity: ei
    });
    const skinColor = new T.ShaderMaterial({
      uniforms: { uColor: { value: new T.Color('#4b6d96') }, uRim: { value: new T.Color('#dbe8ff') } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform vec3 uRim; varying vec3 vN; varying vec3 vV;
        void main(){ vec3 n = normalize(vN); vec3 v = normalize(vV); float ndv = abs(dot(n, v));
          float fr = pow(1.0 - ndv, 2.3);
          vec3 l = normalize(vec3(0.35, 0.8, 0.55)); vec3 h = normalize(l + v);
          float sp = pow(max(dot(n, h), 0.0), 48.0) * 0.4;
          vec3 col = mix(uColor, uRim, fr) + sp;
          gl_FragColor = vec4(col, clamp(0.1 + 0.85 * fr + sp, 0.0, 0.96)); }`,
      transparent: true, depthWrite: false, depthFunc: T.LessEqualDepth
    });
    return {
      muscle: muscle(base, new T.Color('#000000'), 0),
      muscleS: muscle(sec, sec, 0.18),
      muscleP: muscle(tone, tone, 0.38),
      plain: muscle(base.clone().multiplyScalar(0.85), new T.Color('#000000'), 0),

      flesh: new T.MeshStandardMaterial({ color: '#6e2a38', map: fiberTexture(), roughness: 0.6, transparent: true, opacity: 0.42, depthWrite: false }),
      fleshHead: new T.MeshStandardMaterial({ color: '#4d3a52', roughness: 0.65, transparent: true, opacity: 0.38, depthWrite: false }),
      skinDepth: new T.MeshBasicMaterial({ colorWrite: false, transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }),
      skinColor,
      metal: new T.MeshStandardMaterial({ color: '#a7b0bc', metalness: 0.55, roughness: 0.32 }),
      plate: new T.MeshStandardMaterial({ color: '#2a3038', metalness: 0.25, roughness: 0.55 }),
      plateRim: new T.MeshStandardMaterial({ color: '#4a5562', metalness: 0.4, roughness: 0.45 }),
      pad: new T.MeshStandardMaterial({ color: '#2f3946', roughness: 0.85 }),
      frame: new T.MeshStandardMaterial({ color: '#46505d', metalness: 0.45, roughness: 0.45 }),
      stack: new T.MeshStandardMaterial({ color: '#232a33', metalness: 0.3, roughness: 0.6 }),
      cable: new T.MeshBasicMaterial({ color: '#d4dce6' }),
      grip: new T.MeshStandardMaterial({ color: '#151a20', roughness: 0.9 })
    };
  }

  /* =====================================================================
     MÚSCULOS (posición en el sistema local de cada segmento)
     x: hacia fuera · y: a lo largo · z: hacia delante (anterior)
     tamaño: semiejes [lateral, largo, profundidad]
     --------------------------------------------------------------------- */
  const TORSO_MUSCLES = [
    ['chest', [11, 57.5, 12.2], [10.5, 8.6, 3.4], -24], ['chest', [-11, 57.5, 12.2], [10.5, 8.6, 3.4], 24],
    ['abs', [4.2, 41, 12.6], [3.6, 4.2, 1.6]], ['abs', [-4.2, 41, 12.6], [3.6, 4.2, 1.6]],
    ['abs', [4.2, 32, 12.4], [3.6, 4.2, 1.6]], ['abs', [-4.2, 32, 12.4], [3.6, 4.2, 1.6]],
    ['abs', [4.2, 23, 12.2], [3.6, 4.2, 1.6]], ['abs', [-4.2, 23, 12.2], [3.6, 4.2, 1.6]],
    ['abs', [4, 13.5, 12.3], [3.3, 4.4, 1.6]], ['abs', [-4, 13.5, 12.3], [3.3, 4.4, 1.6]],
    ['abs', [14.6, 24, 8.6], [4.4, 10, 2.6], 12], ['abs', [-14.6, 24, 8.6], [4.4, 10, 2.6], -12],
    ['lats', [15.6, 44, -7.4], [6.4, 17, 3.2], 18], ['lats', [-15.6, 44, -7.4], [6.4, 17, 3.2], -18],
    ['upperBack', [8.5, 76, -5.5], [7.5, 5.6, 3], -38], ['upperBack', [-8.5, 76, -5.5], [7.5, 5.6, 3], 38],
    ['upperBack', [0, 64, -11.4], [11.5, 9.5, 2.4]],
    ['lowerBack', [4.6, 22, -11.2], [3, 15, 2.6]], ['lowerBack', [-4.6, 22, -11.2], [3, 15, 2.6]],
    ['glutes', [9.6, -5, -11.4], [9, 10, 5.6]], ['glutes', [-9.6, -5, -11.4], [9, 10, 5.6]],
    ['gluteMed', [18, 4, -5], [4.5, 6.5, 3]], ['gluteMed', [-18, 4, -5], [4.5, 6.5, 3]],
    ['plain', [18, 50, 5], [2.6, 4.5, 1.8], 35], ['plain', [-18, 50, 5], [2.6, 4.5, 1.8], -35],
    ['plain', [18.5, 44, 5.5], [2.6, 4.5, 1.8], 35], ['plain', [-18.5, 44, 5.5], [2.6, 4.5, 1.8], -35],
    ['chest', [6, 51, 13.2], [6, 4.5, 2.4], -8], ['chest', [-6, 51, 13.2], [6, 4.5, 2.4], 8]
  ];
  /* Músculos de las extremidades: y en fracción de la longitud */
  const LIMB_MUSCLES = {
    upperArm: [
      ['frontDelt', [0.4, 0.07, 4.3], [3.6, 7.6, 3.2]], ['sideDelt', [4.6, 0.09, 0], [3.4, 8, 3.6]],
      ['rearDelt', [0.4, 0.07, -4.3], [3.6, 7.6, 3.2]], ['biceps', [0, 0.56, 3.3], [3.4, 12, 3.4]],
      ['triceps', [-1.3, 0.48, -3.4], [3.2, 15, 3.3]], ['triceps', [2.4, 0.4, -2.6], [2.6, 10, 2.6]]
    ],
    forearm: [['forearm', [0, 0.3, 1.7], [3, 11, 2.6]], ['forearm', [1.5, 0.3, -1.5], [2.8, 11, 2.4]]],
    thigh: [
      ['quads', [0, 0.46, 6.4], [4, 19, 3.2]], ['quads', [5.2, 0.5, 2.2], [4.4, 19, 4.2]], ['quads', [-4.6, 0.78, 3.2], [3.8, 8, 3.6]],
      ['hams', [2.4, 0.5, -6], [3.6, 19, 3.4]], ['hams', [-2.6, 0.5, -6], [3.4, 19, 3.2]], ['plain', [-6.2, 0.25, 0], [3.2, 12, 4.5]]
    ],
    shin: [
      ['calves', [-2.2, 0.28, -3.6], [3, 11, 3.2]], ['calves', [2.2, 0.26, -3.4], [2.6, 10, 2.8]],
      ['calves', [0, 0.55, -2.6], [3.6, 10, 2.2]], ['plain', [1.3, 0.38, 3.4], [1.6, 12, 1.5]]
    ]
  };

  /* =====================================================================
     MANIQUÍ
     ===================================================================== */
  function makeMesh(geo, mat, order = 0) {
    const m = new T.Mesh(geo, mat);
    m.renderOrder = order;
    return m;
  }
  /* Piel = dos mallas: una que solo escribe profundidad (para dibujar solo
     la superficie exterior) y otra de cristal con brillo en los bordes. */
  function skin(geo, M, inset = 0.84) {
    const g = new T.Group();
    const flesh = makeMesh(geo, M.flesh, 0);
    flesh.scale.set(inset, 1, inset);
    g.add(flesh, makeMesh(geo, M.skinDepth, 1), makeMesh(geo, M.skinColor, 2));
    return g;
  }

  function muscleMat(M, hl, key) {
    if (key === 'plain') return M.plain;
    if (hl.p.includes(key)) return M.muscleP;
    if (hl.s.includes(key)) return M.muscleS;
    return M.muscle;
  }

  function buildMannequin(M, hl) {
    const G = geometries();
    const root = new T.Group();
    const parts = {};

    // Torso
    const torso = new T.Group();
    torso.add(skin(G.torso, M, 0.87));
    for (const [key, p, s, rz] of TORSO_MUSCLES) {
      const m = makeMesh(G.muscle, muscleMat(M, hl, key));
      m.position.set(...p); m.scale.set(s[0] * 1.3, s[1] * 2.1, s[2] * 1.3);
      if (rz) m.rotation.z = rz * deg;
      torso.add(m);
    }
    root.add(torso);
    parts.torso = torso;

    // Cabeza y cuello
    const head = new T.Group();
    const cran = makeMesh(G.sphere, M.skinDepth, 1); const cranC = makeMesh(G.sphere, M.skinColor, 2);
    for (const m of [cran, cranC]) { m.scale.set(9.6, 11.6, 10.8); head.add(m); }
    const addHead = (pos, sc) => {
      for (const mat of [[M.skinDepth, 1], [M.skinColor, 2]]) {
        const m = makeMesh(G.sphere, mat[0], mat[1]); m.position.set(...pos); m.scale.set(...sc); head.add(m);
      }
    };
    addHead([0, -5.5, 4], [7.4, 7.6, 7.4]);   // cara y mandíbula
    addHead([0, -1, 10.4], [1.6, 2.8, 2.4]);  // nariz
    addHead([9.4, -0.5, -0.5], [1.5, 3.3, 2.3]); addHead([-9.4, -0.5, -0.5], [1.5, 3.3, 2.3]); // orejas
    const core = makeMesh(G.sphere, M.fleshHead); core.scale.set(8.6, 10.4, 9.6); head.add(core);
    const jaw = makeMesh(G.sphere, M.fleshHead); jaw.scale.set(6.5, 6.7, 6.5); jaw.position.set(0, -5.5, 4); head.add(jaw);
    root.add(head);
    parts.head = head;
    const neck = new T.Group(); neck.add(skin(G.neck, M)); root.add(neck); parts.neck = neck;

    // Extremidades: cada segmento es un grupo con piel, músculos y hueso
    const limb = (geo, musclesKey, side, boneR) => {
      const g = new T.Group();
      const sk = skin(geo, M);
      g.add(sk);
      const bone = new T.Object3D(); g.add(bone);
      const list = [];
      for (const [key, p, s] of (LIMB_MUSCLES[musclesKey] || [])) {
        const m = makeMesh(G.muscle, muscleMat(M, hl, key));
        m.scale.set(s[0] * 1.35, s[1] * 2.15, s[2] * 1.3);
        list.push({ m, p });
        g.add(m);
      }
      root.add(g);
      return { g, sk, bone, list, side };
    };
    for (const side of ['L', 'R']) {
      parts['ua' + side] = limb(G.upperArm, 'upperArm', side, 1.5);
      parts['fa' + side] = limb(G.forearm, 'forearm', side, 1.2);
      parts['hand' + side] = limb(G.hand, null, side, 0.01);
      parts['th' + side] = limb(G.thigh, 'thigh', side, 1.9);
      parts['sh' + side] = limb(G.shin, 'shin', side, 1.5);
      parts['foot' + side] = limb(G.foot, null, side, 0.01);
    }
    return { root, parts };
  }

  /* Coloca un cilindro unitario entre a y b */
  const UP = V(0, 1, 0);
  function placeCyl(mesh, a, b, r) {
    const d = V().subVectors(b, a);
    const len = d.length() || 0.001;
    mesh.position.copy(a).addScaledVector(d, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, d.normalize());
    mesh.scale.set(r, len, r);
  }

  const _m = new T.Matrix4();
  /* Orienta un grupo con ejes x (lateral), y (dirección), z (anterior) */
  function orient(obj, origin, y, z) {
    const x = V().crossVectors(y, z).normalize();
    const zz = V().crossVectors(x, y).normalize();
    _m.makeBasis(x, y, zz);
    obj.position.copy(origin);
    obj.quaternion.setFromRotationMatrix(_m);
  }
  /* Componente de v perpendicular a d (normalizada) o null */
  function perp(v, d) {
    const p = v.clone().addScaledVector(d, -v.dot(d));
    return p.lengthSq() > 1e-4 ? p.normalize() : null;
  }

  /* Coloca un segmento de extremidad: dirección, cara anterior y lado */
  function placeLimb(part, a, b, ant, len, ref) {
    const d = V().subVectors(b, a);
    const L0 = len || d.length();
    d.normalize();
    orient(part.g, a, d, ant);
    part.sk.scale.set(1, L0, 1);
    part.bone.position.set(0, L0 / 2, 0);
    part.bone.scale.y = L0;
    // Hacia fuera: signo del eje x local respecto a la referencia del lado
    const lx = V(1, 0, 0).applyQuaternion(part.g.quaternion);
    const out = ref ? (lx.dot(ref) >= 0 ? 1 : -1) : 1;
    for (const { m, p } of part.list) m.position.set(p[0] * out, p[1] * L0, p[2]);
  }

  /* Cara anterior de un segmento a partir de la flexión de la articulación */
  function anteriorOf(d, bendVec, sign, fallbacks) {
    if (bendVec) {
      const p = perp(bendVec, d);
      if (p && bendVec.clone().normalize().cross(d).length() > 0.22) return p.multiplyScalar(sign);
    }
    for (const f of fallbacks) { const p = perp(f, d); if (p) return p; }
    return perp(V(0, 0, 1), d) || V(1, 0, 0);
  }

  function poseMannequin(man, J) {
    const P = man.parts;
    const up = V().subVectors(J.shC, J.hipC).normalize();
    const fwd = perp(J.fwd, up) || V(0, 0, 1);
    orient(P.torso, J.hipC, up, fwd);
    // Torso de longitud variable (vistas frontales): se escala solo en altura
    P.torso.scale.set(1, J.hipC.distanceTo(J.shC) / L.T, 1);

    // Cuello y cabeza
    const headUp = J.headUp.clone().normalize();
    orient(P.neck.g || P.neck, J.shC.clone().addScaledVector(up, -2), headUp, perp(J.face, headUp) || fwd);
    P.neck.children[0].scale.set(1, L.NECK + 6, 1);
    orient(P.head, J.head, headUp, perp(J.face, headUp) || fwd);

    const lat = V().crossVectors(up, fwd).normalize();
    for (const s of ['L', 'R']) {
      const ref = lat.clone().multiplyScalar(s === 'R' ? 1 : -1);
      const refArm = ref.clone().addScaledVector(up, 0.5);
      const sh = J['sh' + s], el = J['el' + s], ha = J['ha' + s];
      const hip = J['hip' + s], kn = J['kn' + s], an = J['an' + s], to = J['to' + s];
      const dUA = V().subVectors(el, sh).normalize(), dFA = V().subVectors(ha, el).normalize();
      const dTH = V().subVectors(kn, hip).normalize(), dSH = V().subVectors(an, kn).normalize();
      // Brazo: el bíceps mira hacia el antebrazo cuando el codo se flexiona
      const antUA = anteriorOf(dUA, dFA, 1, [fwd, up]);
      placeLimb(P['ua' + s], sh, el, antUA, 0, refArm);
      const antFA = anteriorOf(dFA, dUA.clone().negate(), 1, [antUA, fwd]);
      const wrist = ha.clone().addScaledVector(dFA, -4.5);
      placeLimb(P['fa' + s], el, wrist, antFA, 0, refArm);
      placeLimb(P['hand' + s], wrist, wrist.clone().addScaledVector(dFA, 13), antFA, 13);
      // Pierna: el cuádriceps mira al lado contrario de la flexión de la rodilla
      const antTH = anteriorOf(dTH, dSH, -1, [fwd, up]);
      placeLimb(P['th' + s], hip, kn, antTH, 0, ref);
      const antSH = anteriorOf(dSH, dTH.clone().negate(), -1, [antTH, fwd]);
      placeLimb(P['sh' + s], kn, an, antSH, 0, ref);
      const dFT = V().subVectors(to, an);
      const footLen = Math.max(12, dFT.length());
      placeLimb(P['foot' + s], an, to, perp(dSH.clone().negate(), dFT.clone().normalize()) || up, footLen);
    }
  }

  /* =====================================================================
     DE 2D A 3D
     ===================================================================== */
  const near2 = (p, q, r) => p && q && Math.hypot(p[0] - q[0], p[1] - q[1]) < r;
  const segDist = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  /* Profundidad que falta a un segmento proyectado para tener su longitud */
  const recon = (a, b, len) => {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return d >= len * 0.9 ? 0 : Math.sqrt(len * len - d * d);
  };

  function jointsSide(sk, prims) {
    const S = (p, x = 0) => V(x, FLOOR - p[1], p[0] - 200);
    const wide = prims.some(q => q.type === 'plate' && (near2(q.c, sk.ha, 34) || near2(q.c, sk.sh, 26)));
    const hw = wide ? W.wide : W.ha, ew = wide ? W.wide + 2 : W.el;
    const F = frame(sk.hip, sk.sh);
    const tilt = sk.tilt || 0;
    const head2 = pt(sk.sh, F.a + tilt, L.NECK + L.HEAD);
    const ha2 = pt(sk.sh, F.a + tilt, 10);
    const nose = pt([0, 0], F.a + tilt + 90, 1);
    const J = {
      view: 'side', mirrored: !sk.el2,
      hipC: S(sk.hip), shC: S(sk.sh), head: S(head2),
      headUp: V().subVectors(S(head2), S(ha2)),
      face: V(0, -nose[1], nose[0]), fwd: V(0, -F.front[1], F.front[0]),
      hands2: [sk.ha, sk.ha2 || sk.ha], wideGrip: wide
    };
    const toe = sk.to || [sk.an[0] + 20, sk.an[1] + 6];
    // Lado cercano (-X)
    Object.assign(J, {
      shL: S(sk.sh, -W.sh), elL: S(sk.el, -ew), haL: S(sk.ha, -hw),
      hipL: S(sk.hip, -W.hip), knL: S(sk.kn, -W.kn), anL: S(sk.an, -W.an), toL: S(toe, -W.toe)
    });
    // Lado lejano (+X): explícito o simétrico
    const el2 = sk.el2 || sk.el, ha2b = sk.ha2 || sk.ha, kn2 = sk.kn2 || sk.kn, an2 = sk.an2 || sk.an;
    const to2 = sk.to2 || (sk.kn2 ? [an2[0] + 18, an2[1] + 6] : toe);
    Object.assign(J, {
      shR: S(sk.sh, W.sh), elR: S(el2, ew), haR: S(ha2b, sk.ha2 ? W.ha : hw),
      hipR: S(sk.hip, W.hip), knR: S(kn2, W.kn), anR: S(an2, W.an), toR: S(to2, W.toe)
    });
    J.legsMirrored = !sk.kn2;
    return J;
  }

  function jointsFront(sk, view) {
    const X = p => p[0] - 200, Y = p => FLOOR - p[1];
    const hipL2 = sk.hipL, hipR2 = sk.hipR, shL2 = sk.shL, shR2 = sk.shR;
    const hm = [(hipL2[0] + hipR2[0]) / 2, (hipL2[1] + hipR2[1]) / 2], sm = [(shL2[0] + shR2[0]) / 2, (shL2[1] + shR2[1]) / 2];
    const shZ = recon(hm, sm, L.T);
    const J = { view, mirrored: true, legsMirrored: true };
    J.hipL = V(X(hipL2) * 0.86, Y(hipL2), 0); J.hipR = V(X(hipR2) * 0.86, Y(hipR2), 0);
    J.shL = V(X(shL2) * 0.82, Y(shL2), shZ); J.shR = V(X(shR2) * 0.82, Y(shR2), shZ);
    J.hipC = V().addVectors(J.hipL, J.hipR).multiplyScalar(0.5);
    J.shC = V().addVectors(J.shL, J.shR).multiplyScalar(0.5);
    const up = V().subVectors(J.shC, J.hipC).normalize();
    J.fwd = perp(V(0, 0, 1), up) || V(0, 0, 1);
    J.head = J.shC.clone().addScaledVector(up, L.NECK + L.HEAD);
    J.headUp = up.clone(); J.face = J.fwd.clone();
    for (const s of ['L', 'R']) {
      const sh2 = sk['sh' + s], el2 = sk['el' + s], ha2 = sk['ha' + s];
      const sh3 = J['sh' + s];
      const dx = sh3.x - X(sh2);
      const elZ = sh3.z + recon(sh2, el2, L.UA);
      J['el' + s] = V(X(el2) + dx, Y(el2), elZ);
      J['ha' + s] = V(X(ha2) + dx, Y(ha2), elZ + recon(el2, ha2, L.FA));
      if (sk['kn' + s]) {
        const hip2 = sk['hip' + s], kn2 = sk['kn' + s], an2 = sk['an' + s];
        const hdx = J['hip' + s].x - X(hip2);
        const knZ = recon(hip2, kn2, L.TH);
        J['kn' + s] = V(X(kn2) + hdx, Y(kn2), knZ);
        J['an' + s] = V(X(an2) + hdx, Y(an2), knZ - recon(kn2, an2, L.SH) * (knZ > 20 ? 0.15 : 1));
      } else {
        // Sentado sin piernas en el dibujo: muslos hacia delante
        J['kn' + s] = J['hip' + s].clone().add(V(0, -5, L.TH - 2));
        J['an' + s] = J['kn' + s].clone().add(V(0, -L.SH + 2, 4));
      }
      J['to' + s] = J['an' + s].clone().add(V(0, -4, 15));
    }
    J.hands2 = [sk.haL, sk.haR];
    J.anchors = [[sk.haL, J.haL.z], [sk.haR, J.haR.z]];
    if (sk.knL) J.anchors.push([sk.knL, J.knL.z], [sk.knR, J.knR.z]);
    return J;
  }

  /* Aperturas: tumbado boca arriba, visto desde la cabecera del banco */
  function jointsHead(sk) {
    const J = { view: 'head', mirrored: true, legsMirrored: true };
    const shY = FLOOR - sk.shR[1];
    J.shL = V(-24, shY, 0); J.shR = V(24, shY, 0);
    J.shC = V(0, shY, 0);
    J.hipL = V(-12, shY - 2, -L.T); J.hipR = V(12, shY - 2, -L.T);
    J.hipC = V(0, shY - 2, -L.T);
    J.fwd = V(0, 1, 0);
    J.head = V(0, shY + 1, L.NECK + L.HEAD); J.headUp = V(0, 0.08, 1); J.face = V(0, 1, 0);
    for (const [s, sign] of [['L', -1], ['R', 1]]) {
      const sh2 = sk['sh' + s], el2 = sk['el' + s], ha2 = sk['ha' + s];
      const sh3 = J['sh' + s];
      const m = p => V(sh3.x + (p[0] - sh2[0]), sh3.y - (p[1] - sh2[1]), 0);
      J['el' + s] = m(el2); J['ha' + s] = m(ha2);
      const hip = J['hip' + s];
      J['kn' + s] = hip.clone().add(V(sign * 4, -30, -49));
      J['an' + s] = J['kn' + s].clone().add(V(sign * 2, -44, 34));
      J['to' + s] = J['an' + s].clone().add(V(0, -5, -14));
    }
    J.hands2 = [sk.haL, sk.haR];
    J.anchors = [[sk.haL, 0], [sk.haR, 0]];
    return J;
  }

  function joints3D(view, sk, prims) {
    if (view === 'side') return jointsSide(sk, prims);
    if (view === 'head') return jointsHead(sk);
    return jointsFront(sk, view);
  }

  /* =====================================================================
     EQUIPAMIENTO: de los objetos anotados en 2D a formas 3D
     Cada forma: { k: 'cyl'|'box'|'sph', a, b, r | w,t,side, mat }
     ===================================================================== */
  function shapesFor(prims, J, dynamic) {
    const out = [];
    const view = J.view;
    const side = view === 'side';
    const Yf = p => FLOOR - p[1];
    // Punto 2D → 3D según la vista
    const zNear = p => {
      if (!J.anchors) return 0;
      for (const [q, z] of J.anchors) if (near2(p, q, 20)) return z;
      return 0;
    };
    const P3 = (p, x = 0) => (side ? V(x, Yf(p), p[0] - 200) : view === 'head' ? V(p[0] - 200, Yf(p), x) : V(p[0] - 200, Yf(p), x || zNear(p)));
    const EXT = side ? V(1, 0, 0) : V(0, 0, 1);  // eje perpendicular al dibujo
    const cyl = (a, b, r, mat) => out.push({ k: 'cyl', a, b, r, mat });
    const box = (a, b, w, t, mat, sideAxis = EXT) => out.push({ k: 'box', a, b, w, t, mat, side: sideAxis });
    const sph = (c, r, mat) => out.push({ k: 'sph', a: c, r, mat });
    const along = (c, len) => [c.clone().addScaledVector(EXT, -len / 2), c.clone().addScaledVector(EXT, len / 2)];
    // Manos 3D que corresponden a un punto 2D
    const handsAt = (p, r = 24) => {
      const res = [];
      if (J.hands2 && near2(p, J.hands2[0], r)) res.push(J.haL);
      if (J.hands2 && near2(p, J.hands2[1], r) && (J.mirrored || !side)) res.push(J.haR);
      if (!res.length && J.hands2 && near2(p, J.hands2[1], r)) res.push(J.haR);
      return res;
    };
    const dumbbell = (c, axis, len = 28) => {
      const a = c.clone().addScaledVector(axis, -len / 2), b = c.clone().addScaledVector(axis, len / 2);
      cyl(a, b, 1.7, 'metal');
      for (const [p, s] of [[a, 1], [b, -1]]) {
        cyl(p.clone().addScaledVector(axis, s * 1), p.clone().addScaledVector(axis, s * 6), 8.6, 'plate');
      }
    };
    const barbell = (c, r, len) => {
      const [a, b] = side ? along(c, len) : [c.clone().add(V(-len / 2, 0, 0)), c.clone().add(V(len / 2, 0, 0))];
      const axis = V().subVectors(b, a).normalize();
      cyl(a, b, 1.9, 'metal');
      for (const [p, s] of [[a, 1], [b, -1]]) {
        const inner = p.clone().addScaledVector(axis, s * 14);
        cyl(inner, inner.clone().addScaledVector(axis, s * 5), r, 'plate');
        cyl(inner.clone().addScaledVector(axis, s * 5), inner.clone().addScaledVector(axis, s * 9), r * 0.78, 'plateRim');
        cyl(inner.clone().addScaledVector(axis, -s * 1.5), inner, 3, 'metal');
      }
    };
    const dupAtHands = (a2, b2, w, mat) => {
      if (side) {
        for (const x of [-(J.wideGrip ? W.wide : W.ha), J.wideGrip ? W.wide : W.ha]) cyl(P3(a2, x), P3(b2, x), w / 2, mat);
      } else cyl(P3(a2), P3(b2), w / 2, mat);
    };
    const nearHandLine = (a, b) => J.hands2 && J.hands2.some(h => h && segDist(h, a, b) < 9);
    const frameLines = [];

    for (const q of prims) {
      switch (q.type) {
        case 'floor': break;
        case 'bench': {
          const y = Yf([0, q.top]);
          if (side) {
            box(V(0, y - 5, q.x1 - 200), V(0, y - 5, q.x2 - 200), 28, 10, 'pad');
            for (const x of [q.x1 + 16, q.x2 - 16]) {
              cyl(V(0, 0, x - 200), V(0, y - 10, x - 200), 3, 'frame');
              cyl(V(-16, 2, x - 200), V(16, 2, x - 200), 2.4, 'frame');
            }
          } else {
            box(V(0, y - 5, 30), V(0, y - 5, -120), q.x2 - q.x1, 10, 'pad', V(1, 0, 0));
          }
          break;
        }
        case 'seat': {
          const y = Yf([0, q.top]), cx = (q.x1 + q.x2) / 2;
          if (side) {
            box(V(0, y - 5, q.x1 - 200), V(0, y - 5, q.x2 - 200), 32, 10, 'pad');
            cyl(V(0, 0, cx - 200), V(0, y - 10, cx - 200), 3.5, 'frame');
            cyl(V(-26, 2, cx - 200), V(26, 2, cx - 200), 2.4, 'frame');
            cyl(V(0, 2, cx - 226), V(0, 2, cx - 174), 2.4, 'frame');
          } else {
            box(V(cx - 200, y - 5, -14), V(cx - 200, y - 5, 30), q.x2 - q.x1, 10, 'pad', V(1, 0, 0));
          }
          break;
        }
        case 'pad': box(P3(q.a), P3(q.b), 30, q.w, 'pad'); break;
        case 'post': {
          const a = [q.x, q.y1], b = [q.x, q.y2];
          if (side) frameLines.push({ a, b, w: q.w });
          else cyl(P3(a), P3(b), q.w / 2, 'frame');
          break;
        }
        case 'stack': {
          const c1 = [q.x + q.w / 2, q.y], c2 = [q.x + q.w / 2, q.y + q.h];
          box(P3(c1), P3(c2), side ? 30 : q.w, side ? q.w : 26, 'stack');
          break;
        }
        case 'rack': {
          for (const x of [-44, 44]) {
            if (side) { cyl(V(x, 0, q.x - 200), V(x, FLOOR - 70, q.x - 200), 3, 'frame'); cyl(V(x, FLOOR - 104, q.x - 200), V(x, FLOOR - 104, q.x - 186), 2.4, 'frame'); }
          }
          break;
        }
        case 'plate': {
          const c = P3(q.c);
          barbell(c, q.r, near2(q.c, J.hands2 && J.hands2[0], 40) || side ? 150 : 110);
          break;
        }
        case 'db-end': case 'db-side': {
          const hands = dynamic ? handsAt(q.c) : [];
          const axis = q.type === 'db-end'
            ? (view === 'head' ? V(0, 0, 1) : EXT.clone())
            : (side ? V(0, -Math.sin(q.a * deg), Math.cos(q.a * deg)) : V(Math.cos(q.a * deg), -Math.sin(q.a * deg), 0));
          if (hands.length) hands.forEach(h => dumbbell(h, axis, q.type === 'db-side' ? q.len : 26));
          else dumbbell(P3(q.c), axis, 26);
          break;
        }
        case 'grip': {
          const hands = handsAt(q.c);
          if (side && J.mirrored && hands.length) {
            const c = P3(q.c);
            const w = (J.wideGrip ? W.wide : W.ha) + 10;
            cyl(c.clone().add(V(-w, 0, 0)), c.clone().add(V(w, 0, 0)), 1.8, 'metal');
            cyl(c.clone().add(V(-w + 2, 0, 0)), c.clone().add(V(-w + 12, 0, 0)), 2.6, 'grip');
            cyl(c.clone().add(V(w - 12, 0, 0)), c.clone().add(V(w - 2, 0, 0)), 2.6, 'grip');
          } else (hands.length ? hands : [P3(q.c)]).forEach(h => sph(h, 3.4, 'grip'));
          break;
        }
        case 'handle': {
          const axis = side ? V(0, -Math.sin(q.a * deg), Math.cos(q.a * deg)) : V(Math.cos(q.a * deg), -Math.sin(q.a * deg), 0);
          const hands = handsAt(q.c);
          (hands.length ? hands : [P3(q.c)]).forEach(h => {
            cyl(h.clone().addScaledVector(axis, -q.len / 2), h.clone().addScaledVector(axis, q.len / 2), 2.4, 'grip');
          });
          break;
        }
        case 'roller': {
          const c = side ? P3(q.c) : P3(q.c);
          const [a, b] = along(c, side ? 40 : 14);
          cyl(a, b, q.r, 'pad');
          break;
        }
        case 'cable': {
          const from = P3(q.from);
          let to = P3(q.to);
          const hands = handsAt(q.to, 26);
          if (hands.length && (!side || !J.mirrored)) to = hands[0];
          cyl(from, to, 0.55, 'cable');
          const [a, b] = along(from, 3);
          cyl(a, b, 5, 'frame');
          break;
        }
        case 'line': {
          const { a, b, cls, w } = q;
          if (cls === 'fx-frame') {
            if (side) frameLines.push({ a, b, w });
            else cyl(P3(a), P3(b), w / 2, 'frame');
          } else if (cls === 'fx-lever') {
            if (side && nearHandLine(a, b)) dupAtHands(a, b, w, 'frame');
            else cyl(P3(a, side ? 26 : 0), P3(b, side ? 26 : 0), w / 2, 'frame');
          } else if (cls === 'fx-pad') box(P3(a), P3(b), 30, w, 'pad');
          else if (cls === 'fx-pad-line') box(P3(a), P3(b), 36, w, 'pad');
          else if (cls === 'fx-plate-bar') box(P3(a), P3(b), 46, w, 'plate');
          break;
        }
        case 'rect': {
          const { x, y, w, h, cls } = q;
          const c1 = [x + w / 2, y], c2 = [x + w / 2, y + h];
          const horiz = w > h;
          const a = horiz ? [x, y + h / 2] : c1, b = horiz ? [x + w, y + h / 2] : c2;
          const thick = horiz ? h : w;
          if (cls === 'fx-pad') {
            if (side) box(P3(a), P3(b), 30, thick, 'pad');
            else box(V(x + w / 2 - 200, FLOOR - y - h / 2, -12), V(x + w / 2 - 200, FLOOR - y - h / 2, 28), w, h, 'pad', V(1, 0, 0));
          } else if (cls === 'fx-frame-fill') {
            if (side) box(P3(a), P3(b), 38, thick, 'frame');
            else {
              const z = view === 'rear' ? 18 : -17;
              box(V(x + w / 2 - 200, FLOOR - y, z), V(x + w / 2 - 200, FLOOR - y - h, z), w, 8, 'pad', V(1, 0, 0));
            }
          } else if (cls === 'fx-block') box(P3(a), P3(b), 50, thick, 'frame');
          else if (cls === 'fx-stack') box(P3(a), P3(b), 26, thick, 'stack');
          break;
        }
        case 'circle': {
          const { c, r, cls } = q;
          if (cls === 'fx-pivot') { const [a, b] = along(P3(c), 44); cyl(a, b, 3.2, 'metal'); }
          else if (cls === 'fx-pad-dyn') { const [a, b] = along(P3(c), 36); cyl(a, b, r, 'pad'); }
          else if (cls === 'fx-bar-end') { const [a, b] = along(P3(c), 120); cyl(a, b, 2.2, 'metal'); }
          else if (cls === 'fx-strap') sph(P3(c, side ? -W.an : 0), r, 'grip');
          break;
        }
        default: break;
      }
    }
    // Barras del armazón (vista lateral): junto a las manos van duplicadas
    if (side) {
      const dup = frameLines.filter(l => nearHandLine(l.a, l.b));
      for (const l of frameLines) {
        const onDup = dup.includes(l) || dup.some(d => segDist(l.a, d.a, d.b) < 6 || segDist(l.b, d.a, d.b) < 6);
        if (onDup) dupAtHands(l.a, l.b, l.w, 'frame');
        else cyl(P3(l.a), P3(l.b), l.w / 2, 'frame');
      }
    }
    return out;
  }

  /* Malla reutilizable para una forma */
  function shapeMesh(s, M) {
    const G = geometries();
    const mesh = new T.Mesh(s.k === 'box' ? G.box : s.k === 'sph' ? G.sphere : G.cyl, M[s.mat]);
    updateShape(mesh, s, M);
    return mesh;
  }
  function updateShape(mesh, s, M) {
    mesh.material = M[s.mat];
    if (s.k === 'cyl') placeCyl(mesh, s.a, s.b, s.r);
    else if (s.k === 'sph') { mesh.position.copy(s.a); mesh.scale.setScalar(s.r); }
    else {
      const d = V().subVectors(s.b, s.a);
      const len = Math.max(0.5, d.length());
      d.normalize();
      const sideAx = perp(s.side, d) || perp(V(1, 0, 0), d) || V(0, 0, 1);
      const third = V().crossVectors(sideAx, d).normalize();
      _m.makeBasis(sideAx, d, third);
      mesh.quaternion.setFromRotationMatrix(_m);
      mesh.position.copy(s.a).addScaledVector(V().subVectors(s.b, s.a), 0.5);
      mesh.scale.set(s.w, len, s.t);
    }
  }

  /* =====================================================================
     ESCENA COMPLETA DE UN EJERCICIO
     ===================================================================== */
  const presetCache = new Map();
  function exercisePreset(ex) {
    if (!presetCache.has(ex.id)) presetCache.set(ex.id, capturePreset(ex));
    return presetCache.get(ex.id);
  }
  const toneOf = ex => (MUSCLE_GROUPS[ex.groups[0]] || {}).tone || 'push';

  /* Suelo con sombra suave */
  let floorTex = null;
  function floorTexture() {
    if (floorTex) return floorTex;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(120,150,190,.20)'); grd.addColorStop(0.55, 'rgba(90,115,150,.08)'); grd.addColorStop(1, 'rgba(90,115,150,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(160,185,215,.10)'; g.lineWidth = 1;
    for (let i = 16; i < 256; i += 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    floorTex = new T.CanvasTexture(c);
    return floorTex;
  }
  let shadowTex = null;
  function shadowTexture() {
    if (shadowTex) return shadowTex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    shadowTex = new T.CanvasTexture(c);
    return shadowTex;
  }

  class Stage {
    constructor(ex) {
      this.ex = ex;
      const r = resolve(ex);
      this.view = r.view;
      this.cap = exercisePreset(ex);
      this.M = materials(toneOf(ex));
      this.scene = new T.Scene();
      this.scene.add(new T.HemisphereLight('#e4ecff', '#20242c', 0.75));
      const key = new T.DirectionalLight('#fff4ea', 1.05); key.position.set(-140, 240, 180); this.scene.add(key);
      const fill = new T.DirectionalLight('#9fb8ff', 0.35); fill.position.set(200, 80, 120); this.scene.add(fill);
      const rim = new T.DirectionalLight('#8fb3ff', 0.55); rim.position.set(120, 160, -220); this.scene.add(rim);
      // Suelo y sombra
      const floor = new T.Mesh(new T.PlaneGeometry(560, 560), new T.MeshBasicMaterial({ map: floorTexture(), transparent: true, depthWrite: false }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.2; floor.renderOrder = -2;
      this.scene.add(floor);
      this.shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
      this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.1; this.shadow.renderOrder = -1;
      this.scene.add(this.shadow);
      this.floor = floor;
      // Maniquí
      this.man = buildMannequin(this.M, { p: ex.anim.p || [], s: ex.anim.s || [] });
      this.scene.add(this.man.root);
      // Equipamiento fijo y dinámico
      const first = this.pose(0);
      this.static = new T.Group();
      for (const s of shapesFor(this.cap.scene, first.J, false)) this.static.add(shapeMesh(s, this.M));
      this.scene.add(this.static);
      this.dyn = new T.Group();
      this.scene.add(this.dyn);
      this.dynMeshes = [];
      this.apply(0);
      this.bounds = this.computeBounds();
    }
    pose(t) {
      const { out, prims } = capture(() => this.cap.preset.build(t));
      const J = joints3D(this.view, out.sk, prims);
      return { J, prims };
    }
    apply(t) {
      const { J, prims } = this.pose(t);
      poseMannequin(this.man, J);
      const shapes = shapesFor(prims, J, true);
      if (shapes.length !== this.dynMeshes.length || shapes.some((s, i) => this.dynMeshes[i].userData.k !== s.k)) {
        this.dyn.clear();
        this.dynMeshes = shapes.map(s => { const m = shapeMesh(s, this.M); m.userData.k = s.k; this.dyn.add(m); return m; });
      } else shapes.forEach((s, i) => updateShape(this.dynMeshes[i], s, this.M));
      const c = V().addVectors(J.hipC, J.shC).multiplyScalar(0.5);
      this.shadow.position.set(c.x, 0.1, c.z);
      this.shadow.scale.set(90, 110, 1);
      this.lastJ = J;
    }
    computeBounds() {
      const box = new T.Box3();
      for (const t of [0, 0.5, 1]) {
        const { J } = this.pose(t);
        for (const k of ['hipC', 'shC', 'head', 'haL', 'haR', 'anL', 'anR', 'elL', 'elR', 'knL', 'knR', 'toL', 'toR']) box.expandByPoint(J[k]);
      }
      box.expandByScalar(16);
      box.min.y = Math.min(box.min.y, 0);
      return box;
    }
    dispose() {
      Object.values(this.M).forEach(m => m.dispose && m.dispose());
      this.floor.geometry.dispose(); this.floor.material.dispose();
      this.shadow.geometry.dispose(); this.shadow.material.dispose();
    }
  }

  /* =====================================================================
     CÁMARA
     ===================================================================== */
  const VIEWS = [
    { id: '34', label: '3/4', yaw: -50, pitch: 14 },
    { id: 'lateral', label: 'Lateral', yaw: -90, pitch: 6 },
    { id: 'frontal', label: 'Frontal', yaw: 0, pitch: 8 },
    { id: 'posterior', label: 'Espalda', yaw: 180, pitch: 10 },
    { id: 'arriba', label: 'Arriba', yaw: -30, pitch: 62 }
  ];
  const DEFAULT_VIEW = { side: '34', front: '34', rear: '34', head: 'arriba' };

  class Orbit {
    constructor(stage, aspect) {
      this.cam = new T.PerspectiveCamera(32, aspect, 1, 4000);
      const b = stage.bounds;
      this.target = b.getCenter(V());
      const size = b.getSize(V());
      this.radius = size.length() / 2;
      this.dist = this.radius / Math.tan(16 * deg) * 0.92;
      const v = VIEWS.find(x => x.id === DEFAULT_VIEW[stage.view]) || VIEWS[0];
      this.yaw = v.yaw * deg; this.pitch = v.pitch * deg;
      this.update();
    }
    setView(id) {
      const v = VIEWS.find(x => x.id === id);
      if (!v) return;
      this.yaw = v.yaw * deg; this.pitch = v.pitch * deg;
      this.update();
    }
    update() {
      this.pitch = Math.max(-0.15, Math.min(1.45, this.pitch));
      const c = Math.cos(this.pitch);
      this.cam.position.set(
        this.target.x + this.dist * Math.sin(this.yaw) * c,
        this.target.y + this.dist * Math.sin(this.pitch),
        this.target.z + this.dist * Math.cos(this.yaw) * c);
      this.cam.lookAt(this.target);
    }
  }

  /* =====================================================================
     ANIMADOR (misma interfaz que el de 2D)
     ===================================================================== */
  const VIEW_LABEL = 'Vista 3D · arrastra para girar';

  class Animator3D {
    constructor(host, ex, { onPhase, onState } = {}) {
      this.ex = ex;
      this.phases = Animations.phases(ex);
      this.total = this.phases.reduce((s, p) => s + p.dur, 0);
      this.time = 0; this.speed = 1; this.playing = false;
      this.onPhase = onPhase || (() => {}); this.onState = onState || (() => {});
      this.currentPhase = null;
      host.innerHTML = `<div class="fx3d">
          <canvas class="fx3d-canvas" tabindex="0" role="img" aria-label="Animación 3D del ejercicio ${ex.name}. Arrastra o usa las flechas del teclado para girar la vista."></canvas>
          <div class="fx3d-views" role="group" aria-label="Ángulo de la cámara">
            ${VIEWS.map(v => `<button type="button" class="fx3d-view" data-view="${v.id}">${v.label}</button>`).join('')}
          </div>
          <p class="fx3d-hint" aria-hidden="true">Arrastra para girar · rueda o dos dedos para acercar</p>
        </div>`;
      this.host = host;
      this.canvas = host.querySelector('canvas');
      this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.stage = new Stage(ex);
      this.orbit = new Orbit(this.stage, 4 / 3);
      this.markView(DEFAULT_VIEW[this.stage.view]);
      this._tick = this._tick.bind(this);
      this.resize();
      this.bindInput();
      this.ro = new ResizeObserver(() => { this.resize(); this.render(); });
      this.ro.observe(host);
      this.visible = true;
      this.io = new IntersectionObserver(es => {
        this.visible = es[0].isIntersecting;
        if (this.visible && this.playing) this.loop();
      });
      this.io.observe(host);
      this.draw();
    }
    resize() {
      const w = this.host.clientWidth || 400, h = this.host.clientHeight || 300;
      this.renderer.setSize(w, h, false);
      this.orbit.cam.aspect = w / h;
      this.orbit.cam.updateProjectionMatrix();
    }
    markView(id) {
      this.host.querySelectorAll('.fx3d-view').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
    }
    bindInput() {
      const c = this.canvas, pts = new Map();
      let pinch = 0;
      const rot = (dx, dy) => {
        this.orbit.yaw -= dx * 0.009; this.orbit.pitch += dy * 0.007;
        this.orbit.update(); this.markView(null); this.render();
      };
      const zoom = k => {
        this.orbit.dist = Math.max(this.orbit.radius * 0.9, Math.min(this.orbit.radius * 5, this.orbit.dist * k));
        this.orbit.update(); this.render();
      };
      this.handlers = {
        down: e => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); c.classList.add('is-dragging'); },
        move: e => {
          if (!pts.has(e.pointerId)) return;
          const prev = pts.get(e.pointerId);
          pts.set(e.pointerId, [e.clientX, e.clientY]);
          if (pts.size === 1) rot(e.clientX - prev[0], e.clientY - prev[1]);
          else if (pts.size === 2) {
            const [a, b] = [...pts.values()];
            const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
            if (pinch) zoom(pinch / d);
            pinch = d;
          }
        },
        up: e => { pts.delete(e.pointerId); pinch = 0; if (!pts.size) c.classList.remove('is-dragging'); },
        wheel: e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.08 : 0.93); },
        key: e => {
          const k = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
          if (k) { e.preventDefault(); rot(k[0], k[1]); }
          if (e.key === '+') zoom(0.9);
          if (e.key === '-') zoom(1.1);
        },
        view: e => {
          const b = e.target.closest('.fx3d-view');
          if (!b) return;
          this.orbit.setView(b.dataset.view); this.markView(b.dataset.view); this.render();
        }
      };
      c.addEventListener('pointerdown', this.handlers.down);
      c.addEventListener('pointermove', this.handlers.move);
      c.addEventListener('pointerup', this.handlers.up);
      c.addEventListener('pointercancel', this.handlers.up);
      c.addEventListener('wheel', this.handlers.wheel, { passive: false });
      c.addEventListener('keydown', this.handlers.key);
      this.host.addEventListener('click', this.handlers.view);
    }
    phaseAt(time) {
      for (const ph of this.phases) if (time < ph.t0 + ph.dur) return ph;
      return this.phases[this.phases.length - 1];
    }
    draw() {
      const ph = this.phaseAt(this.time);
      const local = Math.min(1, (this.time - ph.t0) / ph.dur);
      this.stage.apply(ph.from + (ph.to - ph.from) * ease(local));
      this.render();
      if (ph !== this.currentPhase) { this.currentPhase = ph; this.onPhase(ph); }
    }
    render() {
      if (this.renderer) this.renderer.render(this.stage.scene, this.orbit.cam);
    }
    loop() {
      cancelAnimationFrame(this._raf);
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    }
    _tick(now) {
      if (!this.playing || !this.visible) return;
      const dt = Math.min(0.1, (now - this._last) / 1000);
      this._last = now;
      this.time = (this.time + dt * this.speed) % this.total;
      this.draw();
      this._raf = requestAnimationFrame(this._tick);
    }
    play() { if (this.playing) return; this.playing = true; this.loop(); this.onState(true); }
    pause() { this.playing = false; cancelAnimationFrame(this._raf); this.onState(false); }
    toggle() { this.playing ? this.pause() : this.play(); }
    restart() { this.time = 0; this.currentPhase = null; this.draw(); this.play(); }
    seek(key) {
      const ph = this.phases.find(p => p.key === key);
      if (!ph) return;
      this.pause();
      this.time = ph.t0 + (ph.from === ph.to ? ph.dur * 0.5 : 0.001);
      this.draw();
    }
    setSpeed(v) { this.speed = v; }
    destroy() {
      this.pause();
      this.ro.disconnect(); this.io.disconnect();
      const c = this.canvas;
      c.removeEventListener('pointerdown', this.handlers.down);
      c.removeEventListener('pointermove', this.handlers.move);
      c.removeEventListener('pointerup', this.handlers.up);
      c.removeEventListener('pointercancel', this.handlers.up);
      c.removeEventListener('wheel', this.handlers.wheel);
      c.removeEventListener('keydown', this.handlers.key);
      this.host.removeEventListener('click', this.handlers.view);
      this.stage.dispose();
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }

  /* =====================================================================
     MINIATURAS 3D
     Un único renderizador dibuja cada ejercicio una vez y guarda la imagen.
     Mientras tanto se muestra la miniatura 2D.
     ===================================================================== */
  const thumbs = new Map();
  let thumbRenderer = null;
  const queue = [];
  let pumping = false;

  function renderThumb(id) {
    const ex = EXERCISE_INDEX[id];
    if (!ex || thumbs.has(id)) return thumbs.get(id);
    if (!thumbRenderer) {
      const c = document.createElement('canvas');
      thumbRenderer = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
      thumbRenderer.setPixelRatio(1);
      thumbRenderer.setSize(480, 360, false);
    }
    const stage = new Stage(ex);
    stage.apply(0.55);
    const orbit = new Orbit(stage, 4 / 3);
    orbit.dist *= 0.9; orbit.update();
    thumbRenderer.render(stage.scene, orbit.cam);
    let url = '';
    try { url = thumbRenderer.domElement.toDataURL('image/webp', 0.86); } catch (e) { url = ''; }
    if (!url.startsWith('data:image/webp')) url = thumbRenderer.domElement.toDataURL('image/png');
    stage.dispose();
    thumbs.set(id, url);
    return url;
  }

  function pump() {
    if (pumping) return;
    pumping = true;
    const step = () => {
      const el = queue.shift();
      if (!el) { pumping = false; return; }
      if (el.isConnected && el.dataset.thumb) {
        const url = renderThumb(el.dataset.thumb);
        if (url && el.isConnected) {
          el.innerHTML = `<img class="fx-img" src="${url}" alt="" draggable="false">`;
          el.removeAttribute('data-thumb');
        }
      }
      (window.requestIdleCallback || (f => setTimeout(f, 16)))(step);
    };
    step();
  }

  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); queue.push(e.target); }
    pump();
  }, { rootMargin: '200px' }) : null;

  function watchThumbs(root = document) {
    if (!io) return;
    root.querySelectorAll('[data-thumb]').forEach(el => { if (!el._watched) { el._watched = true; io.observe(el); } });
  }
  new MutationObserver(() => watchThumbs()).observe(document.documentElement, { childList: true, subtree: true });

  function thumbnail(ex) {
    const url = thumbs.get(ex.id);
    if (url) return `<span class="fx-thumb3d"><img class="fx-img" src="${url}" alt="" draggable="false"></span>`;
    return `<span class="fx-thumb3d" data-thumb="${ex.id}">${Animations.thumbnail(ex)}</span>`;
  }

  return {
    supported: true,
    create: (host, ex, opts) => {
      try { return new Animator3D(host, ex, opts); } catch (e) {
        console.warn('3D no disponible, se usa 2D', e);
        return Animations.create(host, ex, opts);
      }
    },
    thumbnail,
    viewLabel: () => VIEW_LABEL,
    _stage: ex => new Stage(ex),
    _orbit: st => new Orbit(st, 4 / 3)
  };
})();
