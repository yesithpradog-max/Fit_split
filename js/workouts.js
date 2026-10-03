/* =====================================================================
   FIT SPLIT · workouts.js
   ---------------------------------------------------------------------
   Lógica de planificación y entrenamiento (sin HTML):
   - Planner: consultas sobre métodos, sesiones, límites y el ORDEN
     automático de la rutina.
   - WorkoutStore: estado del usuario guardado en localStorage:
       goal        objetivo elegido
       onboarded   si ya respondió la pregunta inicial
       plan        método y frecuencia (variante) elegidos
       selections  ejercicios elegidos por día y grupo muscular
       active      entrenamiento en curso (para poder reanudarlo)
       last        resumen del último entrenamiento terminado
       configured  si ya terminó de preparar su rutina (muestra su panel)
       since       fecha en la que terminó de prepararla
       history     entrenamientos terminados (para la racha)
       best        mejor racha alcanzada
   ===================================================================== */

/* Tamaño relativo de cada grupo: los grandes se entrenan antes */
const GROUP_SIZE = {
  pecho: 0, espalda: 0, cuadriceps: 0,
  gluteos: 1, isquiotibiales: 1, hombros: 1,
  triceps: 2, biceps: 2, 'deltoides-posteriores': 2,
  pantorrillas: 3
};

const DEMAND_RANK = { alta: 0, media: 1, baja: 2 };

/* Fechas locales en formato AAAA-MM-DD */
const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/* Id de día (lun..dom) de una fecha */
const dayIdOf = d => DAYS[(d.getDay() + 6) % 7].id;
const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));

const Planner = {
  method(id) {
    return METHODS.find(m => m.id === id) || null;
  },

  variant(method, variantId) {
    if (!method) return null;
    return method.variants.find(v => v.id === variantId) || null;
  },

  sessionFor(variant, dayId) {
    const id = variant && variant.schedule[dayId];
    return SESSION_TYPES[id] || SESSION_TYPES.rest;
  },

  groupsOf(session) {
    return session.groups.map(g => {
      const id = typeof g === 'string' ? g : g.id;
      const max = (typeof g === 'object' && g.max) || session.limits.max;
      return { id, max, min: Math.min(session.limits.min, max), group: MUSCLE_GROUPS[id] };
    });
  },

  trainingDays(variant) {
    return DAYS.filter(d => variant.schedule[d.id]);
  },

  isRecommended(exId, groupId) {
    return !!(RECOMMENDED[groupId] && RECOMMENDED[groupId].ids.includes(exId));
  },

  /* Ejercicios de un grupo en el orden del entrenador: recomendados primero */
  exercisesFor(groupId) {
    return Coach.ordered(groupId);
  },

  repsFor(ex, goalId) {
    return (ex.reps && ex.reps[goalId]) || DEFAULT_REPS[ex.category][goalId];
  },

  sessionProgress(methodId, variantId, dayId) {
    const variant = this.variant(this.method(methodId), variantId);
    const session = this.sessionFor(variant, dayId);
    const selection = WorkoutStore.getSelection(methodId, variantId, dayId);
    let done = 0, complete = session.groups.length > 0;
    const perGroup = this.groupsOf(session).map(g => {
      const count = (selection[g.id] || []).length;
      const cap = Coach.groupCap(methodId, variantId, dayId, g.id);
      done += count;
      if (count < g.min) complete = false;
      return { ...g, max: cap, count, ready: count >= g.min, full: count >= cap };
    });
    const coach = session.groups.length ? Coach.review(methodId, variantId, dayId) : null;
    if (coach && !coach.ok) complete = false;
    return { session, perGroup, done, complete, coach };
  },

  weeklyFrequency(variant) {
    const freq = {};
    for (const day of DAYS) {
      for (const g of this.groupsOf(this.sessionFor(variant, day.id))) freq[g.id] = (freq[g.id] || 0) + 1;
    }
    return freq;
  },

  /* ORDEN AUTOMÁTICO DE LA RUTINA
     El usuario elige los ejercicios; la aplicación decide el orden más eficaz:
     1. Ejercicios compuestos antes que los de aislamiento.
     2. Grupos musculares grandes antes que los pequeños.
     3. Entre ejercicios parecidos, los más exigentes y técnicos primero,
        cuando hay menos fatiga.
     Un mismo ejercicio elegido en dos grupos (por ejemplo, la sentadilla en
     cuádriceps y glúteos) aparece una sola vez. */
  orderRoutine(methodId, variantId, dayId) {
    const variant = this.variant(this.method(methodId), variantId);
    const session = this.sessionFor(variant, dayId);
    const selection = WorkoutStore.getSelection(methodId, variantId, dayId);
    const seen = new Set();
    const items = [];
    this.groupsOf(session).forEach((g, gi) => {
      (selection[g.id] || []).forEach((id, i) => {
        if (seen.has(id)) return;
        seen.add(id);
        items.push({ id, g: g.id, pos: gi * 10 + i });
      });
    });
    const diff = { avanzado: 0, intermedio: 1, principiante: 2 };
    const key = it => {
      const ex = EXERCISE_INDEX[it.id];
      return [ex.category === 'compuesto' ? 0 : 1, GROUP_SIZE[it.g] ?? 2, DEMAND_RANK[Coach.rating(it.id).demand], diff[ex.difficulty], it.pos];
    };
    items.sort((a, b) => {
      const ka = key(a), kb = key(b);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return 0;
    });
    return items.map(it => ({ id: it.id, g: it.g, why: this.orderReason(it) }));
  },

  orderReason(it) {
    const ex = EXERCISE_INDEX[it.id];
    const size = GROUP_SIZE[it.g] ?? 2;
    if (ex.category === 'compuesto' && size === 0) return 'Compuesto de un grupo grande: va al principio, cuando tienes más energía.';
    if (ex.category === 'compuesto') return 'Compuesto: antes que los ejercicios de aislamiento.';
    if (size >= 2) return 'Aislamiento de un músculo pequeño: al final, porque ya trabajó en los ejercicios anteriores.';
    return 'Aislamiento: después de los compuestos, para completar el trabajo del músculo.';
  }
};

