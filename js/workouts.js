/* =====================================================================
   FIT SPLIT · workouts.js
   ---------------------------------------------------------------------
   Lógica de planificación (sin HTML):
   - Planner: consultas sobre métodos, variantes, sesiones y límites.
   - WorkoutStore: selección de ejercicios del usuario, objetivo y
     preferencias, guardadas en localStorage.

   Estructura guardada:
   {
     goal: 'hipertrofia',
     setsPerExercise: 3,
     plans: {
       'ppl|ppl6|lun': { pecho: ['press-banca', ...], hombros: [...] }
     }
   }
   ===================================================================== */

const Planner = {
  method(id) {
    return METHODS.find(m => m.id === id) || null;
  },

  variant(method, variantId) {
    if (!method) return null;
    return method.variants.find(v => v.id === variantId) || null;
  },

  /* Tipo de sesión que toca un día concreto (o descanso) */
  sessionFor(variant, dayId) {
    const id = variant && variant.schedule[dayId];
    return SESSION_TYPES[id] || SESSION_TYPES.rest;
  },

  /* Grupos de una sesión con sus límites efectivos */
  groupsOf(session) {
    return session.groups.map(g => {
      const id = typeof g === 'string' ? g : g.id;
      const max = (typeof g === 'object' && g.max) || session.limits.max;
      return { id, max, min: Math.min(session.limits.min, max), group: MUSCLE_GROUPS[id] };
    });
  },

  /* Días de entrenamiento de una variante, en orden semanal */
  trainingDays(variant) {
    return DAYS.filter(d => variant.schedule[d.id]);
  },

  /* Ejercicios disponibles para un grupo muscular */
  exercisesFor(groupId) {
    return EXERCISES.filter(ex => ex.groups.includes(groupId));
  },

  /* Rango de repeticiones orientativo de un ejercicio según el objetivo */
  repsFor(ex, goalId) {
    return (ex.reps && ex.reps[goalId]) || DEFAULT_REPS[ex.category][goalId];
  },

  /* Progreso de una sesión: ejercicios elegidos y si cada grupo cumple el mínimo */
  sessionProgress(methodId, variantId, dayId) {
    const method = this.method(methodId);
    const variant = this.variant(method, variantId);
    const session = this.sessionFor(variant, dayId);
    const groups = this.groupsOf(session);
    const selection = WorkoutStore.getSelection(methodId, variantId, dayId);
    let done = 0, total = 0, complete = groups.length > 0;
    const perGroup = groups.map(g => {
      const count = (selection[g.id] || []).length;
      done += count;
      total += g.max;
      if (count < g.min) complete = false;
      return { ...g, count, ready: count >= g.min, full: count >= g.max };
    });
    return { session, perGroup, done, total, complete };
  },

  /* Veces por semana que cada grupo muscular aparece en una variante */
  weeklyFrequency(variant) {
    const freq = {};
    for (const day of DAYS) {
      const session = this.sessionFor(variant, day.id);
      for (const g of this.groupsOf(session)) freq[g.id] = (freq[g.id] || 0) + 1;
    }
    return freq;
  },

  /* Series semanales planificadas por grupo, según los ejercicios elegidos */
  weeklySets(methodId, variantId) {
    const sets = {};
    const perExercise = WorkoutStore.getSets();
    const method = this.method(methodId);
    const variant = this.variant(method, variantId);
    if (!variant) return sets;
    for (const day of DAYS) {
      const selection = WorkoutStore.getSelection(methodId, variantId, day.id);
      for (const [groupId, ids] of Object.entries(selection)) {
        sets[groupId] = (sets[groupId] || 0) + ids.length * perExercise;
      }
    }
    return sets;
  },

  /* Valida un contexto de navegación (método, variante, día, grupo) */
  validContext(ctx) {
    if (!ctx || !ctx.m) return null;
    const method = this.method(ctx.m);
    const variant = this.variant(method, ctx.v);
    if (!variant || !variant.schedule[ctx.d]) return null;
    const session = this.sessionFor(variant, ctx.d);
    const group = this.groupsOf(session).find(g => g.id === ctx.g);
    if (!group) return null;
    return { method, variant, day: DAYS.find(d => d.id === ctx.d), session, group };
  }
};

