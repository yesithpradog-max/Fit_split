/* =====================================================================
   FIT SPLIT · app.js
   ---------------------------------------------------------------------
   Punto de entrada de la aplicación:
   - Enrutador basado en el hash de la URL (#/plan/metodo, #/entrenar...)
   - Cabecera: botón de retroceso, Inicio y "Reanudar entrenamiento"
   - Pregunta inicial: si el usuario no ha elegido objetivo, se le pide
     antes de cualquier otra cosa
   - Delegación de eventos (data-action) y actualización de la vista
     cuando cambian los datos guardados
   ===================================================================== */

(() => {
  'use strict';

  const app = document.getElementById('app');
  const backBtn = document.getElementById('back-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const homeLink = document.getElementById('home-link');
  const BASE_TITLE = 'FIT SPLIT · Entiende tu entrenamiento. Entrena con propósito.';

  /* Tabla de rutas: expresión regular → función que crea la vista */
  const SEG = '([\\w-]+)';
  const routes = [
    [/^\/$/, () => Views.home()],
    [/^\/plan\/objetivo$/, () => Views.goalStep()],
    [/^\/plan\/metodo$/, () => Views.methodStep()],
    [/^\/plan\/frecuencia$/, () => Views.frequencyStep()],
    [new RegExp(`^/plan/dia/${SEG}$`), m => Views.dayStep({ day: m[1] })],
    [/^\/entrenar$/, () => Views.player()],
    [/^\/entrenar\/fin$/, () => Views.finish()],
    [/^\/ejercicios$/, () => Views.exercises()],
    [new RegExp(`^/ejercicio/${SEG}$`), m => Views.exercise({ id: m[1] })],
    [/^\/aprende$/, () => Views.learn()],
    [new RegExp(`^/aprende/${SEG}$`), m => Views.topic({ id: m[1] })],
    [/^\/sobre$/, () => Views.about()],
    // Direcciones de la versión anterior
    [/^\/metodos(\/.*)?$/, () => ({ redirect: '#/plan/metodo' })],
    [/^\/mi-entrenamiento$/, () => ({ redirect: '#/plan/frecuencia' })]
  ];

  let current = null;     // { view, cleanup, path }
  let firstRender = true;
  let depth = 0;          // pasos de navegación dentro de la aplicación
  let replacing = false;  // una redirección no cuenta como paso

  function parseHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    const [path] = raw.split('?');
    return path.replace(/\/+$/, '') || '/';
  }

  function resolveView(path) {
    // Antes de todo: preguntar qué quiere conseguir el usuario
    if (!WorkoutStore.isOnboarded() && (path === '/' || path.startsWith('/plan/') || path.startsWith('/entrenar'))) {
      if (path !== '/plan/objetivo') return { redirect: '#/plan/objetivo' };
    }
    for (const [re, factory] of routes) {
      const match = path.match(re);
      if (match) return factory(match);
    }
    return Views.notFound();
  }

  function render() {
    const path = parseHash();
    let view;
    try {
      view = resolveView(path);
    } catch (err) {
      console.error(err);
      view = Views.notFound();
    }
    if (view.redirect) {
      replacing = true;
      location.replace(view.redirect);
      return;
    }
    const dlg = document.getElementById('dialog');
    if (dlg.open) dlg.close();
    if (current && current.cleanup) current.cleanup();
    app.innerHTML = view.html;
    app.classList.remove('view-enter');
    void app.offsetWidth;
    app.classList.add('view-enter');
    document.title = view.title ? `${view.title} · FIT SPLIT` : BASE_TITLE;
    const cleanup = view.mount ? view.mount(app) : null;
    current = { view, cleanup, path };
    updateHeader(path);
    window.scrollTo(0, 0);
    if (!firstRender) {
      const h1 = app.querySelector('h1');
      if (h1) h1.focus({ preventScroll: true });
    }
    firstRender = false;
  }
  Views.setRenderer(render);

  /* Cabecera: retroceso, Inicio y botón animado de reanudar */
  function updateHeader(path) {
    backBtn.hidden = path === '/' && depth === 0;
    homeLink.toggleAttribute('aria-current', path === '/');
    if (path === '/') homeLink.setAttribute('aria-current', 'page');
    const active = WorkoutStore.getActive();
    resumeBtn.hidden = !active || path === '/entrenar';
  }

  backBtn.addEventListener('click', () => {
    if (depth > 0) history.back();
    else location.hash = '#/';
  });

  /* Delegación de acciones: primero la vista actual, después las globales */
  app.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || !app.contains(el) || el.disabled) return;
    const handler = current && current.view.actions && current.view.actions[el.dataset.action];
    if (handler) {
      e.preventDefault();
      handler(el, e);
    } else if (el.dataset.action === 'open-exercise') {
      e.preventDefault();
      Views.openExercise(el.dataset.ex);
    }
  });

  /* Cambios en los datos: actualización parcial o nuevo dibujado */
  WorkoutStore.subscribe(() => {
    if (!current) return;
    updateHeader(current.path);
    if (current.view.update) current.view.update(app);
    else if (current.view.reactive) {
      const y = window.scrollY;
      render();
      window.scrollTo(0, y);
    }
  });

  window.addEventListener('hashchange', () => {
    if (replacing) replacing = false;
    else depth += 1;
    render();
  });
  window.addEventListener('popstate', () => { depth = Math.max(0, depth - 2); });
  document.getElementById('year').textContent = new Date().getFullYear();
  render();
})();
