/* =====================================================================
   FIT SPLIT · coach.js
   ---------------------------------------------------------------------
   EL ENTRENADOR: criterio profesional aplicado a la selección de
   ejercicios. Aquí viven, separados de la interfaz:

   - COACH_REFS ....... estudios en los que se apoyan las recomendaciones
   - COACH_RATINGS .... exigencia (fatiga general) y valoración de cada
                        ejercicio para ganar músculo
   - RECOMMENDED ...... ejercicios recomendados por grupo y por qué
   - COACH_TEMPLATES .. cuántos ejercicios por grupo propone el entrenador
                        en cada tipo de sesión
   - Coach ............ reglas de seguridad (límites que el usuario no
                        puede saltarse), revisión de la sesión, series,
                        descansos, duración estimada y autocompletado

   Las reglas no son un adorno: si una selección supera un límite, el
   botón de elegir se desactiva y se explica el motivo.
   ===================================================================== */

/* ---------------------------------------------------------------------
   Estudios citados
   --------------------------------------------------------------------- */
const COACH_REFS = {
  maeo2023: {
    label: 'Maeo et al. (2023). El tríceps crece más con extensiones por encima de la cabeza que con el brazo abajo.',
    url: 'https://onlinelibrary.wiley.com/doi/10.1080/17461391.2022.2100279'
  },
  maeo2021: {
    label: 'Maeo et al. (2021). Más hipertrofia de isquiotibiales con el curl femoral sentado (músculo estirado) que tumbado.',
    url: 'https://www.researchgate.net/publication/344445943_Greater_Hamstrings_Muscle_Hypertrophy_but_Similar_Damage_Protection_after_Training_at_Long_versus_Short_Muscle_Lengths'
  },
  kassiano2023: {
    label: 'Kassiano et al. (2023). Más crecimiento del gemelo entrenando la parte estirada del recorrido.',
    url: 'https://www.researchgate.net/publication/365127382_Greater_gastrocnemius_muscle_hypertrophy_after_partial_range_of_motion_training_performed_at_long_muscle_lengths'
  },
  lengthened: {
    label: 'Repeticiones parciales en posición estirada frente a recorrido completo en personas entrenadas: adaptaciones similares.',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11829627/'
  },
  kubo2019: {
    label: 'Kubo et al. (2019). La sentadilla profunda hizo crecer más el glúteo y los aductores que la media sentadilla.',
    url: 'https://www.strongerbyscience.com/research-spotlight-squat-depth/'
  },
  pedrosa2022: {
    label: 'Pedrosa et al. (2022). Extensión de piernas: más hipertrofia del cuádriceps trabajando con la rodilla flexionada (estirado).',
    url: 'https://www.strongerbyscience.com/leg-extension-muscle-growth/'
  },
  plotkin2023: {
    label: 'Plotkin et al. (2023). Hip thrust y sentadilla producen un crecimiento del glúteo similar; la sentadilla además trabaja cuádriceps y aductores.',
    url: 'https://www.biorxiv.org/content/10.1101/2023.06.21.545949v1'
  },
  pedrosa2023: {
    label: 'Pedrosa et al. (2023). En el curl de bíceps, entrenar la parte inicial del recorrido (brazo estirado) dio mejores resultados.',
    url: 'https://www.mdpi.com/2075-4663/11/2/39'
  },
  volume2023: {
    label: 'Metarregresión (2023) sobre el volumen por sesión: los beneficios se reducen a partir de unas 11 series por músculo y sesión.',
    url: 'https://sportrxiv.org/index.php/server/preprint/view/537'
  }
};

/* ---------------------------------------------------------------------
   Valoración de cada ejercicio
   demand: fatiga general y exigencia técnica (alta | media | baja)
   score:  valoración del entrenador para ganar músculo (1–5)
   --------------------------------------------------------------------- */
