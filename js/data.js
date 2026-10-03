/* =====================================================================
   FIT SPLIT · data.js
   ---------------------------------------------------------------------
   Datos estáticos de la aplicación (sin lógica de interfaz):
   - Días de la semana
   - Grupos musculares, equipamiento y dificultad
   - Objetivos de entrenamiento (fuerza, hipertrofia, resistencia)
   - Tipos de sesión (Push, Pull, Upper, Full Body...)
   - Métodos de entrenamiento con sus variantes semanales

   Para añadir un método nuevo basta con agregar un objeto a METHODS
   (y, si hace falta, un tipo de sesión a SESSION_TYPES). Las vistas
   se generan automáticamente a partir de estos datos.
   ===================================================================== */

const DAYS = [
  { id: 'lun', name: 'Lunes', short: 'Lun' },
  { id: 'mar', name: 'Martes', short: 'Mar' },
  { id: 'mie', name: 'Miércoles', short: 'Mié' },
  { id: 'jue', name: 'Jueves', short: 'Jue' },
  { id: 'vie', name: 'Viernes', short: 'Vie' },
  { id: 'sab', name: 'Sábado', short: 'Sáb' },
  { id: 'dom', name: 'Domingo', short: 'Dom' }
];

/* Tonos de color por tipo de trabajo. Los colores reales viven en CSS
   (clases .tone-push, .tone-pull...). Aquí solo se describe su uso. */
const TONES = {
  push: 'Empuje',
  pull: 'Jalón',
  legs: 'Piernas',
  upper: 'Tren superior',
  full: 'Cuerpo completo',
  rest: 'Descanso'
};

/* ---------------------------------------------------------------------
   Grupos musculares
   --------------------------------------------------------------------- */
const MUSCLE_GROUPS = {
  pecho: {
    id: 'pecho', name: 'Pecho', tone: 'push',
    anatomy: 'Pectoral mayor (porciones clavicular y esternal) y pectoral menor.',
    role: 'Lleva el brazo hacia delante y hacia la línea media del cuerpo. Es el motor principal de los empujes horizontales.'
  },
  hombros: {
    id: 'hombros', name: 'Hombros', tone: 'push',
    anatomy: 'Deltoides anterior y lateral, con apoyo del manguito rotador.',
    role: 'Eleva el brazo hacia delante y hacia los lados. Trabaja en empujes verticales e inclinados.'
  },
  triceps: {
    id: 'triceps', name: 'Tríceps', tone: 'push',
    anatomy: 'Tríceps braquial: cabezas larga, lateral y medial.',
    role: 'Extiende el codo. La cabeza larga también participa en la extensión del hombro.'
  },
  espalda: {
    id: 'espalda', name: 'Espalda', tone: 'pull',
    anatomy: 'Dorsal ancho, redondo mayor, trapecio, romboides y erectores de la columna.',
    role: 'Lleva los brazos hacia el cuerpo, junta y estabiliza las escápulas y protege la postura del tronco.'
  },
  biceps: {
    id: 'biceps', name: 'Bíceps', tone: 'pull',
    anatomy: 'Bíceps braquial, braquial y braquiorradial.',
    role: 'Flexiona el codo y gira el antebrazo hacia arriba (supinación).'
  },
  'deltoides-posteriores': {
    id: 'deltoides-posteriores', name: 'Deltoides posteriores', short: 'Delt. posterior', tone: 'pull',
    anatomy: 'Porción posterior del deltoides, con ayuda del trapecio medio y los romboides.',
    role: 'Lleva el brazo hacia atrás y hacia fuera. Equilibra el trabajo de empuje y ayuda a la salud del hombro.'
  },
  cuadriceps: {
    id: 'cuadriceps', name: 'Cuádriceps', tone: 'legs',
    anatomy: 'Recto femoral, vasto lateral, vasto medial y vasto intermedio.',
    role: 'Extiende la rodilla. El recto femoral también flexiona la cadera.'
  },
  isquiotibiales: {
    id: 'isquiotibiales', name: 'Isquiotibiales', short: 'Isquios', tone: 'legs',
    anatomy: 'Bíceps femoral, semitendinoso y semimembranoso.',
    role: 'Flexionan la rodilla y extienden la cadera. Son clave en las bisagras de cadera.'
  },
  gluteos: {
    id: 'gluteos', name: 'Glúteos', tone: 'legs',
    anatomy: 'Glúteo mayor, medio y menor.',
    role: 'Extienden y estabilizan la cadera. Participan en sentadillas, zancadas y empujes de cadera.'
  },
  pantorrillas: {
    id: 'pantorrillas', name: 'Pantorrillas', tone: 'legs',
    anatomy: 'Gastrocnemio (gemelos) y sóleo.',
    role: 'Extienden el tobillo (elevan el talón). El sóleo trabaja más con la rodilla flexionada.'
  }
};

/* Orden en el que se muestran los grupos en filtros y resúmenes */
const GROUP_ORDER = [
  'pecho', 'espalda', 'hombros', 'deltoides-posteriores', 'biceps', 'triceps',
  'cuadriceps', 'isquiotibiales', 'gluteos', 'pantorrillas'
];

