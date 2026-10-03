/* =====================================================================
   FIT SPLIT · views.js
   ---------------------------------------------------------------------
   Vistas de la aplicación. Cada vista es una función que devuelve:
     title    título de la pestaña
     html     contenido de la página
     mount    (opcional) se ejecuta tras insertar el HTML; puede devolver
              una función de limpieza (por ejemplo, detener animaciones)
     actions  (opcional) manejadores para los elementos con data-action
     update   (opcional) actualización parcial cuando cambia la selección
     reactive (opcional) si es true, la vista se vuelve a dibujar al
              cambiar la selección guardada
   El enrutador (app.js) decide qué vista mostrar según la URL.
   ===================================================================== */

const Views = (() => {
  'use strict';
  const { esc, icon } = UI;

  const STEP_TITLES = {
    prep: 'Preparación',
    start: 'Posición inicial',
    ecc: 'Fase excéntrica',
    turn: 'Punto de transición',
    con: 'Fase concéntrica',
    end: 'Finalización'
  };
  const PHASE_TYPES = { start: 'Inicio', ecc: 'Excéntrica', turn: 'Transición', con: 'Concéntrica', end: 'Final' };
  const GOAL_ICONS = { fuerza: 'bolt', hipertrofia: 'growth', resistencia: 'repeat' };
  const GOAL_TOPICS = { fuerza: 'fuerza', hipertrofia: 'hipertrofia', resistencia: 'resistencia-muscular' };
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sessionHref = (m, v, d, g) => `#/metodos/${m}/${v}/${d}${g ? '/' + g : ''}`;
  const scrollToId = id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };

  /* Sección con encabezado estándar */
  function sectionHead({ eyebrow, title, text, link, id }) {
    return `<div class="section-head">
      <div>
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
        <h2${id ? ` id="${id}"` : ''}>${esc(title)}</h2>
        ${text ? `<p class="section-text">${esc(text)}</p>` : ''}
      </div>
      ${link || ''}
    </div>`;
  }

  /* Tarjetas de objetivo (portada) */
  function goalCards() {
    const current = WorkoutStore.getGoal();
    return GOAL_ORDER.map(id => {
      const g = GOALS[id];
      const active = id === current;
      return `<div class="goal-card goal-${id}${active ? ' is-active' : ''}">
        <button type="button" class="goal-main" data-action="set-goal" data-goal="${id}" aria-pressed="${active}" data-focus="goal-${id}">
          <span class="goal-icon">${icon(GOAL_ICONS[id])}</span>
          <span class="goal-name">${esc(g.name)}</span>
          <span class="goal-tag">${esc(g.tagline)}</span>
          <span class="goal-reps mono">${esc(g.reps)}</span>
          <span class="goal-state">${active ? icon('check') + 'Tu objetivo actual' : 'Elegir como objetivo'}</span>
        </button>
        <a class="goal-more" href="#/aprende/${GOAL_TOPICS[id]}">Aprender sobre ${esc(g.name.toLowerCase())} ${icon('arrow-right')}</a>
      </div>`;
    }).join('');
  }

  /* Diagrama: de la carga a la adaptación */
  const FLOW_STEPS = [
    ['Resistencia externa', 'La carga que debes mover o frenar.', 'dumbbell'],
    ['Producción de fuerza', 'El músculo responde para vencerla.', 'bolt'],
    ['Tensión muscular', 'Las fibras activas soportan esa fuerza.', 'tension'],
    ['Estímulo de entrenamiento', 'Las células detectan la tensión y envían señales.', 'pulse'],
    ['Adaptación', 'Con repetición y recuperación: más fuerza y tamaño.', 'growth']
  ];
  function tensionFlow(compact = false) {
    return `<div class="flow${compact ? ' flow-compact' : ''}">
      <ol class="flow-steps">${FLOW_STEPS.map(([t, d, ic], i) => `
        <li class="flow-step" style="--i:${i}">
          <span class="flow-icon">${icon(ic)}</span>
          <span class="flow-text"><strong>${t}</strong>${compact ? '' : `<span>${d}</span>`}</span>
        </li>`).join('')}
      </ol>
      ${compact ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-action="replay-flow">${icon('restart')}<span>Ver la secuencia</span></button>`}
    </div>`;
  }

  /* =====================================================================
     DIÁLOGO: añadir un ejercicio a una sesión (desde el catálogo)
     ===================================================================== */
  function openAddDialog(ex) {
    // Todas las combinaciones método/variante/día/grupo donde encaja el ejercicio
    const options = [];
    for (const m of METHODS) {
      for (const v of m.variants) {
        for (const d of Planner.trainingDays(v)) {
          for (const g of Planner.groupsOf(Planner.sessionFor(v, d.id))) {
            if (ex.groups.includes(g.id)) options.push({ m, v, d, g });
          }
        }
      }
    }
    const plans = [...new Map(options.map(o => [`${o.m.id}|${o.v.id}`, o])).values()];
    // Por defecto, el método donde el usuario ya tiene más ejercicios
    const counts = {};
    WorkoutStore.plans().forEach(p => { counts[`${p.m}|${p.v}`] = (counts[`${p.m}|${p.v}`] || 0) + 1; });
    const defaultPlan = plans.slice().sort((a, b) =>
      (counts[`${b.m.id}|${b.v.id}`] || 0) - (counts[`${a.m.id}|${a.v.id}`] || 0))[0];

    const dlg = UI.openDialog(`
      <h2 class="dialog-title">Añadir ${esc(ex.name)}</h2>
      <p class="dialog-text">Elige el método, el día y el grupo muscular de la sesión.</p>
      <form class="dialog-form" id="add-form" novalidate>
        <div class="field"><label for="add-plan">Método</label>
          <select id="add-plan">${plans.map(o => `<option value="${o.m.id}|${o.v.id}"${o === defaultPlan ? ' selected' : ''}>${esc(o.m.name)} · ${esc(o.v.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="add-day">Día</label><select id="add-day"></select></div>
        <div class="field" id="add-group-field"><label for="add-group">Grupo muscular</label><select id="add-group"></select></div>
        <p class="dialog-status" id="add-status" aria-live="polite"></p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" data-dialog-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">${icon('plus')}<span>Añadir</span></button>
        </div>
      </form>`);

    const $ = sel => dlg.querySelector(sel);
    const current = () => {
      const [mId, vId] = $('#add-plan').value.split('|');
      return options.find(o => o.m.id === mId && o.v.id === vId && o.d.id === $('#add-day').value && o.g.id === $('#add-group').value);
    };
    const refreshStatus = () => {
      const o = current();
      if (!o) return;
      const list = WorkoutStore.getGroup(o.m.id, o.v.id, o.d.id, o.g.id);
      const status = $('#add-status');
      status.className = 'dialog-status';
      if (list.includes(ex.id)) {
        status.textContent = 'Este ejercicio ya está en esa sesión.';
        status.classList.add('is-warn');
      } else if (list.length >= o.g.max) {
        status.textContent = `${o.g.group.name} ya tiene ${o.g.max} de ${o.g.max} ejercicios. Quita uno desde la sesión para añadir este.`;
        status.classList.add('is-warn');
      } else {
        status.textContent = `${o.g.group.name}: ${list.length} de ${o.g.max} ejercicios seleccionados en ese día.`;
      }
    };
    const fillGroups = () => {
      const [mId, vId] = $('#add-plan').value.split('|');
      const groups = options.filter(o => o.m.id === mId && o.v.id === vId && o.d.id === $('#add-day').value);
      $('#add-group').innerHTML = groups.map(o => `<option value="${o.g.id}">${esc(o.g.group.name)}</option>`).join('');
      $('#add-group-field').hidden = groups.length < 2;
      refreshStatus();
    };
    const fillDays = () => {
      const [mId, vId] = $('#add-plan').value.split('|');
      const days = [...new Map(options.filter(o => o.m.id === mId && o.v.id === vId).map(o => [o.d.id, o])).values()];
      $('#add-day').innerHTML = days.map(o => `<option value="${o.d.id}">${o.d.name} · ${esc(Planner.sessionFor(o.v, o.d.id).name)}</option>`).join('');
      fillGroups();
    };
    $('#add-plan').addEventListener('change', fillDays);
    $('#add-day').addEventListener('change', fillGroups);
    $('#add-group').addEventListener('change', refreshStatus);
    fillDays();

    $('#add-form').addEventListener('submit', e => {
      e.preventDefault();
      const o = current();
      if (!o) return;
      if (WorkoutStore.getGroup(o.m.id, o.v.id, o.d.id, o.g.id).includes(ex.id)) { refreshStatus(); return; }
      const result = WorkoutStore.toggle(o.m.id, o.v.id, o.d.id, o.g.id, ex.id, o.g.max);
      if (result === 'added') {
        dlg.close();
        UI.toast(`${ex.name} añadido a ${o.d.name} · ${Planner.sessionFor(o.v, o.d.id).name} · ${o.g.group.name}`);
      } else {
        refreshStatus();
      }
    });
  }

  /* =====================================================================
     INICIO
     ===================================================================== */
  function home() {
    const demos = [
      { id: 'press-banca', tone: 'push', label: 'Push' },
      { id: 'dominadas', tone: 'pull', label: 'Pull' },
      { id: 'sentadilla', tone: 'legs', label: 'Legs' }
    ];
    let animator = null;

    const html = `
      <section class="hero">
        <div class="container hero-grid">
          <div class="hero-copy">
            <p class="eyebrow">${icon('split')}Plataforma educativa de entrenamiento de fuerza</p>
            <h1 class="hero-title" tabindex="-1">Entiende tu entrenamiento. <span>Entrena con propósito.</span></h1>
            <p class="hero-lead">Explora métodos de entrenamiento, aprende cómo ejecutar cada ejercicio y construye sesiones adaptadas a tus objetivos.</p>
            <div class="btn-row">
              <a class="btn btn-primary btn-lg" href="#/metodos">Explorar métodos ${icon('arrow-right')}</a>
              <a class="btn btn-secondary btn-lg" href="#/ejercicios">Explorar ejercicios</a>
            </div>
            <dl class="hero-stats">
              <div><dt>Métodos</dt><dd>${METHODS.length}</dd></div>
              <div><dt>Ejercicios animados</dt><dd>${EXERCISES.length}</dd></div>
              <div><dt>Temas para aprender</dt><dd>${LEARN_TOPICS.length}</dd></div>
            </dl>
          </div>
          <div class="hero-demo tone-push" id="hero-demo">
            <div class="demo-head">
              <span class="demo-label"><span class="live-dot"></span>Animación en vivo</span>
              <div class="seg seg-sm" role="group" aria-label="Elegir ejemplo">
                ${demos.map((d, i) => `<button type="button" class="seg-btn" data-action="hero-demo" data-ex="${d.id}" data-tone="${d.tone}" aria-pressed="${i === 0}">${d.label}</button>`).join('')}
              </div>
            </div>
            <div class="demo-stage" id="hero-stage"></div>
            <div class="demo-foot">
              <div>
                <p class="demo-ex" id="hero-ex">${esc(EXERCISE_INDEX[demos[0].id].name)}</p>
                <p class="demo-phase" id="hero-phase">Posición inicial</p>
              </div>
              <a class="btn btn-ghost btn-sm" id="hero-link" href="#/ejercicio/${demos[0].id}">Ver ficha ${icon('arrow-right')}</a>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          ${sectionHead({
            eyebrow: 'Métodos', title: 'Métodos de entrenamiento',
            text: 'Cada método reparte el trabajo de la semana de una forma distinta. Elige uno para ver sus días, sus sesiones y sus ejercicios.',
            link: `<a class="text-link" href="#/metodos">Ver todos y compararlos ${icon('arrow-right')}</a>`
          })}
          <div class="card-grid card-grid-methods">${METHODS.map(UI.methodCard).join('')}</div>
        </div>
      </section>

      <section class="section section-alt" id="goals-section">
        <div class="container">
          ${sectionHead({
            eyebrow: 'Objetivo', title: '¿Qué quieres conseguir?',
            text: 'Tu objetivo ajusta las recomendaciones de repeticiones, esfuerzo y descanso que verás en cada ejercicio.'
          })}
          <div class="card-grid card-grid-3" id="goal-cards">${goalCards()}</div>
          <div class="scale-card">
            <div class="scale-card-head">
              <h3>Los rangos se superponen</h3>
              <p>Las repeticiones son una orientación, no una regla. La adaptación depende también del esfuerzo, el volumen, la carga, la técnica y la recuperación.</p>
            </div>
            <div id="home-scale">${UI.repScale(WorkoutStore.getGoal())}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          ${sectionHead({ eyebrow: 'Cómo funciona', title: 'De la idea a tu sesión en seis pasos' })}
          <ol class="flow-path">
            ${[
              ['Elige un método', 'Push Pull Legs, Upper / Lower, Full Body…', 'layers'],
              ['Elige el día', 'Cada día tiene su tipo de sesión.', 'calendar'],
              ['Elige el músculo', 'Pecho, espalda, cuádriceps…', 'body'],
              ['Explora ejercicios', 'Animación, técnica y errores frecuentes.', 'eye'],
              ['Define tu objetivo', 'Fuerza, hipertrofia o resistencia.', 'target'],
              ['Construye tu sesión', 'Hasta 3 ejercicios por grupo.', 'list']
            ].map(([t, d, ic], i) => `<li class="flow-path-step"><span class="flow-path-num mono">${String(i + 1).padStart(2, '0')}</span>${icon(ic)}<strong>${t}</strong><span>${d}</span></li>`).join('')}
          </ol>
          <div class="btn-row center"><a class="btn btn-primary" href="#/metodos/ppl">Empezar con Push Pull Legs ${icon('arrow-right')}</a></div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          ${sectionHead({
            eyebrow: 'Aprende', title: 'Aprende los fundamentos',
            text: 'Conceptos clave explicados con claridad y sin afirmaciones absolutas.',
            link: `<a class="text-link" href="#/aprende">Ir a la biblioteca ${icon('arrow-right')}</a>`
          })}
          <div class="card-grid card-grid-3">${FUNDAMENTALS.map(id => UI.topicCard(LEARN_TOPICS.find(t => t.id === id))).join('')}</div>
        </div>
      </section>`;

    function startDemo(root, exId) {
      if (animator) animator.destroy();
      const ex = EXERCISE_INDEX[exId];
      animator = Animations.create(root.querySelector('#hero-stage'), ex, {
        onPhase: ph => { const el = root.querySelector('#hero-phase'); if (el) el.textContent = ph.label; }
      });
      root.querySelector('#hero-ex').textContent = ex.name;
      root.querySelector('#hero-link').setAttribute('href', `#/ejercicio/${ex.id}`);
      if (!prefersReducedMotion()) animator.play();
    }

    return {
      title: '',
      html,
      mount(root) {
        startDemo(root, demos[0].id);
        return () => animator && animator.destroy();
      },
      update(root) {
        root.querySelector('#goal-cards').innerHTML = goalCards();
        root.querySelector('#home-scale').innerHTML = UI.repScale(WorkoutStore.getGoal());
      },
      actions: {
        'hero-demo'(el) {
          const root = el.closest('.hero');
          root.querySelectorAll('[data-action="hero-demo"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
          const demo = root.querySelector('#hero-demo');
          demo.className = `hero-demo tone-${el.dataset.tone}`;
          startDemo(root, el.dataset.ex);
        },
        'set-goal'(el) {
          WorkoutStore.setGoal(el.dataset.goal);
          UI.toast(`Objetivo: ${GOALS[el.dataset.goal].name}. Las recomendaciones de cada ejercicio se adaptan a él.`);
        }
      }
    };
  }

  /* =====================================================================
     MÉTODOS (lista y comparativa)
     ===================================================================== */
  function methods() {
    const html = `
      <section class="page-head">
        <div class="container">
          <p class="eyebrow">Métodos</p>
          <h1 tabindex="-1">Métodos de entrenamiento</h1>
          <p class="lead">Un método organiza qué músculos entrenas cada día. Ninguno es universalmente mejor: la elección depende de tu disponibilidad, tu experiencia, tu recuperación y tus preferencias.</p>
        </div>
      </section>
      <section class="section">
        <div class="container method-list">
          ${METHODS.map(m => `
            <article class="method-row tone-${m.tone}">
              <div class="method-row-main">
                <span class="method-abbr">${esc(m.short)}</span>
                <h2><a href="#/metodos/${m.id}">${esc(m.name)}</a></h2>
                <p>${esc(m.tagline)}</p>
                <div class="chip-row" aria-label="Variantes">${m.variants.map(v => `<a class="chip" href="#/metodos/${m.id}/${v.id}">${icon('calendar')}${esc(v.name)}</a>`).join('')}</div>
              </div>
              <dl class="stat-list">
                <div><dt>Días por semana</dt><dd>${esc(m.stats.days)}</dd></div>
                <div><dt>Frecuencia por grupo</dt><dd>${esc(m.stats.frequency)}</dd></div>
                <div><dt>Duración por sesión</dt><dd>${esc(m.stats.duration)}</dd></div>
                <div><dt>Nivel orientativo</dt><dd>${esc(m.stats.level)}</dd></div>
              </dl>
              <div class="method-row-side">
                ${UI.weekStrip(m.variants[0])}
                <a class="btn btn-secondary" href="#/metodos/${m.id}">Ver método ${icon('arrow-right')}</a>
              </div>
            </article>`).join('')}
        </div>
      </section>
      <section class="section section-alt">
        <div class="container">
          ${sectionHead({ eyebrow: 'Comparativa', title: 'Comparativa rápida', text: 'Una vista general para orientarte. Los valores son habituales, no obligatorios.' })}
          <div class="table-wrap" tabindex="0" role="region" aria-label="Tabla comparativa de métodos">
            <table class="compare">
              <thead><tr><th scope="col">Método</th><th scope="col">Días / semana</th><th scope="col">Frecuencia por grupo</th><th scope="col">Duración</th><th scope="col">Complejidad</th><th scope="col">Destaca por</th></tr></thead>
              <tbody>${METHODS.map(m => `<tr class="tone-${m.tone}">
                <th scope="row"><a href="#/metodos/${m.id}"><span class="dot"></span>${esc(m.name)}</a></th>
                <td class="mono">${esc(m.compare.days)}</td><td class="mono">${esc(m.compare.frequency)}</td>
                <td>${esc(m.compare.duration)}</td><td>${esc(m.compare.complexity)}</td><td>${esc(m.compare.bestFor)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          <p class="callout">${icon('info')}<span>Cuando el volumen semanal es similar, las diferencias de resultados entre métodos suelen ser pequeñas. El mejor método suele ser el que puedes mantener con constancia.</span></p>
        </div>
      </section>`;
    return { title: 'Métodos', html };
  }

  /* =====================================================================
     DETALLE DE UN MÉTODO
     ===================================================================== */
  function method({ id, variant: variantId }) {
    const m = Planner.method(id);
    if (!m) return notFound();
    const v = variantId ? Planner.variant(m, variantId) : m.variants[0];
    if (!v) return notFound();

    const freq = Planner.weeklyFrequency(v);
    const maxFreq = Math.max(3, ...Object.values(freq));
    const sessionTypes = [...new Set(Object.values(v.schedule))].map(sid => SESSION_TYPES[sid]);
    const navItems = [
      ['que-es', '¿Qué es?'], ['como-funciona', 'Cómo funciona'], ['ventajas', 'Ventajas'],
      ['para-quien', 'Para quién'], ['semana', 'Semana'], ['frecuencia', 'Frecuencia'], ['preguntas', 'Preguntas']
    ];

    const calendar = DAYS.map(day => {
      const s = Planner.sessionFor(v, day.id);
      if (s.id === 'rest') {
        return `<div class="day-tile is-rest">
          <span class="day-name">${day.name}</span>
          <span class="day-session">${icon('moon')}Descanso</span>
          <span class="day-groups">Recuperación</span>
        </div>`;
      }
      const p = Planner.sessionProgress(m.id, v.id, day.id);
      return `<a class="day-tile tone-${s.tone}${p.complete ? ' is-complete' : ''}" href="${sessionHref(m.id, v.id, day.id)}">
        <span class="day-name">${day.name}</span>
        <span class="day-session">${esc(s.name)}</span>
        <span class="day-groups">${p.perGroup.map(g => esc(g.group.short || g.group.name)).join(' · ')}</span>
        <span class="day-progress">${UI.progress(p.done, p.total, `${day.name}: ${p.done} ejercicios`)}<small>${p.complete ? icon('check') + 'Sesión lista' : UI.plural(p.done, 'ejercicio', 'ejercicios')}</small></span>
        <span class="day-cta">${p.done ? 'Editar sesión' : 'Construir sesión'}${icon('arrow-right')}</span>
      </a>`;
    }).join('');

    const html = `
      <section class="page-head tone-${m.tone} method-head">
        <div class="container">
          ${UI.breadcrumb([{ label: 'Métodos', href: '#/metodos' }, { label: m.name }])}
          <div class="method-head-grid">
            <div>
              <p class="eyebrow">Método · ${esc(m.short)}</p>
              <h1 tabindex="-1">${esc(m.name)}</h1>
              <p class="lead">${esc(m.tagline)}</p>
            </div>
            <dl class="stat-list stat-list-head">
              <div><dt>Días por semana</dt><dd>${esc(m.stats.days)}</dd></div>
              <div><dt>Frecuencia por grupo</dt><dd>${esc(m.stats.frequency)}</dd></div>
              <div><dt>Duración por sesión</dt><dd>${esc(m.stats.duration)}</dd></div>
              <div><dt>Nivel orientativo</dt><dd>${esc(m.stats.level)}</dd></div>
            </dl>
          </div>
          <nav class="local-nav" aria-label="Secciones de esta página">
            ${navItems.map(([target, label]) => `<button type="button" data-action="scroll-to" data-target="${target}">${label}</button>`).join('')}
          </nav>
        </div>
      </section>

      <section class="section">
        <div class="container content-grid">
          <div class="prose" id="que-es">
            <h2>¿Qué es?</h2>
            ${m.what.map(p => `<p>${esc(p)}</p>`).join('')}
          </div>
          <div class="prose" id="como-funciona">
            <h2>¿Cómo funciona?</h2>
            ${m.how.map(p => `<p>${esc(p)}</p>`).join('')}
          </div>
        </div>
        <div class="container">
          <div class="session-types">
            ${sessionTypes.map(s => `<div class="session-type tone-${s.tone}">
              <p class="session-type-name">${esc(s.name)} <span>${esc(s.subtitle)}</span></p>
              <p>${esc(s.description)}</p>
              <div class="chip-row">${Planner.groupsOf(s).map(g => `<span class="chip chip-static">${esc(g.group.name)}</span>`).join('')}</div>
            </div>`).join('')}
          </div>
        </div>
      </section>

      <section class="section section-alt" id="ventajas">
        <div class="container two-col">
          <div class="pros-card">
            <h2>${icon('check')}Ventajas</h2>
            <ul class="list-check">${m.advantages.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
          </div>
          <div class="cons-card">
            <h2>${icon('alert')}Desventajas</h2>
            <ul class="list-x">${m.disadvantages.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
          </div>
        </div>
      </section>

      <section class="section" id="para-quien">
        <div class="container content-grid">
          <div class="prose">
            <h2>¿Para quién puede ser útil?</h2>
            ${m.forWhom.map(p => `<p>${esc(p)}</p>`).join('')}
          </div>
          <div class="aside-card">
            <h3>Puede no ser la mejor opción si…</h3>
            <ul class="list-dot">${m.notIdeal.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
          </div>
        </div>
      </section>

      <section class="section section-alt" id="semana">
        <div class="container">
          ${sectionHead({ eyebrow: 'Estructura semanal', title: 'Tu semana con ' + m.name, text: 'Elige una variante y entra en un día para construir esa sesión.' })}
          ${m.variants.length > 1 ? `<div class="seg variant-tabs" role="group" aria-label="Variantes del método">
            ${m.variants.map(x => `<a class="seg-btn" href="#/metodos/${m.id}/${x.id}" aria-current="${x.id === v.id ? 'true' : 'false'}">${esc(x.name)}</a>`).join('')}
          </div>` : ''}
          <p class="variant-desc">${icon('info')}${esc(v.description)}</p>
          <div class="week-calendar">${calendar}</div>
        </div>
      </section>

      <section class="section" id="frecuencia">
        <div class="container content-grid">
          <div class="prose">
            <h2>Frecuencia por grupo muscular</h2>
            <p>Número de sesiones por semana en las que trabaja cada grupo con la variante <strong>${esc(v.name)}</strong>. Entrenar un músculo más veces permite repartir su volumen semanal en sesiones menos largas.</p>
            <p class="muted">Muchos músculos también reciben trabajo indirecto: por ejemplo, el tríceps participa en los empujes de pecho.</p>
          </div>
          <div class="freq-chart">
            ${GROUP_ORDER.filter(g => freq[g]).map(g => `<div class="freq-row tone-${UI.toneOfGroup(g)}">
              <span class="freq-name">${esc(MUSCLE_GROUPS[g].name)}</span>
              <span class="freq-bar"><span style="width:${(freq[g] / maxFreq) * 100}%"></span></span>
              <span class="freq-val mono">${freq[g]}×</span>
            </div>`).join('')}
            <p class="freq-caption">Veces por semana</p>
          </div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container two-col">
          <div class="aside-card">
            <h3>${icon('moon')}Recuperación</h3>
            <ul class="list-dot">${m.recovery.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
          </div>
          <div class="aside-card">
            <h3>${icon('stairs')}Cómo progresar</h3>
            <ul class="list-dot">${m.progression.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
          </div>
        </div>
      </section>

      <section class="section" id="preguntas">
        <div class="container narrow">
          <h2>Preguntas frecuentes</h2>
          <div class="faq-list">${m.faq.map(f => `<details class="faq"><summary>${esc(f.q)}${icon('chevron-down')}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          <h2 class="h3">Otros métodos</h2>
          <div class="chip-row">${METHODS.filter(x => x.id !== m.id).map(x => `<a class="chip chip-lg tone-${x.tone}" href="#/metodos/${x.id}"><span class="dot"></span>${esc(x.name)}</a>`).join('')}</div>
        </div>
      </section>`;

    return {
      title: m.name,
      html,
      reactive: true,
      actions: { 'scroll-to': el => scrollToId(el.dataset.target) }
    };
  }

  /* =====================================================================
     SESIÓN DE UN DÍA (selección de ejercicios)
     ===================================================================== */
  function session({ id, variant: variantId, day: dayId, group: groupId }) {
    const m = Planner.method(id);
    const v = Planner.variant(m, variantId);
    if (!v || !v.schedule[dayId]) return notFound();
    const day = DAYS.find(d => d.id === dayId);
    const p = Planner.sessionProgress(m.id, v.id, dayId);
    const s = p.session;
    if (!groupId) return { redirect: sessionHref(m.id, v.id, dayId, p.perGroup[0].id) };
    const g = p.perGroup.find(x => x.id === groupId);
    if (!g) return notFound();

    const ctx = { m: m.id, v: v.id, d: dayId, g: g.id };
    const selected = WorkoutStore.getGroup(m.id, v.id, dayId, g.id);
    const exercises = Planner.exercisesFor(g.id);
    const idx = p.perGroup.indexOf(g);
    const next = p.perGroup[idx + 1];
    const readyGroups = p.perGroup.filter(x => x.ready).length;

    // Otros días con la misma sesión y ejercicios elegidos (para copiar)
    const copySources = !p.done ? Planner.trainingDays(v).filter(d =>
      d.id !== dayId && v.schedule[d.id] === s.id && Object.keys(WorkoutStore.getSelection(m.id, v.id, d.id)).length) : [];

    const limitText = g.full
      ? `Has alcanzado el máximo de ${g.max} ejercicios para ${g.group.name.toLowerCase()}. Quita uno para elegir otro.`
      : `Elige hasta ${g.max} ejercicios.${g.min > 0 ? ` Necesitas al menos ${g.min} para completar el grupo.` : ''}`;

    const html = `
      <section class="page-head tone-${s.tone} session-head">
        <div class="container">
          ${UI.breadcrumb([
            { label: 'Métodos', href: '#/metodos' },
            { label: m.name, href: `#/metodos/${m.id}/${v.id}` },
            { label: `${day.name} · ${s.name}` }
          ])}
          <div class="session-head-grid">
            <div>
              <p class="eyebrow">${esc(m.name)} · ${esc(v.name)}</p>
              <h1 class="session-title" tabindex="-1"><span>${day.name}</span><span class="sep" aria-hidden="true">·</span><span class="tone-text">${esc(s.name)}</span></h1>
              <p class="lead">${esc(s.description)}</p>
              <p class="muscles-line"><span>Músculos principales</span>${p.perGroup.map(x => `<span class="chip chip-static tone-${UI.toneOfGroup(x.id)}"><span class="dot"></span>${esc(x.group.name)}</span>`).join('')}</p>
            </div>
            <div class="session-progress-card">
              <span class="label">Progreso de la sesión</span>
              <p class="big-num mono"><strong>${p.done}</strong> / ${p.total}</p>
              ${UI.progress(p.done, p.total, 'Ejercicios seleccionados en la sesión')}
              <span class="muted">${readyGroups} de ${p.perGroup.length} grupos listos</span>
            </div>
          </div>
          ${Planner.trainingDays(v).length > 1 ? `<nav class="day-switch" aria-label="Otros días de ${esc(v.name)}">
            ${Planner.trainingDays(v).map(d => {
              const ds = Planner.sessionFor(v, d.id);
              return `<a class="day-chip tone-${ds.tone}" href="${sessionHref(m.id, v.id, d.id)}" aria-current="${d.id === dayId ? 'page' : 'false'}"><b>${d.short}</b>${esc(ds.name)}</a>`;
            }).join('')}
          </nav>` : ''}
        </div>
      </section>

      <section class="section session-body">
        <div class="container session-layout">
          <div class="session-main">
            <div class="group-picker" id="group-picker">
              ${p.perGroup.map(x => `<a class="group-card tone-${UI.toneOfGroup(x.id)}${x.id === g.id ? ' is-current' : ''}" href="${sessionHref(m.id, v.id, dayId, x.id)}" aria-current="${x.id === g.id ? 'true' : 'false'}">
                <span class="group-card-top"><span class="group-name">${esc(x.group.name)}</span>
                <span class="group-state ${x.full ? 'is-full' : x.ready ? 'is-ready' : ''}">${x.full ? icon('check') + 'Completo' : x.ready ? icon('check') + 'Listo' : 'Pendiente'}</span></span>
                <span class="group-count mono">${x.count} / ${x.max}</span>
                ${UI.progress(x.count, x.max, `${x.group.name}: ${x.count} de ${x.max}`)}
              </a>`).join('')}
            </div>

            <div class="group-panel tone-${UI.toneOfGroup(g.id)}" id="group-panel">
              <div class="group-panel-head">
                <div>
                  <h2 id="group-title" tabindex="-1">${esc(g.group.name)}</h2>
                  <p>${esc(g.group.role)}</p>
                </div>
                <div class="counter${g.full ? ' is-full' : ''}" aria-live="polite">
                  <p><strong class="mono">${g.count} / ${g.max}</strong> ejercicios seleccionados</p>
                  ${UI.progress(g.count, g.max, `Ejercicios seleccionados de ${g.group.name}`)}
                </div>
              </div>
              <p class="limit-note${g.full ? ' is-full' : ''}" id="limit-note">${icon(g.full ? 'check' : 'info')}<span>${esc(limitText)}</span></p>
              ${s.hint ? `<p class="hint">${icon('bolt')}<span>${esc(s.hint)}</span></p>` : ''}
              <div class="ex-grid">
                ${exercises.map((ex, i) => UI.exerciseCard(ex, {
                  ctx, index: i,
                  selected: selected.includes(ex.id),
                  disabled: g.full && !selected.includes(ex.id)
                })).join('')}
              </div>
              ${next && g.ready ? `<div class="group-next"><a class="btn btn-secondary" href="${sessionHref(m.id, v.id, dayId, next.id)}">Siguiente grupo: ${esc(next.group.name)} ${icon('arrow-right')}</a></div>` : ''}
            </div>
          </div>

          <aside class="session-summary" aria-labelledby="summary-title">
            <h2 id="summary-title">Tu sesión</h2>
            <p class="summary-sub tone-${s.tone}"><span class="dot"></span>${day.name} · ${esc(s.name)}</p>
            ${p.perGroup.map(x => {
              const list = WorkoutStore.getGroup(m.id, v.id, dayId, x.id);
              return `<div class="summary-group">
                <h3>${esc(x.group.name)} <span class="mono">${x.count}/${x.max}</span></h3>
                ${list.length ? `<ol>${list.map(exId => {
                  const ex = EXERCISE_INDEX[exId];
                  return `<li><a href="${UI.exerciseHref(ex, { ...ctx, g: x.id })}">${esc(ex.name)}</a>
                    <button type="button" class="icon-btn" data-action="remove-exercise" data-g="${x.id}" data-ex="${ex.id}" aria-label="Quitar ${esc(ex.name)}">${icon('x')}</button></li>`;
                }).join('')}</ol>` : '<p class="summary-empty">Sin ejercicios todavía</p>'}
              </div>`;
            }).join('')}
            ${copySources.map(d => `<button type="button" class="btn btn-ghost btn-block" data-action="copy-session" data-from="${d.id}">${icon('copy')}<span>Copiar la selección del ${d.name.toLowerCase()}</span></button>`).join('')}
            ${p.complete
              ? `<a class="btn btn-primary btn-block" href="#/mi-entrenamiento${UI.query({ m: m.id, v: v.id, focus: dayId })}">Ver mi sesión ${icon('arrow-right')}</a>`
              : `<p class="summary-hint">${icon('info')}<span>Elige al menos ${p.perGroup[0].min} ${p.perGroup[0].min === 1 ? 'ejercicio' : 'ejercicios'} en cada grupo para ver tu sesión.</span></p>`}
            ${p.done ? `<button type="button" class="btn btn-ghost btn-block btn-danger-text" data-action="clear-session">${icon('trash')}<span>Limpiar sesión</span></button>` : ''}
          </aside>
        </div>
      </section>`;

    return {
      title: `${day.name} · ${s.name} · ${g.group.name}`,
      html,
      reactive: true,
      mount(root) {
        // En móvil los grupos se desplazan en horizontal: centra el grupo actual
        const picker = root.querySelector('#group-picker');
        const cur = picker && picker.querySelector('.is-current');
        if (cur && picker.scrollWidth > picker.clientWidth) {
          picker.scrollLeft = cur.offsetLeft - (picker.clientWidth - cur.clientWidth) / 2;
        }
      },
      scrollKey: `session:${m.id}/${v.id}/${dayId}`,
      focusTarget: '#group-title',
      actions: {
        'toggle-exercise'(el) {
          const before = Planner.sessionProgress(m.id, v.id, dayId);
          const result = WorkoutStore.toggle(m.id, v.id, dayId, g.id, el.dataset.ex, g.max);
          if (result === 'full') {
            UI.toast(`Máximo de ${g.max} ejercicios para ${g.group.name.toLowerCase()}. Quita uno para cambiarlo.`, 'error');
            return;
          }
          const after = Planner.sessionProgress(m.id, v.id, dayId);
          const ga = after.perGroup.find(x => x.id === g.id);
          if (after.complete && !before.complete) UI.toast('Sesión lista. Ya puedes ver tu sesión completa.');
          else if (ga.full && result === 'added') UI.toast(`${g.group.name}: ${ga.count} / ${ga.max} ejercicios seleccionados.`);
        },
        'remove-exercise'(el) {
          WorkoutStore.remove(m.id, v.id, dayId, el.dataset.g, el.dataset.ex);
        },
        'copy-session'(el) {
          WorkoutStore.copySession(m.id, v.id, el.dataset.from, dayId);
          UI.toast('Selección copiada. Puedes cambiarla cuando quieras.');
        },
        async 'clear-session'() {
          const ok = await UI.confirm({
            title: 'Limpiar sesión',
            text: `Se quitarán todos los ejercicios del ${day.name.toLowerCase()} (${s.name}).`,
            confirmLabel: 'Limpiar sesión', danger: true
          });
          if (ok) { WorkoutStore.clearSession(m.id, v.id, dayId); UI.toast('Sesión vaciada.'); }
        }
      }
    };
  }

  /* =====================================================================
     FICHA DE EJERCICIO
     ===================================================================== */
  function goalPanel(ex, goalId) {
    const g = GOALS[goalId];
    const fits = ex.goals.includes(goalId);
    const reasons = {
      fuerza: 'En ejercicios de aislamiento, las cargas muy altas suelen ser poco prácticas y más exigentes para las articulaciones. Es más habitual usarlos con rangos moderados y apoyar la fuerza con ejercicios compuestos.',
      hipertrofia: 'Puede usarse, pero otros ejercicios permiten acercarse al fallo con más seguridad.',
      resistencia: 'Con series muy largas, la técnica de este ejercicio tiende a degradarse con la fatiga. Elige otro ejercicio para este objetivo o usa rangos moderados.'
    };
    return `<div class="goal-panel goal-${goalId}">
      <div class="goal-panel-head">
        <span class="goal-icon">${icon(GOAL_ICONS[goalId])}</span>
        <div><h3>${esc(g.name)}</h3><p>${esc(g.summary)}</p></div>
      </div>
      ${fits ? '' : `<p class="callout callout-warn">${icon('alert')}<span>${esc(reasons[goalId])}</span></p>`}
      <dl class="rx-grid">
        <div class="rx-main"><dt>${icon('repeat')}Repeticiones orientativas</dt><dd class="mono">${esc(Planner.repsFor(ex, goalId))}</dd></div>
        <div><dt>${icon('layers')}Series</dt><dd>${esc(g.sets)}</dd></div>
        <div><dt>${icon('flame')}Esfuerzo</dt><dd>${esc(g.effort)}</dd></div>
        <div><dt>${icon('clock')}Descanso</dt><dd>${esc(g.rest)}</dd></div>
        <div><dt>${icon('dumbbell')}Carga</dt><dd>${esc(g.load)}</dd></div>
        <div><dt>${icon('speed')}Ritmo</dt><dd>${esc(g.tempo)}</dd></div>
      </dl>
      <ul class="list-check goal-keys">${g.keys.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
      <p class="callout">${icon('info')}<span>${esc(g.caution)}</span></p>
      ${UI.repScale(goalId)}
    </div>`;
  }

  function exercise({ id }, q) {
    const ex = EXERCISE_INDEX[id];
    if (!ex) return notFound();
    const vc = Planner.validContext(q);
    const ctx = vc ? { m: q.m, v: q.v, d: q.d, g: q.g } : null;
    const tone = ctx ? UI.toneOfGroup(ctx.g) : UI.toneOfExercise(ex);
    const phases = Animations.phases(ex);
    const stepOrder = ['prep', ...phases.map(p => p.key)];
    const groupForRelated = ctx ? ctx.g : ex.groups[0];
    const related = Planner.exercisesFor(groupForRelated).filter(e => e.id !== ex.id);
    let animator = null;
    let speedIdx = 1;
    const SPEEDS = [0.5, 1];

    function selectCard() {
      if (ctx) {
        const list = WorkoutStore.getGroup(ctx.m, ctx.v, ctx.d, ctx.g);
        const selected = list.includes(ex.id);
        const full = list.length >= vc.group.max;
        return `<h2>Tu sesión</h2>
          <p class="select-ctx tone-${vc.session.tone}"><span class="dot"></span>${vc.day.name} · ${esc(vc.session.name)} · ${esc(vc.group.group.name)}</p>
          <div class="counter${full ? ' is-full' : ''}">
            <p><strong class="mono">${list.length} / ${vc.group.max}</strong> ejercicios seleccionados</p>
            ${UI.progress(list.length, vc.group.max, 'Ejercicios seleccionados en el grupo')}
          </div>
          <button type="button" class="btn btn-select btn-block${selected ? ' is-selected' : ''}" data-action="ctx-toggle" data-focus="ctx-toggle" aria-pressed="${selected}" ${full && !selected ? 'disabled' : ''}>
            ${selected ? icon('check') + '<span>Seleccionado · pulsa para quitar</span>' : icon('plus') + '<span>Seleccionar ejercicio</span>'}
          </button>
          ${full && !selected ? `<p class="limit-note is-full">${icon('info')}<span>Ya tienes ${vc.group.max} ejercicios de ${esc(vc.group.group.name.toLowerCase())}. Quita uno en la sesión para añadir este.</span></p>` : ''}
          <a class="btn btn-ghost btn-block" href="${sessionHref(ctx.m, ctx.v, ctx.d, ctx.g)}">${icon('arrow-left')}<span>Volver a ${esc(vc.group.group.name.toLowerCase())}</span></a>`;
      }
      const inPlans = WorkoutStore.plans().filter(p => Object.values(p.groups).some(ids => ids.includes(ex.id))).length;
      return `<h2>Añádelo a tu entrenamiento</h2>
        <p class="muted">Elige el método, el día y el grupo muscular donde quieres incluirlo.</p>
        <button type="button" class="btn btn-primary btn-block" data-action="open-add" data-ex="${ex.id}" data-focus="open-add-main">${icon('plus')}<span>Añadir a una sesión</span></button>
        ${inPlans ? `<p class="muted small">${icon('check')}Está en ${UI.plural(inPlans, 'de tus sesiones', 'de tus sesiones')}. <a href="#/mi-entrenamiento">Ver mi entrenamiento</a></p>` : ''}`;
    }

    const goal = WorkoutStore.getGoal();
    const crumbs = ctx
      ? [{ label: 'Métodos', href: '#/metodos' },
         { label: vc.method.name, href: `#/metodos/${ctx.m}/${ctx.v}` },
         { label: `${vc.day.name} · ${vc.session.name}`, href: sessionHref(ctx.m, ctx.v, ctx.d, ctx.g) },
         { label: ex.name }]
      : [{ label: 'Ejercicios', href: '#/ejercicios' }, { label: ex.name }];

    const html = `
      <section class="page-head tone-${tone} ex-head">
        <div class="container">
          ${UI.breadcrumb(crumbs)}
          <div class="tag-row">
            ${ex.groups.map(gid => `<a class="chip tone-${UI.toneOfGroup(gid)}" href="#/ejercicios${UI.query({ grupo: gid })}"><span class="dot"></span>${esc(MUSCLE_GROUPS[gid].name)}</a>`).join('')}
            <span class="tag">${esc(ex.movement)}</span>
          </div>
          <h1 tabindex="-1">${esc(ex.name)}</h1>
          <p class="lead">${esc(ex.description)}</p>
        </div>
      </section>

      <section class="section ex-top">
        <div class="container ex-layout">
          <div class="anim-card tone-${tone}">
            <div class="anim-head">
              <span class="anim-view">${icon('eye')}${Animations.viewLabel(ex)}</span>
              <span class="anim-legend"><span><i class="lg-p"></i>Principal</span><span><i class="lg-s"></i>Secundario</span></span>
            </div>
            <div class="anim-stage" id="anim-stage"></div>
            <div class="anim-controls">
              <button type="button" class="btn btn-primary" data-action="anim-toggle" id="anim-toggle">${icon('play')}<span>Reproducir</span></button>
              <button type="button" class="btn btn-ghost" data-action="anim-restart">${icon('restart')}<span>Reiniciar</span></button>
              <button type="button" class="btn btn-ghost" data-action="anim-speed" id="anim-speed" aria-label="Velocidad de la animación: normal">${icon('speed')}<span>1×</span></button>
            </div>
            <ol class="phase-track" aria-label="Fases del movimiento">
              ${phases.map((ph, i) => `<li><button type="button" class="phase-chip" data-action="anim-seek" data-phase="${ph.key}">
                <span class="phase-num mono">${i + 1}</span><span class="phase-name">${esc(ph.label)}</span><span class="phase-type">${PHASE_TYPES[ph.key]}</span>
              </button></li>`).join('')}
            </ol>
            <p class="sr-only" id="anim-status" aria-live="polite"></p>
          </div>

          <aside class="ex-aside">
            <div class="info-card">
              <h2>Información rápida</h2>
              <dl class="info-list">
                <div><dt>Músculo principal</dt><dd>${esc(ex.primary.join(', '))}</dd></div>
                <div><dt>Músculos secundarios</dt><dd>${ex.secondary.length ? esc(ex.secondary.join(', ')) : '—'}</dd></div>
                <div><dt>Equipamiento</dt><dd>${esc(ex.equipmentLabel)}</dd></div>
                <div><dt>Dificultad</dt><dd>${UI.difficulty(ex.difficulty)}</dd></div>
                <div><dt>Tipo de movimiento</dt><dd>${esc(ex.movement)}</dd></div>
                <div><dt>Categoría</dt><dd>${ex.category === 'compuesto' ? 'Compuesto (varias articulaciones)' : 'Aislamiento (una articulación)'}</dd></div>
              </dl>
            </div>
            <div class="select-card tone-${tone}" id="select-card">${selectCard()}</div>
          </aside>
        </div>
      </section>

      <section class="section">
        <div class="container ex-content">
          <section class="block" aria-labelledby="h-tech">
            <h2 id="h-tech">Cómo hacerlo</h2>
            <p class="muted">Los pasos se resaltan mientras la animación avanza por cada fase.</p>
            <ol class="steps" id="steps">
              ${stepOrder.map((k, i) => `<li class="step" data-phase="${k}">
                <span class="step-num mono">${i + 1}</span>
                <div><h3>${STEP_TITLES[k]}</h3><p>${esc(ex.steps[k])}</p></div>
              </li>`).join('')}
            </ol>
          </section>

          <div class="two-col">
            <section class="block cons-card" aria-labelledby="h-mistakes">
              <h2 id="h-mistakes">${icon('alert')}Errores frecuentes</h2>
              <ul class="list-x">${ex.mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            </section>
            <section class="block pros-card" aria-labelledby="h-tips">
              <h2 id="h-tips">${icon('check')}Recomendaciones</h2>
              <ul class="list-check">${ex.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            </section>
          </div>

          <section class="block goal-block" aria-labelledby="h-goal">
            <h2 id="h-goal">Elige tu objetivo</h2>
            <p class="muted">Las recomendaciones cambian según lo que quieras priorizar. Tu elección se guarda y se aplica también al resto de ejercicios.</p>
            <div class="seg" role="radiogroup" aria-labelledby="h-goal" id="goal-seg">
              ${GOAL_ORDER.map(gid => `<button type="button" role="radio" class="seg-btn" aria-checked="${gid === goal}" data-action="ex-goal" data-goal="${gid}">${icon(GOAL_ICONS[gid])}${esc(UI.goalName(gid))}</button>`).join('')}
            </div>
            <div id="goal-panel">${goalPanel(ex, goal)}</div>
          </section>

          <section class="block tension-block" aria-labelledby="h-tension">
            <p class="eyebrow">Concepto clave</p>
            <h2 id="h-tension">Tensión mecánica</h2>
            <div class="tension-grid">
              <div><h3>Dónde es mayor la demanda</h3><p>${esc(ex.tension.where)}</p></div>
              <div><h3>Cómo aprovecharla</h3><p>${esc(ex.tension.cue)}</p></div>
            </div>
            ${tensionFlow(true)}
            <p class="callout">${icon('info')}<span>Más peso no garantiza un mejor estímulo: si la técnica, el recorrido o el control empeoran, la tensión sobre el músculo objetivo puede disminuir.</span></p>
            <a class="text-link" href="#/aprende/tension-mecanica">Leer más sobre tensión mecánica ${icon('arrow-right')}</a>
          </section>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          ${sectionHead({
            title: `Más ejercicios de ${MUSCLE_GROUPS[groupForRelated].name.toLowerCase()}`,
            text: ctx ? 'Puedes seleccionarlos directamente para tu sesión.' : ''
          })}
          <div class="ex-grid ex-grid-tight">${related.map(e => {
            if (!ctx) return UI.exerciseCard(e, { showAdd: true });
            const list = WorkoutStore.getGroup(ctx.m, ctx.v, ctx.d, ctx.g);
            return UI.exerciseCard(e, { ctx, selected: list.includes(e.id), disabled: list.length >= vc.group.max && !list.includes(e.id) });
          }).join('')}</div>
        </div>
      </section>
      <p class="disclaimer container">${icon('shield')}<span>Información educativa y general. No sustituye la valoración de un profesional sanitario o del ejercicio. Si tienes una lesión o una condición médica, consulta antes de entrenar.</span></p>`;

    function setToggle(root, playing) {
      const btn = root.querySelector('#anim-toggle');
      if (!btn) return;
      btn.innerHTML = playing ? `${icon('pause')}<span>Pausar</span>` : `${icon('play')}<span>Reproducir</span>`;
      btn.setAttribute('aria-label', playing ? 'Pausar animación' : 'Reproducir animación');
    }

    return {
      title: ex.name,
      html,
      mount(root) {
        animator = Animations.create(root.querySelector('#anim-stage'), ex, {
          onPhase: ph => {
            root.querySelectorAll('.phase-chip').forEach(c => c.setAttribute('aria-current', String(c.dataset.phase === ph.key)));
            root.querySelectorAll('.step').forEach(s => s.classList.toggle('is-active', s.dataset.phase === ph.key));
          },
          onState: playing => setToggle(root, playing)
        });
        if (!prefersReducedMotion()) animator.play();
        return () => animator && animator.destroy();
      },
      update(root) {
        root.querySelector('#select-card').innerHTML = selectCard();
        const goalNow = WorkoutStore.getGoal();
        root.querySelectorAll('#goal-seg .seg-btn').forEach(b => b.setAttribute('aria-checked', String(b.dataset.goal === goalNow)));
        root.querySelector('#goal-panel').innerHTML = goalPanel(ex, goalNow);
        if (ctx) {
          const list = WorkoutStore.getGroup(ctx.m, ctx.v, ctx.d, ctx.g);
          root.querySelectorAll('.ex-grid .btn-select').forEach(b => {
            const sel = list.includes(b.dataset.ex);
            b.classList.toggle('is-selected', sel);
            b.closest('.ex-card').classList.toggle('is-selected', sel);
            b.setAttribute('aria-pressed', String(sel));
            b.disabled = !sel && list.length >= vc.group.max;
            b.innerHTML = sel ? icon('check') + '<span>Seleccionado</span>' : icon('plus') + '<span>Seleccionar</span>';
          });
        }
      },
      actions: {
        'anim-toggle': () => animator.toggle(),
        'anim-restart': () => animator.restart(),
        'anim-speed'(el) {
          speedIdx = (speedIdx + 1) % SPEEDS.length;
          animator.setSpeed(SPEEDS[speedIdx]);
          el.querySelector('span').textContent = SPEEDS[speedIdx] === 1 ? '1×' : '0,5×';
          el.setAttribute('aria-label', `Velocidad de la animación: ${SPEEDS[speedIdx] === 1 ? 'normal' : 'lenta'}`);
        },
        'anim-seek'(el) {
          animator.seek(el.dataset.phase);
          const status = document.getElementById('anim-status');
          if (status) status.textContent = `Fase: ${el.querySelector('.phase-name').textContent}. Animación en pausa.`;
        },
        'ex-goal'(el) { WorkoutStore.setGoal(el.dataset.goal); },
        'ctx-toggle'() {
          const result = WorkoutStore.toggle(ctx.m, ctx.v, ctx.d, ctx.g, ex.id, vc.group.max);
          if (result === 'added') UI.toast(`${ex.name} añadido a ${vc.day.name} · ${vc.session.name}.`);
          else if (result === 'removed') UI.toast(`${ex.name} quitado de la sesión.`);
          else UI.toast(`Máximo de ${vc.group.max} ejercicios para este grupo.`, 'error');
        },
        'toggle-exercise'(el) {
          const result = WorkoutStore.toggle(ctx.m, ctx.v, ctx.d, ctx.g, el.dataset.ex, vc.group.max);
          if (result === 'full') UI.toast(`Máximo de ${vc.group.max} ejercicios para este grupo.`, 'error');
        },
        'open-add'(el) { openAddDialog(EXERCISE_INDEX[el.dataset.ex]); }
      }
    };
  }

  /* =====================================================================
     CATÁLOGO DE EJERCICIOS CON FILTROS
     ===================================================================== */
  const filters = { q: '', group: 'all', equip: 'all', diff: 'all', goal: 'all' };
  const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function filterExercises() {
    const q = normalize(filters.q.trim());
    return EXERCISES.filter(ex => {
      if (filters.group !== 'all' && !ex.groups.includes(filters.group)) return false;
      if (filters.equip !== 'all' && !ex.equipment.includes(filters.equip)) return false;
      if (filters.diff !== 'all' && ex.difficulty !== filters.diff) return false;
      if (filters.goal !== 'all' && !ex.goals.includes(filters.goal)) return false;
      if (!q) return true;
      const haystack = normalize([
        ex.name, ex.movement, ex.equipmentLabel, ...ex.primary, ...ex.secondary,
        ...ex.groups.map(g => MUSCLE_GROUPS[g].name)
      ].join(' '));
      return q.split(/\s+/).every(word => haystack.includes(word));
    });
  }

  function exercises(q) {
    if (q.grupo && MUSCLE_GROUPS[q.grupo]) {
      Object.assign(filters, { q: '', group: q.grupo, equip: 'all', diff: 'all', goal: 'all' });
    }
    const select = (id, label, value, opts) => `<div class="field"><label for="${id}">${label}</label>
      <div class="select-wrap"><select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${v === value ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>${icon('chevron-down')}</div></div>`;

    const html = `
      <section class="page-head">
        <div class="container">
          <p class="eyebrow">Biblioteca</p>
          <h1 tabindex="-1">Ejercicios</h1>
          <p class="lead">${EXERCISES.length} ejercicios con animación, técnica paso a paso, errores frecuentes y recomendaciones según tu objetivo.</p>
        </div>
      </section>
      <section class="section">
        <div class="container">
          <form class="filters" id="filters" role="search" aria-label="Buscar y filtrar ejercicios">
            <div class="field field-search"><label for="f-q">Buscar</label>
              <div class="input-icon">${icon('search')}<input id="f-q" type="search" placeholder="Nombre, músculo o equipamiento" value="${esc(filters.q)}" autocomplete="off"></div></div>
            ${select('f-group', 'Grupo muscular', filters.group, [['all', 'Todos'], ...GROUP_ORDER.map(g => [g, MUSCLE_GROUPS[g].name])])}
            ${select('f-equip', 'Equipamiento', filters.equip, [['all', 'Todos'], ...Object.entries(EQUIPMENT)])}
            ${select('f-diff', 'Dificultad', filters.diff, [['all', 'Todas'], ...Object.entries(DIFFICULTIES).map(([k, d]) => [k, d.name])])}
            ${select('f-goal', 'Objetivo', filters.goal, [['all', 'Todos'], ...GOAL_ORDER.map(g => [g, UI.goalName(g)])])}
          </form>
          <div class="results-bar">
            <p id="results-count" aria-live="polite"></p>
            <button type="button" class="btn btn-ghost btn-sm" data-action="clear-filters" id="clear-filters">${icon('x')}<span>Limpiar filtros</span></button>
          </div>
          <div class="ex-grid" id="results"></div>
        </div>
      </section>`;

    function renderResults(root) {
      const list = filterExercises();
      const active = filters.q || ['group', 'equip', 'diff', 'goal'].some(k => filters[k] !== 'all');
      root.querySelector('#results-count').textContent = `${UI.plural(list.length, 'ejercicio', 'ejercicios')}${active ? ' con los filtros actuales' : ''}`;
      root.querySelector('#clear-filters').hidden = !active;
      root.querySelector('#results').innerHTML = list.length
        ? list.map((ex, i) => UI.exerciseCard(ex, { showAdd: true, index: Math.min(i, 8) })).join('')
        : UI.emptyState({
          iconName: 'search', title: 'Sin resultados',
          text: filters.q ? `No hay ejercicios que coincidan con «${filters.q}» y los filtros elegidos.` : 'No hay ejercicios con esta combinación de filtros.',
          actions: `<button type="button" class="btn btn-secondary" data-action="clear-filters">Limpiar filtros</button>`
        });
    }

    return {
      title: 'Ejercicios',
      html,
      mount(root) {
        const form = root.querySelector('#filters');
        const map = { 'f-q': 'q', 'f-group': 'group', 'f-equip': 'equip', 'f-diff': 'diff', 'f-goal': 'goal' };
        form.addEventListener('input', e => {
          const key = map[e.target.id];
          if (key) { filters[key] = e.target.value; renderResults(root); }
        });
        form.addEventListener('submit', e => e.preventDefault());
        renderResults(root);
      },
      actions: {
        'clear-filters'(el) {
          const root = el.closest('#app');
          Object.assign(filters, { q: '', group: 'all', equip: 'all', diff: 'all', goal: 'all' });
          root.querySelector('#f-q').value = '';
          ['f-group', 'f-equip', 'f-diff', 'f-goal'].forEach(id => { root.querySelector('#' + id).value = 'all'; });
          renderResults(root);
          root.querySelector('#f-q').focus();
        },
        'open-add'(el) { openAddDialog(EXERCISE_INDEX[el.dataset.ex]); }
      }
    };
  }

  /* =====================================================================
     APRENDE (biblioteca y temas)
     ===================================================================== */
  function learn() {
    const goalsIds = ['hipertrofia', 'fuerza', 'resistencia-muscular'];
    const topic = id => LEARN_TOPICS.find(t => t.id === id);
    const html = `
      <section class="page-head">
        <div class="container">
          <p class="eyebrow">Aprende</p>
          <h1 tabindex="-1">Biblioteca educativa</h1>
          <p class="lead">Conceptos clave del entrenamiento de fuerza explicados de forma clara, con matices cuando la evidencia los tiene y sin promesas absolutas.</p>
        </div>
      </section>
      <section class="section">
        <div class="container">
          ${sectionHead({ eyebrow: 'Objetivos', title: 'Qué adaptación buscas' })}
          <div class="card-grid card-grid-3">${goalsIds.map(id => UI.topicCard(topic(id))).join('')}</div>
        </div>
      </section>
      <section class="section section-alt">
        <div class="container">
          ${sectionHead({ eyebrow: 'Fundamentos', title: 'Cómo funciona el entrenamiento' })}
          <div class="card-grid card-grid-3">${FUNDAMENTALS.map(id => UI.topicCard(topic(id))).join('')}</div>
        </div>
      </section>`;
    return { title: 'Aprende', html };
  }

  /* Widgets interactivos de los temas */
  const RIR_TEXT = [
    'Fallo: no podrías completar otra repetición con técnica adecuada. Útil de forma puntual, sobre todo en ejercicios seguros como máquinas o aislamiento.',
    'Muy cerca del fallo. Estímulo alto con algo de margen para mantener la técnica.',
    'Exigente pero con margen. Es un rango muy habitual en el trabajo de hipertrofia.',
    'Moderadamente exigente. Común en fuerza, en ejercicios técnicos y en las primeras series.',
    'Margen amplio. Útil para calentar, practicar técnica o en semanas de descarga.',
    'Esfuerzo bajo. Poco estímulo para la hipertrofia, aunque útil para aprender un movimiento.'
  ];

  function widget(type) {
    switch (type) {
      case 'tension-flow':
        return tensionFlow(false);
      case 'rep-scale': {
        const goal = WorkoutStore.getGoal();
        return `<div class="widget scale-widget">
          <div class="seg seg-sm" role="radiogroup" aria-label="Resaltar objetivo">
            ${GOAL_ORDER.map(g => `<button type="button" role="radio" class="seg-btn" aria-checked="${g === goal}" data-action="scale-goal" data-goal="${g}">${esc(UI.goalName(g))}</button>`).join('')}
          </div>
          <div class="scale-host">${UI.repScale(goal)}</div>
          <p class="scale-desc">${esc(GOALS[goal].reps)}. ${esc(GOALS[goal].caution)}</p>
        </div>`;
      }
      case 'rir':
        return `<div class="widget rir-widget">
          <div class="rir-top">
            <label for="rir-range">Repeticiones en reserva</label>
            <output id="rir-out" class="mono" for="rir-range">RIR 2</output>
          </div>
          <input type="range" id="rir-range" min="0" max="5" step="1" value="2" aria-describedby="rir-text">
          <div class="rir-dots" id="rir-dots" aria-hidden="true"></div>
          <p class="rir-legend"><span class="sw sw-done"></span>Repeticiones hechas <span class="sw sw-left"></span>Repeticiones en reserva</p>
          <p class="rir-text" id="rir-text"></p>
          <p class="muted small">Ejemplo con una carga que permitiría un máximo de 12 repeticiones.</p>
        </div>`;
      case 'volume-calc':
        return `<div class="widget calc-widget">
          <div class="calc-inputs">
            <div class="field"><label for="c-sets">Series por sesión</label><input type="number" id="c-sets" min="1" max="12" value="3" inputmode="numeric"></div>
            <div class="field"><label for="c-reps">Repeticiones por serie</label><input type="number" id="c-reps" min="1" max="40" value="10" inputmode="numeric"></div>
            <div class="field"><label for="c-load">Carga (kg)</label><input type="number" id="c-load" min="0" max="500" value="40" inputmode="decimal"></div>
            <div class="field"><label for="c-freq">Sesiones por semana</label><input type="number" id="c-freq" min="1" max="4" value="2" inputmode="numeric"></div>
          </div>
          <dl class="calc-out">
            <div><dt>Series semanales</dt><dd class="mono" id="c-out-sets">6</dd></div>
            <div><dt>Repeticiones semanales</dt><dd class="mono" id="c-out-reps">60</dd></div>
            <div><dt>Tonelaje semanal</dt><dd class="mono" id="c-out-ton">2400 kg</dd></div>
          </dl>
          <p class="calc-note" id="c-note"></p>
        </div>`;
      case 'intensity-table':
        return `<div class="table-wrap" tabindex="0" role="region" aria-label="Significados de intensidad"><table class="compare">
          <thead><tr><th scope="col">Uso</th><th scope="col">Cómo se mide</th><th scope="col">Ejemplo</th><th scope="col">Para qué sirve</th></tr></thead>
          <tbody>${INTENSITY_MEANINGS.map(r => `<tr><th scope="row">${esc(r.name)}</th><td>${esc(r.measure)}</td><td>${esc(r.example)}</td><td>${esc(r.use)}</td></tr>`).join('')}</tbody>
        </table></div>`;
      case 'recovery-list':
        return `<div class="pillars">${RECOVERY_PILLARS.map(p => `<div class="pillar"><span class="topic-icon">${icon(p.icon)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>`).join('')}</div>`;
      case 'progression': {
        const weeks = [
          { w: 1, load: 40, reps: [8, 8, 7] },
          { w: 2, load: 40, reps: [10, 9, 9] },
          { w: 3, load: 40, reps: [11, 11, 10] },
          { w: 4, load: 40, reps: [12, 12, 12], up: true },
          { w: 5, load: 42.5, reps: [9, 8, 8] }
        ];
        return `<div class="widget progression">
          <div class="table-wrap" tabindex="0" role="region" aria-label="Ejemplo de doble progresión"><table class="compare">
            <thead><tr><th scope="col">Semana</th><th scope="col">Carga</th><th scope="col">Repeticiones (3 series)</th><th scope="col">Decisión</th></tr></thead>
            <tbody>${weeks.map(r => `<tr${r.up ? ' class="is-up"' : ''}><th scope="row" class="mono">${r.w}</th><td class="mono">${String(r.load).replace('.', ',')} kg</td>
              <td><span class="rep-bars">${r.reps.map(n => `<span class="rep-bar" style="--h:${(n / 12) * 100}%"><b class="mono">${n}</b></span>`).join('')}</span></td>
              <td>${r.up ? `${icon('check')}12 en todas las series: sube la carga` : r.w === 5 ? 'Nueva carga, vuelves cerca de 8' : 'Sigue sumando repeticiones'}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>`;
      }
    }
    return '';
  }

  function initWidgets(root) {
    const range = root.querySelector('#rir-range');
    if (range) {
      const draw = () => {
        const rir = Number(range.value);
        const done = 12 - rir;
        root.querySelector('#rir-out').textContent = `RIR ${rir}`;
        root.querySelector('#rir-dots').innerHTML = Array.from({ length: 12 }, (_, i) => `<span class="${i < done ? 'is-done' : 'is-left'}">${i + 1}</span>`).join('');
        root.querySelector('#rir-text').innerHTML = `<strong>${done} repeticiones hechas, ${rir} en reserva.</strong> ${esc(RIR_TEXT[rir])}`;
        range.setAttribute('aria-valuetext', `RIR ${rir}: ${done} repeticiones hechas`);
      };
      range.addEventListener('input', draw);
      draw();
    }
    const calc = root.querySelector('.calc-widget');
    if (calc) {
      const val = (id, min, max) => Math.min(max, Math.max(min, Number(calc.querySelector(id).value) || 0));
      const draw = () => {
        const sets = val('#c-sets', 1, 12), reps = val('#c-reps', 1, 40), load = val('#c-load', 0, 500), freq = val('#c-freq', 1, 4);
        const weekly = sets * freq;
        calc.querySelector('#c-out-sets').textContent = weekly;
        calc.querySelector('#c-out-reps').textContent = (weekly * reps).toLocaleString('es');
        calc.querySelector('#c-out-ton').textContent = `${(weekly * reps * load).toLocaleString('es')} kg`;
        const ref = weekly < 10
          ? 'Por debajo de la referencia común de 10–20 series semanales para hipertrofia. Puede ser suficiente al empezar o para mantener.'
          : weekly <= 20
            ? 'Dentro de la referencia común de 10–20 series semanales por grupo muscular para hipertrofia.'
            : 'Por encima de la referencia común. Puede funcionar en personas avanzadas, pero vigila la recuperación.';
        calc.querySelector('#c-note').innerHTML = `${icon('info')}<span>${ref} El tonelaje mezcla carga y repeticiones: dos planes con el mismo tonelaje pueden generar estímulos muy distintos.</span>`;
      };
      calc.addEventListener('input', draw);
      draw();
    }
  }

  function topic({ id }) {
    const t = LEARN_TOPICS.find(x => x.id === id);
    if (!t) return notFound();
    const i = LEARN_TOPICS.indexOf(t);
    const prev = LEARN_TOPICS[i - 1], next = LEARN_TOPICS[i + 1];

    const html = `
      <section class="page-head">
        <div class="container narrow-left">
          ${UI.breadcrumb([{ label: 'Aprende', href: '#/aprende' }, { label: t.title }])}
          <p class="eyebrow">${icon('clock')}${t.readTime} min de lectura</p>
          <h1 tabindex="-1">${esc(t.title)}</h1>
          <p class="lead">${esc(t.lead)}</p>
        </div>
      </section>
      <section class="section">
        <div class="container article-layout">
          <article class="article">
            ${t.sections.map(sec => `<section class="article-section">
              <h2>${esc(sec.h)}</h2>
              ${(sec.p || []).map(p => `<p>${esc(p)}</p>`).join('')}
              ${sec.widget ? widget(sec.widget) : ''}
              ${sec.list ? `<ul class="list-dot">${sec.list.map(li => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}
              ${sec.defs ? `<dl class="defs">${sec.defs.map(d => `<div><dt>${esc(d.t)}</dt><dd>${esc(d.d)}</dd></div>`).join('')}</dl>` : ''}
            </section>`).join('')}
            <section class="article-section">
              <h2>Ideas erróneas frecuentes</h2>
              <div class="myths">${t.myths.map(m => `<div class="myth">
                <p class="myth-claim">${icon('x')}<span>«${esc(m.myth)}»</span></p>
                <p class="myth-reality">${icon('check')}<span>${esc(m.reality)}</span></p>
              </div>`).join('')}</div>
            </section>
            <section class="article-section refs">
              <h2>Lecturas recomendadas</h2>
              <ul>${t.refs.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
            </section>
          </article>
          <aside class="article-aside">
            <div class="key-card">
              <h2>Ideas clave</h2>
              <ul class="list-check">${t.keyPoints.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
            </div>
            <nav class="topic-nav" aria-label="Otros temas">
              <h2>Otros temas</h2>
              <ul>${LEARN_TOPICS.map(x => `<li><a href="#/aprende/${x.id}"${x.id === t.id ? ' aria-current="page"' : ''}>${icon(x.icon)}${esc(x.title)}</a></li>`).join('')}</ul>
            </nav>
          </aside>
        </div>
        <nav class="container pager" aria-label="Tema anterior y siguiente">
          ${prev ? `<a class="pager-link" href="#/aprende/${prev.id}">${icon('arrow-left')}<span><small>Anterior</small>${esc(prev.title)}</span></a>` : '<span></span>'}
          ${next ? `<a class="pager-link pager-next" href="#/aprende/${next.id}"><span><small>Siguiente</small>${esc(next.title)}</span>${icon('arrow-right')}</a>` : '<span></span>'}
        </nav>
      </section>`;

    return {
      title: t.title,
      html,
      mount(root) { initWidgets(root); },
      actions: {
        'replay-flow'(el) {
          const flow = el.closest('.flow');
          flow.classList.remove('is-playing');
          void flow.offsetWidth; // reinicia la animación CSS
          flow.classList.add('is-playing');
        },
        'scale-goal'(el) {
          const w = el.closest('.scale-widget');
          const g = el.dataset.goal;
          w.querySelectorAll('.seg-btn').forEach(b => b.setAttribute('aria-checked', String(b === el)));
          w.querySelector('.scale-host').innerHTML = UI.repScale(g);
          w.querySelector('.scale-desc').textContent = `${GOALS[g].reps}. ${GOALS[g].caution}`;
        }
      }
    };
  }

  /* =====================================================================
     MI ENTRENAMIENTO
     ===================================================================== */
  function myWorkout(q) {
    const plans = WorkoutStore.plans();
    const goal = WorkoutStore.getGoal();
    const setsPer = WorkoutStore.getSets();

    const toolbar = `<div class="toolbar">
      <div class="toolbar-field">
        <span class="label" id="goal-label">Objetivo</span>
        <div class="seg" role="radiogroup" aria-labelledby="goal-label">
          ${GOAL_ORDER.map(g => `<button type="button" role="radio" class="seg-btn" aria-checked="${g === goal}" data-action="set-goal" data-goal="${g}" data-focus="mg-${g}">${icon(GOAL_ICONS[g])}${esc(UI.goalName(g))}</button>`).join('')}
        </div>
      </div>
      <div class="toolbar-field">
        <span class="label" id="sets-label">Series por ejercicio</span>
        <div class="stepper" role="group" aria-labelledby="sets-label">
          <button type="button" class="icon-btn" data-action="sets-dec" data-focus="sets-dec" aria-label="Menos series" ${setsPer <= 1 ? 'disabled' : ''}>${icon('minus')}</button>
          <output class="mono" aria-live="polite">${setsPer}</output>
          <button type="button" class="icon-btn" data-action="sets-inc" data-focus="sets-inc" aria-label="Más series" ${setsPer >= 6 ? 'disabled' : ''}>${icon('plus')}</button>
        </div>
      </div>
    </div>`;

    const head = `<section class="page-head">
      <div class="container">
        <p class="eyebrow">Constructor</p>
        <h1 tabindex="-1">Mi entrenamiento</h1>
        <p class="lead">Aquí aparecen los ejercicios que seleccionas en cada sesión. Se guardan en este navegador.</p>
        ${plans.length ? toolbar : ''}
      </div>
    </section>`;

    if (!plans.length) {
      return {
        title: 'Mi entrenamiento',
        html: head + `<section class="section"><div class="container">${UI.emptyState({
          iconName: 'list', title: 'Todavía no has elegido ejercicios',
          text: 'Elige un método, entra en un día y selecciona ejercicios para cada grupo muscular. Tu sesión aparecerá aquí.',
          actions: `<a class="btn btn-primary" href="#/metodos">Elegir un método ${icon('arrow-right')}</a><a class="btn btn-secondary" href="#/ejercicios">Explorar ejercicios</a>`
        })}</div></section>`,
        reactive: true
      };
    }

    // Agrupa las sesiones por método y variante
    const combos = [];
    for (const m of METHODS) for (const v of m.variants) {
      const days = plans.filter(p => p.m === m.id && p.v === v.id);
      if (days.length) combos.push({ m, v, days, count: days.reduce((s, d) => s + Object.values(d.groups).flat().length, 0) });
    }
    const active = combos.find(c => c.m.id === q.m && c.v.id === q.v) || combos.slice().sort((a, b) => b.count - a.count)[0];
    const { m, v } = active;
    const weekly = Planner.weeklySets(m.id, v.id);
    const freq = Planner.weeklyFrequency(v);
    const totalSets = Object.values(weekly).reduce((a, b) => a + b, 0);
    const volGroups = GROUP_ORDER.filter(g => freq[g]);
    const volMax = Math.max(24, ...Object.values(weekly));
    const rx = ex => `${setsPer} × ${Planner.repsFor(ex, goal)} · ${GOALS[goal].prescription.rir} · ${GOALS[goal].prescription.rest}`;

    const dayCards = DAYS.filter(d => v.schedule[d.id]).map(day => {
      const s = Planner.sessionFor(v, day.id);
      const sel = WorkoutStore.getSelection(m.id, v.id, day.id);
      const groups = Planner.groupsOf(s);
      if (!Object.keys(sel).length) {
        return `<article class="day-card day-card-empty tone-${s.tone}" id="day-${day.id}">
          <div><p class="eyebrow">${day.name}</p><h3>${esc(s.name)}</h3></div>
          <a class="btn btn-ghost btn-sm" href="${sessionHref(m.id, v.id, day.id)}">${icon('plus')}<span>Construir sesión</span></a>
        </article>`;
      }
      const missing = groups.filter(g => !(sel[g.id] || []).length);
      return `<article class="day-card tone-${s.tone}${q.focus === day.id ? ' is-focus' : ''}" id="day-${day.id}">
        <header class="day-card-head">
          <div><p class="eyebrow">${day.name}</p><h3>${esc(s.name)} <span class="muted">${esc(s.subtitle)}</span></h3></div>
          <div class="day-card-actions">
            <a class="btn btn-ghost btn-sm" href="${sessionHref(m.id, v.id, day.id)}">${icon('edit')}<span>Editar</span></a>
            <button type="button" class="btn btn-ghost btn-sm btn-danger-text" data-action="delete-session" data-d="${day.id}">${icon('trash')}<span>Eliminar</span></button>
          </div>
        </header>
        ${groups.filter(g => (sel[g.id] || []).length).map(g => `<section class="day-group">
          <h4><span class="dot tone-${UI.toneOfGroup(g.id)}"></span>${esc(g.group.name)}</h4>
          <ol class="ex-list">${sel[g.id].map((exId, i) => {
            const ex = EXERCISE_INDEX[exId];
            return `<li>
              <span class="ex-list-num mono">${i + 1}</span>
              <div class="ex-list-main"><a href="${UI.exerciseHref(ex, { m: m.id, v: v.id, d: day.id, g: g.id })}">${esc(ex.name)}</a><span class="rx mono">${esc(rx(ex))}</span></div>
              <button type="button" class="icon-btn" data-action="remove-from-plan" data-d="${day.id}" data-g="${g.id}" data-ex="${ex.id}" data-focus="rm-${day.id}-${ex.id}" aria-label="Eliminar ${esc(ex.name)} del ${day.name.toLowerCase()}">${icon('x')}</button>
            </li>`;
          }).join('')}</ol>
        </section>`).join('')}
        ${missing.length ? `<p class="day-missing">${icon('info')}<span>Sin ejercicios para: ${missing.map(g => esc(g.group.name)).join(', ')}.</span> <a href="${sessionHref(m.id, v.id, day.id, missing[0].id)}">Añadir</a></p>` : ''}
      </article>`;
    }).join('');

    const html = head + `
      <section class="section">
        <div class="container">
          ${combos.length > 1 ? `<div class="seg plan-tabs" role="group" aria-label="Planes guardados">
            ${combos.map(c => `<a class="seg-btn" href="#/mi-entrenamiento${UI.query({ m: c.m.id, v: c.v.id })}" aria-current="${c === active ? 'true' : 'false'}">${esc(c.m.name)} · ${esc(c.v.name)} <span class="mono">${c.count}</span></a>`).join('')}
          </div>` : ''}
          <div class="plan-head tone-${m.tone}">
            <div>
              <p class="eyebrow">${esc(m.name)} · ${esc(v.name)}</p>
              <h2>Tu semana</h2>
              ${UI.weekStrip(v)}
            </div>
            <dl class="plan-stats">
              <div><dt>Sesiones con ejercicios</dt><dd class="mono">${active.days.length} / ${Planner.trainingDays(v).length}</dd></div>
              <div><dt>Ejercicios</dt><dd class="mono">${active.count}</dd></div>
              <div><dt>Series semanales</dt><dd class="mono">${totalSets}</dd></div>
            </dl>
            <div class="plan-actions">
              <button type="button" class="btn btn-secondary btn-sm" data-action="copy-summary">${icon('copy')}<span>Copiar resumen</span></button>
              <button type="button" class="btn btn-ghost btn-sm btn-danger-text" data-action="clear-all">${icon('trash')}<span>Limpiar entrenamiento</span></button>
            </div>
          </div>
          <div class="workout-layout">
            <div class="day-cards">${dayCards}</div>
            <aside class="volume-card" aria-labelledby="vol-title">
              <h2 id="vol-title">Volumen semanal estimado</h2>
              <p class="muted small">Series por grupo muscular con ${UI.plural(setsPer, 'serie', 'series')} por ejercicio.</p>
              <div class="vol-chart" style="--ref-l:${(10 / volMax) * 100}%;--ref-w:${(10 / volMax) * 100}%">
                ${volGroups.map(g => `<div class="vol-row tone-${UI.toneOfGroup(g)}">
                  <span class="vol-name">${esc(MUSCLE_GROUPS[g].short || MUSCLE_GROUPS[g].name)}</span>
                  <span class="vol-bar"><span style="width:${((weekly[g] || 0) / volMax) * 100}%"></span></span>
                  <span class="vol-val mono">${weekly[g] || 0}</span>
                </div>`).join('')}
              </div>
              <p class="vol-legend"><span class="sw sw-ref"></span>Referencia común para hipertrofia: 10–20 series semanales</p>
              <p class="callout small">${icon('info')}<span>Es una estimación: solo cuenta los ejercicios elegidos para cada grupo. Los músculos secundarios reciben además trabajo indirecto. La cantidad adecuada varía entre personas.</span></p>
            </aside>
          </div>
        </div>
      </section>`;

    function summaryText() {
      const lines = [`FIT SPLIT · ${m.name} (${v.name})`, `Objetivo: ${GOALS[goal].name} · ${UI.plural(setsPer, 'serie', 'series')} por ejercicio`, ''];
      for (const day of DAYS) {
        const sel = WorkoutStore.getSelection(m.id, v.id, day.id);
        if (!Object.keys(sel).length) continue;
        const s = Planner.sessionFor(v, day.id);
        lines.push(`${day.name.toUpperCase()} · ${s.name.toUpperCase()}`);
        for (const g of Planner.groupsOf(s)) {
          if (!(sel[g.id] || []).length) continue;
          lines.push(g.group.name);
          sel[g.id].forEach((id, i) => lines.push(`  ${i + 1}. ${EXERCISE_INDEX[id].name} — ${rx(EXERCISE_INDEX[id])}`));
        }
        lines.push('');
      }
      return lines.join('\n');
    }

    return {
      title: 'Mi entrenamiento',
      html,
      reactive: true,
      mount(root) {
        if (q.focus) {
          const el = root.querySelector(`#day-${q.focus}`);
          if (el) setTimeout(() => el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' }), 60);
        }
      },
      actions: {
        'set-goal'(el) { WorkoutStore.setGoal(el.dataset.goal); },
        'sets-dec'() { WorkoutStore.setSets(WorkoutStore.getSets() - 1); },
        'sets-inc'() { WorkoutStore.setSets(WorkoutStore.getSets() + 1); },
        'remove-from-plan'(el) {
          const ex = EXERCISE_INDEX[el.dataset.ex];
          WorkoutStore.remove(m.id, v.id, el.dataset.d, el.dataset.g, ex.id);
          UI.toast(`${ex.name} eliminado.`);
        },
        async 'delete-session'(el) {
          const day = DAYS.find(d => d.id === el.dataset.d);
          const ok = await UI.confirm({
            title: 'Eliminar sesión',
            text: `Se quitarán todos los ejercicios del ${day.name.toLowerCase()}.`,
            confirmLabel: 'Eliminar sesión', danger: true
          });
          if (ok) { WorkoutStore.clearSession(m.id, v.id, day.id); UI.toast('Sesión eliminada.'); }
        },
        async 'clear-all'() {
          const ok = await UI.confirm({
            title: 'Limpiar entrenamiento',
            text: 'Se eliminarán todas las sesiones de todos los métodos. Esta acción no se puede deshacer.',
            confirmLabel: 'Limpiar todo', danger: true
          });
          if (ok) { WorkoutStore.clearAll(); UI.toast('Entrenamiento vaciado.'); }
        },
        async 'copy-summary'() {
          const text = summaryText();
          try {
            await navigator.clipboard.writeText(text);
            UI.toast('Resumen copiado al portapapeles.');
          } catch (e) {
            UI.openDialog(`<h2 class="dialog-title">Resumen de tu entrenamiento</h2>
              <p class="dialog-text">Tu navegador no permitió copiar automáticamente. Selecciona el texto y cópialo.</p>
              <textarea class="summary-text mono" readonly rows="12">${esc(text)}</textarea>
              <div class="dialog-actions"><button type="button" class="btn btn-primary" data-dialog-close>Cerrar</button></div>`);
            const ta = document.querySelector('#dialog textarea');
            if (ta) ta.select();
          }
        }
      }
    };
  }

  /* =====================================================================
     SOBRE FIT SPLIT
     ===================================================================== */
  function about() {
    const layers = [
      { name: 'Datos', files: ['data.js', 'exercises.js', 'learn.js'], text: 'Métodos, sesiones, ejercicios y contenido educativo como objetos de JavaScript.' },
      { name: 'Lógica', files: ['workouts.js'], text: 'Planner calcula sesiones, límites y volumen. WorkoutStore guarda la selección en localStorage.' },
      { name: 'Animaciones', files: ['animations.js'], text: `Figura en SVG con cinemática inversa y ${Animations.presets.length} patrones de movimiento.` },
      { name: 'Interfaz', files: ['ui.js', 'views.js', 'app.js'], text: 'Componentes reutilizables, vistas y un enrutador por hash.' },
      { name: 'Estilos', files: ['styles.css', 'responsive.css'], text: 'Diseño oscuro con variables CSS y adaptación a móvil y tablet.' }
    ];
    const html = `
      <section class="page-head">
        <div class="container">
          <p class="eyebrow">Sobre el proyecto</p>
          <h1 tabindex="-1">Sobre FIT SPLIT</h1>
          <p class="lead">FIT SPLIT es una plataforma interactiva para aprender sobre métodos de entrenamiento, comprender los fundamentos del ejercicio y construir sesiones según diferentes objetivos.</p>
        </div>
      </section>
      <section class="section">
        <div class="container content-grid">
          <div class="prose">
            <h2>Por qué existe</h2>
            <p>Mucha información sobre entrenamiento se presenta como reglas absolutas: un rango de repeticiones “para crecer”, una rutina “perfecta”, ir siempre al fallo. FIT SPLIT intenta lo contrario: explicar el porqué de cada decisión y mostrar dónde hay consenso y dónde hay matices.</p>
            <p>La experiencia está pensada como un recorrido: eliges un método, entras en un día, eliges un músculo, aprendes cada ejercicio con su animación y construyes tu sesión según tu objetivo.</p>
          </div>
          <div class="aside-card">
            <h3>${icon('shield')}Aviso importante</h3>
            <p>El contenido es educativo y general. No sustituye la valoración de un profesional sanitario o del ejercicio. Si tienes una lesión, una condición médica o dudas, consulta antes de entrenar.</p>
          </div>
        </div>
      </section>
      <section class="section section-alt">
        <div class="container">
          ${sectionHead({ eyebrow: 'Principios', title: 'Cómo presentamos la información' })}
          <div class="card-grid card-grid-4">
            ${[
              ['book', 'Basada en evidencia', 'Las recomendaciones se apoyan en la literatura científica y en consensos profesionales.'],
              ['sliders', 'Sin absolutos', 'Los rangos son orientativos y se explica cuándo hay incertidumbre o varios enfoques razonables.'],
              ['eye', 'Aprender viendo', 'Cada ejercicio tiene animación por fases, técnica paso a paso y errores frecuentes.'],
              ['target', 'Tu decisión', 'Tú eliges método, objetivo y ejercicios. La plataforma orienta, no impone.']
            ].map(([ic, t, d]) => `<div class="principle">${icon(ic)}<h3>${t}</h3><p>${d}</p></div>`).join('')}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="container">
          ${sectionHead({ eyebrow: 'Arquitectura', title: 'Cómo está construido', text: 'Una aplicación web de una sola página hecha con HTML5, CSS3 y JavaScript moderno, sin backend ni dependencias externas. Funciona en el navegador y guarda la selección del usuario en localStorage.' })}
          <ol class="arch">
            ${layers.map(l => `<li class="arch-layer">
              <h3>${l.name}</h3>
              <p>${l.text}</p>
              <p class="arch-files">${l.files.map(f => `<code>${f}</code>`).join('')}</p>
            </li>`).join('')}
          </ol>
          <div class="feature-list">
            ${[
              ['code', 'Enrutador por hash', 'Cada vista tiene su URL (por ejemplo #/metodos/ppl/ppl6/lun/pecho) y el botón atrás del navegador funciona.'],
              ['layers', 'Guiado por datos', 'Añadir un método o un ejercicio solo requiere agregar un objeto a los datos; las vistas se generan solas.'],
              ['play', 'Animaciones propias', 'Las figuras se calculan en cada fotograma con cinemática inversa: los codos y rodillas se ajustan para mantener la longitud de cada segmento.'],
              ['shield', 'Accesible', 'HTML semántico, botones reales, navegación por teclado, estados visibles y respeto a la preferencia de movimiento reducido.']
            ].map(([ic, t, d]) => `<div class="feature">${icon(ic)}<div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}
          </div>
        </div>
      </section>
      <section class="section section-alt">
        <div class="container narrow center">
          <h2>Empieza a explorar</h2>
          <p class="muted">Elige un método y construye tu primera sesión.</p>
          <div class="btn-row center">
            <a class="btn btn-primary" href="#/metodos">Explorar métodos ${icon('arrow-right')}</a>
            <a class="btn btn-secondary" href="#/aprende">Ir a Aprende</a>
          </div>
        </div>
      </section>`;
    return { title: 'Sobre FIT SPLIT', html };
  }

  /* =====================================================================
     PÁGINA NO ENCONTRADA
     ===================================================================== */
  function notFound() {
    return {
      title: 'Página no encontrada',
      html: `<section class="section"><div class="container">${UI.emptyState({
        iconName: 'alert', title: 'Página no encontrada',
        text: 'La dirección no corresponde a ninguna sección de FIT SPLIT.',
        actions: `<a class="btn btn-primary" href="#/">Volver al inicio</a><a class="btn btn-secondary" href="#/metodos">Ver métodos</a>`
      })}</div></section>`
    };
  }

  return { home, methods, method, session, exercise, exercises, learn, topic, myWorkout, about, notFound };
})();