const WorkoutStore = (() => {
  const KEY = 'fitsplit:v2';
  const listeners = new Set();

  const defaults = () => ({
    goal: 'hipertrofia', onboarded: false, plan: null, selections: {}, active: null, last: null,
    configured: false, since: null, history: [], best: 0
  });
  const ACTIVE_MAX_AGE = 24 * 60 * 60 * 1000; // un entrenamiento sin terminar caduca a las 24 h

  /* Limpia datos antiguos o inválidos */
  function sanitize(data) {
    const clean = defaults();
    if (!data) return clean;
    if (GOALS[data.goal]) clean.goal = data.goal;
    clean.onboarded = !!data.onboarded;
    if (data.plan && Planner.variant(Planner.method(data.plan.m), data.plan.v)) clean.plan = { m: data.plan.m, v: data.plan.v };
    for (const [key, groups] of Object.entries(data.selections || {})) {
      const [m, v, d] = key.split('|');
      const variant = Planner.variant(Planner.method(m), v);
      if (!variant || !variant.schedule[d]) continue;
      const out = {};
      for (const g of Planner.groupsOf(Planner.sessionFor(variant, d))) {
        const ids = (groups[g.id] || []).filter(id => EXERCISE_INDEX[id] && EXERCISE_INDEX[id].groups.includes(g.id));
        if (ids.length) out[g.id] = [...new Set(ids)].slice(0, g.max);
      }
      if (Object.keys(out).length) clean.selections[key] = out;
    }
    const a = data.active;
    const fresh = a && typeof a.started === 'number' && Date.now() - a.started < ACTIVE_MAX_AGE;
    if (fresh && Array.isArray(a.items) && a.items.length && a.items.every(it => EXERCISE_INDEX[it.id])) {
      clean.active = { ...a, index: Math.min(Math.max(0, a.index | 0), a.items.length - 1), done: a.done || {} };
    }
    if (data.last && data.last.sessionName) clean.last = data.last;
    clean.configured = !!data.configured && !!clean.plan;
    if (typeof data.since === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.since)) clean.since = data.since;
    if (Array.isArray(data.history)) {
      clean.history = data.history.filter(h => h && /^\d{4}-\d{2}-\d{2}$/.test(h.date)).slice(-400);
    }
    clean.best = Math.max(0, data.best | 0);
    return clean;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return sanitize(JSON.parse(raw));
    } catch (e) {
      /* localStorage no disponible: se usa memoria */
    }
    return defaults();
  }

  let state = load();

  function commit() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* Sin persistencia: los datos viven mientras la página esté abierta */
    }
    listeners.forEach(fn => fn(state));
  }

  const keyOf = (m, v, d) => `${m}|${v}|${d}`;

  /* RACHA
     Suma los entrenamientos terminados mientras se cumplan los días
     planificados de cada semana (lunes a domingo). Si un día no se puede,
     recuperarlo otro día de la misma semana mantiene la racha. La semana en
     curso nunca rompe la racha: aún hay tiempo. */
  function computeStreak(now = new Date()) {
    const plan = state.plan;
    const variant = plan && Planner.variant(Planner.method(plan.m), plan.v);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = dateKey(today);
    const monday = mondayOf(today);
    const byDate = {};
    for (const h of state.history) byDate[h.date] = (byDate[h.date] || 0) + 1;
    const since = state.since ? parseKey(state.since) : (state.history[0] ? parseKey(state.history[0].date) : today);
    const scheduled = d => !!(variant && variant.schedule[dayIdOf(d)]) && d >= since;
    const countWeek = start => {
      let done = 0, required = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        done += byDate[dateKey(d)] || 0;
        if (scheduled(d)) required += 1;
      }
      return { done, required };
    };
    const week = countWeek(monday);
    let current = week.done;
    for (let start = addDays(monday, -7); start >= mondayOf(since); start = addDays(start, -7)) {
      const w = countWeek(start);
      if (w.done < w.required) break;
      current += w.done;
    }
    const days = DAYS.map((day, i) => {
      const d = addDays(monday, i);
      const key = dateKey(d);
      return {
        id: day.id, date: key, trained: !!byDate[key], scheduled: !!(variant && variant.schedule[day.id]),
        isToday: key === todayKey, isPast: d < today, beforeStart: d < since
      };
    });
    return {
      current, best: Math.max(state.best, current), total: state.history.length,
      week: { done: days.filter(x => x.trained).length, required: week.required, days },
      trainedToday: !!byDate[todayKey], todayId: dayIdOf(today)
    };
  }

  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /* Objetivo */
    getGoal: () => state.goal,
    isOnboarded: () => state.onboarded,
    setGoal(goal) {
      if (!GOALS[goal]) return;
      state.goal = goal;
      state.onboarded = true;
      commit();
    },

    /* Método y frecuencia */
    getPlan: () => state.plan,
    setPlan(m, v) {
      state.plan = { m, v };
      commit();
    },

    /* Rutina preparada: a partir de aquí el inicio es el panel personal */
    isConfigured: () => state.configured,
    setConfigured(value) {
      state.configured = !!value && !!state.plan;
      if (state.configured && !state.since) state.since = dateKey();
      commit();
    },

    /* Racha e historial */
    getStreak: now => computeStreak(now),
    getHistory: () => state.history,

    /* Borra todos los datos y vuelve a empezar */
    resetAll() {
      state = defaults();
      commit();
    },

    /* Selección de ejercicios */
    getSelection(m, v, d) { return state.selections[keyOf(m, v, d)] || {}; },
    getGroup(m, v, d, g) { return (state.selections[keyOf(m, v, d)] || {})[g] || []; },

    /* Añade o quita un ejercicio. Las reglas del entrenador (coach.js)
       deciden si se puede añadir: si no, devuelve 'blocked'. */
    toggle(m, v, d, g, exId) {
      const key = keyOf(m, v, d);
      const plan = state.selections[key] || {};
      const list = plan[g] || [];
      let result;
      if (list.includes(exId)) {
        plan[g] = list.filter(id => id !== exId);
        result = 'removed';
      } else {
        if (!Coach.check(m, v, d, g, exId).ok) return 'blocked';
        plan[g] = [...list, exId];
        result = 'added';
      }
      if (!plan[g].length) delete plan[g];
      if (Object.keys(plan).length) state.selections[key] = plan;
      else delete state.selections[key];
      commit();
      return result;
    },

    /* Sustituye la selección de un día (autocompletado del entrenador) */
    setSelection(m, v, d, sel) {
      const out = {};
      for (const [g, ids] of Object.entries(sel)) if (ids.length) out[g] = [...new Set(ids)];
      if (Object.keys(out).length) state.selections[keyOf(m, v, d)] = out;
      else delete state.selections[keyOf(m, v, d)];
      commit();
    },

    clearSession(m, v, d) {
      delete state.selections[keyOf(m, v, d)];
      commit();
    },

    copySession(m, v, fromDay, toDay) {
      const source = state.selections[keyOf(m, v, fromDay)];
      if (!source) return;
      state.selections[keyOf(m, v, toDay)] = JSON.parse(JSON.stringify(source));
      commit();
    },

    /* Entrenamiento en curso */
    getActive: () => state.active,

    startWorkout(m, v, d) {
      const items = Planner.orderRoutine(m, v, d);
      if (!items.length) return false;
      state.active = { m, v, d, items, index: 0, done: {}, goal: state.goal, started: Date.now() };
      commit();
      return true;
    },

    goTo(index) {
      const a = state.active;
      if (!a) return;
      a.index = Math.min(Math.max(0, index), a.items.length - 1);
      commit();
    },

    /* Marca o desmarca series completadas del ejercicio actual */
    setDone(index, count) {
      const a = state.active;
      if (!a) return;
      a.done[index] = Math.max(0, count);
      commit();
    },

    finishWorkout() {
      const a = state.active;
      if (!a) return null;
      const variant = Planner.variant(Planner.method(a.m), a.v);
      const session = Planner.sessionFor(variant, a.d);
      const day = DAYS.find(x => x.id === a.d);
      state.last = {
        sessionName: `${day.name} · ${session.name}`,
        tone: session.tone,
        exercises: a.items.length,
        sets: Object.values(a.done).reduce((s, n) => s + n, 0),
        minutes: Math.max(1, Math.round((Date.now() - a.started) / 60000)),
        goal: a.goal
      };
      state.history.push({ date: dateKey(), d: a.d, m: a.m, v: a.v, name: state.last.sessionName, tone: session.tone });
      state.active = null;
      const streak = computeStreak();
      state.best = Math.max(state.best, streak.current);
      state.last.streak = streak.current;
      commit();
      return state.last;
    },

    abandonWorkout() {
      state.active = null;
      commit();
    },

    getLast: () => state.last,

    countSelected(m, v) {
      return Object.entries(state.selections)
        .filter(([k]) => k.startsWith(`${m}|${v}|`))
        .reduce((sum, [, groups]) => sum + Object.values(groups).reduce((s, ids) => s + ids.length, 0), 0);
    }
  };
})();