const COACH_RATINGS = {
  // Pecho
  'press-banca': ['alta', 5], 'press-inclinado-barra': ['alta', 4], 'press-inclinado-mancuernas': ['media', 5],
  'press-banca-mancuernas': ['media', 4], 'press-pecho-maquina': ['media', 4], fondos: ['alta', 4], flexiones: ['media', 3],
  'aperturas-mancuernas': ['baja', 3], 'cruce-poleas': ['baja', 4], 'contractor-pecho': ['baja', 4], 'cruce-poleas-bajo': ['baja', 3],
  // Espalda
  dominadas: ['alta', 5], 'dominadas-supinas': ['alta', 4], 'remo-barra': ['alta', 4], 'peso-muerto': ['alta', 3],
  'jalon-pecho': ['media', 5], 'jalon-neutro': ['media', 4], 'remo-mancuerna': ['media', 4], 'remo-maquina': ['media', 5],
  'remo-polea-sentado': ['media', 4], 'remo-pecho-apoyado': ['media', 5], 'pullover-polea': ['baja', 3],
  // Hombros
  'press-militar': ['alta', 4], 'press-mancuernas-hombro': ['media', 4], 'press-arnold': ['media', 3], 'press-hombro-maquina': ['media', 4],
  'elevaciones-laterales': ['baja', 5], 'elevaciones-laterales-polea': ['baja', 5], 'elevaciones-frontales': ['baja', 2],
  // Deltoides posteriores
  'elevaciones-posteriores': ['baja', 4], 'face-pull': ['baja', 4], 'pajaro-maquina': ['baja', 5], 'pajaro-polea': ['baja', 5],
  'elevacion-posterior-inclinado': ['baja', 4],
  // Bíceps
  'curl-barra': ['baja', 4], 'curl-mancuernas': ['baja', 4], 'curl-inclinado': ['baja', 5], 'curl-martillo': ['baja', 4],
  'curl-polea': ['baja', 4], 'curl-predicador': ['baja', 5], 'curl-bayesiano': ['baja', 5], 'curl-concentrado': ['baja', 3],
  // Tríceps
  'extension-triceps-polea': ['baja', 4], 'press-frances': ['baja', 4], 'extension-sobre-cabeza': ['baja', 5],
  'extension-polea-sobre-cabeza': ['baja', 5], 'press-cerrado': ['alta', 4], 'patada-triceps': ['baja', 2],
  // Cuádriceps
  sentadilla: ['alta', 5], 'sentadilla-frontal': ['alta', 4], prensa: ['media', 4], 'sentadilla-hack': ['media', 5],
  'extension-piernas': ['baja', 4], zancadas: ['media', 4], 'sentadilla-bulgara': ['media', 5], 'sentadilla-goblet': ['media', 3],
  // Isquiotibiales
  'peso-muerto-rumano': ['alta', 5], 'peso-muerto-rumano-mancuernas': ['media', 4], 'buenos-dias': ['alta', 3],
  'curl-femoral': ['baja', 4], 'curl-femoral-sentado': ['baja', 5], 'curl-nordico': ['alta', 4],
  // Glúteos
  'hip-thrust': ['media', 4], 'patada-gluteo': ['baja', 3], 'abduccion-cadera': ['baja', 3], 'puente-gluteo': ['baja', 3],
  'hiperextension-45': ['media', 4],
  // Pantorrillas
  'elevacion-talones-pie': ['baja', 4], 'elevacion-talones-sentado': ['baja', 4], 'elevacion-talones-prensa': ['baja', 4],
  'elevacion-talones-una-pierna': ['baja', 4], 'elevacion-talones-maquina': ['baja', 5]
};

const DEMAND_LABELS = {
  alta: { name: 'Muy exigente', short: 'Exigente' },
  media: { name: 'Exigencia media', short: 'Media' },
  baja: { name: 'Exigencia baja', short: 'Baja' }
};

/* ---------------------------------------------------------------------
   Recomendados por grupo (en orden de prioridad del entrenador)
   --------------------------------------------------------------------- */
