/* =====================================================================
   FIT SPLIT · app.js
   ---------------------------------------------------------------------
   Punto de entrada de la aplicación:
   - Enrutador basado en el hash de la URL (#/metodos/ppl/ppl6/lun/pecho)
   - Renderizado de vistas y limpieza de la vista anterior
   - Delegación de eventos (data-action)
   - Navegación principal y menú móvil
   - Actualización de la interfaz cuando cambia la selección guardada
   ===================================================================== */

(() => {
  'use strict';

  const app = document.getElementById('app');
  const nav = document.getElementById('primary-nav');
  const navToggle = document.getElementById('nav-toggle');
  const badge = document.getElementById('nav-badge');
  const BASE_TITLE = 'FIT SPLIT · Entiende tu entrenamiento. Entrena con propósito.';

  /* Tabla de rutas: expresión regular → función que crea la vista */
  const SEG = '([\\w-]+)';
  const routes = [
    [/^\/?$/, () => Views.home()],
    [/^\/metodos$/, () => Views.methods()],
    [new RegExp(`^/metodos/${SEG}$`), m => Views.method({ id: m[1] })],
    [new RegExp(`^/metodos/${SEG}/${SEG}$`), m => Views.method({ id: m[1], variant: m[2] })],
    [new RegExp(`^/metodos/${SEG}/${SEG}/${SEG}$`), m => Views.session({ id: m[1], variant: m[2], day: m[3] })],
    [new RegExp(`^/metodos/${SEG}/${SEG}/${SEG}/${SEG}$`), m => Views.session({ id: m[1], variant: m[2], day: m[3], group: m[4] })],
    [/^\/ejercicios$/, (m, q) => Views.exercises(q)],
    [new RegExp(`^/ejercicio/${SEG}$`), (m, q) => Views.exercise({ id: m[1] }, q)],
    [/^\/aprende$/, () => Views.learn()],
    [new RegExp(`^/aprende/${SEG}$`), m => Views.topic({ id: m[1] })],
    [/^\/mi-entrenamiento$/, (m, q) => Views.myWorkout(q)],
    [/^\/sobre$/, () => Views.about()]
  ];

  /* Sección del menú activa según la ruta */
  const NAV_SECTIONS = { '': 'inicio', metodos: 'metodos', ejercicios: 'ejercicios', ejercicio: 'ejercicios', aprende: 'aprende', 'mi-entrenamiento': 'mi-entrenamiento', sobre: 'sobre' };

  let current = null;   // { view, cleanup, path }
  let firstRender = true;

  function parseHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    const [path, qs = ''] = raw.split('?');
    return { path: path.replace(/\/+$/, '') || '/', query: Object.fromEntries(new URLSearchParams(qs)) };
  }

  function resolveView(path, query) {
    for (const [re, factory] of routes) {
      const match = path.match(re);
      if (match) return factory(match, query);
    }
    return Views.notFound();
  }

  /* Dibuja la vista actual. soft = true conserva scroll y foco (re-render por cambios de datos) */
  function render({ soft = false } = {}) {
    const { path, query } = parseHash();
    let view;
    try {
      view = resolveView(path, query);
    } catch (err) {
      console.error(err);
      view = Views.notFound();
    }
    if (view.redirect) {
      location.replace(view.redirect);
      return;
    }

    const focusKey = soft && document.activeElement && document.activeElement.dataset
      ? document.activeElement.dataset.focus : null;
    const scrollY = window.scrollY;
    const sameScope = !soft && current && view.scrollKey && current.view.scrollKey === view.scrollKey;

    if (current && current.cleanup) current.cleanup();
    app.innerHTML = view.html;
    app.classList.toggle('view-enter', !soft && !sameScope);
    document.title = view.title ? `${view.title} · FIT SPLIT` : BASE_TITLE;

    const cleanup = view.mount ? view.mount(app) : null;
    current = { view, cleanup, path };
    updateNav(path, query);
    closeMenu();

    if (soft || sameScope) {
      window.scrollTo(0, scrollY);
      if (focusKey) {
        const el = app.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`);
        if (el && !el.disabled) el.focus({ preventScroll: true });
      }
      if (sameScope && view.focusTarget) {
        const target = app.querySelector(view.focusTarget);
        if (target) target.focus({ preventScroll: true });
      }
    } else {
      window.scrollTo(0, 0);
      // Lleva el foco al título para lectores de pantalla (excepto en la primera carga)
      if (!firstRender) {
        const h1 = app.querySelector('h1');
        if (h1) h1.focus({ preventScroll: true });
      }
    }
    firstRender = false;
  }

  function updateNav(path, query = {}) {
    let section = NAV_SECTIONS[path.split('/')[1] || ''] || '';
    // Un ejercicio abierto desde una sesión pertenece al recorrido de Métodos
    if (section === 'ejercicios' && query.m) section = 'metodos';
    nav.querySelectorAll('a[data-nav]').forEach(a => {
      if (a.dataset.nav === section) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function updateBadge() {
    const n = WorkoutStore.totalCount();
    badge.textContent = n;
    badge.hidden = n === 0;
    badge.setAttribute('aria-label', `${n} ejercicios seleccionados`);
  }

  /* ----------------------------- Menú móvil ----------------------------- */
  function closeMenu() {
    document.body.classList.remove('menu-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menú');
  }
  navToggle.addEventListener('click', () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
      closeMenu();
      navToggle.focus();
    }
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });

  /* ------------------------ Delegación de acciones ------------------------ */
  app.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || !app.contains(el) || el.disabled) return;
    const handler = current && current.view.actions && current.view.actions[el.dataset.action];
    if (handler) {
      e.preventDefault();
      handler(el, e);
    }
  });

  /* Cuando cambia la selección: actualización parcial o re-render suave */
  WorkoutStore.subscribe(() => {
    updateBadge();
    if (!current) return;
    if (current.view.update) current.view.update(app);
    else if (current.view.reactive) render({ soft: true });
  });

  window.addEventListener('hashchange', () => render());
  document.getElementById('year').textContent = new Date().getFullYear();
  updateBadge();
  render();
})();
