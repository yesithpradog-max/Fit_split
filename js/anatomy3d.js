/* =====================================================================
   FIT SPLIT · anatomy3d.js
   ---------------------------------------------------------------------
   Cuerpo humano anatómico (sin piel) para las animaciones 3D.

   - Geometría real de BodyParts3D (© DBCLS, CC BY 4.0), simplificada
     y completada con los músculos que faltaban (tools/anatomy-*.mjs).
   - Se carga bajo demanda desde assets/anatomy/anatomy-data.js (un
     script, para que funcione también abriendo index.html sin servidor).
   - Esqueleto animable (three.js SkinnedMesh): tronco, cuello, cabeza,
     escápulas, brazos con giro del antebrazo, manos con dedos, piernas
     y pies con dedos.
   - Los músculos que trabaja el ejercicio se resaltan con un rojo más
     vivo y un brillo suave; los secundarios, con un rojo intermedio.

   API:
     Anatomy3D.load() → Promise
     new Anatomy3D.Figure({ p: [...claves], s: [...claves] })
       .root (Object3D para añadir a la escena)
       .setPose(pose)   pose = { bones: { nombre: Quaternion mundo }, root: Vector3 }
       .rest            datos de reposo (articulaciones, longitudes)
   ===================================================================== */

const Anatomy3D = (() => {
  'use strict';
  const T = window.THREE;
  let data = null, loading = null;

  /* ------------------------------ Carga ------------------------------ */
  function scriptSrc() {
    const own = [...document.scripts].find(s => /anatomy3d\.js/.test(s.src));
    return own ? own.src.replace(/js\/anatomy3d\.js.*$/, 'assets/anatomy/anatomy-data.js') : 'assets/anatomy/anatomy-data.js';
  }
  function load() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const done = () => {
        try { data = decode(window.FITSPLIT_ANATOMY); window.FITSPLIT_ANATOMY = null; resolve(data); } catch (e) { reject(e); }
      };
      if (window.FITSPLIT_ANATOMY) { done(); return; }
      const s = document.createElement('script');
      s.src = scriptSrc();
      s.async = true;
      s.onload = done;
      s.onerror = () => reject(new Error('No se pudo cargar el modelo anatómico'));
      document.head.appendChild(s);
    });
    return loading;
  }

  /* ---------------------------- Decodificar ---------------------------- */
  const GROUPS = ['muscle', 'bone', 'tendon', 'cartilage', 'eye'];
  function decode(src) {
    const m = src.manifest;
    const raw = atob(src.data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const buf = bytes.buffer;
    const nv = m.vertices, ni = m.indices;
    const P = new Int16Array(buf, 0, nv * 3);
    const I = new Uint16Array(buf, nv * 6, ni);
    const SI = new Uint8Array(buf, nv * 6 + ni * 2, nv * 4);
    const SW = new Uint8Array(buf, nv * 6 + ni * 2 + nv * 4, nv * 4);
    const floor = m.floor;
    const pos = new Float32Array(nv * 3);
    for (let i = 0; i < nv * 3; i++) {
      const k = i % 3;
      pos[i] = m.min[k] + ((P[i] + 32768) / 65535) * m.span[k] - (k === 1 ? floor : 0);
    }
    // Agrupar piezas por material
    const groups = {};
    for (const g of GROUPS) groups[g] = { parts: [], nv: 0, ni: 0 };
    for (const part of m.parts) {
      const [structure, type, key, side, v0, n, i0, cnt] = part;
      const g = groups[type === 'tendon' || type === 'cartilage' || type === 'eye' || type === 'bone' ? type : 'muscle'];
      g.parts.push({ structure, type, key, side, v0, n, i0, cnt, start: g.nv });
      g.nv += n; g.ni += cnt;
    }
    const geos = {};
    for (const [name, g] of Object.entries(groups)) {
      if (!g.nv) continue;
      const gp = new Float32Array(g.nv * 3), gi = new Uint32Array(g.ni), gsi = new Uint16Array(g.nv * 4), gsw = new Float32Array(g.nv * 4);
      const keys = new Array(g.nv);
      let io = 0;
      for (const p of g.parts) {
        gp.set(pos.subarray(p.v0 * 3, (p.v0 + p.n) * 3), p.start * 3);
        for (let i = 0; i < p.n * 4; i++) { gsi[p.start * 4 + i] = SI[p.v0 * 4 + i]; gsw[p.start * 4 + i] = SW[p.v0 * 4 + i] / 255; }
        for (let i = 0; i < p.cnt; i++) gi[io + i] = I[p.i0 + i] + p.start;
        io += p.cnt;
        for (let i = 0; i < p.n; i++) keys[p.start + i] = p.key;
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(gp, 3));
      geo.setAttribute('skinIndex', new T.BufferAttribute(gsi, 4));
      geo.setAttribute('skinWeight', new T.BufferAttribute(gsw, 4));
      geo.setIndex(new T.BufferAttribute(gi, 1));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      geos[name] = { geo, keys, parts: g.parts };
    }
    // Esqueleto en reposo (suelo en y = 0)
    const lift = p => [p[0], p[1] - floor, p[2]];
    const bones = m.bones.map(([name, parent, p]) => ({ name, parent, pos: lift(p) }));
    const joints = {};
    for (const [k, v] of Object.entries(m.joints)) joints[k] = Array.isArray(v) ? lift(v) : v;
    return { geos, bones, joints, credit: m.credit };
  }

  /* ---------------------------- Materiales ---------------------------- */
  const COLORS = {
    muscle: new T.Color('#8f2a33'),     // músculo en reposo
    muscleS: new T.Color('#c23a42'),    // secundario
    muscleP: new T.Color('#f04a45'),    // principal
    plain: new T.Color('#86292f'),
    bone: '#e4dac3', tendon: '#ece5d3', cartilage: '#d6aba2', eye: '#f2efe8'
  };

  function muscleMaterial() {
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.02 });
    mat.userData.pulse = { value: 0 };
    mat.onBeforeCompile = sh => {
      sh.uniforms.uPulse = mat.userData.pulse;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aHL;\nvarying float vHL;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHL = aHL;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uPulse;\nvarying float vHL;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor * vHL * (0.16 + 0.12 * uPulse);');
    };
    return mat;
  }

  /* ------------------------------ Figura ------------------------------ */
  class Figure {
    constructor(hl = { p: [], s: [] }) {
      if (!data) throw new Error('Anatomy3D.load() primero');
      this.root = new T.Group();
      // Huesos del esqueleto
      this.bones = {};
      const list = data.bones.map(b => {
        const bone = new T.Bone();
        bone.name = b.name;
        this.bones[b.name] = bone;
        return bone;
      });
      data.bones.forEach((b, i) => {
        const bone = list[i];
        if (b.parent) {
          const pp = data.bones.find(x => x.name === b.parent).pos;
          bone.position.set(b.pos[0] - pp[0], b.pos[1] - pp[1], b.pos[2] - pp[2]);
          this.bones[b.parent].add(bone);
        } else {
          bone.position.set(...b.pos);
        }
      });
      this.rootBone = list[0];
      this.skeleton = new T.Skeleton(list);
      this.root.add(this.rootBone);
      this.rootBone.updateMatrixWorld(true);
      this.skeleton.calculateInverses(); // con los huesos ya colocados en reposo
      // Mallas
      this.materials = {};
      this.meshes = {};
      for (const [name, g] of Object.entries(data.geos)) {
        let geo = g.geo, mat;
        if (name === 'muscle') {
          geo = new T.BufferGeometry();
          for (const a of ['position', 'normal', 'skinIndex', 'skinWeight']) geo.setAttribute(a, g.geo.getAttribute(a));
          geo.setIndex(g.geo.getIndex());
          geo.boundingSphere = g.geo.boundingSphere;
          const col = new Float32Array(g.keys.length * 3), hlA = new Float32Array(g.keys.length);
          geo.setAttribute('color', new T.BufferAttribute(col, 3));
          geo.setAttribute('aHL', new T.BufferAttribute(hlA, 1));
          mat = muscleMaterial();
          this.muscleGeo = geo;
        } else {
          mat = new T.MeshStandardMaterial({ color: COLORS[name], roughness: name === 'eye' ? 0.25 : 0.62, metalness: 0, side: name === 'cartilage' ? T.DoubleSide : T.FrontSide });
        }
        const mesh = new T.SkinnedMesh(geo, mat);
        mesh.bind(this.skeleton, new T.Matrix4());
        mesh.frustumCulled = false;
        this.root.add(mesh);
        this.meshes[name] = mesh;
        this.materials[name] = mat;
      }
      this.setHighlight(hl);
      this.rest = data;
    }

    setHighlight(hl) {
      const g = data.geos.muscle;
      const col = this.muscleGeo.getAttribute('color'), hlA = this.muscleGeo.getAttribute('aHL');
      for (let i = 0; i < g.keys.length; i++) {
        const k = g.keys[i];
        const lvl = k && hl.p.includes(k) ? 2 : k && hl.s.includes(k) ? 1 : 0;
        const c = lvl === 2 ? COLORS.muscleP : lvl === 1 ? COLORS.muscleS : k === 'plain' ? COLORS.plain : COLORS.muscle;
        col.setXYZ(i, c.r, c.g, c.b);
        hlA.setX(i, lvl === 2 ? 1 : lvl === 1 ? 0.35 : 0);
      }
      col.needsUpdate = true; hlA.needsUpdate = true;
    }

    setPulse(v) { this.materials.muscle.userData.pulse.value = v; }

    /* pose.bones: rotaciones en el mundo (respecto al reposo) por hueso;
       pose.root: posición del centro de la pelvis */
    setPose(pose) {
      const q = new T.Quaternion();
      const world = pose.bones;
      for (const b of data.bones) {
        const bone = this.bones[b.name];
        const w = world[b.name] || (b.parent ? world[b.parent] : null) || q.identity();
        if (b.parent) {
          const pw = this._worldOf(b.parent, world);
          bone.quaternion.copy(pw).invert().multiply(w);
        } else {
          bone.quaternion.copy(w);
          bone.position.copy(pose.root);
        }
      }
      this.rootBone.updateMatrixWorld(true);
    }
    _worldOf(name, world) {
      let n = name;
      while (n && !world[n]) n = data.bones.find(b => b.name === n).parent;
      return n ? world[n] : new T.Quaternion();
    }

    dispose() {
      this.muscleGeo.dispose();
      Object.values(this.materials).forEach(m => m.dispose());
    }
  }

  return {
    load,
    get ready() { return !!data; },
    get data() { return data; },
    Figure
  };
})();