const WorkoutStore = (() => {
  const KEY = 'fitsplit:v1';
  const listeners = new Set();

  const defaults = () => ({ goal: 'hipertrofia', setsPerExercise: 3, plans: {} });

  /* Limpia datos antiguos o inválidos (por ejemplo, ejercicios que ya no existen) */
  function sanitize(data) {
    const clean = defaults();
    if (data && GOALS[data.goal]) clean.goal = data.goal;
    if (data && Number.isInteger(data.setsPerExercise)) {
      clean.setsPerExercise = Math.min(6, Math.max(1, data.setsPerExercise));
    }
    const plans = (data && data.plans) || {};
    for (const [key, groups] of Object.entries(plans)) {
      const [m, v, d] = key.split('|');
      const variant = Planner.variant(Planner.method(m), v);
      if (!variant || !variant.schedule[d]) continue;
      const allowed = Planner.groupsOf(Planner.sessionFor(variant, d));
      const out = {};
      for (const g of allowed) {
        const ids = (groups[g.id] || []).filter(id => EXERCISE_INDEX[id] && EXERCISE_INDEX[id].groups.includes(g.id));
        if (ids.length) out[g.id] = [...new Set(ids)].slice(0, g.max);
      }
      if (Object.keys(out).length) clean.plans[key] = out;
    }
    return clean;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return sanitize(JSON.parse(raw));
    } catch (e) {
      /* localStorage no disponible (modo privado, permisos): se usa memoria */
    }
    return defaults();
  }

  let state = load();

  function commit() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* Sin persistencia: la selección se mantiene mientras la página esté abierta */
    }
    listeners.forEach(fn => fn(state));
  }

  const keyOf = (m, v, d) => `${m}|${v}|${d}`;

  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    getGoal: () => state.goal,
    setGoal(goal) {
      if (!GOALS[goal] || goal === state.goal) return;
      state.goal = goal;
      commit();
    },

    getSets: () => state.setsPerExercise,
    setSets(n) {
      const value = Math.min(6, Math.max(1, n));
      if (value === state.setsPerExercise) return;
      state.setsPerExercise = value;
      commit();
    },

    getSelection(m, v, d) {
      return state.plans[keyOf(m, v, d)] || {};
    },

    getGroup(m, v, d, g) {
      return (state.plans[keyOf(m, v, d)] || {})[g] || [];
    },

    /* Añade o quita un ejercicio. Devuelve 'added', 'removed' o 'full' */
    toggle(m, v, d, g, exId, max) {
      const key = keyOf(m, v, d);
      const plan = state.plans[key] || {};
      const list = plan[g] || [];
      let result;
      if (list.includes(exId)) {
        plan[g] = list.filter(id => id !== exId);
        result = 'removed';
      } else {
        if (list.length >= max) return 'full';
        plan[g] = [...list, exId];
        result = 'added';
      }
      if (!plan[g].length) delete plan[g];
      if (Object.keys(plan).length) state.plans[key] = plan;
      else delete state.plans[key];
      commit();
      return result;
    },

    remove(m, v, d, g, exId) {
      if (this.getGroup(m, v, d, g).includes(exId)) this.toggle(m, v, d, g, exId, Infinity);
    },

    clearSession(m, v, d) {
      delete state.plans[keyOf(m, v, d)];
      commit();
    },

    /* Copia la selección de un día a otro con el mismo tipo de sesión */
    copySession(m, v, fromDay, toDay) {
      const source = state.plans[keyOf(m, v, fromDay)];
      if (!source) return;
      state.plans[keyOf(m, v, toDay)] = JSON.parse(JSON.stringify(source));
      commit();
    },

    clearAll() {
      state.plans = {};
      commit();
    },

    /* Lista de sesiones guardadas */
    plans() {
      return Object.entries(state.plans).map(([key, groups]) => {
        const [m, v, d] = key.split('|');
        return { key, m, v, d, groups };
      });
    },

    totalCount() {
      return Object.values(state.plans).reduce(
        (sum, groups) => sum + Object.values(groups).reduce((s, ids) => s + ids.length, 0), 0);
    }
  };
})();
