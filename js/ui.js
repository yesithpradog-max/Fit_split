/* =====================================================================
   FIT SPLIT · ui.js
   ---------------------------------------------------------------------
   Componentes de interfaz reutilizables. Cada función devuelve un
   fragmento de HTML (string) o gestiona un elemento global (avisos,
   diálogos). Las vistas (views.js) combinan estos componentes.
   ===================================================================== */

const UI = (() => {
  'use strict';

  /* Escapa texto para insertarlo de forma segura en HTML */
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ----------------------------- Iconos ----------------------------- */
  const ICONS = {
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    'chevron-right': '<path d="M9 6l6 6-6 6"/>',
    'chevron-down': '<path d="M6 9l6 6 6-6"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>',
    restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    dumbbell: '<path d="M3 9.5v5M6 7v10M18 7v10M21 9.5v5M6 12h12"/>',
    layers: '<path d="M12 3.5l8.5 4.5L12 12.5 3.5 8z"/><path d="M3.5 12.5l8.5 4.5 8.5-4.5"/><path d="M3.5 16.5l8.5 4.5 8.5-4.5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5.5"/>',
    moon: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
    growth: '<path d="M4 20h16"/><path d="M7 16v-3M12 16V9M17 16V5"/>',
    repeat: '<path d="M17 3.5l3 3-3 3"/><path d="M4 11.5v-2a3 3 0 0 1 3-3h13"/><path d="M7 20.5l-3-3 3-3"/><path d="M20 12.5v2a3 3 0 0 1-3 3H4"/>',
    tension: '<path d="M3 12h18"/><path d="M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
    pulse: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    stairs: '<path d="M4 20h4v-4h4v-4h4V8h4V4"/>',
    leaf: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19l7-7"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.3v.2"/>',
    book: '<path d="M4 4.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4z"/><path d="M20 4.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6z"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.5M4.5 12h.5M4.5 18h.5"/>',
    flame: '<path d="M12 3c.5 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.6 1.6-4 2.5-5.5.8 1.4 1.5 2.3 2.5 2.8C12.5 8.5 12 6 12 3z"/>',
    body: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M7 9.5h10M12 14l-3 6.5M12 14l3 6.5"/>',
    split: '<path d="M7 4v16M12 4v16M17 4v16"/>',
    speed: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l3.5-4.5"/><path d="M8 18h8"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    code: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5"/>',
    shield: '<path d="M12 3.5l7 3v5.5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6.5z"/>'
  };

  const icon = (name, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

  /* --------------------------- Utilidades --------------------------- */
  const goalName = id => (GOALS[id] && (GOALS[id].shortName || GOALS[id].name)) || id;
  const toneOfGroup = id => (MUSCLE_GROUPS[id] ? MUSCLE_GROUPS[id].tone : 'rest');
  const toneOfExercise = ex => toneOfGroup(ex.groups[0]);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* Construye la parte "?m=..&v=.." de una ruta con contexto */
  function query(params) {
    const parts = Object.entries(params).filter(([, v]) => v != null && v !== '');
    return parts.length ? '?' + parts.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
  }

  const exerciseHref = (ex, ctx) => `#/ejercicio/${ex.id}` + (ctx ? query({ m: ctx.m, v: ctx.v, d: ctx.d, g: ctx.g }) : '');

  /* ---------------------------- Componentes ---------------------------- */
  function difficulty(level) {
    const d = DIFFICULTIES[level];
    return `<span class="difficulty" title="Dificultad: ${d.name}">
      <span class="difficulty-bars" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${i <= d.level ? 'on' : ''}"></i>`).join('')}</span>
      <span>${d.name}</span></span>`;
  }

  function progress(value, max, label) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"${label ? ` aria-label="${esc(label)}"` : ''}>
      <span style="width:${pct}%"></span></div>`;
  }

  /* Tira de 7 días con el color de cada tipo de sesión */
  function weekStrip(variant, { labels = true } = {}) {
    return `<div class="week-strip" aria-label="Distribución semanal">${DAYS.map(day => {
      const s = Planner.sessionFor(variant, day.id);
      return `<span class="week-cell tone-${s.tone}" title="${day.name}: ${esc(s.name)}">
        ${labels ? `<b>${day.short.charAt(0)}</b>` : ''}<i></i></span>`;
    }).join('')}</div>`;
  }

  /* Tarjeta de ejercicio. ctx (opcional) habilita el botón de selección. */
  function exerciseCard(ex, opts = {}) {
    const { ctx, selected = false, disabled = false, showAdd = false, index } = opts;
    const href = exerciseHref(ex, ctx);
    const tone = ctx ? toneOfGroup(ctx.g) : toneOfExercise(ex);
    let action = '';
    if (ctx) {
      action = `<button type="button" class="btn btn-select${selected ? ' is-selected' : ''}" data-action="toggle-exercise"
          data-ex="${ex.id}" data-focus="sel-${ex.id}" aria-pressed="${selected}" ${disabled ? 'disabled aria-describedby="limit-note"' : ''}>
          ${selected ? icon('check') + '<span>Seleccionado</span>' : icon('plus') + '<span>Seleccionar</span>'}
        </button>`;
    } else if (showAdd) {
      action = `<button type="button" class="btn btn-ghost btn-sm" data-action="open-add" data-ex="${ex.id}" data-focus="add-${ex.id}">
          ${icon('plus')}<span>Añadir a una sesión</span></button>`;
    }
    return `
      <article class="ex-card tone-${tone}${selected ? ' is-selected' : ''}"${index != null ? ` style="--i:${index}"` : ''}>
        <a class="ex-card-media" href="${href}" tabindex="-1" aria-hidden="true">${Animations.thumbnail(ex)}</a>
        <div class="ex-card-body">
          <div class="ex-card-tags">
            <span class="tag">${ex.category === 'compuesto' ? 'Compuesto' : 'Aislamiento'}</span>
            ${difficulty(ex.difficulty)}
          </div>
          <h3 class="ex-card-title"><a href="${href}">${esc(ex.name)}</a></h3>
          <p class="ex-card-meta">${esc(ex.primary.join(', '))}</p>
          <p class="ex-card-equip">${icon('dumbbell')}${esc(ex.equipmentLabel)}</p>
        </div>
        <div class="ex-card-actions">
          <a class="btn btn-ghost btn-sm" href="${href}">${icon('eye')}<span>Ver ejercicio</span></a>
          ${action}
        </div>
      </article>`;
  }

  /* Tarjeta de método para la portada y la lista de métodos */
  function methodCard(m) {
    const v = m.variants[0];
    return `
      <a class="method-card tone-${m.tone}" href="#/metodos/${m.id}">
        <div class="method-card-top">
          <span class="method-abbr">${esc(m.short)}</span>
          <span class="pill">${icon('calendar')}${esc(m.stats.days)}</span>
        </div>
        <h3>${esc(m.name)}</h3>
        <p>${esc(m.summary)}</p>
        ${weekStrip(v)}
        <span class="card-link">Ver método ${icon('arrow-right')}</span>
      </a>`;
  }

  function topicCard(t) {
    return `
      <a class="topic-card" href="#/aprende/${t.id}">
        <span class="topic-icon">${icon(t.icon)}</span>
        <h3>${esc(t.shortTitle || t.title)}</h3>
        <p>${esc(t.short)}</p>
        <span class="topic-meta">${icon('clock')}${t.readTime} min de lectura</span>
      </a>`;
  }

  /* Escala de repeticiones con los tres objetivos en carriles separados.
     Muestra la superposición entre rangos en lugar de límites rígidos. */
  function repScale(active) {
    const max = 30;
    const x = r => ((Math.min(r, max) - 1) / (max - 1)) * 100;
    const lanes = [
      { id: 'fuerza', solid: [1, 6], soft: [1, 8] },
      { id: 'hipertrofia', solid: [6, 15], soft: [5, 30] },
      { id: 'resistencia', solid: [15, 30], soft: [12, 30], open: true }
    ];
    const ticks = [1, 5, 10, 15, 20, 25, 30];
    return `
      <div class="rep-scale${active ? ' has-active' : ''}" role="img"
        aria-label="Escala orientativa de repeticiones: fuerza aproximadamente 1 a 6, hipertrofia 6 a 15 como rango práctico con un rango posible de 5 a 30, resistencia 15 a 30 o más. Los rangos se superponen.">
        ${lanes.map(l => `
          <div class="rep-lane goal-${l.id}${active === l.id ? ' is-active' : ''}">
            <span class="rep-lane-name">${goalName(l.id)}</span>
            <div class="rep-track">
              <span class="rep-soft" style="left:${x(l.soft[0])}%;width:${x(l.soft[1]) - x(l.soft[0])}%"></span>
              <span class="rep-solid${l.open ? ' is-open' : ''}" style="left:${x(l.solid[0])}%;width:${x(l.solid[1]) - x(l.solid[0])}%"></span>
            </div>
          </div>`).join('')}
        <div class="rep-axis" aria-hidden="true">
          <span class="rep-lane-name">Reps</span>
          <div class="rep-ticks">${ticks.map(t => `<span style="left:${x(t)}%">${t === 30 ? '30+' : t}</span>`).join('')}</div>
        </div>
        <p class="rep-legend"><span class="sw sw-solid"></span>Rango práctico habitual <span class="sw sw-soft"></span>Rango en el que también hay adaptación</p>
      </div>`;
  }

  function breadcrumb(items) {
    return `<nav class="breadcrumb" aria-label="Ruta de navegación"><ol>${items.map((it, i) =>
      i === items.length - 1
        ? `<li aria-current="page">${esc(it.label)}</li>`
        : `<li><a href="${it.href}">${esc(it.label)}</a>${icon('chevron-right')}</li>`).join('')}</ol></nav>`;
  }

  function emptyState({ iconName = 'info', title, text, actions = '' }) {
    return `<div class="empty-state">${icon(iconName)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${actions ? `<div class="btn-row">${actions}</div>` : ''}</div>`;
  }

  /* ------------------------------ Avisos ------------------------------ */
  function toast(message, type = 'info') {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `${icon(type === 'error' ? 'alert' : 'check')}<span>${esc(message)}</span>`;
    region.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  /* ------------------------------ Diálogos ------------------------------ */
  /* Abre el <dialog> global con contenido propio. Devuelve el elemento. */
  function openDialog(html, { onClose } = {}) {
    const dlg = document.getElementById('dialog');
    dlg.innerHTML = `<div class="dialog-inner">${html}</div>`;
    const close = () => dlg.close();
    dlg.querySelectorAll('[data-dialog-close]').forEach(b => b.addEventListener('click', close));
    dlg.onclose = () => { if (onClose) onClose(dlg.returnValue); };
    dlg.onclick = e => { if (e.target === dlg) close(); };
    dlg.showModal();
    const first = dlg.querySelector('[autofocus], select, input, button:not([data-dialog-close])');
    if (first) first.focus();
    return dlg;
  }

  /* Confirmación accesible (sustituye a window.confirm) */
  function confirm({ title, text, confirmLabel = 'Confirmar', danger = false }) {
    return new Promise(resolve => {
      let answered = false;
      const dlg = openDialog(`
        <h2 class="dialog-title">${esc(title)}</h2>
        <p class="dialog-text">${esc(text)}</p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" data-dialog-close>Cancelar</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm autofocus>${esc(confirmLabel)}</button>
        </div>`, { onClose: () => { if (!answered) resolve(false); } });
      dlg.querySelector('[data-confirm]').addEventListener('click', () => {
        answered = true;
        resolve(true);
        dlg.close();
      });
    });
  }

  return {
    esc, icon, goalName, toneOfGroup, toneOfExercise, plural, query, exerciseHref,
    difficulty, progress, weekStrip, exerciseCard, methodCard, topicCard, repScale,
    breadcrumb, emptyState, toast, openDialog, confirm
  };
})();