const EQUIPMENT = {
  barra: 'Barra',
  mancuernas: 'Mancuernas',
  polea: 'Polea',
  maquina: 'Máquina',
  'peso-corporal': 'Peso corporal'
};

const DIFFICULTIES = {
  principiante: { name: 'Principiante', level: 1 },
  intermedio: { name: 'Intermedio', level: 2 },
  avanzado: { name: 'Avanzado', level: 3 }
};

/* ---------------------------------------------------------------------
   Objetivos de entrenamiento
   Los rangos son orientativos: hay superposición entre ellos y la
   adaptación depende también del esfuerzo, el volumen, la técnica y la
   recuperación.
   --------------------------------------------------------------------- */
const GOALS = {
  fuerza: {
    id: 'fuerza',
    name: 'Fuerza',
    tagline: 'Mejora tu capacidad para producir fuerza.',
    summary: 'Prioriza aumentar la fuerza máxima, sobre todo en los ejercicios que practicas. Depende del tamaño del músculo, pero también de la coordinación del sistema nervioso y del dominio técnico del gesto.',
    reps: 'Aprox. 1–6 repeticiones',
    range: [1, 6],
    sets: '3–5 series por ejercicio',
    effort: 'RIR 1–3 en la mayoría de las series. El fallo se usa poco en ejercicios pesados.',
    rest: '2–5 minutos entre series',
    load: 'Altas respecto a tu máximo (aprox. 80–90 % de 1RM o más)',
    tempo: 'Bajada controlada y subida con intención de acelerar, aunque la barra se mueva lenta.',
    prescription: { sets: '3–5', rir: 'RIR 1–3', rest: '2–5 min' },
    setsNum: 4,      // series por ejercicio en el modo entrenamiento
    restSec: 180,    // descanso entre series (segundos)
    keys: [
      'La especificidad importa: mejoras más en los ejercicios y rangos de repeticiones que practicas.',
      'Una técnica estable forma parte del entrenamiento de fuerza; no es un detalle estético.',
      'Trabajar también en rangos más altos construye músculo, que sostiene la fuerza a largo plazo.'
    ],
    caution: 'Los rangos son orientativos. También se gana fuerza con más repeticiones, sobre todo al empezar, pero las cargas altas son más específicas para expresar la fuerza máxima.'
  },
  hipertrofia: {
    id: 'hipertrofia',
    name: 'Hipertrofia',
    tagline: 'Entrena para favorecer el desarrollo muscular.',
    summary: 'Prioriza el aumento del tamaño muscular. El estímulo depende sobre todo de acumular series con esfuerzo suficiente, buena técnica y una recuperación adecuada.',
    reps: 'Aprox. 6–15 repeticiones como rango práctico común',
    range: [6, 15],
    extended: [5, 30],
    sets: '2–4 series por ejercicio. Como referencia, muchas personas trabajan unas 10–20 series semanales por grupo muscular.',
    effort: 'RIR 0–3: series cercanas al fallo, con técnica estable.',
    rest: '1,5–3 minutos (más tiempo en ejercicios compuestos)',
    load: 'Moderada: la que te permita acercarte al fallo dentro del rango elegido',
    tempo: 'Fase excéntrica controlada (unos 2–3 s), sin rebotes y con recorrido completo.',
    prescription: { sets: '2–4', rir: 'RIR 0–3', rest: '1,5–3 min' },
    setsNum: 3,
    restSec: 120,
    keys: [
      'La hipertrofia puede producirse en un rango amplio de repeticiones si las series se acercan al fallo.',
      'El volumen semanal (series efectivas por grupo muscular) es una de las variables más útiles para planificar.',
      'Progresar en carga o repeticiones con la misma técnica indica que el estímulo sigue avanzando.'
    ],
    caution: 'El rango 6–15 es una herramienta práctica, no una regla. Los estudios muestran crecimiento muscular con cargas muy distintas (aprox. 5–30 repeticiones) cuando el esfuerzo es alto. Con menos repeticiones se suelen necesitar más series; con muchas más, la fatiga y la incomodidad dificultan acercarse al fallo.'
  },
  resistencia: {
    id: 'resistencia',
    name: 'Resistencia muscular',
    shortName: 'Resistencia',
    tagline: 'Mejora tu capacidad para mantener esfuerzos repetidos.',
    summary: 'Prioriza la capacidad del músculo para repetir un gesto o sostener un esfuerzo durante más tiempo antes de que la fatiga obligue a parar.',
    reps: 'Generalmente 15–30 repeticiones o más',
    range: [15, 30],
    sets: '2–4 series por ejercicio',
    effort: 'RIR 1–4. El reto es mantener la técnica bajo fatiga.',
    rest: '30–90 segundos entre series',
    load: 'Baja a moderada (aprox. 60–65 % de 1RM o menos)',
    tempo: 'Ritmo constante y controlado, con respiración regular.',
    prescription: { sets: '2–3', rir: 'RIR 1–4', rest: '30–90 s' },
    setsNum: 3,
    restSec: 60,
    keys: [
      'Los descansos cortos forman parte del estímulo: entrenan la tolerancia a la fatiga.',
      'Las repeticiones altas también pueden generar hipertrofia si las series son exigentes.',
      'Conviene mantener la técnica: cuando se degrada, la serie deja de entrenar lo que buscas.'
    ],
    caution: 'Las repeticiones altas no “tonifican” de forma especial ni impiden ganar músculo. La diferencia está en qué adaptación se prioriza, no en un efecto exclusivo de cada rango.'
  }
};

