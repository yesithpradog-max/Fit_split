/* =====================================================================
   FIT SPLIT · animations3d.js
   ---------------------------------------------------------------------
   Animaciones 3D con un cuerpo humano anatómico real (sin piel).

   Piezas:
   - anatomy3d.js  cuerpo de BodyParts3D (© DBCLS, CC BY 4.0) con
                   esqueleto animable y resaltado de músculos.
   - biomech.js    solucionador de posturas (cinemática inversa con las
                   longitudes reales del modelo, escápulas, antebrazos,
                   centro de masas).
   - poses3d.js    técnica de cada ejercicio (posición inicial y punto
                   de transición) revisada con criterios de entrenador.
   - props3d.js    equipamiento a escala real.

   La cámara se gira arrastrando, se acerca con la rueda o con dos dedos
   y tiene ángulos predefinidos. Si el navegador no admite WebGL, o el
   modelo no carga, se usa la animación 2D.
   ===================================================================== */

const Animations3D = (() => {
  'use strict';

  const T = window.THREE;
  const ok = (() => {
    if (!T || typeof Animations === 'undefined' || typeof Anatomy3D === 'undefined' || typeof Poses3D === 'undefined') return false;
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  })();
  if (!ok) return { supported: false };

  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const deg = Math.PI / 180;
  const ease = x => -(Math.cos(Math.PI * x) - 1) / 2;

  /* ------------------------- Carga del modelo ------------------------- */
  let ready = null;
  function loadModel() {
    if (!ready) ready = Anatomy3D.load().then(d => { Biomech.init(d); Poses3D.measure(); return d; });
    return ready;
  }

  /* ------------------------------ Texturas ------------------------------ */
  let shadowTex = null;
  function blobTexture() {
    if (shadowTex) return shadowTex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    shadowTex = new T.CanvasTexture(c);
    return shadowTex;
  }
  let floorTex = null;
  function floorTexture() {
    if (floorTex) return floorTex;
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256);
    gr.addColorStop(0, '#20252e'); gr.addColorStop(0.6, '#151920'); gr.addColorStop(1, 'rgba(14,17,22,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    floorTex = new T.CanvasTexture(c);
    return floorTex;
  }

  /* =====================================================================
     ESCENA DE UN EJERCICIO
     ===================================================================== */
  const FRAMES = 96; // fotogramas de postura precalculados por repetición

  class Stage {
    constructor(ex, figure) {
      this.ex = ex;
      this.pat = Poses3D.get(ex);
      if (!this.pat) throw new Error('Sin patrón 3D: ' + ex.anim.preset);
      this.scene = new T.Scene();
      this.scene.add(new T.HemisphereLight('#e9eefc', '#2a2420', 0.62));
      const key = new T.DirectionalLight('#fff3e6', 1.05);
      key.position.set(-1.6, 3.4, 2.4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -1.6; key.shadow.camera.right = 1.6; key.shadow.camera.top = 2.6; key.shadow.camera.bottom = -0.6;
      key.shadow.camera.near = 0.5; key.shadow.camera.far = 8;
      key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
      this.scene.add(key); this.key = key;
      const fill = new T.DirectionalLight('#a9bdff', 0.35); fill.position.set(2.2, 1.2, 1.6); this.scene.add(fill);
      const rim = new T.DirectionalLight('#9fc0ff', 0.6); rim.position.set(1.2, 2.2, -3); this.scene.add(rim);
      // Suelo
      const floor = new T.Mesh(new T.PlaneGeometry(6, 6), new T.MeshStandardMaterial({ map: floorTexture(), transparent: true, roughness: 0.95, metalness: 0 }));
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
      this.scene.add(floor); this.floor = floor;
      this.blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }));
      this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = 0.002;
      this.scene.add(this.blob);
      // Cuerpo y equipamiento
      this.fig = figure || new Anatomy3D.Figure({ p: ex.anim.p || [], s: ex.anim.s || [] });
      this.ownFigure = !figure;
      if (figure) figure.setHighlight({ p: ex.anim.p || [], s: ex.anim.s || [] });
      for (const m of Object.values(this.fig.meshes)) { m.castShadow = true; m.receiveShadow = true; }
      this.scene.add(this.fig.root);
      this.props = new T.Group();
      this.scene.add(this.props);
      this.dyn = this.pat.setup(this.props);
      this.cache = new Map();
      this.apply(0);
      this.bounds = this.computeBounds();
    }
    solved(t) {
      const k = Math.round(Math.max(0, Math.min(1, t)) * FRAMES);
      let s = this.cache.get(k);
      if (!s) {
        const spec = this.pat.pose(k / FRAMES);
        s = Biomech.solve(spec);
        s.spec = spec;
        this.cache.set(k, s);
      }
      return s;
    }
    apply(t) {
      // Interpolación suave entre dos fotogramas precalculados
      const x = Math.max(0, Math.min(1, t)) * FRAMES, k0 = Math.floor(x), f = x - k0;
      const a = this.solved(k0 / FRAMES), b = f > 1e-3 ? this.solved(Math.min(FRAMES, k0 + 1) / FRAMES) : a;
      let use = a;
      if (b !== a) {
        const q = {};
        for (const n of Object.keys(a.pose.q)) q[n] = a.pose.q[n].clone().slerp(b.pose.q[n] || a.pose.q[n], f);
        use = { pose: { q, root: a.pose.root.clone().lerp(b.pose.root, f) }, info: f < 0.5 ? a.info : b.info, spec: f < 0.5 ? a.spec : b.spec };
      }
      this.fig.setPose({ bones: use.pose.q, root: use.pose.root });
      this.pat.update(this.dyn, t, f < 0.5 ? a : b);
      const c = use.info.com;
      this.blob.position.set(c.x, 0.002, c.z);
      this.blob.scale.set(0.9, 1.1, 1);
    }
    computeBounds() {
      const box = new T.Box3();
      for (const t of [0, 0.5, 1]) {
        const i = this.solved(t).info;
        for (const S of ['L', 'R']) {
          const a = i.arms[S], l = i.legs[S];
          if (a) [a.shoulder, a.elbow, a.wrist, a.grip].forEach(p => box.expandByPoint(p));
          if (l) [l.hip, l.knee, l.ankle].forEach(p => box.expandByPoint(p));
        }
        box.expandByPoint(i.headPos.clone().add(V(0, 0.16, 0)));
        box.expandByPoint(i.shoulderMid);
      }
      box.expandByScalar(0.12);
      box.min.y = Math.min(box.min.y, 0);
      return box;
    }
    dispose() {
      if (this.ownFigure) this.fig.dispose();
      this.scene.remove(this.fig.root);
      this.floor.geometry.dispose(); this.floor.material.dispose();
      this.blob.geometry.dispose(); this.blob.material.dispose();
    }
  }

  /* =====================================================================
     CÁMARA
     ===================================================================== */
  const VIEWS = [
    { id: '34', label: '3/4', yaw: -50, pitch: 12 },
    { id: 'lateral', label: 'Lateral', yaw: -90, pitch: 5 },
    { id: 'frontal', label: 'Frontal', yaw: 0, pitch: 8 },
    { id: 'posterior', label: 'Espalda', yaw: 180, pitch: 10 },
    { id: 'arriba', label: 'Arriba', yaw: -30, pitch: 60 }
  ];

  class Orbit {
    constructor(stage, aspect) {
      this.cam = new T.PerspectiveCamera(32, aspect, 0.05, 40);
      const b = stage.bounds;
      this.target = b.getCenter(V());
      this.radius = b.getSize(V()).length() / 2;
      this.dist = this.radius / Math.tan(16 * deg) * 0.95;
      const c = stage.pat.cam || {};
      this.home = { yaw: (c.yaw != null ? c.yaw : -50) * deg, pitch: (c.pitch != null ? c.pitch : 12) * deg };
      this.yaw = this.home.yaw; this.pitch = this.home.pitch;
      this.update();
    }
    setView(id) {
      const v = VIEWS.find(x => x.id === id);
      if (!v) return;
      if (id === '34') { this.yaw = this.home.yaw; this.pitch = this.home.pitch; }
      else { this.yaw = v.yaw * deg; this.pitch = v.pitch * deg; }
      this.update();
    }
    update() {
      this.pitch = Math.max(-0.1, Math.min(1.45, this.pitch));
      const c = Math.cos(this.pitch);
      // yaw: ángulo de la cámara alrededor del cuerpo (0 = de frente)
      this.cam.position.set(
        this.target.x - this.dist * Math.sin(this.yaw) * c,
        this.target.y + this.dist * Math.sin(this.pitch),
        this.target.z + this.dist * Math.cos(this.yaw) * c);
      this.cam.lookAt(this.target);
    }
  }

  function makeRenderer(canvas, opts = {}) {
    const r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, ...opts });
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    return r;
  }

  /* =====================================================================
     ANIMADOR (misma interfaz que el de 2D)
     ===================================================================== */
  const VIEW_LABEL = 'Cuerpo anatómico 3D · arrastra para girar';

  class Animator3D {
    constructor(host, ex, { onPhase, onState } = {}) {
      this.ex = ex;
      this.phases = Animations.phases(ex);
      this.total = this.phases.reduce((s, p) => s + p.dur, 0);
      this.time = 0; this.speed = 1; this.playing = false;
      this.onPhase = onPhase || (() => {}); this.onState = onState || (() => {});
      this.currentPhase = null;
      this.host = host;
      host.innerHTML = `<div class="fx3d is-loading">
          <canvas class="fx3d-canvas" tabindex="0" role="img" aria-label="Animación 3D del ejercicio ${ex.name} con un cuerpo anatómico. Arrastra o usa las flechas del teclado para girar la vista."></canvas>
          <div class="fx3d-views" role="group" aria-label="Ángulo de la cámara">
            ${VIEWS.map(v => `<button type="button" class="fx3d-view" data-view="${v.id}">${v.label}</button>`).join('')}
          </div>
          <p class="fx3d-loading" role="status"><span class="fx3d-spinner" aria-hidden="true"></span>Cargando el modelo anatómico…</p>
          <p class="fx3d-hint" aria-hidden="true">Arrastra para girar · rueda o dos dedos para acercar</p>
          <p class="fx3d-credit">Modelo: BodyParts3D © DBCLS · CC BY 4.0</p>
        </div>`;
      this.wrap = host.querySelector('.fx3d');
      this.canvas = host.querySelector('canvas');
      this._tick = this._tick.bind(this);
      this.visible = true;
      this.destroyed = false;
      loadModel().then(() => { if (!this.destroyed) this.init(); }).catch(err => this.fallback(err));
    }
    init() {
      try {
        this.renderer = makeRenderer(this.canvas);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.stage = new Stage(this.ex);
        this.orbit = new Orbit(this.stage, 4 / 3);
      } catch (err) { this.fallback(err); return; }
      this.wrap.classList.remove('is-loading');
      this.markView('34');
      this.resize();
      this.bindInput();
      this.ro = new ResizeObserver(() => { this.resize(); this.render(); });
      this.ro.observe(this.host);
      this.io = new IntersectionObserver(es => {
        this.visible = es[0].isIntersecting;
        if (this.visible && this.playing) this.loop();
      });
      this.io.observe(this.host);
      this.draw();
      if (this.playing) this.loop();
    }
    fallback(err) {
      if (this.destroyed) return;
      console.warn('3D no disponible, se usa 2D', err);
      const wasPlaying = this.playing;
      this.cleanup();
      this.inner = Animations.create(this.host, this.ex, { onPhase: this.onPhase, onState: this.onState });
      if (wasPlaying) this.inner.play();
    }
    resize() {
      if (!this.renderer) return;
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
        this.orbit.yaw += dx * 0.009; this.orbit.pitch += dy * 0.007;
        this.orbit.update(); this.markView(null); this.render();
      };
      const zoom = k => {
        this.orbit.dist = Math.max(this.orbit.radius * 0.8, Math.min(this.orbit.radius * 5, this.orbit.dist * k));
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
      if (this.stage) {
        this.stage.apply(ph.from + (ph.to - ph.from) * ease(local));
        // Brillo suave en los músculos que trabajan
        this.stage.fig.setPulse(0.5 + 0.5 * Math.sin(this.time * 3.2));
        this.render();
      }
      if (ph !== this.currentPhase) { this.currentPhase = ph; this.onPhase(ph); }
    }
    render() {
      if (this.renderer && this.stage) this.renderer.render(this.stage.scene, this.orbit.cam);
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
    play() {
      if (this.inner) return this.inner.play();
      if (this.playing) return;
      this.playing = true; this.loop(); this.onState(true);
    }
    pause() {
      if (this.inner) return this.inner.pause();
      this.playing = false; cancelAnimationFrame(this._raf); this.onState(false);
    }
    toggle() { if (this.inner) return this.inner.toggle(); this.playing ? this.pause() : this.play(); }
    restart() { if (this.inner) return this.inner.restart(); this.time = 0; this.currentPhase = null; this.draw(); this.play(); }
    seek(key) {
      if (this.inner) return this.inner.seek(key);
      const ph = this.phases.find(p => p.key === key);
      if (!ph) return;
      this.pause();
      this.time = ph.t0 + (ph.from === ph.to ? ph.dur * 0.5 : 0.001);
      this.draw();
    }
    setSpeed(v) { if (this.inner) return this.inner.setSpeed(v); this.speed = v; }
    cleanup() {
      cancelAnimationFrame(this._raf);
      if (this.ro) this.ro.disconnect();
      if (this.io) this.io.disconnect();
      const c = this.canvas;
      if (this.handlers) {
        c.removeEventListener('pointerdown', this.handlers.down);
        c.removeEventListener('pointermove', this.handlers.move);
        c.removeEventListener('pointerup', this.handlers.up);
        c.removeEventListener('pointercancel', this.handlers.up);
        c.removeEventListener('wheel', this.handlers.wheel);
        c.removeEventListener('keydown', this.handlers.key);
        this.host.removeEventListener('click', this.handlers.view);
      }
      if (this.stage) this.stage.dispose();
      if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); }
      this.stage = null; this.renderer = null;
    }
    destroy() {
      this.destroyed = true;
      if (this.inner) { this.inner.destroy(); return; }
      this.playing = false;
      this.cleanup();
    }
  }

  /* =====================================================================
     MINIATURAS 3D
     Un único renderizador y un único cuerpo dibujan cada ejercicio una vez
     y guardan la imagen. Mientras tanto se muestra la miniatura 2D.
     ===================================================================== */
  const thumbs = new Map();
  let thumbRenderer = null, thumbFigure = null;
  const queue = [];
  let pumping = false;

  function renderThumb(id) {
    const ex = EXERCISE_INDEX[id];
    if (!ex || thumbs.has(id)) return thumbs.get(id);
    if (!thumbRenderer) {
      const c = document.createElement('canvas');
      thumbRenderer = makeRenderer(c, { preserveDrawingBuffer: true });
      thumbRenderer.setPixelRatio(1);
      thumbRenderer.setSize(480, 360, false);
      thumbFigure = new Anatomy3D.Figure({ p: [], s: [] });
    }
    const stage = new Stage(ex, thumbFigure);
    stage.apply(0.6);
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
    loadModel().then(() => {
      const step = () => {
        const el = queue.shift();
        if (!el) { pumping = false; return; }
        if (el.isConnected && el.dataset.thumb) {
          let url = '';
          try { url = renderThumb(el.dataset.thumb); } catch (e) { console.warn(e); }
          if (url && el.isConnected) {
            el.innerHTML = `<img class="fx-img" src="${url}" alt="" draggable="false">`;
            el.removeAttribute('data-thumb');
          }
        }
        (window.requestIdleCallback || (f => setTimeout(f, 16)))(step);
      };
      step();
    }).catch(() => { pumping = false; queue.length = 0; });
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
    load: loadModel
  };
})();