const RECOMMENDED = {
  pecho: {
    ids: ['press-banca', 'press-inclinado-mancuernas', 'contractor-pecho', 'press-pecho-maquina'],
    why: 'Un press horizontal pesado, un press inclinado para la parte superior y un ejercicio guiado que carga el pecho estirado, donde más estímulo recibe.',
    refs: ['lengthened']
  },
  espalda: {
    ids: ['jalon-pecho', 'remo-pecho-apoyado', 'remo-polea-sentado', 'dominadas'],
    why: 'Un tirón vertical y remos con apoyo: cubren dorsal y espalda media con un gran estiramiento y poca carga sobre la zona lumbar.',
    refs: ['lengthened']
  },
  hombros: {
    ids: ['elevaciones-laterales-polea', 'press-mancuernas-hombro', 'elevaciones-laterales'],
    why: 'El deltoides lateral es el que da anchura y los press lo trabajan poco: la polea lo carga desde la posición estirada. El press completa el trabajo.',
    refs: ['lengthened']
  },
  'deltoides-posteriores': {
    ids: ['pajaro-maquina', 'pajaro-polea', 'face-pull'],
    why: 'Aperturas guiadas que mantienen la tensión en todo el arco, también con los brazos cruzados (músculo estirado).',
    refs: []
  },
  biceps: {
    ids: ['curl-bayesiano', 'curl-inclinado', 'curl-predicador'],
    why: 'Los tres cargan el bíceps con el brazo estirado. Entrenar esa parte del recorrido dio mejores resultados en el curl.',
    refs: ['pedrosa2023']
  },
  triceps: {
    ids: ['extension-polea-sobre-cabeza', 'extension-triceps-polea', 'extension-sobre-cabeza', 'press-cerrado'],
    why: 'Con el brazo por encima de la cabeza la porción larga se estira: en un estudio el tríceps creció alrededor de 1,4 veces más que con el brazo abajo. La extensión en polea completa las otras porciones.',
    refs: ['maeo2023']
  },
  cuadriceps: {
    ids: ['sentadilla', 'sentadilla-hack', 'extension-piernas', 'sentadilla-bulgara'],
    why: 'Sentadillas profundas y una extensión de piernas: el cuádriceps responde mejor cuando trabaja con la rodilla muy flexionada.',
    refs: ['kubo2019', 'pedrosa2022']
  },
  isquiotibiales: {
    ids: ['curl-femoral-sentado', 'peso-muerto-rumano'],
    why: 'Sentado, el isquio se estira desde la cadera: creció más que con el curl tumbado. El rumano añade la bisagra de cadera.',
    refs: ['maeo2021']
  },
  gluteos: {
    ids: ['hip-thrust', 'sentadilla-bulgara', 'sentadilla'],
    why: 'El hip thrust y la sentadilla hicieron crecer el glúteo de forma parecida; la sentadilla profunda además trabaja cuádriceps y aductores.',
    refs: ['plotkin2023', 'kubo2019']
  },
  pantorrillas: {
    ids: ['elevacion-talones-maquina', 'elevacion-talones-pie', 'elevacion-talones-prensa'],
    why: 'De pie, con la rodilla extendida, el gemelo trabaja estirado. La parte baja del recorrido es la que más crecimiento produjo.',
    refs: ['kassiano2023']
  }
};

/* ---------------------------------------------------------------------
   Plantillas: ejercicios por grupo que propone el entrenador
   --------------------------------------------------------------------- */
const LEG_TEMPLATE = { cuadriceps: 2, isquiotibiales: 2, gluteos: 1, pantorrillas: 1 };
const COACH_TEMPLATES = {
  push: { pecho: 3, hombros: 2, triceps: 2 },
  pull: { espalda: 3, biceps: 2, 'deltoides-posteriores': 2 },
  legs: LEG_TEMPLATE, piernas: LEG_TEMPLATE, lower: LEG_TEMPLATE, 'bro-piernas': LEG_TEMPLATE,
  'pecho-espalda': { pecho: 3, espalda: 3 },
  'hombros-brazos': { hombros: 2, biceps: 2, triceps: 2 },
  upper: { pecho: 2, espalda: 2, hombros: 1, biceps: 1, triceps: 1 },
  fullbody: {},
  'bro-pecho': { pecho: 4 },
  'bro-espalda': { espalda: 4 },
  'bro-hombros': { hombros: 3, 'deltoides-posteriores': 2 },
  'bro-brazos': { biceps: 3, triceps: 3 }
};

/* Límites del entrenador */
const COACH_LIMITS = {
  highPerSession: 2,                                     // ejercicios muy exigentes por sesión
  exercisesPerSession: { fuerza: 5, hipertrofia: 8, resistencia: 9 },
  setsPerGroupFocused: 12,                               // sesiones de 1–2 grupos
  setsPerGroupShared: 9                                  // sesiones de 3 o más grupos
};