const GOAL_ORDER = ['fuerza', 'hipertrofia', 'resistencia'];

/* ---------------------------------------------------------------------
   Tipos de sesión
   groups: grupos musculares que se trabajan en la sesión.
   Cada grupo puede ser un id o { id, max } para sobrescribir el máximo.
   limits.min: ejercicios mínimos por grupo para dar la sesión por lista.
   limits.max: ejercicios máximos por grupo.
   --------------------------------------------------------------------- */
const LEG_GROUPS = ['cuadriceps', 'isquiotibiales', 'gluteos', 'pantorrillas'];

const SESSION_TYPES = {
  push: {
    id: 'push', name: 'Push', subtitle: 'Empuje', tone: 'push',
    description: 'Músculos que empujan una carga lejos del cuerpo: pecho, hombros y tríceps.',
    groups: ['pecho', 'hombros', 'triceps'],
    limits: { min: 1, max: 3 },
    hint: 'Lo habitual en una sesión Push son 2–3 ejercicios por grupo. Empieza por los ejercicios compuestos.'
  },
  pull: {
    id: 'pull', name: 'Pull', subtitle: 'Jalón', tone: 'pull',
    description: 'Músculos que acercan una carga al cuerpo: espalda, bíceps y deltoides posteriores.',
    groups: ['espalda', 'biceps', 'deltoides-posteriores'],
    limits: { min: 1, max: 3 },
    hint: 'Combina al menos un jalón vertical (dominadas, jalón) con un remo horizontal.'
  },
  legs: {
    id: 'legs', name: 'Legs', subtitle: 'Piernas', tone: 'legs',
    description: 'Tren inferior completo: cuádriceps, isquiotibiales, glúteos y pantorrillas.',
    groups: LEG_GROUPS,
    limits: { min: 1, max: 3 },
    hint: 'Con cuatro grupos, 1–2 ejercicios por grupo suelen dar una sesión completa y manejable.'
  },
  'pecho-espalda': {
    id: 'pecho-espalda', name: 'Pecho + Espalda', subtitle: 'Antagonistas', tone: 'upper',
    description: 'Músculos antagonistas en la misma sesión. Permite alternar series de empuje y de jalón.',
    groups: ['pecho', 'espalda'],
    limits: { min: 1, max: 3 },
    hint: 'Puedes alternar un ejercicio de pecho y uno de espalda para aprovechar los descansos.'
  },
  'hombros-brazos': {
    id: 'hombros-brazos', name: 'Hombros + Brazos', subtitle: 'Deltoides, bíceps y tríceps', tone: 'upper',
    description: 'Trabajo directo de deltoides, bíceps y tríceps, que en otras sesiones reciben trabajo indirecto.',
    groups: ['hombros', 'biceps', 'triceps'],
    limits: { min: 1, max: 3 },
    hint: 'Los brazos ya trabajaron en la sesión de pecho y espalda: vigila el volumen total.'
  },
  piernas: {
    id: 'piernas', name: 'Piernas', subtitle: 'Tren inferior', tone: 'legs',
    description: 'Cuádriceps, isquiotibiales, glúteos y pantorrillas en una sesión.',
    groups: LEG_GROUPS,
    limits: { min: 1, max: 3 },
    hint: 'Coloca primero el ejercicio más exigente (sentadilla o prensa) cuando estés más fresco.'
  },
  upper: {
    id: 'upper', name: 'Upper', subtitle: 'Tren superior', tone: 'upper',
    description: 'Todo el tren superior: pecho, espalda, hombros, bíceps y tríceps.',
    groups: ['pecho', 'espalda', 'hombros', 'biceps', 'triceps'],
    limits: { min: 1, max: 3 },
    hint: 'Con cinco grupos, 1–2 ejercicios por grupo mantienen la sesión en una duración razonable.'
  },
  lower: {
    id: 'lower', name: 'Lower', subtitle: 'Tren inferior', tone: 'legs',
    description: 'Todo el tren inferior: cuádriceps, isquiotibiales, glúteos y pantorrillas.',
    groups: LEG_GROUPS,
    limits: { min: 1, max: 3 },
    hint: 'Alterna el énfasis entre sesiones: un día dominante de rodilla y otro de cadera.'
  },
  fullbody: {
    id: 'fullbody', name: 'Full Body', subtitle: 'Cuerpo completo', tone: 'full',
    description: 'Todos los grandes grupos musculares en una misma sesión.',
    groups: ['pecho', 'espalda', 'hombros', 'cuadriceps', 'isquiotibiales', 'gluteos', 'biceps', 'triceps'],
    limits: { min: 1, max: 3 },
    hint: 'En Full Body suele bastar 1 ejercicio por grupo. Varía los ejercicios entre los distintos días.'
  },
  'bro-pecho': {
    id: 'bro-pecho', name: 'Pecho', subtitle: 'Día de pecho', tone: 'push',
    description: 'Una sesión dedicada al pecho, con varios ángulos de empuje y aperturas.',
    groups: [{ id: 'pecho', max: 5 }],
    limits: { min: 3, max: 5 },
    hint: 'Combina un press horizontal, uno inclinado y un ejercicio de aperturas.'
  },
  'bro-espalda': {
    id: 'bro-espalda', name: 'Espalda', subtitle: 'Día de espalda', tone: 'pull',
    description: 'Una sesión dedicada a la espalda: jalones verticales y remos horizontales.',
    groups: [{ id: 'espalda', max: 5 }],
    limits: { min: 3, max: 5 },
    hint: 'Equilibra jalones verticales y remos para trabajar dorsales y espalda media.'
  },
  'bro-hombros': {
    id: 'bro-hombros', name: 'Hombros', subtitle: 'Día de hombros', tone: 'push',
    description: 'Deltoides anterior, lateral y posterior en una misma sesión.',
    groups: [{ id: 'hombros', max: 4 }, { id: 'deltoides-posteriores', max: 2 }],
    limits: { min: 1, max: 4 },
    hint: 'Un press y una elevación lateral cubren el deltoides anterior y lateral; añade trabajo posterior.'
  },
  'bro-brazos': {
    id: 'bro-brazos', name: 'Brazos', subtitle: 'Bíceps y tríceps', tone: 'upper',
    description: 'Trabajo directo de bíceps y tríceps.',
    groups: [{ id: 'biceps', max: 4 }, { id: 'triceps', max: 4 }],
    limits: { min: 2, max: 4 },
    hint: 'Alterna ejercicios de bíceps y tríceps para repartir la fatiga.'
  },
  'bro-piernas': {
    id: 'bro-piernas', name: 'Piernas', subtitle: 'Día de piernas', tone: 'legs',
    description: 'Una sesión completa de tren inferior.',
    groups: LEG_GROUPS,
    limits: { min: 1, max: 3 },
    hint: 'Es la sesión más exigente del método: prioriza la calidad sobre la cantidad de ejercicios.'
  },
  rest: {
    id: 'rest', name: 'Descanso', subtitle: 'Recuperación', tone: 'rest',
    description: 'Día sin entrenamiento de fuerza. La adaptación se consolida durante la recuperación.',
    groups: [],
    limits: { min: 0, max: 0 }
  }
};

