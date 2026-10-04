/* =====================================================================
   FIT SPLIT · views.js
   ---------------------------------------------------------------------
   Vistas de la aplicación. Cada vista es una función que devuelve:
     title    título de la pestaña del navegador
     html     contenido de la página
     mount    (opcional) se ejecuta tras insertar el HTML; puede devolver
              una función de limpieza (detener animaciones, temporizadores)
     actions  (opcional) manejadores de los elementos con data-action
     update   (opcional) actualización parcial cuando cambian los datos:
              cambia solo lo necesario, sin recargar ni mover la página
     redirect (opcional) ruta a la que hay que ir en su lugar

   Recorrido principal (planificación paso a paso):
     #/plan/objetivo → #/plan/metodo → #/plan/frecuencia → #/plan/dia/:d
     → #/entrenar → #/entrenar/fin
   ===================================================================== */

const Views = (() => {
  'use strict';
  const { esc, icon, GOAL_ICONS } = UI;

  const STEP_TITLES = {
    prep: 'Preparación', start: 'Posición inicial', ecc: 'Fase excéntrica',
    turn: 'Punto de transición', con: 'Fase concéntrica', end: 'Finalización'
  };
  const PHASE_TYPES = { start: 'Inicio', ecc: 'Excéntrica', turn: 'Transición', con: 'Concéntrica', end: 'Final' };
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const go = hash => { location.hash = hash; };
  /* Animaciones 3D si el navegador admite WebGL; si no, las 2D */
  const use3D = () => typeof Animations3D !== 'undefined' && Animations3D.supported;

  /* El enrutador registra aquí su función de dibujado */
  let rerender = () => {};
  const setRenderer = fn => { rerender = fn; };

  /* Plan actual (método + variante) con sus objetos de datos */
  function currentPlan() {
    const p = WorkoutStore.getPlan();
    if (!p) return null;
    const method = Planner.method(p.m);
    const variant = Planner.variant(method, p.v);
    return variant ? { m: p.m, v: p.v, method, variant } : null;
  }

  /* =====================================================================
     PASOS DE LA PLANIFICACIÓN
     ===================================================================== */
  const STEPS = [
    { id: 'objetivo', label: 'Objetivo' },
    { id: 'metodo', label: 'Método' },
    { id: 'frecuencia', label: 'Frecuencia' },
    { id: 'dia', label: 'Ejercicios' },
    { id: 'listo', label: 'Rutina lista' }
  ];

  /* Indicador de pasos: solo informa en qué paso estás, no es un enlace */
  function planStepper(current) {
    const plan = currentPlan();
    const onboarded = WorkoutStore.isOnboarded();
    const ci = STEPS.findIndex(s => s.id === current);
    const values = {
      objetivo: onboarded ? GOALS[WorkoutStore.getGoal()].name : '',
      metodo: plan ? plan.method.name : '',
      frecuencia: plan ? plan.variant.name : '',
      dia: '',
      listo: WorkoutStore.isConfigured() ? 'Tu panel' : ''
    };
    return `<div class="stepper" role="group" aria-label="Paso ${ci + 1} de ${STEPS.length} de la planificación"><ol>
      ${STEPS.map((s, i) => {
        const st = i < ci ? 'is-done' : i === ci ? 'is-current' : '';
        return `<li class="${st}"${i === ci ? ' aria-current="step"' : ''}>
          <span class="step-num" aria-hidden="true">${i < ci ? icon('check') : i + 1}</span>
          <span class="step-text"><span class="step-label">${s.label}</span>${values[s.id] ? `<small>${esc(values[s.id])}</small>` : ''}</span>
          ${i < ci ? '<span class="sr-only">(completado)</span>' : ''}</li>`;
      }).join('')}
    </ol></div>`;
  }

  /* =====================================================================
     DETALLE DE EJERCICIO (página y ventana emergente)
     ===================================================================== */
  function stepsHtml(ex) {
    const order = ['prep', ...Animations.phases(ex).map(p => p.key)];
    return `<ol class="steps">${order.map((k, i) => `<li class="step" data-phase="${k}">
      <span class="step-n mono">${i + 1}</span>
      <div><h4>${STEP_TITLES[k]}</h4><p>${esc(ex.steps[k])}</p></div></li>`).join('')}</ol>`;
  }

  function goalPanel(ex, goalId) {
    const g = GOALS[goalId];
    const fits = ex.goals.includes(goalId);
    const reasons = {
      fuerza: 'En ejercicios de aislamiento, las cargas muy altas suelen ser poco prácticas y más exigentes para las articulaciones. Es más habitual usar rangos moderados.',
      hipertrofia: 'Puede usarse, pero otros ejercicios permiten acercarse al fallo con más seguridad.',
      resistencia: 'Con series muy largas, la técnica de este ejercicio tiende a degradarse con la fatiga.'
    };
    return `<div class="goal-panel goal-${goalId}">
      ${fits ? '' : `<p class="callout callout-warn">${icon('alert')}<span>${esc(reasons[goalId])}</span></p>`}
      <dl class="rx-grid">
        <div class="rx-main"><dt>Repeticiones orientativas</dt><dd class="mono">${esc(Planner.repsFor(ex, goalId))}</dd></div>
        <div><dt>Series</dt><dd>${esc(g.prescription.sets)} por ejercicio</dd></div>
        <div><dt>Esfuerzo</dt><dd>${esc(g.prescription.rir)}</dd></div>
        <div><dt>Descanso</dt><dd>${esc(g.prescription.rest)}</dd></div>
        <div class="rx-wide"><dt>Carga</dt><dd>${esc(g.load)}</dd></div>
        <div class="rx-wide"><dt>Ritmo</dt><dd>${esc(g.tempo)}</dd></div>
      </dl>
      <p class="callout">${icon('info')}<span>${esc(g.caution)}</span></p>
      ${UI.repScale(goalId)}
    </div>`;
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
        <li class="flow-step" style="--i:${i}"><span class="flow-icon">${icon(ic)}</span>
          <span class="flow-text"><strong>${t}</strong>${compact ? '' : `<span>${d}</span>`}</span></li>`).join('')}
      </ol>
      ${compact ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-action="replay-flow">${icon('restart')}<span>Ver la secuencia</span></button>`}
    </div>`;
  }

  /* Tarjeta de animación con controles. Los controles usan data-exd para
     funcionar igual dentro de la página o de una ventana emergente. */
  function animCard(ex) {
    const phases = Animations.phases(ex);
    return `<div class="anim-card">
      <div class="anim-head">
        <span class="anim-view">${icon(use3D() ? 'cube' : 'eye')}${use3D() ? Animations3D.viewLabel(ex) : Animations.viewLabel(ex)}</span>
        <span class="anim-legend${use3D() ? ' is-anatomy' : ''}"><span><i class="lg-p"></i>Trabaja</span><span><i class="lg-s"></i>Ayuda</span><span><i class="lg-b"></i>Otros músculos</span></span>
      </div>
      <div class="anim-stage" data-stage></div>
      <div class="anim-controls">
        <button type="button" class="btn btn-primary btn-sm" data-exd="toggle">${icon('pause')}<span>Pausar</span></button>
        <button type="button" class="btn btn-ghost btn-sm" data-exd="restart">${icon('restart')}<span>Reiniciar</span></button>
        <button type="button" class="btn btn-ghost btn-sm" data-exd="speed" aria-label="Velocidad: normal">${icon('speed')}<span>1×</span></button>
      </div>
      <ol class="phase-track" aria-label="Fases del movimiento">
        ${phases.map((ph, i) => `<li><button type="button" class="phase-chip" data-exd="seek" data-phase="${ph.key}">
          <span class="phase-num mono">${i + 1}</span><span class="phase-name">${esc(ph.label)}</span><span class="phase-type">${PHASE_TYPES[ph.key]}</span>
        </button></li>`).join('')}
      </ol>
    </div>`;
  }

  /* Conecta la animación y sus controles dentro de un contenedor */
  function mountAnim(scope, ex) {
    const toggleBtn = scope.querySelector('[data-exd="toggle"]');
    const setToggle = playing => {
      toggleBtn.innerHTML = playing ? `${icon('pause')}<span>Pausar</span>` : `${icon('play')}<span>Reproducir</span>`;
      toggleBtn.setAttribute('aria-label', playing ? 'Pausar animación' : 'Reproducir animación');
    };
    const animator = (use3D() ? Animations3D : Animations).create(scope.querySelector('[data-stage]'), ex, {
      onPhase: ph => {
        scope.querySelectorAll('.phase-chip').forEach(c => c.setAttribute('aria-current', String(c.dataset.phase === ph.key)));
        scope.querySelectorAll('.step').forEach(s => s.classList.toggle('is-active', s.dataset.phase === ph.key));
      },
      onState: setToggle
    });
    setToggle(false);
    if (!prefersReducedMotion()) animator.play();
    let speed = 1;
    const onClick = e => {
      const el = e.target.closest('[data-exd]');
      if (!el || !scope.contains(el)) return;
      const act = el.dataset.exd;
      if (act === 'toggle') animator.toggle();
      if (act === 'restart') animator.restart();
      if (act === 'seek') animator.seek(el.dataset.phase);
      if (act === 'speed') {
        speed = speed === 1 ? 0.5 : 1;
        animator.setSpeed(speed);
        el.querySelector('span').textContent = speed === 1 ? '1×' : '0,5×';
        el.setAttribute('aria-label', `Velocidad: ${speed === 1 ? 'normal' : 'lenta'}`);
      }
    };
    scope.addEventListener('click', onClick);
    return () => { animator.destroy(); scope.removeEventListener('click', onClick); };
  }

  function selectButton(ex, c) {
    const list = WorkoutStore.getGroup(c.m, c.v, c.d, c.g);
    const cap = Coach.groupCap(c.m, c.v, c.d, c.g);
    const sel = list.includes(ex.id);
    const chk = sel ? { ok: true } : Coach.check(c.m, c.v, c.d, c.g, ex.id);
    const g = MUSCLE_GROUPS[c.g].name.toLowerCase();
    return `<button type="button" class="btn btn-select btn-block${sel ? ' is-selected' : ''}" data-exd="select" aria-pressed="${sel}" ${chk.ok ? '' : 'disabled'}>
        ${sel ? icon('check') + `<span>Elegido para ${esc(g)} · pulsa para quitar</span>` : chk.ok ? icon('plus') + `<span>Elegir para ${esc(g)}</span>` : icon('lock') + '<span>El entrenador no lo permite ahora</span>'}
      </button>
      ${chk.ok ? `<p class="muted small">${list.length} de ${cap} ejercicios elegidos en este grupo.</p>` : `<p class="coach-block">${icon('coach')}<span>${esc(chk.reason)}</span></p>`}`;
  }

  const DEMAND_NOTES = {
    alta: 'Mucha fatiga general: el entrenador permite como máximo 2 por sesión (1 en el día de pierna).',
    media: 'Fatiga moderada.',
    baja: 'Poca fatiga general: ideal para sumar volumen.'
  };

  /* Recomendación del entrenador con sus estudios */
  function recCallout(groupId) {
    const r = RECOMMENDED[groupId];
    return `<div class="callout callout-rec">${icon('star')}<div><p><strong>Recomendado por el entrenador.</strong> ${esc(r.why)}</p>
      ${r.refs.length ? `<ul class="refs-mini">${r.refs.map(id => `<li><a href="${COACH_REFS[id].url}" target="_blank" rel="noopener">${esc(COACH_REFS[id].label)}</a></li>`).join('')}</ul>` : ''}</div></div>`;
  }

  function exerciseDetail(ex, { groupId, headingTag = 'h2', selectCtx } = {}) {
    const tone = groupId ? UI.toneOfGroup(groupId) : UI.toneOfExercise(ex);
    const rec = groupId && Planner.isRecommended(ex.id, groupId);
    const goal = WorkoutStore.getGoal();
    const info = `<dl class="info-list">
      <div><dt>Músculo principal</dt><dd>${esc(ex.primary.join(', '))}</dd></div>
      <div><dt>Músculos secundarios</dt><dd>${ex.secondary.length ? esc(ex.secondary.join(', ')) : '—'}</dd></div>
      <div><dt>Equipamiento</dt><dd>${esc(ex.equipmentLabel)}</dd></div>
      <div><dt>Dificultad</dt><dd>${UI.difficulty(ex.difficulty)}</dd></div>
      <div><dt>Tipo de movimiento</dt><dd>${esc(ex.movement)}</dd></div>
      <div><dt>Categoría</dt><dd>${ex.category === 'compuesto' ? 'Compuesto (varias articulaciones)' : 'Aislamiento (una articulación)'}</dd></div>
      <div><dt>Exigencia</dt><dd>${UI.demandTag(ex)} <span class="muted small">${esc(DEMAND_NOTES[Coach.rating(ex.id).demand])}</span></dd></div>
    </dl>
    ${rec ? recCallout(groupId) : ''}`;
    const goalTab = `<div class="seg seg-sm" role="radiogroup" aria-label="Objetivo">
        ${GOAL_ORDER.map(g => `<button type="button" role="radio" class="seg-btn" aria-checked="${g === goal}" data-exd-goal="${g}">${icon(GOAL_ICONS[g])}${esc(UI.goalName(g))}</button>`).join('')}
      </div><div data-goal-panel>${goalPanel(ex, goal)}</div>`;
    const tension = `<div class="tension-grid">
        <div><h4>Dónde es mayor la demanda</h4><p>${esc(ex.tension.where)}</p></div>
        <div><h4>Cómo aprovecharla</h4><p>${esc(ex.tension.cue)}</p></div>
      </div>
      ${tensionFlow(true)}
      <p class="callout">${icon('info')}<span>Más peso no garantiza un mejor estímulo: si la técnica, el recorrido o el control empeoran, la tensión sobre el músculo objetivo puede disminuir.</span></p>`;

    return `<div class="exd tone-${tone}">
      ${animCard(ex)}
      <div class="exd-info">
        <div class="exd-head">
          <div class="tag-row">
            ${ex.groups.map(g => `<span class="chip chip-static tone-${UI.toneOfGroup(g)}"><span class="dot"></span>${esc(MUSCLE_GROUPS[g].name)}</span>`).join('')}
            ${rec ? `<span class="rec-badge rec-inline">${icon('star')}Recomendado</span>` : ''}
          </div>
          <${headingTag} class="exd-title" tabindex="-1">${esc(ex.name)}</${headingTag}>
          <p class="exd-desc">${esc(ex.description)}</p>
        </div>
        ${UI.tabs('exd', [
          { id: 'resumen', label: 'Resumen', html: info },
          { id: 'tecnica', label: 'Técnica', html: stepsHtml(ex) },
          { id: 'errores', label: 'Errores', html: `<ul class="list-x">${ex.mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` },
          { id: 'consejos', label: 'Consejos', html: `<ul class="list-check">${ex.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` },
          { id: 'objetivo', label: 'Tu objetivo', html: goalTab },
          { id: 'tension', label: 'Tensión mecánica', html: tension }
        ])}
        ${selectCtx ? `<div class="exd-select" data-exd-select>${selectButton(ex, selectCtx)}</div>` : ''}
      </div>
    </div>`;
  }

  /* Conecta pestaña de objetivo y botón de selección del detalle */
  function mountDetail(scope, ex, selectCtx) {
    const stopAnim = mountAnim(scope, ex);
    const onClick = e => {
      const g = e.target.closest('[data-exd-goal]');
      if (g && scope.contains(g)) {
        WorkoutStore.setGoal(g.dataset.exdGoal);
        scope.querySelectorAll('[data-exd-goal]').forEach(b => b.setAttribute('aria-checked', String(b === g)));
        scope.querySelector('[data-goal-panel]').innerHTML = goalPanel(ex, g.dataset.exdGoal);
      }
      const s = e.target.closest('[data-exd="select"]');
      if (s && selectCtx && !s.disabled) {
        const r = WorkoutStore.toggle(selectCtx.m, selectCtx.v, selectCtx.d, selectCtx.g, ex.id);
        if (r === 'blocked') UI.toast(Coach.check(selectCtx.m, selectCtx.v, selectCtx.d, selectCtx.g, ex.id).reason, 'error');
        scope.querySelector('[data-exd-select]').innerHTML = selectButton(ex, selectCtx);
      }
    };
    scope.addEventListener('click', onClick);
    return () => { stopAnim(); scope.removeEventListener('click', onClick); };
  }

  /* Abre el detalle de un ejercicio en una ventana emergente */
  function openExercise(exId, opts = {}) {
    const ex = EXERCISE_INDEX[exId];
    if (!ex) return;
    let cleanup = null;
    const dlg = UI.openDialog(`
      <button type="button" class="icon-btn dialog-close" data-dialog-close aria-label="Cerrar">${icon('x')}</button>
      ${exerciseDetail(ex, opts)}`, { wide: true, label: ex.name, onClose: () => cleanup && cleanup() });
    cleanup = mountDetail(dlg.querySelector('.exd'), ex, opts.selectCtx);
  }

  /* =====================================================================
     INICIO (panel de control)
     ===================================================================== */
  function resumeCard() {
    const a = WorkoutStore.getActive();
    if (!a) return '';
    const variant = Planner.variant(Planner.method(a.m), a.v);
    const s = Planner.sessionFor(variant, a.d);
    const day = DAYS.find(d => d.id === a.d);
    const ex = EXERCISE_INDEX[a.items[a.index].id];
    return `<section class="resume-card tone-${s.tone}" aria-labelledby="resume-title">
      <div class="resume-info">
        <p class="eyebrow"><span class="live-dot"></span>Entrenamiento en curso</p>
        <h2 id="resume-title">${day.name} · <span class="tone-text">${esc(s.name)}</span></h2>
        <p class="muted">Ejercicio ${a.index + 1} de ${a.items.length}: <strong>${esc(ex.name)}</strong></p>
        ${UI.progress(a.index, a.items.length, 'Progreso del entrenamiento')}
      </div>
      <div class="resume-actions">
        <a class="btn btn-primary btn-lg btn-pulse" href="#/entrenar">${icon('play')}<span>Continuar entrenamiento</span></a>
        <button type="button" class="btn btn-ghost btn-sm" data-action="abandon">Descartar</button>
      </div>
    </section>`;
  }

  function home() {
    return WorkoutStore.isConfigured() && currentPlan() ? dashboard() : planningHome();
  }

  /* Primer día de entrenamiento que aún no tiene ejercicios válidos */
  function nextIncompleteDay(plan, afterId) {
    const days = Planner.trainingDays(plan.variant);
    const start = afterId ? days.findIndex(d => d.id === afterId) + 1 : 0;
    const ordered = [...days.slice(start), ...days.slice(0, start)];
    return ordered.find(d => d.id !== afterId && !Planner.sessionProgress(plan.m, plan.v, d.id).complete) || null;
  }

  /* Inicio antes de terminar la rutina: la planificación paso a paso */
  function planningHome() {
    const plan = currentPlan();
    const goal = GOALS[WorkoutStore.getGoal()];
    const topic = id => LEARN_TOPICS.find(t => t.id === id);
    const stepCard = (n, title, value, text, href, cta, extra = '') => `
      <li class="step-card${value ? ' is-set' : ''}">
        <span class="step-card-num mono">${n}</span>
        <div class="step-card-body">
          <p class="step-card-title">${title}</p>
          <p class="step-card-value">${value ? esc(value) : '<span class="muted">Sin definir</span>'}</p>
          <p class="step-card-text">${text}</p>
          ${extra}
        </div>
        <a class="btn btn-ghost btn-sm" href="${href}">${cta}${icon('arrow-right')}</a>
      </li>`;

    const pending = plan && nextIncompleteDay(plan);
    const nextHref = !plan ? '#/plan/metodo' : pending ? `#/plan/dia/${pending.id}` : '#/plan/frecuencia';
    const html = `
      <section class="dash">
        <div class="container">
          ${resumeCard()}
          <div class="dash-grid">
            <div class="dash-main">
              <div class="dash-hero">
                <h1 tabindex="-1">Entiende tu entrenamiento. <span>Entrena con propósito.</span></h1>
                <p class="lead">Define tu objetivo, tu método y tu frecuencia, elige los ejercicios de cada día con la ayuda del entrenador y tendrás tu panel personal para entrenar.</p>
              </div>
              <section class="plan-box" aria-labelledby="plan-title">
                <div class="box-head">
                  <h2 id="plan-title">Tu planificación, paso a paso</h2>
                  <a class="btn btn-primary" href="${nextHref}">${plan ? (pending ? 'Elegir ejercicios' : 'Revisar y finalizar') : 'Continuar planificación'}${icon('arrow-right')}</a>
                </div>
                <ol class="step-cards">
                  ${stepCard(1, 'Definir objetivo', goal.name, esc(goal.tagline), '#/plan/objetivo', 'Cambiar')}
                  ${stepCard(2, 'Método de entrenamiento', plan && plan.method.name, plan ? esc(plan.method.tagline) : 'Cómo repartes los músculos en la semana.', '#/plan/metodo', plan ? 'Cambiar' : 'Elegir')}
                  ${stepCard(3, 'Frecuencia de entrenamiento', plan && plan.variant.name, plan ? esc(plan.variant.description) : 'Cuántos días entrenas por semana.', plan ? '#/plan/frecuencia' : '#/plan/metodo', plan ? 'Ver semana' : 'Elegir', plan ? UI.weekStrip(plan.variant) : '')}
                </ol>
              </section>
            </div>
            <aside class="dash-side">
              <section class="side-box" aria-labelledby="fund-title">
                <h2 id="fund-title">Fundamentos importantes</h2>
                <div class="topic-list">
                  ${FUNDAMENTALS.map((id, i) => UI.topicCard(topic(id), { featured: i === 0 })).join('')}
                </div>
              </section>
              <section class="side-box" aria-labelledby="explore-title">
                <h2 id="explore-title">Explora</h2>
                <div class="explore-grid">
                  <a class="explore-tile" href="#/ejercicios">${icon('dumbbell')}<span><strong>Ejercicios</strong><small>${EXERCISES.length} con animación</small></span></a>
                  <a class="explore-tile" href="#/aprende">${icon('book')}<span><strong>Aprende</strong><small>${LEARN_TOPICS.length} temas</small></span></a>
                  <a class="explore-tile" href="#/sobre">${icon('info')}<span><strong>Sobre FIT SPLIT</strong><small>El proyecto</small></span></a>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>`;

    return {
      title: '',
      html,
      reactive: true,
      actions: {
        async abandon() {
          const ok = await UI.confirm({ title: 'Descartar entrenamiento', text: 'Se perderá el progreso del entrenamiento en curso. Tu selección de ejercicios se mantiene.', confirmLabel: 'Descartar', danger: true });
          if (ok) { WorkoutStore.abandonWorkout(); UI.toast('Entrenamiento descartado.'); }
        }
      }
    };
  }

  /* =====================================================================
     PANEL PERSONAL (inicio una vez preparada la rutina)
     Se mantiene cada vez que el usuario vuelve a abrir la página.
     ===================================================================== */
  const STREAK_LEVELS = [
    [0, 'Empieza hoy tu racha: cada entrenamiento cuenta.'],
    [1, 'Primer paso dado. La constancia es lo que da resultados.'],
    [3, 'Buen ritmo. Mantén los días planificados de cada semana.'],
    [8, 'Ya es un hábito. Sigue así.'],
    [20, 'Constancia de verdad. Recuerda: comer y dormir bien multiplican este trabajo.']
  ];

  function streakCard(st) {
    const msg = STREAK_LEVELS.filter(([n]) => st.current >= n).pop()[1];
    return `<section class="streak-card${st.current ? ' is-on' : ''}" aria-labelledby="streak-title">
      <div class="streak-main">
        <span class="streak-flame">${icon('flame')}</span>
        <div>
          <h2 id="streak-title" class="streak-label">Tu racha</h2>
          <p class="streak-num"><strong class="mono">${st.current}</strong> <span>${st.current === 1 ? 'entrenamiento' : 'entrenamientos'} seguidos</span></p>
        </div>
      </div>
      <p class="streak-msg">${esc(msg)}</p>
      <ol class="streak-week" aria-label="Esta semana: ${st.week.done} de ${st.week.required} entrenamientos">
        ${st.week.days.map((d, i) => {
          const cls = d.trained ? 'is-trained' : !d.scheduled ? 'is-rest' : d.beforeStart ? 'is-off' : d.isPast ? 'is-missed' : 'is-planned';
          const label = d.trained ? 'entrenado' : !d.scheduled ? 'descanso' : d.beforeStart ? 'antes de empezar tu plan' : d.isPast ? 'pendiente' : 'planificado';
          return `<li class="${cls}${d.isToday ? ' is-today' : ''}" title="${DAYS[i].name}: ${label}"><span>${DAYS[i].short.charAt(0)}</span><i>${d.trained ? icon('check') : ''}</i></li>`;
        }).join('')}
      </ol>
      <dl class="streak-stats">
        <div><dt>Esta semana</dt><dd class="mono">${st.week.done}/${st.week.required}</dd></div>
        <div><dt>Mejor racha</dt><dd class="mono">${st.best}</dd></div>
        <div><dt>Total</dt><dd class="mono">${st.total}</dd></div>
      </dl>
      <p class="streak-rule">${icon('info')}<span>La racha se mantiene mientras cumplas los días planificados de cada semana. Si un día no puedes, recupéralo otro día de esa misma semana.</span></p>
    </section>`;
  }

  /* Lista corta de la rutina de un día, ya ordenada */
  function routinePreview(plan, dayId, max = 4) {
    const order = Planner.orderRoutine(plan.m, plan.v, dayId);
    const extra = order.length - max;
    return `<ol class="mini-routine">${order.slice(0, max).map(it => `<li class="tone-${UI.toneOfGroup(it.g)}"><span class="dot"></span>${esc(EXERCISE_INDEX[it.id].name)}</li>`).join('')}
      ${extra > 0 ? `<li class="more">+ ${UI.plural(extra, 'ejercicio más', 'ejercicios más')}</li>` : ''}</ol>`;
  }

  function todayCard(plan, st) {
    const today = DAYS.find(d => d.id === st.todayId);
    const s = Planner.sessionFor(plan.variant, today.id);
    const nextDay = () => {
      const days = DAYS.map(d => d.id);
      const i = days.indexOf(today.id);
      for (let k = 1; k <= 7; k++) {
        const id = days[(i + k) % 7];
        if (plan.variant.schedule[id]) return DAYS.find(d => d.id === id);
      }
      return null;
    };
    if (WorkoutStore.getActive()) {
      return `<section class="today-card is-info"><p class="eyebrow">Hoy</p><h2>Tienes un entrenamiento a medias</h2><p class="muted">Continúalo desde el aviso de arriba o descártalo para empezar otro.</p></section>`;
    }
    if (s.id === 'rest' || st.trainedToday) {
      const nd = nextDay();
      const ns = nd && Planner.sessionFor(plan.variant, nd.id);
      const p = nd && Planner.sessionProgress(plan.m, plan.v, nd.id);
      return `<section class="today-card${st.trainedToday ? ' is-done' : ' is-rest'}" aria-labelledby="today-title">
        <p class="eyebrow">Hoy · ${today.name}</p>
        <h2 id="today-title">${st.trainedToday ? `${icon('check')}Entrenamiento de hoy completado` : `${icon('moon')}Día de descanso`}</h2>
        <p class="muted">${st.trainedToday ? 'Buen trabajo. Ahora toca comer bien y descansar: ahí es donde el músculo se adapta.' : 'La adaptación ocurre durante la recuperación. Aprovecha para dormir bien y cuidar la alimentación.'}</p>
        ${nd ? `<div class="today-next tone-${ns.tone}"><p>Próximo: <strong>${nd.name} · <span class="tone-text">${esc(ns.name)}</span></strong></p>
          ${p.complete ? `<button type="button" class="btn btn-ghost btn-sm" data-action="start-day" data-d="${nd.id}">${icon('play')}<span>Adelantarlo hoy</span></button>`
            : '<span class="muted small">Faltan ejercicios: usa «Editar método actual».</span>'}</div>` : ''}
      </section>`;
    }
    const p = Planner.sessionProgress(plan.m, plan.v, today.id);
    if (!p.complete) {
      return `<section class="today-card tone-${s.tone}" aria-labelledby="today-title">
        <p class="eyebrow">Hoy · ${today.name}</p>
        <h2 id="today-title">Hoy toca <span class="tone-text">${esc(s.name)}</span></h2>
        <p class="muted">Este día aún no tiene una rutina válida${p.coach && p.coach.violations.length ? ' (el entrenador ha detectado límites superados)' : ''}. Complétalo con el botón «Editar método actual».</p>
      </section>`;
    }
    return `<section class="today-card tone-${s.tone}" aria-labelledby="today-title">
      <p class="eyebrow">Hoy · ${today.name}</p>
      <h2 id="today-title">Hoy toca <span class="tone-text">${esc(s.name)}</span></h2>
      <p class="today-meta">${icon('dumbbell')}${UI.plural(p.coach.count, 'ejercicio', 'ejercicios')} · ${p.coach.sets} series · ${icon('clock')}≈ ${p.coach.minutes} min</p>
      ${routinePreview(plan, today.id)}
      <div class="btn-row">
        <button type="button" class="btn btn-primary btn-lg btn-pulse" data-action="start-day" data-d="${today.id}">${icon('play')}<span>Empezar entrenamiento</span></button>
      </div>
    </section>`;
  }

  function weekList(plan, st) {
    return `<div class="week-list">${DAYS.map((day, i) => {
      const s = Planner.sessionFor(plan.variant, day.id);
      const info = st.week.days[i];
      const badge = info.isToday ? '<span class="badge badge-today">Hoy</span>' : '';
      if (s.id === 'rest') {
        return `<article class="wk-day is-rest${info.isToday ? ' is-today' : ''}">
          <header><span class="wk-name">${day.name}</span>${badge}${info.trained ? `<span class="badge badge-ok">${icon('check')}Hecho</span>` : ''}</header>
          <p class="wk-session">${icon('moon')}Descanso</p></article>`;
      }
      const p = Planner.sessionProgress(plan.m, plan.v, day.id);
      const status = info.trained ? `<span class="badge badge-ok">${icon('check')}Hecho</span>` : info.isPast && !info.beforeStart ? '<span class="badge badge-warn">Pendiente</span>' : '';
      return `<article class="wk-day tone-${s.tone}${info.isToday ? ' is-today' : ''}">
        <header><span class="wk-name">${day.name}</span>${badge}${status}</header>
        <p class="wk-session tone-text">${esc(s.name)}</p>
        ${p.complete ? `<p class="wk-meta">${UI.plural(p.coach.count, 'ejercicio', 'ejercicios')} · ≈ ${p.coach.minutes} min</p>${routinePreview(plan, day.id, 3)}`
          : `<p class="wk-meta wk-warn">${icon('alert')}${p.coach && p.coach.violations.length ? 'Supera los límites del entrenador' : 'Faltan ejercicios'}</p>`}
        <div class="wk-actions">
          ${p.complete ? `<button type="button" class="btn btn-primary btn-sm" data-action="start-day" data-d="${day.id}">${icon('play')}<span>Entrenar</span></button>` : ''}
        </div>
      </article>`;
    }).join('')}</div>`;
  }

  function dashboard() {
    const plan = currentPlan();
    const goal = GOALS[WorkoutStore.getGoal()];
    const st = WorkoutStore.getStreak();
    const topic = id => LEARN_TOPICS.find(t => t.id === id);
    const html = `
      <section class="dash dash-me">
        <div class="container">
          ${resumeCard()}
          <div class="me-head">
            <div>
              <p class="eyebrow">Tu panel</p>
              <h1 tabindex="-1">Tu entrenamiento</h1>
            </div>
            <ul class="plan-chips" aria-label="Tu plan">
              <li class="chip chip-static goal-${goal.id}">${icon(GOAL_ICONS[goal.id] || 'target')}${esc(goal.name)}</li>
              <li class="chip chip-static tone-${plan.method.tone}"><span class="dot"></span>${esc(plan.method.name)}</li>
              <li class="chip chip-static">${icon('calendar')}${esc(plan.variant.name)}</li>
            </ul>
          </div>
          <div class="me-actions">
            <a class="btn btn-secondary" href="#/plan/metodo">${icon('split')}<span>Cambiar método</span></a>
            <a class="btn btn-secondary" href="#/plan/frecuencia">${icon('edit')}<span>Editar método actual</span></a>
          </div>
          <div class="me-grid">
            ${todayCard(plan, st)}
            ${streakCard(st)}
          </div>
          ${UI.tabs('me', [
            { id: 'semana', label: 'Mi semana', html: weekList(plan, st) },
            { id: 'fundamentos', label: 'Fundamentos', html: `<div class="topic-grid">${FUNDAMENTALS.map((id, i) => UI.topicCard(topic(id), { featured: i === 0 })).join('')}</div>
              <div class="explore-grid explore-row">
                <a class="explore-tile" href="#/ejercicios">${icon('dumbbell')}<span><strong>Ejercicios</strong><small>${EXERCISES.length} con animación</small></span></a>
                <a class="explore-tile" href="#/aprende">${icon('book')}<span><strong>Aprende</strong><small>${LEARN_TOPICS.length} temas</small></span></a>
                <a class="explore-tile" href="#/sobre">${icon('info')}<span><strong>Sobre FIT SPLIT</strong><small>El proyecto</small></span></a>
              </div>` }
          ])}
        </div>
      </section>`;
    return {
      title: 'Tu panel',
      html,
      reactive: true,
      actions: {
        'start-day'(el) { startDay(el.dataset.d); },
        async abandon() {
          const ok = await UI.confirm({ title: 'Descartar entrenamiento', text: 'Se perderá el progreso del entrenamiento en curso y no contará para la racha. Tu rutina se mantiene.', confirmLabel: 'Descartar', danger: true });
          if (ok) { WorkoutStore.abandonWorkout(); UI.toast('Entrenamiento descartado.'); }
        }
      }
    };
  }

  /* =====================================================================
     PASO 1 · OBJETIVO
     ===================================================================== */
  function goalStep() {
    const onboarded = WorkoutStore.isOnboarded();
    const current = WorkoutStore.getGoal();
    const repsShort = { fuerza: '≈ 1–6', hipertrofia: '≈ 6–15', resistencia: '15–30+' };
    const html = `
      <section class="step-page">
        <div class="container">
          ${planStepper('objetivo')}
          <div class="step-head">
            ${onboarded ? '' : `<p class="eyebrow">Bienvenido a FIT SPLIT</p>`}
            <h1 tabindex="-1">¿Qué quieres conseguir?</h1>
            <p class="lead">${onboarded ? 'Puedes cambiar tu objetivo cuando quieras.' : 'Antes de empezar, cuéntanos tu objetivo.'} Con él ajustamos repeticiones, series, esfuerzo y descanso en cada ejercicio.</p>
          </div>
          <div class="goal-options">
            ${GOAL_ORDER.map(id => {
              const g = GOALS[id];
              const sel = onboarded && id === current;
              return `<button type="button" class="goal-option goal-${id}${sel ? ' is-selected' : ''}" data-action="choose-goal" data-goal="${id}" aria-pressed="${sel}">
                <span class="goal-icon">${icon(GOAL_ICONS[id])}</span>
                <span class="goal-name">${esc(g.name)}</span>
                <span class="goal-tag">${esc(g.tagline)}</span>
                <span class="goal-facts">
                  <span><small>Repeticiones</small><b class="mono">${repsShort[id]}</b></span>
                  <span><small>Descanso</small><b class="mono">${esc(g.prescription.rest)}</b></span>
                </span>
                <span class="goal-cta">${sel ? icon('check') + 'Tu objetivo' : 'Elegir' + icon('arrow-right')}</span>
              </button>`;
            }).join('')}
          </div>
          <p class="callout">${icon('info')}<span>Los rangos de repeticiones son orientativos y se superponen. El resultado también depende del esfuerzo, el volumen, la técnica, la recuperación y, sobre todo, de la alimentación.</span></p>
        </div>
      </section>`;
    return {
      title: 'Tu objetivo',
      html,
      actions: {
        'choose-goal'(el) {
          WorkoutStore.setGoal(el.dataset.goal);
          UI.toast(`Objetivo: ${GOALS[el.dataset.goal].name}. El entrenador ha ajustado series, descansos y límites.`);
          go(WorkoutStore.isConfigured() && currentPlan() ? '#/' : currentPlan() ? '#/plan/frecuencia' : '#/plan/metodo');
        }
      }
    };
  }

  /* =====================================================================
     PASO 2 · MÉTODO
     ===================================================================== */
  let viewingMethod = null;

  function methodDetail(m) {
    const plan = currentPlan();
    const chosen = plan && plan.m === m.id;
    const sessionTypes = [...new Set(m.variants.flatMap(v => Object.values(v.schedule)))].map(id => SESSION_TYPES[id]);
    return `<div class="method-detail-inner tone-${m.tone}">
      <div class="md-head">
        <div>
          <p class="eyebrow">${esc(m.short)}</p>
          <h2>${esc(m.name)}</h2>
          <p class="muted">${esc(m.tagline)}</p>
        </div>
        <button type="button" class="btn btn-primary" data-action="choose-method" data-m="${m.id}">${chosen ? 'Continuar con este método' : 'Elegir este método'}${icon('arrow-right')}</button>
      </div>
      <dl class="stat-row">
        <div><dt>Días</dt><dd>${esc(m.stats.days)}</dd></div>
        <div><dt>Frecuencia</dt><dd>${esc(m.stats.frequency)}</dd></div>
        <div><dt>Duración</dt><dd>${esc(m.stats.duration)}</dd></div>
        <div><dt>Nivel</dt><dd>${esc(m.stats.level)}</dd></div>
      </dl>
      ${UI.tabs('method-info', [
        { id: 'que', label: 'Qué es', html: `${m.what.map(p => `<p>${esc(p)}</p>`).join('')}${m.how.map(p => `<p>${esc(p)}</p>`).join('')}
          <div class="session-types">${sessionTypes.map(s => `<div class="session-type tone-${s.tone}"><strong>${esc(s.name)}</strong><span>${Planner.groupsOf(s).map(g => esc(g.group.name)).join(' · ')}</span></div>`).join('')}</div>` },
        { id: 'pros', label: 'Ventajas y desventajas', html: `<div class="two-col">
          <div><h4 class="h-ok">${icon('check')}Ventajas</h4><ul class="list-check">${m.advantages.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>
          <div><h4 class="h-bad">${icon('alert')}Desventajas</h4><ul class="list-x">${m.disadvantages.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div></div>` },
        { id: 'quien', label: 'Para quién', html: `${m.forWhom.map(p => `<p>${esc(p)}</p>`).join('')}
          <h4>Puede no ser la mejor opción si…</h4><ul class="list-dot">${m.notIdeal.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` },
        { id: 'faq', label: 'Preguntas', html: `<div class="faq-list">${m.faq.map(f => `<details class="faq"><summary>${esc(f.q)}${icon('chevron-down')}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>` },
        { id: 'comparar', label: 'Comparar', html: `<div class="table-wrap" tabindex="0" role="region" aria-label="Comparativa de métodos"><table class="compare">
          <thead><tr><th scope="col">Método</th><th scope="col">Días</th><th scope="col">Frecuencia</th><th scope="col">Duración</th><th scope="col">Destaca por</th></tr></thead>
          <tbody>${METHODS.map(x => `<tr class="tone-${x.tone}${x.id === m.id ? ' is-current' : ''}"><th scope="row"><span class="dot"></span>${esc(x.name)}</th>
            <td class="mono">${esc(x.compare.days)}</td><td class="mono">${esc(x.compare.frequency)}</td><td>${esc(x.compare.duration)}</td><td>${esc(x.compare.bestFor)}</td></tr>`).join('')}</tbody>
          </table></div><p class="muted small">Con el mismo volumen semanal, las diferencias entre métodos suelen ser pequeñas. El mejor método suele ser el que puedes mantener.</p>` }
      ])}
    </div>`;
  }

  function methodStep() {
    if (!WorkoutStore.isOnboarded()) return { redirect: '#/plan/objetivo' };
    const plan = currentPlan();
    if (!viewingMethod || !Planner.method(viewingMethod)) viewingMethod = plan ? plan.m : METHODS[0].id;
    const html = `
      <section class="step-page">
        <div class="container">
          ${planStepper('metodo')}
          <div class="step-head">
            <h1 tabindex="-1">Elige un método de entrenamiento</h1>
            <p class="lead">Un método decide qué músculos entrenas cada día. Toca uno para ver cómo funciona; ninguno es el mejor para todo el mundo.</p>
            ${WorkoutStore.isConfigured() ? `<p class="muted">Tu objetivo: <strong>${esc(GOALS[WorkoutStore.getGoal()].name)}</strong> · <a href="#/plan/objetivo">cambiar objetivo</a></p>` : ''}
          </div>
          <div class="method-picker">
            <div class="method-options" role="group" aria-label="Métodos">
              ${METHODS.map(m => `<button type="button" class="method-option tone-${m.tone}" data-action="view-method" data-m="${m.id}" aria-pressed="${m.id === viewingMethod}">
                <span class="method-abbr">${esc(m.short)}</span>
                <span class="mo-text"><strong>${esc(m.name)}</strong><small>${esc(m.stats.days)} · ${esc(m.stats.frequency)}</small></span>
                ${plan && plan.m === m.id ? `<span class="mo-badge">${icon('check')}Elegido</span>` : ''}
              </button>`).join('')}
            </div>
            <div class="method-detail" id="method-detail">${methodDetail(Planner.method(viewingMethod))}</div>
          </div>
        </div>
      </section>`;
    return {
      title: 'Elige un método',
      html,
      actions: {
        'view-method'(el) {
          viewingMethod = el.dataset.m;
          document.querySelectorAll('.method-option').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
          const detail = document.getElementById('method-detail');
          detail.innerHTML = methodDetail(Planner.method(viewingMethod));
          if (window.matchMedia('(max-width: 860px)').matches) detail.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        },
        'choose-method'(el) {
          const m = Planner.method(el.dataset.m);
          const plan = currentPlan();
          WorkoutStore.setPlan(m.id, plan && plan.m === m.id ? plan.v : m.variants[0].id);
          go('#/plan/frecuencia');
        }
      }
    };
  }

  /* =====================================================================
     PASO 3 · FRECUENCIA
     Al cambiar de frecuencia solo se actualizan las tarjetas de abajo.
     ===================================================================== */
  function weekCards(plan) {
    const { m, v, variant } = plan;
    const freq = Planner.weeklyFrequency(variant);
    const days = DAYS.map(day => {
      const s = Planner.sessionFor(variant, day.id);
      if (s.id === 'rest') {
        return `<div class="day-tile is-rest"><span class="day-name">${day.name}</span><span class="day-session">${icon('moon')}Descanso</span><span class="day-groups">Recuperación</span></div>`;
      }
      const p = Planner.sessionProgress(m, v, day.id);
      const over = p.coach && p.coach.violations.length;
      return `<div class="day-tile tone-${s.tone}${p.complete ? ' is-complete' : ''}${over ? ' is-over' : ''}">
        <span class="day-name">${day.name}</span>
        <span class="day-session">${esc(s.name)}</span>
        <span class="day-groups">${p.perGroup.map(g => esc(g.group.short || g.group.name)).join(' · ')}</span>
        <span class="day-status">${p.complete ? icon('check') + `${UI.plural(p.coach.count, 'ejercicio', 'ejercicios')} · ≈ ${p.coach.minutes} min` : over ? icon('alert') + 'Supera los límites del entrenador' : p.done ? `${p.done} elegidos · faltan grupos` : 'Sin ejercicios'}</span>
        <span class="day-actions">
          <a class="btn ${p.complete ? 'btn-ghost' : 'btn-secondary'} btn-sm" href="#/plan/dia/${day.id}">${p.done ? `${icon('edit')}<span>Editar</span>` : 'Elegir ejercicios'}</a>
        </span>
      </div>`;
    }).join('');
    return `<p class="variant-desc">${icon('info')}${esc(variant.description)}</p>
      <div class="freq-layout">
        <div class="week-calendar">${days}</div>
        <div class="freq-chart">
          <h3>Veces por semana</h3>
          ${GROUP_ORDER.filter(g => freq[g]).map(g => `<div class="freq-row tone-${UI.toneOfGroup(g)}">
            <span class="freq-name">${esc(MUSCLE_GROUPS[g].short || MUSCLE_GROUPS[g].name)}</span>
            <span class="freq-bar"><span style="width:${(freq[g] / 3) * 100}%"></span></span>
            <span class="freq-val mono">${freq[g]}×</span></div>`).join('')}
        </div>
      </div>`;
  }

  function freqTabs(plan) {
    return plan.method.variants.map(x => `<button type="button" role="radio" class="seg-btn" data-action="choose-variant" data-v="${x.id}" aria-checked="${x.id === plan.v}">${icon('calendar')}${esc(x.name)}</button>`).join('');
  }

  /* Acciones de la semana: siguiente día pendiente, autocompletar o finalizar */
  function freqCta(plan) {
    const pending = nextIncompleteDay(plan);
    const configured = WorkoutStore.isConfigured();
    return `${pending ? `<button type="button" class="btn btn-ghost" data-action="autofill-week">${icon('wand')}<span>Completar los días pendientes con el entrenador</span></button>` : ''}
      ${pending ? `<a class="btn btn-primary btn-lg" href="#/plan/dia/${pending.id}">Elegir ejercicios: ${pending.name.toLowerCase()}${icon('arrow-right')}</a>`
        : configured ? `<a class="btn btn-primary btn-lg" href="#/">${icon('home')}<span>Volver a mi panel</span></a>`
        : `<button type="button" class="btn btn-primary btn-lg btn-pulse" data-action="finish-routine">${icon('flag')}<span>Finalizar rutina</span></button>`}`;
  }

  /* Rutina terminada: a partir de aquí el inicio es el panel personal */
  function finishRoutine() {
    const first = !WorkoutStore.isConfigured();
    WorkoutStore.setConfigured(true);
    UI.toast(first ? '¡Rutina lista! Este es tu panel: desde aquí entrenarás cada día.' : 'Cambios guardados.');
    go('#/');
  }

  function autofillWeek(plan) {
    let n = 0;
    for (const d of Planner.trainingDays(plan.variant)) {
      if (Planner.sessionProgress(plan.m, plan.v, d.id).complete) continue;
      WorkoutStore.setSelection(plan.m, plan.v, d.id, Coach.autofill(plan.m, plan.v, d.id));
      n += 1;
    }
    UI.toast(`El entrenador completó ${UI.plural(n, 'día', 'días')}. Revisa y cambia lo que quieras.`);
  }

  function frequencyStep() {
    const plan = currentPlan();
    if (!plan) return { redirect: WorkoutStore.isOnboarded() ? '#/plan/metodo' : '#/plan/objetivo' };
    const html = `
      <section class="step-page">
        <div class="container">
          <div id="stepper-slot">${planStepper('frecuencia')}</div>
          <div class="step-head step-head-row">
            <div>
              <h1 tabindex="-1">¿Cuántos días vas a entrenar?</h1>
              <p class="lead">Método: <strong>${esc(plan.method.name)}</strong> · <a href="#/plan/metodo">cambiar</a>. Elige la frecuencia y después un día para elegir sus ejercicios.</p>
            </div>
            <div class="seg freq-tabs" role="radiogroup" aria-label="Frecuencia" id="freq-tabs">${freqTabs(plan)}</div>
          </div>
          <div id="freq-body">${weekCards(plan)}</div>
          <div class="freq-cta" id="freq-cta">${freqCta(plan)}</div>
        </div>
      </section>`;
    return {
      title: 'Frecuencia',
      html,
      update(root) {
        const p = currentPlan();
        if (!p) return;
        root.querySelector('#freq-tabs').innerHTML = freqTabs(p);
        root.querySelector('#freq-body').innerHTML = weekCards(p);
        root.querySelector('#stepper-slot').innerHTML = planStepper('frecuencia');
        root.querySelector('#freq-cta').innerHTML = freqCta(p);
      },
      actions: {
        'choose-variant'(el) {
          const p = currentPlan();
          WorkoutStore.setPlan(p.m, el.dataset.v);
          const btn = document.querySelector(`[data-action="choose-variant"][data-v="${el.dataset.v}"]`);
          if (btn) btn.focus({ preventScroll: true });
        },
        'autofill-week'() { autofillWeek(currentPlan()); },
        'finish-routine'() { finishRoutine(); }
      }
    };
  }

  async function startDay(dayId) {
    const plan = currentPlan();
    if (WorkoutStore.getActive()) {
      const ok = await UI.confirm({ title: 'Ya tienes un entrenamiento en curso', text: 'Si empiezas otro, se descartará el progreso del entrenamiento actual.', confirmLabel: 'Empezar nuevo' });
      if (!ok) return;
    }
    if (WorkoutStore.startWorkout(plan.m, plan.v, dayId)) go('#/entrenar');
  }

  /* =====================================================================
     PASO 4 · EJERCICIOS DEL DÍA
     El usuario elige los ejercicios de todos los grupos; la aplicación
     los ordena automáticamente.
     ===================================================================== */
  const groupByDay = {};

  function dayStep({ day: dayId }) {
    const plan = currentPlan();
    if (!plan) return { redirect: '#/plan/metodo' };
    if (!plan.variant.schedule[dayId]) return { redirect: '#/plan/frecuencia' };
    const { m, v, variant, method } = plan;
    const day = DAYS.find(d => d.id === dayId);
    const s = Planner.sessionFor(variant, dayId);
    const groups = Planner.groupsOf(s);
    const memKey = `${m}|${v}|${dayId}`;
    if (!groups.some(g => g.id === groupByDay[memKey])) groupByDay[memKey] = groups[0].id;

    const groupTabs = () => {
      const p = Planner.sessionProgress(m, v, dayId);
      return p.perGroup.map(x => `<button type="button" class="group-tab tone-${UI.toneOfGroup(x.id)}" data-action="pick-group" data-g="${x.id}" aria-pressed="${x.id === groupByDay[memKey]}" data-focus="gt-${x.id}">
        <span class="group-name">${esc(x.group.name)}</span>
        <span class="group-count mono">${x.count}/${x.max}</span>
        ${x.ready ? `<span class="group-ok" aria-label="listo">${icon('check')}</span>` : ''}
      </button>`).join('');
    };

    const groupPane = () => {
      const g = groups.find(x => x.id === groupByDay[memKey]);
      const list = WorkoutStore.getGroup(m, v, dayId, g.id);
      const cap = Coach.groupCap(m, v, dayId, g.id);
      const full = list.length >= cap;
      const next = groups[groups.indexOf(g) + 1];
      return `<div class="group-pane-head tone-${UI.toneOfGroup(g.id)}">
          <div>
            <h2>${esc(g.group.name)}</h2>
            <p class="muted">${esc(g.group.role)}</p>
          </div>
          <div class="counter${full ? ' is-full' : ''}" aria-live="polite">
            <p><strong class="mono">${list.length} / ${cap}</strong> elegidos</p>
            ${UI.progress(list.length, cap, `Ejercicios elegidos de ${g.group.name}`)}
          </div>
        </div>
        ${RECOMMENDED[g.id] ? `<details class="rec-note"><summary>${icon('star')}<span><strong>Recomendados por el entrenador:</strong> ${esc(RECOMMENDED[g.id].why)}</span></summary>
          ${RECOMMENDED[g.id].refs.length ? `<ul class="refs-mini">${RECOMMENDED[g.id].refs.map(id => `<li><a href="${COACH_REFS[id].url}" target="_blank" rel="noopener">${esc(COACH_REFS[id].label)}</a></li>`).join('')}</ul>` : '<p class="muted small">Criterio del entrenador: tensión en todo el recorrido y buena carga en la posición estirada.</p>'}</details>` : ''}
        <p class="limit-note">${icon('info')}<span>${full ? `Máximo alcanzado (${cap}). Quita uno para cambiarlo.` : `Elige ${g.min > 1 ? `entre ${g.min} y ${cap}` : `hasta ${cap}`}. ${s.hint ? esc(s.hint) : ''}`}</span></p>
        <div class="ex-grid">
          ${Planner.exercisesFor(g.id).map((ex, i) => UI.exerciseCard(ex, {
            groupId: g.id, selectable: true, index: Math.min(i, 8),
            selected: list.includes(ex.id), block: list.includes(ex.id) ? null : Coach.check(m, v, dayId, g.id, ex.id)
          })).join('')}
        </div>
        ${next && list.length >= g.min ? `<div class="group-next"><button type="button" class="btn btn-secondary" data-action="pick-group" data-g="${next.id}">Siguiente grupo: ${esc(next.group.name)}${icon('arrow-right')}</button></div>` : ''}`;
    };

    /* Botón principal: guardar y pasar al siguiente día pendiente */
    const primaryAction = (p, compact) => {
      const pending = nextIncompleteDay(plan, dayId);
      const label = pending ? (compact ? 'Guardar y seguir' : `Guardar y continuar: ${pending.name.toLowerCase()}`)
        : WorkoutStore.isConfigured() ? 'Guardar cambios' : 'Finalizar rutina';
      return `<button type="button" class="btn btn-primary${compact ? '' : ' btn-lg btn-block'}${p.complete ? ' btn-pulse' : ''}" data-action="save-day" ${p.complete ? '' : 'disabled'}>
        ${icon(pending ? 'arrow-right' : 'flag')}<span>${label}</span></button>`;
    };

    const coachPanel = p => {
      const c = p.coach;
      const meter = (label, value, cap, warn) => `<div class="cm${warn ? ' is-warn' : ''}"><dt>${label}</dt><dd class="mono">${value}${cap != null ? `<small>/${cap}</small>` : ''}</dd></div>`;
      return `<section class="coach-panel" aria-labelledby="coach-title">
        <h3 id="coach-title">${icon('coach')}Control del entrenador</h3>
        <dl class="coach-meters">
          ${meter('Ejercicios', c.count, c.cap, c.count > c.cap)}
          ${meter('Exigentes', c.high, c.highCap, c.high > c.highCap)}
          ${meter('Series', c.sets)}
          ${meter('Minutos', c.minutes ? `≈${c.minutes}` : '—', null)}
        </dl>
        ${c.violations.map(t => `<p class="coach-msg is-bad">${icon('alert')}<span>${esc(t)}</span></p>`).join('')}
        ${c.notes.map(t => `<p class="coach-msg">${icon('info')}<span>${esc(t)}</span></p>`).join('')}
        ${!c.violations.length && !c.notes.length && c.count ? `<p class="coach-msg is-ok">${icon('check')}<span>Selección dentro de los límites seguros.</span></p>` : ''}
        <button type="button" class="btn btn-ghost btn-sm btn-block" data-action="autofill-day">${icon('wand')}<span>${p.done ? 'Completar con el entrenador' : 'Que el entrenador elija por mí'}</span></button>
      </section>`;
    };

    const routinePanel = () => {
      const p = Planner.sessionProgress(m, v, dayId);
      const order = Planner.orderRoutine(m, v, dayId);
      const copyFrom = !p.done ? Planner.trainingDays(variant).filter(d => d.id !== dayId && variant.schedule[d.id] === s.id && Planner.sessionProgress(m, v, d.id).complete) : [];
      const missing = p.perGroup.filter(x => !x.ready).map(x => x.group.name);
      return `${coachPanel(p)}
        <h2>Tu rutina</h2>
        <p class="muted small routine-sub">${icon('list')}<span>Orden automático: compuestos y músculos grandes primero, los más exigentes cuando estás fresco, aislamientos al final.</span></p>
        ${order.length ? `<ol class="routine-list">${order.map((it, i) => {
          const ex = EXERCISE_INDEX[it.id];
          return `<li class="tone-${UI.toneOfGroup(it.g)}">
            <span class="routine-n mono">${i + 1}</span>
            <div><strong>${esc(ex.name)}</strong><small><span class="dot"></span>${esc(MUSCLE_GROUPS[it.g].name)} · ${Coach.setsFor(ex)} series</small></div>
          </li>`;
        }).join('')}</ol>` : '<p class="routine-empty">Elige ejercicios en cada grupo y aquí verás el orden en que los harás.</p>'}
        ${copyFrom.map(d => `<button type="button" class="btn btn-ghost btn-sm btn-block" data-action="copy-day" data-from="${d.id}">${icon('copy')}<span>Copiar la rutina del ${d.name.toLowerCase()}</span></button>`).join('')}
        ${primaryAction(p, false)}
        ${p.complete ? '' : `<p class="routine-hint">${icon('info')}<span>${p.coach && p.coach.violations.length ? 'Corrige los avisos del entrenador para continuar.' : `Falta elegir: ${missing.map(esc).join(', ')}.`}</span></p>`}
        ${p.done ? `<button type="button" class="btn btn-ghost btn-sm btn-block btn-danger-text" data-action="clear-day">${icon('trash')}<span>Vaciar el día</span></button>` : ''}`;
    };

    const mobileBar = () => {
      const p = Planner.sessionProgress(m, v, dayId);
      const ready = p.perGroup.filter(x => x.ready).length;
      return `<p><strong>${UI.plural(p.done, 'ejercicio', 'ejercicios')}</strong> · ${ready}/${p.perGroup.length} grupos${p.coach && p.coach.minutes ? ` · ≈${p.coach.minutes} min` : ''}</p>
        ${primaryAction(p, true)}`;
    };

    const html = `
      <section class="step-page">
        <div class="container">
          <div id="stepper-slot">${planStepper('dia')}</div>
          <div class="day-head tone-${s.tone}">
            <div>
              <p class="eyebrow">${esc(method.name)} · ${esc(variant.name)}</p>
              <h1 tabindex="-1">${day.name} · <span class="tone-text">${esc(s.name)}</span></h1>
              <p class="muted">Elige los ejercicios de cada grupo. El entrenador controla la carga de la sesión y los ordena de la forma más eficaz.</p>
            </div>
            <nav class="day-switch" aria-label="Días de entrenamiento">
              ${Planner.trainingDays(variant).map(d => {
                const ds = Planner.sessionFor(variant, d.id);
                return `<a class="day-chip tone-${ds.tone}" href="#/plan/dia/${d.id}" aria-current="${d.id === dayId ? 'page' : 'false'}"><b>${d.short}</b>${esc(ds.name)}</a>`;
              }).join('')}
            </nav>
          </div>
          <div class="builder">
            <div class="builder-main">
              <div class="group-tabs" id="group-tabs" role="group" aria-label="Grupos musculares">${groupTabs()}</div>
              <div class="group-pane" id="group-pane">${groupPane()}</div>
            </div>
            <aside class="routine-panel" id="routine-panel" aria-label="Tu rutina">${routinePanel()}</aside>
          </div>
        </div>
        <div class="mobile-bar" id="mobile-bar">${mobileBar()}</div>
      </section>`;

    const refresh = root => {
      const focusKey = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.focus : null;
      root.querySelector('#group-tabs').innerHTML = groupTabs();
      root.querySelector('#group-pane').innerHTML = groupPane();
      root.querySelector('#routine-panel').innerHTML = routinePanel();
      root.querySelector('#mobile-bar').innerHTML = mobileBar();
      if (focusKey) {
        const el = root.querySelector(`[data-focus="${focusKey}"]`);
        if (el && !el.disabled) el.focus({ preventScroll: true });
      }
    };

    return {
      title: `${day.name} · ${s.name}`,
      html,
      update: refresh,
      actions: {
        'pick-group'(el) {
          groupByDay[memKey] = el.dataset.g;
          const root = document.getElementById('app');
          refresh(root);
          const tabs = root.querySelector('#group-tabs');
          if (tabs.getBoundingClientRect().top < 60) tabs.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
          const cur = tabs.querySelector('[aria-pressed="true"]');
          if (cur) tabs.scrollLeft = cur.offsetLeft - (tabs.clientWidth - cur.clientWidth) / 2;
        },
        'toggle-exercise'(el) {
          const g = groups.find(x => x.id === groupByDay[memKey]);
          const before = Planner.sessionProgress(m, v, dayId).complete;
          const chk = Coach.check(m, v, dayId, g.id, el.dataset.ex);
          const r = WorkoutStore.toggle(m, v, dayId, g.id, el.dataset.ex);
          if (r === 'blocked') UI.toast(chk.reason, 'error');
          if (!before && Planner.sessionProgress(m, v, dayId).complete) UI.toast('Día completo. Pulsa «Guardar» para continuar.');
        },
        'open-exercise'(el) {
          const g = groups.find(x => x.id === groupByDay[memKey]);
          openExercise(el.dataset.ex, { groupId: g.id, selectCtx: { m, v, d: dayId, g: g.id } });
        },
        'copy-day'(el) { WorkoutStore.copySession(m, v, el.dataset.from, dayId); UI.toast('Selección copiada.'); },
        async 'clear-day'() {
          const ok = await UI.confirm({ title: 'Vaciar el día', text: `Se quitarán todos los ejercicios del ${day.name.toLowerCase()}.`, confirmLabel: 'Vaciar', danger: true });
          if (ok) WorkoutStore.clearSession(m, v, dayId);
        },
        'autofill-day'() {
          WorkoutStore.setSelection(m, v, dayId, Coach.autofill(m, v, dayId));
          UI.toast('El entrenador completó el día. Puedes cambiar cualquier ejercicio.');
        },
        'save-day'() {
          if (!Planner.sessionProgress(m, v, dayId).complete) return;
          const pending = nextIncompleteDay(plan, dayId);
          if (pending) {
            UI.toast(`${day.name} guardado. Ahora: ${pending.name.toLowerCase()}.`);
            go(`#/plan/dia/${pending.id}`);
          } else finishRoutine();
        }
      }
    };
  }

  /* =====================================================================
     PASO 5 · ENTRENAR (un ejercicio cada vez)
     ===================================================================== */
  function player() {
    const a = WorkoutStore.getActive();
    if (!a) return { redirect: '#/' };
    const variant = Planner.variant(Planner.method(a.m), a.v);
    const s = Planner.sessionFor(variant, a.d);
    const day = DAYS.find(d => d.id === a.d);
    const item = a.items[a.index];
    const ex = EXERCISE_INDEX[item.id];
    const g = GOALS[a.goal];
    const renderedIndex = a.index;
    const isLast = a.index === a.items.length - 1;
    const nSets = Coach.setsFor(ex, a.goal);
    const restSec = Coach.restFor(ex, a.goal);
    let cleanupAnim = null, restTimer = null;

    const progressBar = () => {
      const cur = WorkoutStore.getActive();
      return cur.items.map((it, i) => {
        const done = (cur.done[i] || 0) >= Coach.setsFor(EXERCISE_INDEX[it.id], cur.goal);
        return `<li><button type="button" class="pp-seg${i === cur.index ? ' is-current' : ''}${done ? ' is-done' : ''}" data-action="go-exercise" data-i="${i}"
          aria-label="Ejercicio ${i + 1}: ${esc(EXERCISE_INDEX[it.id].name)}${done ? ', completado' : ''}"${i === cur.index ? ' aria-current="step"' : ''}><span></span></button></li>`;
      }).join('');
    };

    const setsBlock = () => {
      const cur = WorkoutStore.getActive();
      const done = cur.done[cur.index] || 0;
      return `<div class="sets-head"><span>Series completadas</span><strong class="mono">${done} / ${nSets}</strong></div>
        <div class="set-row">${Array.from({ length: nSets }, (_, k) => `<button type="button" class="set-btn${k < done ? ' is-done' : ''}" data-action="toggle-set" data-k="${k}" aria-pressed="${k < done}" data-focus="set-${k}">
          ${k < done ? icon('check') : `<span class="mono">${k + 1}</span>`}<span>Serie ${k + 1}</span></button>`).join('')}</div>
        ${done >= nSets ? `<p class="sets-done">${icon('check')}<span>¡Ejercicio completado! ${isLast ? 'Pulsa «Finalizar entrenamiento».' : 'Pulsa «Siguiente ejercicio».'}</span></p>` : '<p class="muted small">Marca cada serie al terminarla. Empezará el descanso.</p>'}`;
    };

    const nextBtn = () => {
      const cur = WorkoutStore.getActive();
      const complete = (cur.done[cur.index] || 0) >= nSets;
      return `<button type="button" class="btn btn-primary btn-lg${complete ? ' btn-pulse' : ''}" data-action="next-exercise" id="next-btn">
        <span>${isLast ? 'Finalizar entrenamiento' : 'Siguiente ejercicio'}</span>${icon(isLast ? 'flag' : 'arrow-right')}</button>`;
    };

    const html = `
      <section class="player tone-${UI.toneOfGroup(item.g)}">
        <div class="container">
          <div class="player-top">
            <div>
              <p class="eyebrow"><span class="live-dot"></span>Entrenamiento en curso · ${esc(g.name)}</p>
              <p class="player-session">${day.name} · <span class="tone-text">${esc(s.name)}</span></p>
            </div>
            <div class="player-top-actions">
              <a class="btn btn-ghost btn-sm" href="#/">${icon('exit')}<span>Pausar y salir</span></a>
              <button type="button" class="btn btn-ghost btn-sm" data-action="finish-early">${icon('flag')}<span>Terminar</span></button>
            </div>
          </div>
          <ol class="player-progress" id="pp" aria-label="Progreso del entrenamiento">${progressBar()}</ol>
          <div class="player-grid">
            <div class="player-anim">${animCard(ex)}</div>
            <div class="player-panel">
              <p class="player-count">Ejercicio ${a.index + 1} de ${a.items.length}
                <span class="chip chip-static"><span class="dot"></span>${esc(MUSCLE_GROUPS[item.g].name)}</span>
                ${Planner.isRecommended(ex.id, item.g) ? `<span class="rec-badge rec-inline">${icon('star')}Recomendado</span>` : ''}</p>
              <h1 class="player-ex" tabindex="-1">${esc(ex.name)}</h1>
              <dl class="rx-row">
                <div><dt>Series</dt><dd class="mono">${nSets}</dd></div>
                <div><dt>Repeticiones</dt><dd class="mono">${esc(Planner.repsFor(ex, a.goal))}</dd></div>
                <div><dt>Esfuerzo</dt><dd class="mono">${esc(g.prescription.rir)}</dd></div>
                <div><dt>Descanso</dt><dd class="mono">${esc(Coach.fmtRest(restSec))}</dd></div>
              </dl>
              <div class="sets" id="sets">${setsBlock()}</div>
              <div class="rest" id="rest" hidden aria-live="polite"></div>
              ${UI.tabs('player-info', [
                { id: 'tecnica', label: 'Técnica', html: stepsHtml(ex) },
                { id: 'errores', label: 'Errores', html: `<ul class="list-x">${ex.mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` },
                { id: 'consejos', label: 'Consejos', html: `<ul class="list-check">${ex.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` },
                { id: 'orden', label: '¿Por qué aquí?', html: `<p>${esc(item.why)}</p><p class="muted small">El orden lo calcula FIT SPLIT: ejercicios compuestos y músculos grandes primero, cuando tienes más energía; aislamientos al final.</p>` }
              ])}
            </div>
          </div>
          <div class="player-nav">
            <button type="button" class="btn btn-ghost btn-lg" data-action="prev-exercise" aria-label="Ejercicio anterior" ${a.index === 0 ? 'disabled' : ''}>${icon('arrow-left')}<span>Anterior</span></button>
            <span id="next-slot">${nextBtn()}</span>
          </div>
        </div>
      </section>`;

    function stopRest() { clearInterval(restTimer); restTimer = null; }
    function startRest(root) {
      stopRest();
      let left = restSec;
      const box = root.querySelector('#rest');
      const fmt = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
      const draw = () => {
        box.hidden = false;
        box.classList.toggle('is-over', left <= 0);
        box.innerHTML = left > 0
          ? `${icon('clock')}<span>Descanso <strong class="mono">${fmt(left)}</strong></span><button type="button" class="btn btn-ghost btn-sm" data-action="skip-rest">${icon('skip')}<span>Saltar</span></button>`
          : `${icon('bolt')}<span><strong>¡A por la siguiente serie!</strong></span>`;
      };
      draw();
      restTimer = setInterval(() => {
        left -= 1;
        draw();
        if (left <= 0) {
          stopRest();
          setTimeout(() => { if (!restTimer && box.isConnected) box.hidden = true; }, 4000);
        }
      }, 1000);
    }

    return {
      title: `Entrenando · ${ex.name}`,
      html,
      mount(root) {
        cleanupAnim = mountAnim(root.querySelector('.player-anim'), ex);
        return () => { if (cleanupAnim) cleanupAnim(); stopRest(); };
      },
      update(root) {
        const cur = WorkoutStore.getActive();
        if (!cur) return;
        if (cur.index !== renderedIndex) { rerender(); return; }
        root.querySelector('#sets').innerHTML = setsBlock();
        root.querySelector('#pp').innerHTML = progressBar();
        root.querySelector('#next-slot').innerHTML = nextBtn();
      },
      actions: {
        'toggle-set'(el) {
          const k = Number(el.dataset.k);
          const cur = WorkoutStore.getActive();
          const done = cur.done[cur.index] || 0;
          const next = k < done ? k : k + 1;
          WorkoutStore.setDone(cur.index, next);
          const root = document.getElementById('app');
          if (next > done && next < nSets) startRest(root);
          else { stopRest(); root.querySelector('#rest').hidden = true; }
          const target = root.querySelector(next >= nSets ? '#next-btn' : `[data-focus="set-${k}"]`);
          if (target) target.focus({ preventScroll: true });
        },
        'skip-rest'() { stopRest(); document.getElementById('rest').hidden = true; },
        'go-exercise'(el) { WorkoutStore.goTo(Number(el.dataset.i)); },
        'prev-exercise'() { WorkoutStore.goTo(renderedIndex - 1); },
        'next-exercise'() {
          if (isLast) { WorkoutStore.finishWorkout(); go('#/entrenar/fin'); }
          else WorkoutStore.goTo(renderedIndex + 1);
        },
        async 'finish-early'() {
          const ok = await UI.confirm({ title: 'Terminar entrenamiento', text: 'Se guardará como terminado con las series que hayas marcado.', confirmLabel: 'Terminar' });
          if (ok) { WorkoutStore.finishWorkout(); go('#/entrenar/fin'); }
        }
      }
    };
  }

  /* Pantalla final con el recordatorio sobre la alimentación */
  function finish() {
    const last = WorkoutStore.getLast();
    if (!last) return { redirect: '#/' };
    const html = `
      <section class="finish tone-${last.tone}">
        <div class="container finish-grid">
          <div class="finish-main">
            <span class="finish-icon">${icon('trophy')}</span>
            <p class="eyebrow">Entrenamiento completado</p>
            <h1 tabindex="-1">¡Buen trabajo!</h1>
            <p class="lead">${esc(last.sessionName)}</p>
            <dl class="finish-stats">
              <div><dt>Ejercicios</dt><dd class="mono">${last.exercises}</dd></div>
              <div><dt>Series</dt><dd class="mono">${last.sets}</dd></div>
              <div><dt>Minutos</dt><dd class="mono">${last.minutes}</dd></div>
            </dl>
            ${last.streak ? `<p class="finish-streak">${icon('flame')}<span>Racha: <strong class="mono">${last.streak}</strong> ${last.streak === 1 ? 'entrenamiento seguido' : 'entrenamientos seguidos'}. ¡No la rompas!</span></p>` : ''}
            <div class="btn-row">
              <a class="btn btn-primary" href="#/">${icon('home')}<span>Ir a mi panel</span></a>
            </div>
          </div>
          <section class="nutrition-card" aria-labelledby="nutri-title">
            <span class="topic-icon">${icon('leaf')}</span>
            <h2 id="nutri-title">${esc(NUTRITION_NOTE.title)}</h2>
            <p>${esc(NUTRITION_NOTE.text)}</p>
            <ul class="list-check">${NUTRITION_NOTE.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
            <a class="text-link" href="#/aprende/alimentacion">Aprender sobre alimentación${icon('arrow-right')}</a>
          </section>
        </div>
      </section>`;
    return { title: 'Entrenamiento completado', html };
  }

  /* =====================================================================
     BIBLIOTECA DE EJERCICIOS
     ===================================================================== */
  const filters = { q: '', group: 'all', equip: 'all', diff: 'all', goal: 'all' };
  const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function filterExercises() {
    const q = normalize(filters.q.trim());
    const list = EXERCISES.filter(ex => {
      if (filters.group !== 'all' && !ex.groups.includes(filters.group)) return false;
      if (filters.equip !== 'all' && !ex.equipment.includes(filters.equip)) return false;
      if (filters.diff !== 'all' && ex.difficulty !== filters.diff) return false;
      if (filters.goal !== 'all' && !ex.goals.includes(filters.goal)) return false;
      if (!q) return true;
      const hay = normalize([ex.name, ex.movement, ex.equipmentLabel, ...ex.primary, ...ex.secondary, ...ex.groups.map(g => MUSCLE_GROUPS[g].name)].join(' '));
      return q.split(/\s+/).every(w => hay.includes(w));
    });
    return filters.group === 'all' ? list : list.sort((a, b) => Planner.isRecommended(b.id, filters.group) - Planner.isRecommended(a.id, filters.group));
  }

  function exercises() {
    const select = (id, label, value, opts) => `<div class="field"><label for="${id}">${label}</label>
      <div class="select-wrap"><select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${v === value ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>${icon('chevron-down')}</div></div>`;
    const html = `
      <section class="step-page">
        <div class="container">
          <div class="page-title">
            <h1 tabindex="-1">Ejercicios</h1>
            <p class="muted">${EXERCISES.length} ejercicios con animación, técnica y recomendaciones según tu objetivo. Toca uno para verlo.</p>
          </div>
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
        ? list.map((ex, i) => UI.exerciseCard(ex, { groupId: filters.group !== 'all' ? filters.group : null, index: Math.min(i, 8) })).join('')
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
        'clear-filters'() {
          const root = document.getElementById('app');
          Object.assign(filters, { q: '', group: 'all', equip: 'all', diff: 'all', goal: 'all' });
          root.querySelector('#f-q').value = '';
          ['f-group', 'f-equip', 'f-diff', 'f-goal'].forEach(id => { root.querySelector('#' + id).value = 'all'; });
          renderResults(root);
          root.querySelector('#f-q').focus();
        },
        'open-exercise'(el) { openExercise(el.dataset.ex, { groupId: filters.group !== 'all' ? filters.group : null }); }
      }
    };
  }

  /* Ficha de ejercicio como página (enlace directo) */
  function exercise({ id }) {
    const ex = EXERCISE_INDEX[id];
    if (!ex) return notFound();
    return {
      title: ex.name,
      html: `<section class="step-page"><div class="container">${exerciseDetail(ex, { headingTag: 'h1' })}</div></section>`,
      mount(root) { return mountDetail(root.querySelector('.exd'), ex); }
    };
  }

  /* =====================================================================
     APRENDE
     ===================================================================== */
  function learn() {
    const t = id => LEARN_TOPICS.find(x => x.id === id);
    const goalsIds = ['hipertrofia', 'fuerza', 'resistencia-muscular'];
    const rest = LEARN_TOPICS.filter(x => !goalsIds.includes(x.id) && x.id !== 'alimentacion');
    const html = `
      <section class="step-page">
        <div class="container">
          <div class="page-title">
            <h1 tabindex="-1">Aprende</h1>
            <p class="muted">Conceptos clave explicados con claridad, con matices cuando la evidencia los tiene y sin promesas absolutas.</p>
          </div>
          <div class="learn-grid">
            <section class="side-box">
              <h2>Lo más importante</h2>
              <div class="topic-list">${UI.topicCard(t('alimentacion'), { featured: true })}</div>
              <h2 class="mt">Objetivos</h2>
              <div class="topic-list">${goalsIds.map(id => UI.topicCard(t(id))).join('')}</div>
            </section>
            <section class="side-box">
              <h2>Fundamentos</h2>
              <div class="topic-list">${rest.map(x => UI.topicCard(x)).join('')}</div>
            </section>
          </div>
        </div>
      </section>`;
    return { title: 'Aprende', html };
  }

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
      case 'tension-flow': return tensionFlow(false);
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
          <div class="rir-top"><label for="rir-range">Repeticiones en reserva</label><output id="rir-out" class="mono" for="rir-range">RIR 2</output></div>
          <input type="range" id="rir-range" min="0" max="5" step="1" value="2" aria-describedby="rir-text">
          <div class="rir-dots" id="rir-dots" aria-hidden="true"></div>
          <p class="rir-text" id="rir-text"></p>
          <p class="muted small">Ejemplo con una carga que permitiría un máximo de 12 repeticiones.</p>
        </div>`;
      case 'volume-calc':
        return `<div class="widget calc-widget">
          <div class="calc-inputs">
            <div class="field"><label for="c-sets">Series por sesión</label><input type="number" id="c-sets" min="1" max="12" value="3" inputmode="numeric"></div>
            <div class="field"><label for="c-reps">Repeticiones</label><input type="number" id="c-reps" min="1" max="40" value="10" inputmode="numeric"></div>
            <div class="field"><label for="c-load">Carga (kg)</label><input type="number" id="c-load" min="0" max="500" value="40" inputmode="decimal"></div>
            <div class="field"><label for="c-freq">Sesiones / semana</label><input type="number" id="c-freq" min="1" max="4" value="2" inputmode="numeric"></div>
          </div>
          <dl class="calc-out">
            <div><dt>Series semanales</dt><dd class="mono" id="c-out-sets">6</dd></div>
            <div><dt>Repeticiones</dt><dd class="mono" id="c-out-reps">60</dd></div>
            <div><dt>Tonelaje</dt><dd class="mono" id="c-out-ton">2400 kg</dd></div>
          </dl>
          <p class="calc-note" id="c-note"></p>
        </div>`;
      case 'intensity-table':
        return `<div class="table-wrap" tabindex="0" role="region" aria-label="Significados de intensidad"><table class="compare">
          <thead><tr><th scope="col">Uso</th><th scope="col">Cómo se mide</th><th scope="col">Ejemplo</th><th scope="col">Para qué sirve</th></tr></thead>
          <tbody>${INTENSITY_MEANINGS.map(r => `<tr><th scope="row">${esc(r.name)}</th><td>${esc(r.measure)}</td><td>${esc(r.example)}</td><td>${esc(r.use)}</td></tr>`).join('')}</tbody>
        </table></div>`;
      case 'recovery-list':
        return `<div class="pillars">${RECOVERY_PILLARS.map(p => `<div class="pillar"><span class="topic-icon">${icon(p.icon)}</span><h4>${esc(p.title)}</h4><p>${esc(p.text)}</p></div>`).join('')}</div>`;
      case 'progression': {
        const weeks = [
          { w: 1, load: 40, reps: [8, 8, 7] }, { w: 2, load: 40, reps: [10, 9, 9] }, { w: 3, load: 40, reps: [11, 11, 10] },
          { w: 4, load: 40, reps: [12, 12, 12], up: true }, { w: 5, load: 42.5, reps: [9, 8, 8] }
        ];
        return `<div class="table-wrap" tabindex="0" role="region" aria-label="Ejemplo de doble progresión"><table class="compare">
          <thead><tr><th scope="col">Semana</th><th scope="col">Carga</th><th scope="col">Repeticiones (3 series)</th><th scope="col">Decisión</th></tr></thead>
          <tbody>${weeks.map(r => `<tr${r.up ? ' class="is-up"' : ''}><th scope="row" class="mono">${r.w}</th><td class="mono">${String(r.load).replace('.', ',')} kg</td>
            <td class="mono">${r.reps.join(' · ')}</td>
            <td>${r.up ? '12 en todas: sube la carga' : r.w === 5 ? 'Nueva carga, vuelves cerca de 8' : 'Sigue sumando repeticiones'}</td></tr>`).join('')}</tbody>
        </table></div>`;
      }
    }
    return '';
  }

  function initWidgets(root) {
    const range = root.querySelector('#rir-range');
    if (range) {
      const draw = () => {
        const rir = Number(range.value), done = 12 - rir;
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
        const ref = weekly < 10 ? 'Por debajo de la referencia común de 10–20 series semanales para hipertrofia.'
          : weekly <= 20 ? 'Dentro de la referencia común de 10–20 series semanales por grupo muscular.'
            : 'Por encima de la referencia común: vigila la recuperación.';
        calc.querySelector('#c-note').innerHTML = `${icon('info')}<span>${ref} El tonelaje mezcla carga y repeticiones: dos planes con el mismo tonelaje pueden generar estímulos muy distintos.</span>`;
      };
      calc.addEventListener('input', draw);
      draw();
    }
  }

  function topic({ id }) {
    const t = LEARN_TOPICS.find(x => x.id === id);
    if (!t) return notFound();
    const items = t.sections.map((sec, i) => ({
      id: 's' + i, label: sec.h,
      html: `${(sec.p || []).map(p => `<p>${esc(p)}</p>`).join('')}
        ${sec.widget ? widget(sec.widget) : ''}
        ${sec.list ? `<ul class="list-dot">${sec.list.map(li => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}
        ${sec.defs ? `<dl class="defs">${sec.defs.map(d => `<div><dt>${esc(d.t)}</dt><dd>${esc(d.d)}</dd></div>`).join('')}</dl>` : ''}`
    }));
    items.push({ id: 'mitos', label: 'Ideas erróneas', html: `<div class="myths">${t.myths.map(m => `<div class="myth">
        <p class="myth-claim">${icon('x')}<span>«${esc(m.myth)}»</span></p><p class="myth-reality">${icon('check')}<span>${esc(m.reality)}</span></p></div>`).join('')}</div>` });
    items.push({ id: 'lecturas', label: 'Lecturas', html: `<ul class="refs">${t.refs.map(r => `<li>${typeof r === 'string' ? esc(r) : `<a href="${r.url}" target="_blank" rel="noopener">${esc(r.text)}</a>`}</li>`).join('')}</ul>` });

    const html = `
      <section class="step-page">
        <div class="container">
          <div class="page-title">
            <p class="eyebrow">${icon(t.icon)}Aprende · ${t.readTime} min</p>
            <h1 tabindex="-1">${esc(t.title)}</h1>
            <p class="lead">${esc(t.lead)}</p>
          </div>
          <div class="article-layout">
            <article class="article">${UI.tabs('topic-' + t.id, items)}</article>
            <aside class="article-aside">
              <div class="side-box key-box">
                <h2>Ideas clave</h2>
                <ul class="list-check">${t.keyPoints.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
              </div>
              <nav class="side-box" aria-label="Otros temas">
                <h2>Otros temas</h2>
                <ul class="topic-links">${LEARN_TOPICS.map(x => `<li><a href="#/aprende/${x.id}"${x.id === t.id ? ' aria-current="page"' : ''}>${icon(x.icon)}${esc(x.title)}</a></li>`).join('')}</ul>
              </nav>
            </aside>
          </div>
        </div>
      </section>`;
    return {
      title: t.title,
      html,
      mount(root) { initWidgets(root); },
      actions: {
        'replay-flow'(el) {
          const flow = el.closest('.flow');
          flow.classList.remove('is-playing');
          void flow.offsetWidth;
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
     SOBRE FIT SPLIT
     ===================================================================== */
  function about() {
    const layers = [
      ['Datos', 'data.js · exercises.js · learn.js', 'Métodos, sesiones, ejercicios, recomendados y contenido educativo como objetos de JavaScript.'],
      ['Lógica', 'workouts.js', 'Planner calcula sesiones y el orden automático de la rutina. WorkoutStore guarda el plan, la rutina, el entrenamiento en curso y la racha en localStorage.'],
      ['Entrenador', 'coach.js', 'Valoración de cada ejercicio, recomendados con estudios, límites de seguridad por sesión y autocompletado.'],
      ['Animaciones', 'anatomy3d.js · biomech.js · poses3d.js · animations3d.js', `${Animations.presets.length} patrones de movimiento con cinemática inversa. Se muestran en 3D sobre un cuerpo anatómico real sin piel (BodyParts3D), con la técnica revisada ejercicio a ejercicio y cámara giratoria, y en 2D si el navegador no admite WebGL.`],
      ['Interfaz', 'ui.js · views.js · app.js', 'Componentes reutilizables, vistas por paso y un enrutador por hash con botón de retroceso.'],
      ['Estilos', 'styles.css · responsive.css', 'Diseño oscuro con variables CSS, adaptado a computador, tablet y teléfono.']
    ];
    const html = `
      <section class="step-page">
        <div class="container">
          <div class="page-title">
            <h1 tabindex="-1">Sobre FIT SPLIT</h1>
            <p class="lead">Una plataforma interactiva para aprender sobre métodos de entrenamiento, comprender los fundamentos del ejercicio y entrenar con un plan según tu objetivo.</p>
          </div>
          <div class="about-grid">
            <div class="side-box">${UI.tabs('about', [
              { id: 'porque', label: 'Por qué existe', html: `<p>Mucha información sobre entrenamiento se presenta como reglas absolutas. FIT SPLIT explica el porqué de cada decisión y muestra dónde hay consenso y dónde hay matices.</p><p>La experiencia es un recorrido guiado: defines tu objetivo, eliges método y frecuencia y seleccionas los ejercicios de cada día con un entrenador que controla la fatiga de la sesión. Después tienes tu panel personal para entrenar cualquier día y mantener tu racha.</p>` },
              { id: 'principios', label: 'Principios', html: `<ul class="list-check">
                <li><strong>Basada en evidencia:</strong> recomendaciones apoyadas en la literatura científica.</li>
                <li><strong>Sin absolutos:</strong> los rangos son orientativos y se explican los matices.</li>
                <li><strong>Aprender viendo:</strong> cada ejercicio tiene animación por fases con los músculos visibles.</li>
                <li><strong>Seguridad ante todo:</strong> el entrenador limita los ejercicios muy exigentes y el volumen por sesión.</li>
                <li><strong>Lo esencial primero:</strong> sin alimentación y constancia no hay resultados.</li></ul>` },
              { id: 'arquitectura', label: 'Cómo está construido', html: `<p>Aplicación web de una sola página hecha con HTML5, CSS3 y JavaScript moderno, sin backend ni dependencias.</p>
                <ol class="arch">${layers.map(([n, f, d]) => `<li><strong>${n}</strong><code>${f}</code><span>${d}</span></li>`).join('')}</ol>` }
            ])}</div>
            <div class="about-side">
              <div class="side-box" data-install-app-box>
                <h2>${icon('dumbbell')}App para el móvil</h2>
                <p class="muted">Instala FIT SPLIT en Android, en iPhone o en el ordenador como una app más. Funciona sin conexión.</p>
                <button type="button" class="btn btn-primary btn-sm" data-install-app>${icon('arrow-right')}<span>Descargar app</span></button>
              </div>
              <div class="side-box">
                <h2>${icon('shield')}Aviso importante</h2>
                <p class="muted">El contenido es educativo y general. No sustituye la valoración de un profesional sanitario, de la nutrición o del ejercicio. Si tienes una lesión, una condición médica o dudas, consulta antes de entrenar.</p>
              </div>
              <div class="side-box">
                <h2>${icon('body')}Modelo anatómico</h2>
                <p class="muted">Las animaciones 3D usan geometría real de <strong>BodyParts3D</strong>, © The Database Center for Life Science, con licencia <a href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank" rel="noopener">CC BY 4.0</a>. FIT SPLIT la simplificó, le añadió un esqueleto animable y modeló los músculos que faltaban en el conjunto de datos.</p>
              </div>
              <div class="side-box">
                <h2>${icon('trash')}Tus datos</h2>
                <p class="muted">Tu plan, tus rutinas y tu racha se guardan solo en este navegador.</p>
                <button type="button" class="btn btn-ghost btn-sm btn-danger-text" data-action="reset-all">${icon('trash')}<span>Borrar mis datos</span></button>
              </div>
            </div>
          </div>
        </div>
      </section>`;
    return {
      title: 'Sobre FIT SPLIT',
      html,
      actions: {
        async 'reset-all'() {
          const ok = await UI.confirm({ title: 'Borrar mis datos', text: 'Se borrarán tu objetivo, tu plan, todas tus rutinas, tu historial y tu racha. No se puede deshacer.', confirmLabel: 'Borrar todo', danger: true });
          if (ok) { WorkoutStore.resetAll(); go('#/plan/objetivo'); }
        }
      }
    };
  }

  function notFound() {
    return {
      title: 'Página no encontrada',
      html: `<section class="step-page"><div class="container">${UI.emptyState({
        iconName: 'alert', title: 'Página no encontrada',
        text: 'La dirección no corresponde a ninguna sección de FIT SPLIT.',
        actions: `<a class="btn btn-primary" href="#/">Volver al inicio</a>`
      })}</div></section>`
    };
  }

  return {
    setRenderer, openExercise,
    home, goalStep, methodStep, frequencyStep, dayStep, player, finish,
    exercises, exercise, learn, topic, about, notFound
  };
})();