const Coach = (() => {
  'use strict';

  const rating = id => {
    const r = COACH_RATINGS[id];
    if (r) return { demand: r[0], score: r[1] };
    const ex = EXERCISE_INDEX[id];
    return { demand: ex && ex.category === 'compuesto' ? 'media' : 'baja', score: 3 };
  };

  const goalOf = () => WorkoutStore.getGoal();

  /* Series y descanso según objetivo y tipo de ejercicio */
  function setsFor(ex, goal = goalOf()) {
    return goal === 'fuerza' && ex.category !== 'compuesto' ? 3 : GOALS[goal].setsNum;
  }
  function restFor(ex, goal = goalOf()) {
    if (goal === 'fuerza') return ex.category === 'compuesto' ? 180 : 120;
    if (goal === 'hipertrofia') return ex.category === 'compuesto' ? 120 : 90;
    return 60;
  }
  const fmtRest = s => (s >= 60 ? `${Math.floor(s / 60)}${s % 60 ? `:${String(s % 60).padStart(2, '0')}` : ''} min` : `${s} s`);

  function ctx(m, v, d) {
    const variant = Planner.variant(Planner.method(m), v);
    const session = Planner.sessionFor(variant, d);
    return { session, groups: Planner.groupsOf(session) };
  }

  const uniqueIds = sel => new Set(Object.values(sel).flat());

  function sessionCap(groups, goal) {
    const mins = groups.reduce((s, g) => s + g.min, 0);
    return Math.max(COACH_LIMITS.exercisesPerSession[goal], mins);
  }

  function groupCap(groups, g, goal) {
    const setCap = groups.length <= 2 ? COACH_LIMITS.setsPerGroupFocused : COACH_LIMITS.setsPerGroupShared;
    return Math.max(g.min, Math.min(g.max, Math.floor(setCap / GOALS[goal].setsNum)));
  }

  /* ¿Se puede añadir este ejercicio? Devuelve { ok, reason, code } */
  function check(m, v, d, groupId, exId, sel = WorkoutStore.getSelection(m, v, d)) {
    const goal = goalOf();
    const { groups } = ctx(m, v, d);
    const g = groups.find(x => x.id === groupId);
    if (!g) return { ok: false, code: 'group', reason: 'Este grupo no se entrena en esta sesión.' };
    const list = sel[groupId] || [];
    if (list.includes(exId)) return { ok: true };
    const gCap = groupCap(groups, g, goal);
    if (list.length >= gCap) {
      return {
        ok: false, code: 'group-full',
        reason: gCap < g.max
          ? `Con tu objetivo (${GOALS[goal].name.toLowerCase()}) el máximo es ${gCap} ejercicios de ${g.group.name.toLowerCase()} por sesión: más series en el mismo día suman fatiga y apenas añaden estímulo.`
          : `Ya tienes ${gCap} ejercicios de ${g.group.name.toLowerCase()}, el máximo para esta sesión. Quita uno para cambiarlo.`
      };
    }
    const ids = uniqueIds(sel);
    if (ids.has(exId)) return { ok: true }; // ya elegido en otro grupo: se hace una sola vez
    const cap = sessionCap(groups, goal);
    if (ids.size >= cap) {
      return { ok: false, code: 'session-full', reason: `La sesión ya tiene ${cap} ejercicios, el máximo que el entrenador permite para tu objetivo. Una sesión más larga suma fatiga sin mejorar el resultado.` };
    }
    const missing = groups.filter(x => x.id !== groupId && (sel[x.id] || []).length < x.min);
    const reserve = missing.reduce((s, x) => s + x.min - (sel[x.id] || []).length, 0);
    if (ids.size + 1 + reserve > cap) {
      return { ok: false, code: 'reserve', reason: `Aún faltan ${missing.map(x => x.group.name.toLowerCase()).join(', ')}. El entrenador reserva hueco para esos grupos: complétalos primero.` };
    }
    if (rating(exId).demand === 'alta') {
      const high = [...ids].filter(id => rating(id).demand === 'alta');
      if (high.length >= COACH_LIMITS.highPerSession) {
        return {
          ok: false, code: 'high',
          reason: `Ya tienes ${high.length} ejercicios muy exigentes (${high.map(id => EXERCISE_INDEX[id].name).join(' y ')}). Un tercero dispara la fatiga y el riesgo de lesión: elige una opción en máquina, polea o con mancuernas.`
        };
      }
    }
    return { ok: true };
  }

  /* Revisión completa de la sesión: límites, avisos y estimaciones */
  function review(m, v, d) {
    const goal = goalOf();
    const { session, groups } = ctx(m, v, d);
    const sel = WorkoutStore.getSelection(m, v, d);
    const ids = [...uniqueIds(sel)];
    const cap = sessionCap(groups, goal);
    const high = ids.filter(id => rating(id).demand === 'alta');
    const violations = [];
    const notes = [];
    if (ids.length > cap) violations.push(`Hay ${ids.length} ejercicios y el máximo para tu objetivo es ${cap}. Quita ${ids.length - cap}.`);
    if (high.length > COACH_LIMITS.highPerSession) violations.push(`Hay ${high.length} ejercicios muy exigentes; el máximo es ${COACH_LIMITS.highPerSession}. Quita ${high.length - COACH_LIMITS.highPerSession} de: ${high.map(id => EXERCISE_INDEX[id].name).join(', ')}.`);
    for (const g of groups) {
      const n = (sel[g.id] || []).length;
      const gc = groupCap(groups, g, goal);
      if (n > gc) violations.push(`${g.group.name}: ${n} ejercicios, el máximo con tu objetivo es ${gc}.`);
      const list = (sel[g.id] || []).map(id => EXERCISE_INDEX[id]);
      if (list.length && RECOMMENDED[g.id] && !list.some(ex => RECOMMENDED[g.id].ids.includes(ex.id))) {
        notes.push(`${g.group.name}: no has elegido ningún recomendado. Los marcados con estrella suelen dar más resultado por serie.`);
      }
      for (const ex of list) {
        if (rating(ex.id).score <= 2) {
          const alt = (RECOMMENDED[g.id] || { ids: [] }).ids.find(id => !list.some(x => x.id === id));
          notes.push(`${ex.name}: hay opciones más eficaces${alt ? `, por ejemplo ${EXERCISE_INDEX[alt].name.toLowerCase()}` : ''}.`);
        }
      }
    }
    const items = ids.map(id => EXERCISE_INDEX[id]);
    const sets = items.reduce((s, ex) => s + setsFor(ex, goal), 0);
    const seconds = items.reduce((s, ex) => s + setsFor(ex, goal) * (restFor(ex, goal) + 35), 0);
    const minutes = items.length ? Math.round((seconds / 60 + 10) / 5) * 5 : 0;
    return { session, count: ids.length, cap, high: high.length, highCap: COACH_LIMITS.highPerSession, sets, minutes, violations, notes, ok: !violations.length };
  }

  /* Ejercicios de un grupo ordenados por el entrenador */
  function ordered(groupId) {
    const rec = (RECOMMENDED[groupId] || { ids: [] }).ids;
    const pos = id => (rec.includes(id) ? rec.indexOf(id) : 99);
    return EXERCISES.filter(ex => ex.groups.includes(groupId))
      .sort((a, b) => pos(a.id) - pos(b.id) || rating(b.id).score - rating(a.id).score);
  }

  function targetFor(session, groups, g, goal) {
    const t = (COACH_TEMPLATES[session.id] || {})[g.id] || 1;
    return Math.max(g.min, Math.min(t, groupCap(groups, g, goal)));
  }

  /* Completa la sesión con la propuesta del entrenador, respetando lo que
     el usuario ya eligió y todas las reglas. Devuelve la nueva selección. */
  function autofill(m, v, d) {
    const goal = goalOf();
    const { session, groups } = ctx(m, v, d);
    const sel = JSON.parse(JSON.stringify(WorkoutStore.getSelection(m, v, d)));
    /* Prioridad: recomendados, después los que encajan con el objetivo y por
       último el resto, siempre por valoración del entrenador. */
    const poolOf = gId => {
      const rec = (RECOMMENDED[gId] || { ids: [] }).ids;
      const rank = ex => (rec.includes(ex.id) ? 0 : ex.goals.includes(goal) ? 1 : 2);
      return ordered(gId).map((ex, i) => [ex, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
    };
    /* En sesiones con muchos grupos, un compuesto ya elegido que también es
       recomendado para otro grupo (la sentadilla para glúteos) cubre ambos. */
    const shareCompounds = groups.length >= 6;
    const fill = (limitOf, allowShared) => {
      for (const g of groups) {
        const pool = poolOf(g.id);
        if (allowShared) pool.sort((a, b) => uniqueIds(sel).has(b.id) - uniqueIds(sel).has(a.id));
        for (const ex of pool) {
          const list = sel[g.id] || [];
          if (list.length >= limitOf(g)) break;
          const taken = uniqueIds(sel).has(ex.id);
          if (taken && !(allowShared && (RECOMMENDED[g.id] || { ids: [] }).ids.includes(ex.id))) continue;
          if (check(m, v, d, g.id, ex.id, sel).ok) sel[g.id] = [...list, ex.id];
        }
      }
    };
    fill(g => g.min, shareCompounds);
    fill(g => targetFor(session, groups, g, goal), false);
    return sel;
  }

  return {
    rating, setsFor, restFor, fmtRest, check, review, ordered, autofill, groupCap: (m, v, d, gId) => {
      const { groups } = ctx(m, v, d);
      return groupCap(groups, groups.find(x => x.id === gId), goalOf());
    }
  };
})();