/* ---------------------------------------------------------------------
   Métodos de entrenamiento
   Cada variante define qué tipo de sesión toca cada día de la semana.
   Los días que no aparecen en "schedule" son de descanso.
   --------------------------------------------------------------------- */
const METHODS = [
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    short: 'PPL',
    tone: 'push',
    tagline: 'Organiza la semana por patrones de movimiento: empujar, jalar y piernas.',
    summary: 'Divide el entrenamiento en sesiones de empuje, jalón y piernas. Funciona con 3 o 6 días por semana.',
    stats: {
      days: '3–6 días',
      frequency: '1–2 veces por semana',
      duration: '60–90 min',
      level: 'Principiante avanzado en adelante'
    },
    what: [
      'Push Pull Legs (PPL) organiza el entrenamiento agrupando los músculos que trabajan juntos en un mismo tipo de movimiento. En lugar de dedicar un día a cada músculo, cada sesión reúne a los que empujan, a los que jalan o a los de las piernas.',
      'Por eso un ejercicio como el press de banca, que mueve pecho, hombros y tríceps a la vez, comparte sesión con los ejercicios que después aíslan esos mismos músculos.'
    ],
    how: [
      'La semana se reparte en tres tipos de sesión. En la versión de seis días el ciclo se repite dos veces, de modo que cada grupo muscular se entrena aproximadamente cada 72 horas. En la versión de tres días, cada sesión se hace una vez.',
      'Como los músculos de cada sesión colaboran entre sí, el trabajo de un día interfiere poco con el siguiente: el día de Pull no depende de los músculos que se fatigaron en Push.'
    ],
    advantages: [
      'Agrupa músculos que colaboran entre sí, por lo que cada sesión interfiere poco con la siguiente.',
      'La versión de seis días permite entrenar cada grupo muscular dos veces por semana.',
      'Es fácil de entender y de ajustar: se pueden mover días sin romper la lógica del plan.',
      'Cada sesión tiene un foco claro, lo que facilita registrar el progreso.',
      'Escala bien de 3 a 6 días según la disponibilidad.'
    ],
    disadvantages: [
      'La versión de seis días exige mucha disponibilidad y una buena gestión de la recuperación.',
      'En la versión de tres días cada músculo se entrena solo una vez por semana.',
      'Si se pierde un día, el ciclo se desordena y algún grupo puede quedar sin trabajo esa semana.',
      'La sesión de piernas suele ser la más exigente y puede acumular mucha fatiga.'
    ],
    forWhom: [
      'Puede ser útil para personas con algo de experiencia que buscan una estructura clara y pueden entrenar varios días. También encaja con quien prefiere sesiones enfocadas en lugar de entrenar todo el cuerpo cada día.',
      'No es mejor ni peor que otros métodos por sí mismo: su utilidad depende de la disponibilidad, la recuperación, la experiencia y las preferencias de cada persona.'
    ],
    notIdeal: [
      'Tienes menos de tres días disponibles por semana.',
      'Tu horario es muy irregular y te cuesta mantener una secuencia.',
      'Estás empezando y todavía aprendes la técnica de los ejercicios básicos: un Full Body te da más práctica de cada patrón.'
    ],
    variants: [
      {
        id: 'ppl6', name: '6 días', description: 'El ciclo completo dos veces por semana. Cada grupo muscular se entrena 2 veces.',
        schedule: { lun: 'push', mar: 'pull', mie: 'legs', jue: 'push', vie: 'pull', sab: 'legs' }
      },
      {
        id: 'ppl3', name: '3 días', description: 'Cada sesión una vez por semana, con un día de descanso entre sesiones.',
        schedule: { lun: 'push', mie: 'pull', vie: 'legs' }
      },
      {
        id: 'pplul', name: '5 días · PPL + Upper/Lower', description: 'Híbrido: PPL al inicio de la semana y Upper/Lower al final. Cada grupo se entrena 2 veces en 5 días.',
        schedule: { lun: 'push', mar: 'pull', mie: 'legs', vie: 'upper', sab: 'lower' }
      }
    ],
    recovery: [
      'Deja al menos 48 horas entre dos sesiones que trabajen el mismo grupo muscular.',
      'En la versión de 6 días, el día de descanso forma parte del plan.',
      'Si la fatiga se acumula, reduce series antes de sacrificar la técnica.'
    ],
    progression: [
      'Empieza con 2–3 ejercicios por grupo y aumenta series de forma gradual.',
      'Registra cargas y repeticiones para comparar cada sesión con la misma de la semana anterior.',
      'En la versión de 6 días puedes usar la primera mitad de la semana para cargas altas y la segunda para más repeticiones.'
    ],
    faq: [
      { q: '¿Es mejor la versión de 6 días que la de 3?', a: 'No necesariamente. La de 6 días permite repartir más volumen semanal, pero exige más tiempo y recuperación. Con 3 días también se progresa, sobre todo si el volumen de cada sesión está bien planificado.' },
      { q: '¿Tengo que seguir el orden Push → Pull → Legs?', a: 'No. Algunas personas prefieren Pull → Push → Legs o colocar piernas entre las dos sesiones de tren superior. Lo importante es dejar tiempo de recuperación entre sesiones que trabajan los mismos músculos.' },
      { q: '¿Dónde entra el abdomen?', a: 'Se puede añadir al final de cualquier sesión. Muchos ejercicios compuestos ya lo trabajan como estabilizador.' }
    ],
    compare: { days: '3–6', frequency: '1–2×', duration: '60–90 min', complexity: 'Media', bestFor: 'Estructura clara por patrones' }
  },
  {
    id: 'arnold',
    name: 'Arnold Split',
    short: 'Arnold',
    tone: 'upper',
    tagline: 'Pecho con espalda, hombros con brazos y piernas: alta frecuencia y mucho volumen.',
    summary: 'Combina músculos antagonistas en la misma sesión. Clásico del culturismo, normalmente de 6 días.',
    stats: {
      days: '3–6 días',
      frequency: '1–2 veces por semana',
      duration: '75–100 min',
      level: 'Intermedio a avanzado'
    },
    what: [
      'El Arnold Split es una división popularizada por Arnold Schwarzenegger en su etapa de competición. Agrupa el pecho con la espalda, los hombros con los brazos y deja las piernas en una sesión propia.',
      'La idea central es entrenar músculos antagonistas (los que hacen movimientos opuestos) en la misma sesión y repetir el ciclo dos veces por semana.'
    ],
    how: [
      'Cada sesión combina dos grupos que no compiten por los mismos músculos auxiliares. En el día de pecho y espalda se pueden alternar series de empuje y de jalón: mientras un grupo trabaja, el otro descansa.',
      'Hombros y brazos tienen su propia sesión, lo que permite dedicarles trabajo directo. Las piernas se entrenan aparte, dos veces por semana en la versión de seis días.'
    ],
    advantages: [
      'Alternar pecho y espalda permite hacer superseries antagonistas y ahorrar tiempo de descanso.',
      'La versión de seis días entrena cada grupo dos veces por semana.',
      'Brazos y hombros reciben trabajo directo con atención específica.',
      'Las sesiones de tren superior se equilibran entre empuje y jalón.'
    ],
    disadvantages: [
      'Las sesiones suelen ser largas y exigentes, sobre todo la de pecho y espalda.',
      'Hombros y brazos trabajan de forma indirecta el día anterior: puede haber solapamiento y fatiga acumulada.',
      'La versión completa requiere seis días por semana.',
      'Puede ser demasiado volumen para quien está empezando.'
    ],
    forWhom: [
      'Puede ser útil para personas con experiencia, buena tolerancia al volumen y tiempo para entrenar seis días. También para quien disfruta de sesiones largas y quiere trabajo directo de brazos y hombros.',
      'Su fama viene del culturismo de élite, pero eso no lo convierte en la mejor opción para todos: el volumen y la frecuencia deben ajustarse a la capacidad de recuperación de cada persona.'
    ],
    notIdeal: [
      'Tienes poco tiempo por sesión.',
      'Te recuperas lento o duermes poco de forma habitual.',
      'Estás aprendiendo la técnica de los ejercicios básicos.'
    ],
    variants: [
      {
        id: 'arnold6', name: '6 días', description: 'La versión clásica: el ciclo de tres sesiones dos veces por semana.',
        schedule: { lun: 'pecho-espalda', mar: 'hombros-brazos', mie: 'piernas', jue: 'pecho-espalda', vie: 'hombros-brazos', sab: 'piernas' }
      },
      {
        id: 'arnold3', name: '3 días', description: 'El ciclo una vez por semana, alternando con días de descanso. Menos volumen y más recuperación.',
        schedule: { lun: 'pecho-espalda', mie: 'hombros-brazos', vie: 'piernas' }
      }
    ],
    recovery: [
      'Vigila los hombros: trabajan en pecho, en espalda y en su propia sesión.',
      'Si una sesión supera la hora y media, reparte o reduce ejercicios.',
      'Planifica semanas de descarga si la fatiga se acumula durante varias semanas seguidas.'
    ],
    progression: [
      'Usa superseries antagonistas (pecho + espalda) para mantener la sesión en un tiempo razonable.',
      'Empieza con el volumen bajo y súbelo de forma gradual: es fácil pasarse con este método.',
      'Registra la carga del primer ejercicio de cada grupo como referencia de progreso.'
    ],
    faq: [
      { q: '¿Arnold realmente entrenaba así?', a: 'Es la división más asociada a su etapa de competición, aunque él y sus contemporáneos variaban mucho sus rutinas. Úsala como una estructura, no como una receta exacta.' },
      { q: '¿Qué es una superserie antagonista?', a: 'Alternar una serie de un músculo con una del músculo opuesto, por ejemplo press de banca y remo, descansando poco entre ambas.' }
    ],
    compare: { days: '3–6', frequency: '1–2×', duration: '75–100 min', complexity: 'Alta', bestFor: 'Volumen alto y trabajo directo de brazos' }
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    short: 'U/L',
    tone: 'upper',
    tagline: 'Tren superior y tren inferior en días alternos, con frecuencia 2 en solo 4 días.',
    summary: 'Alterna sesiones de tren superior e inferior. Muy equilibrado y fácil de encajar en 4 días.',
    stats: {
      days: '2–4 días',
      frequency: '1–2 veces por semana',
      duration: '60–80 min',
      level: 'Principiante a avanzado'
    },
    what: [
      'Upper / Lower divide el cuerpo en dos mitades: tren superior (pecho, espalda, hombros y brazos) y tren inferior (piernas y glúteos).',
      'Es una de las divisiones más equilibradas porque reparte el trabajo de forma simétrica y permite entrenar cada grupo muscular dos veces por semana con solo cuatro sesiones.'
    ],
    how: [
      'En la versión de cuatro días se alternan dos sesiones de tren superior y dos de tren inferior, normalmente con un día de descanso a mitad de semana.',
      'Es habitual que las dos sesiones de cada tipo tengan un énfasis distinto: por ejemplo, una sesión más pesada y otra con más repeticiones, o una centrada en sentadilla y otra en bisagra de cadera.'
    ],
    advantages: [
      'Frecuencia 2 para cada grupo muscular con solo cuatro días de entrenamiento.',
      'Buen equilibrio entre volumen por sesión y recuperación.',
      'Fácil de combinar con otras actividades, como deportes o carrera.',
      'Permite alternar énfasis (fuerza / hipertrofia) entre las dos sesiones de cada tipo.'
    ],
    disadvantages: [
      'Las sesiones de tren superior pueden ser largas porque incluyen muchos grupos musculares.',
      'Los brazos y los hombros suelen recibir poco trabajo directo si la sesión se alarga.',
      'Las sesiones de tren inferior pueden ser muy exigentes si se juntan sentadilla y peso muerto.'
    ],
    forWhom: [
      'Puede ser útil para quien dispone de cuatro días por semana y busca equilibrio entre frecuencia, volumen y recuperación. Funciona tanto para personas que empiezan como para personas con experiencia.',
      'Como cualquier método, su resultado depende más de la constancia, el esfuerzo y la progresión que de la estructura en sí.'
    ],
    notIdeal: [
      'Solo puedes entrenar dos días: entonces cada grupo se entrena una vez por semana.',
      'Quieres mucho trabajo de aislamiento para un grupo específico.'
    ],
    variants: [
      {
        id: 'ul4', name: '4 días', description: 'Dos bloques Upper / Lower separados por un día de descanso.',
        schedule: { lun: 'upper', mar: 'lower', jue: 'upper', vie: 'lower' }
      },
      {
        id: 'ul2', name: '2 días', description: 'Una sesión de cada tipo. Opción mínima para semanas con poco tiempo.',
        schedule: { lun: 'upper', jue: 'lower' }
      }
    ],
    recovery: [
      'El descanso de mitad de semana ayuda a llegar fresco al segundo bloque.',
      'Evita poner el ejercicio más pesado de piernas en las dos sesiones Lower.',
      'Si el tren superior se alarga, mueve parte del trabajo de brazos a la segunda sesión.'
    ],
    progression: [
      'Define una sesión “pesada” y otra “de volumen” para cada mitad del cuerpo.',
      'Compara cada sesión con la misma de la semana anterior, no con la otra del mismo tipo.',
      'Añade series poco a poco en los grupos que quieras priorizar.'
    ],
    faq: [
      { q: '¿Puedo hacer Upper / Lower en 3 días?', a: 'Sí, alternando: una semana Upper-Lower-Upper y la siguiente Lower-Upper-Lower. La frecuencia media queda en 1,5 veces por semana.' },
      { q: '¿Dónde van los abdominales?', a: 'Se pueden añadir al final de cualquiera de las sesiones, aunque es común colocarlos en los días de Lower.' }
    ],
    compare: { days: '2–4', frequency: '1–2×', duration: '60–80 min', complexity: 'Baja', bestFor: 'Equilibrio con 4 días' }
  },
  {
    id: 'full-body',
    name: 'Full Body',
    short: 'FB',
    tone: 'full',
    tagline: 'Todo el cuerpo en cada sesión: máxima frecuencia con pocos días.',
    summary: 'Entrena todos los grandes grupos musculares en cada sesión. Ideal para 2–3 días por semana.',
    stats: {
      days: '2–3 días',
      frequency: '2–3 veces por semana',
      duration: '60–75 min',
      level: 'Principiante a avanzado'
    },
    what: [
      'En un Full Body cada sesión incluye ejercicios para todo el cuerpo: pecho, espalda, hombros, piernas y brazos. En lugar de separar músculos por días, se reparte el volumen semanal en varias sesiones completas.',
      'Es una forma muy eficiente de practicar los patrones básicos varias veces por semana, algo especialmente valioso cuando se está aprendiendo la técnica.'
    ],
    how: [
      'Se entrena dos o tres días no consecutivos. Cada sesión incluye uno o dos ejercicios por grupo muscular, normalmente empezando por los compuestos.',
      'Para no repetir siempre lo mismo, es habitual alternar ejercicios entre días: por ejemplo, sentadilla el lunes y peso muerto rumano el miércoles.'
    ],
    advantages: [
      'Cada grupo muscular se entrena 2–3 veces por semana.',
      'Si se pierde una sesión, ningún músculo se queda una semana sin trabajar.',
      'Mucha práctica de los movimientos básicos: útil para aprender técnica.',
      'Necesita pocos días, lo que facilita la constancia.'
    ],
    disadvantages: [
      'El volumen por grupo en cada sesión es limitado si no se quiere alargar demasiado.',
      'Las sesiones pueden volverse largas al crecer el número de ejercicios.',
      'La fatiga de los primeros ejercicios puede afectar a los últimos.'
    ],
    forWhom: [
      'Puede ser útil para personas que empiezan, para quien tiene poco tiempo y para quien prefiere entrenar pocos días con alta frecuencia por músculo.',
      'Las personas avanzadas también lo usan: cuando se ajusta bien el volumen, la frecuencia alta puede ayudar a mantener la calidad de cada serie.'
    ],
    notIdeal: [
      'Quieres sesiones cortas con muchos ejercicios de aislamiento.',
      'Prefieres dedicar sesiones enteras a un grupo muscular concreto.'
    ],
    variants: [
      {
        id: 'fb3', name: '3 días', description: 'Lunes, miércoles y viernes. La versión más común.',
        schedule: { lun: 'fullbody', mie: 'fullbody', vie: 'fullbody' }
      },
      {
        id: 'fb2', name: '2 días', description: 'Dos sesiones bien separadas. Útil para semanas con poco tiempo.',
        schedule: { mar: 'fullbody', vie: 'fullbody' }
      }
    ],
    recovery: [
      'Deja al menos un día de descanso entre sesiones.',
      'No lleves todos los ejercicios al fallo: con frecuencia alta, la fatiga se acumula rápido.',
      'Alterna ejercicios exigentes entre días para repartir la carga sobre la zona lumbar.'
    ],
    progression: [
      'Elige 1 ejercicio por grupo y cámbialo entre días para ganar variedad.',
      'Progresa primero en repeticiones dentro de tu rango y después en carga.',
      'Si te sobra energía al final de la semana, añade una serie al grupo que quieras priorizar.'
    ],
    faq: [
      { q: '¿Full Body es solo para principiantes?', a: 'No. Es muy común al empezar, pero también lo usan personas avanzadas. Con el volumen semanal igualado, las diferencias entre dividir o no dividir el cuerpo suelen ser pequeñas.' },
      { q: '¿Puedo entrenar Full Body 4 días?', a: 'Sí, aunque entonces conviene reducir el volumen de cada sesión para recuperarte entre días.' }
    ],
    compare: { days: '2–3', frequency: '2–3×', duration: '60–75 min', complexity: 'Baja', bestFor: 'Pocos días, alta frecuencia' }
  },
  {
    id: 'bro-split',
    name: 'Bro Split',
    short: 'Bro',
    tone: 'pull',
    tagline: 'Un gran grupo muscular por día, con mucho volumen en cada sesión.',
    summary: 'Dedica cada sesión a uno o dos grupos musculares. Muy popular en gimnasios y en el culturismo.',
    stats: {
      days: '5 días',
      frequency: '1 vez por semana',
      duration: '45–75 min',
      level: 'Intermedio'
    },
    what: [
      'El Bro Split (o rutina dividida por músculos) dedica cada día a un grupo muscular principal: pecho, espalda, hombros, brazos y piernas.',
      'Su nombre viene de la cultura de gimnasio, donde ha sido la estructura más extendida durante décadas.'
    ],
    how: [
      'Cada grupo recibe todo su volumen semanal en una única sesión, con varios ejercicios desde distintos ángulos.',
      'Esto permite sesiones muy enfocadas, aunque cada músculo pasa una semana completa sin estímulo directo.'
    ],
    advantages: [
      'Sesiones simples de planificar y de seguir.',
      'Mucho trabajo y variedad de ejercicios para cada grupo en un solo día.',
      'Las sesiones suelen ser más cortas que las de otros métodos.',
      'Facilita concentrarse en un único grupo muscular.'
    ],
    disadvantages: [
      'Cada grupo muscular se entrena solo una vez por semana.',
      'Concentrar todo el volumen en una sesión puede bajar la calidad de las últimas series.',
      'Si se pierde un día, ese grupo puede pasar dos semanas sin trabajo directo.',
      'Los músculos auxiliares trabajan varios días seguidos (por ejemplo, el tríceps en pecho y en hombros).'
    ],
    forWhom: [
      'Puede ser útil para personas con experiencia que disfrutan de sesiones enfocadas en un solo grupo y pueden entrenar cinco días.',
      'Cuando el volumen semanal es similar, las diferencias entre frecuencias suelen ser pequeñas. Repartirlo en más días puede ayudar a mantener la calidad de las series, pero el Bro Split sigue siendo una opción válida si se ajusta el volumen.'
    ],
    notIdeal: [
      'Tu horario no te garantiza cinco días por semana.',
      'Estás empezando y te beneficia practicar los patrones básicos con más frecuencia.'
    ],
    variants: [
      {
        id: 'bro5', name: '5 días', description: 'Un grupo principal por día y fin de semana libre.',
        schedule: { lun: 'bro-pecho', mar: 'bro-espalda', mie: 'bro-hombros', jue: 'bro-brazos', vie: 'bro-piernas' }
      }
    ],
    recovery: [
      'Evita poner hombros justo después de pecho si notas fatiga en la articulación.',
      'Reparte el volumen en 3–5 ejercicios en lugar de acumular series del mismo ejercicio.',
      'El fin de semana libre ayuda a compensar el volumen alto de cada sesión.'
    ],
    progression: [
      'Empieza por el ejercicio más exigente y termina con aislamiento.',
      'Controla el volumen total: más ejercicios no siempre significa más estímulo útil.',
      'Puedes añadir una segunda sesión corta para los grupos que quieras priorizar.'
    ],
    faq: [
      { q: '¿El Bro Split funciona?', a: 'Sí, se puede progresar con él. La evidencia sugiere que, con el mismo volumen semanal, entrenar un músculo una o dos veces por semana da resultados parecidos, aunque repartirlo suele ayudar a la calidad de las series.' },
      { q: '¿Por qué los brazos tienen su propio día?', a: 'Porque reciben trabajo indirecto en pecho, espalda y hombros, y el día de brazos permite trabajo directo sin fatiga previa del resto de la sesión.' }
    ],
    compare: { days: '5', frequency: '1×', duration: '45–75 min', complexity: 'Baja', bestFor: 'Sesiones enfocadas por músculo' }
  }
];

/* Mensaje que se muestra al terminar cada entrenamiento */
const NUTRITION_NOTE = {
  title: 'Lo más importante es la alimentación',
  text: 'Seguir una rutina por sí sola no hará aparecer resultados de forma mágica. El entrenamiento es la señal; la alimentación aporta la energía y los materiales para adaptarte. Sin comer bien, descansar y ser constante durante semanas y meses, el progreso se frena.',
  points: [
    'Proteína suficiente cada día (como referencia, alrededor de 1,6 g por kg de peso corporal).',
    'Energía acorde a tu objetivo: un ligero superávit para ganar músculo, un déficit moderado para perder grasa.',
    'Dormir bien y mantener la constancia: los resultados llegan con el tiempo.'
  ]
};
