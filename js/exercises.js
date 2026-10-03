/* =====================================================================
   FIT SPLIT · exercises.js
   ---------------------------------------------------------------------
   Base de datos de ejercicios. Cada ejercicio contiene:

   id, name ........... identificador y nombre
   groups ............. grupos musculares donde aparece (ver MUSCLE_GROUPS)
   primary/secondary .. músculos principales y secundarios
   movement ........... tipo de movimiento
   category ........... 'compuesto' (varias articulaciones) o 'aislamiento'
   equipment .......... claves de EQUIPMENT (para filtros)
   equipmentLabel ..... texto legible del equipamiento
   difficulty ......... principiante | intermedio | avanzado
   description ........ resumen del ejercicio
   steps .............. técnica por fases: prep, start, ecc, turn, con, end
   mistakes ........... errores frecuentes
   tips ............... recomendaciones
   goals .............. objetivos para los que encaja bien
   reps ............... (opcional) rangos orientativos propios por objetivo
   tension ............ dónde y cómo se genera la tensión mecánica
   anim ............... preset de animación (ver animations.js), opciones,
                        músculos a resaltar (p = principales, s = secundarios)
                        y fase inicial ('ecc' o 'con')
   ===================================================================== */

const EXERCISES = [
  /* ============================ PECHO ============================ */
  {
    id: 'press-banca',
    name: 'Press de banca',
    groups: ['pecho'],
    primary: ['Pectoral mayor'],
    secondary: ['Tríceps', 'Deltoides anterior'],
    movement: 'Empuje horizontal',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra y banco plano',
    difficulty: 'intermedio',
    description: 'Ejercicio básico de empuje horizontal. Permite usar cargas altas y trabajar el pecho con apoyo de tríceps y hombros.',
    steps: {
      prep: 'Túmbate con los ojos bajo la barra. Apoya los pies firmes en el suelo, junta y baja ligeramente las escápulas y mantén una pequeña curva natural en la zona lumbar.',
      start: 'Agarra la barra algo más abierta que el ancho de los hombros. Sácala del soporte y colócala sobre la línea de los hombros con los brazos extendidos.',
      ecc: 'Baja la barra de forma controlada hacia la parte media o baja del pecho. Los codos forman un ángulo aproximado de 45–70° con el torso.',
      turn: 'Toca el pecho de forma suave, sin rebotar. Mantén la tensión en las escápulas y en las piernas.',
      con: 'Empuja la barra hacia arriba y ligeramente hacia atrás, hacia la línea de los hombros, sin despegar la cadera del banco.',
      end: 'Termina con los brazos extendidos sin bloquear los codos de golpe. Respira y repite.'
    },
    mistakes: [
      'Rebotar la barra en el pecho para ganar impulso.',
      'Despegar la cadera del banco al empujar.',
      'Abrir los codos a 90° del torso durante todo el recorrido.',
      'Perder la posición de las escápulas al final de cada repetición.',
      'Entrenar pesado sin alguien que asista o sin barras de seguridad.'
    ],
    tips: [
      'Usa un compañero o barras de seguridad cuando trabajes cerca del fallo.',
      'Piensa en “doblar la barra” para activar la espalda y estabilizar el hombro.',
      'Mantén las muñecas alineadas sobre los antebrazos.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    tension: {
      where: 'La mayor demanda sobre el pecho aparece en la parte baja del recorrido, cuando la barra está cerca del pecho y el músculo está estirado.',
      cue: 'Controla el descenso y evita el rebote: la tensión debe sostenerla el músculo, no la inercia.'
    },
    anim: { preset: 'bench', opts: { equip: 'barbell' }, p: ['chest'], s: ['triceps', 'frontDelt'] }
  },
  {
    id: 'press-inclinado-mancuernas',
    name: 'Press inclinado con mancuernas',
    groups: ['pecho'],
    primary: ['Pectoral mayor (porción clavicular)'],
    secondary: ['Deltoides anterior', 'Tríceps'],
    movement: 'Empuje inclinado',
    category: 'compuesto',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas y banco inclinado',
    difficulty: 'intermedio',
    description: 'Variante inclinada que da más protagonismo a la parte superior del pecho. Las mancuernas permiten un recorrido amplio y un trabajo más independiente de cada lado.',
    steps: {
      prep: 'Ajusta el banco a unos 30°. Siéntate con las mancuernas apoyadas en los muslos y túmbate llevándolas a la altura del pecho.',
      start: 'Extiende los brazos sobre la parte superior del pecho con las palmas hacia delante o ligeramente enfrentadas.',
      ecc: 'Baja las mancuernas de forma controlada hacia los lados de la parte superior del pecho, con los codos algo por debajo del banco.',
      turn: 'Haz una pausa breve cuando notes el estiramiento del pecho, sin perder la posición de los hombros.',
      con: 'Empuja hacia arriba y ligeramente hacia dentro, sin chocar las mancuernas.',
      end: 'Termina con los brazos extendidos sobre el pecho, manteniendo el control.'
    },
    mistakes: [
      'Inclinar demasiado el banco (más de 45°), lo que desplaza el trabajo hacia los hombros.',
      'Bajar las mancuernas sin control y perder la estabilidad del hombro.',
      'Arquear en exceso la espalda para empujar más peso.',
      'Recortar el recorrido para mover más carga.'
    ],
    tips: [
      'Una inclinación de 15–30° suele ser suficiente para enfatizar la porción superior.',
      'Al terminar la serie, lleva las mancuernas a los muslos antes de incorporarte.',
      'Elige un peso que puedas controlar en la parte baja del recorrido.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    reps: { fuerza: '5–8' },
    tension: {
      where: 'La tensión sobre el pecho es mayor en la parte baja, con el músculo en posición estirada. Arriba, la demanda disminuye.',
      cue: 'Las mancuernas permiten bajar un poco más que la barra: aprovecha ese rango con control.'
    },
    anim: { preset: 'bench', opts: { incline: 30, equip: 'dumbbell' }, p: ['chest'], s: ['frontDelt', 'triceps'] }
  },
  {
    id: 'press-pecho-maquina',
    name: 'Press de pecho en máquina',
    groups: ['pecho'],
    primary: ['Pectoral mayor'],
    secondary: ['Tríceps', 'Deltoides anterior'],
    movement: 'Empuje horizontal',
    category: 'compuesto',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de press de pecho',
    difficulty: 'principiante',
    description: 'Empuje horizontal guiado. La trayectoria fija reduce la demanda de estabilidad, lo que permite concentrarse en el esfuerzo del pecho.',
    steps: {
      prep: 'Ajusta el asiento para que las agarraderas queden a la altura de la parte media del pecho. Apoya la espalda en el respaldo.',
      start: 'Agarra las asas con las muñecas rectas y los codos algo por debajo de la línea de los hombros.',
      con: 'Empuja las asas hacia delante hasta casi extender los codos, manteniendo la espalda apoyada.',
      turn: 'Al final del recorrido, mantén la tensión sin bloquear los codos de golpe.',
      ecc: 'Regresa de forma controlada hasta notar el estiramiento del pecho, sin que el peso choque.',
      end: 'Mantén la posición del pecho y repite con el mismo recorrido.'
    },
    mistakes: [
      'Ajustar mal el asiento y empujar con las asas demasiado altas o bajas.',
      'Despegar la espalda del respaldo.',
      'Dejar que el peso golpee la pila entre repeticiones.',
      'Recortar el recorrido en la fase de regreso.'
    ],
    tips: [
      'Es una buena opción para acercarse al fallo con menos riesgo que un press libre.',
      'Útil después de un press con barra para sumar volumen.',
      'Mantén las escápulas apoyadas en el respaldo.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'La máquina mantiene una resistencia guiada en todo el recorrido. La mayor exigencia para el pecho aparece en la posición más estirada.',
      cue: 'Como no tienes que estabilizar tanto, puedes concentrar el esfuerzo en el músculo y acercarte al fallo con control.'
    },
    anim: { preset: 'seated-push', p: ['chest'], s: ['triceps', 'frontDelt'] }
  },
  {
    id: 'fondos',
    name: 'Fondos en paralelas',
    groups: ['pecho', 'triceps'],
    primary: ['Pectoral mayor (porción inferior)', 'Tríceps'],
    secondary: ['Deltoides anterior'],
    movement: 'Empuje vertical descendente',
    category: 'compuesto',
    equipment: ['peso-corporal'],
    equipmentLabel: 'Barras paralelas (peso corporal)',
    difficulty: 'intermedio',
    description: 'Ejercicio con el propio peso. Inclinar el torso hacia delante da más protagonismo al pecho; mantenerlo vertical enfatiza el tríceps.',
    steps: {
      prep: 'Sujétate en las paralelas con los brazos extendidos y los hombros lejos de las orejas.',
      start: 'Flexiona ligeramente las rodillas y decide la inclinación del torso según el énfasis que busques.',
      ecc: 'Baja de forma controlada flexionando los codos hasta que los hombros queden más o menos a la altura de los codos.',
      turn: 'Haz la transición sin rebote, manteniendo los hombros estables y el pecho abierto.',
      con: 'Empuja las barras hacia abajo para extender los codos y volver arriba.',
      end: 'Termina con los brazos extendidos y los hombros bajos, sin encogerte.'
    },
    mistakes: [
      'Bajar más de lo que permite la movilidad del hombro.',
      'Encoger los hombros hacia las orejas.',
      'Balancear las piernas para impulsarse.',
      'Añadir lastre antes de dominar repeticiones limpias con el propio peso.'
    ],
    tips: [
      'Si aún no puedes hacerlos, usa una máquina asistida o una banda elástica.',
      'Ajusta la profundidad a tu movilidad: el rango debe ser cómodo para el hombro.',
      'Cuando domines el ejercicio, puedes progresar con un cinturón de lastre.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    reps: { fuerza: '4–8', resistencia: 'Máximas repeticiones técnicas' },
    tension: {
      where: 'La tensión es mayor en la parte baja, cuando pecho y tríceps están más estirados y soportan todo el peso corporal.',
      cue: 'La inclinación del torso cambia el músculo que recibe más demanda: decide el énfasis antes de empezar.'
    },
    anim: { preset: 'dip', opts: { lean: 'chest' }, p: ['chest', 'triceps'], s: ['frontDelt'] }
  },
  {
    id: 'aperturas-mancuernas',
    name: 'Aperturas con mancuernas',
    groups: ['pecho'],
    primary: ['Pectoral mayor'],
    secondary: ['Deltoides anterior'],
    movement: 'Aducción horizontal',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas y banco plano',
    difficulty: 'principiante',
    description: 'Aislamiento del pecho mediante un arco amplio de los brazos con los codos ligeramente flexionados.',
    steps: {
      prep: 'Túmbate en un banco plano con una mancuerna en cada mano y los pies firmes en el suelo.',
      start: 'Extiende los brazos sobre el pecho con las palmas enfrentadas y los codos levemente flexionados.',
      ecc: 'Abre los brazos en un arco amplio, manteniendo fija la flexión de los codos, hasta notar un estiramiento cómodo del pecho.',
      turn: 'Detente cuando los brazos queden a la altura del torso o un poco por debajo, sin forzar el hombro.',
      con: 'Cierra el arco llevando las mancuernas de vuelta sobre el pecho, como si abrazaras un barril.',
      end: 'Termina con las mancuernas cerca, sin chocarlas, y mantén la tensión.'
    },
    mistakes: [
      'Flexionar y extender los codos, convirtiendo el ejercicio en un press.',
      'Bajar demasiado y forzar la articulación del hombro.',
      'Usar mancuernas tan pesadas que no se pueda controlar el arco.',
      'Chocar las mancuernas arriba y perder la tensión.'
    ],
    tips: [
      'Usa pesos moderados: la palanca es larga y la demanda en el hombro es alta en la parte baja.',
      'Funciona bien al final de la sesión, después de los ejercicios de press.',
      'El recorrido final arriba aporta poca tensión: puedes terminar un poco antes.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La tensión es máxima con los brazos abiertos, cuando el pecho está estirado y la palanca es más larga. Arriba, la gravedad apenas genera resistencia.',
      cue: 'Más peso no implica más estímulo aquí: controla el estiramiento y deja que el pecho haga el trabajo.'
    },
    anim: { preset: 'fly', p: ['chest'], s: ['frontDelt'] }
  },
  {
    id: 'cruce-poleas',
    name: 'Cruce de poleas',
    groups: ['pecho'],
    primary: ['Pectoral mayor'],
    secondary: ['Deltoides anterior'],
    movement: 'Aducción horizontal',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Polea doble (poleas altas)',
    difficulty: 'principiante',
    description: 'Aislamiento del pecho con poleas. El cable mantiene la resistencia durante todo el recorrido, incluida la fase final.',
    steps: {
      prep: 'Coloca las poleas en posición alta, agarra una asa en cada mano y da un paso adelante con una pierna.',
      start: 'Inclina ligeramente el torso, con los brazos abiertos y los codos algo flexionados.',
      con: 'Lleva las manos hacia abajo y hacia delante en un arco hasta que se encuentren frente a la parte baja del pecho.',
      turn: 'Aprieta el pecho un instante con las manos juntas, sin encoger los hombros.',
      ecc: 'Regresa abriendo los brazos de forma controlada hasta notar el estiramiento del pecho.',
      end: 'Mantén la postura estable y repite sin que el peso toque la pila.'
    },
    mistakes: [
      'Mover el torso hacia delante y atrás para ayudarse.',
      'Doblar demasiado los codos y convertirlo en un press.',
      'Dejar que los hombros se adelanten y se encojan.',
      'Usar demasiada carga y perder el arco del movimiento.'
    ],
    tips: [
      'Cambiar la altura de las poleas cambia el énfasis: altas para la porción inferior, bajas para la superior.',
      'Mantén la flexión de codos constante durante toda la repetición.',
      'Ideal para acercarse al fallo de forma controlada al final de la sesión.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'El cable mantiene una tensión más uniforme que las mancuernas, incluso con las manos juntas, donde las aperturas pierden resistencia.',
      cue: 'Piensa en juntar los codos, no solo las manos.'
    },
    anim: { preset: 'crossover', p: ['chest'], s: ['frontDelt'] }
  },

  {
    id: 'press-banca-mancuernas',
    name: 'Press de banca con mancuernas',
    groups: ['pecho'],
    primary: ['Pectoral mayor'],
    secondary: ['Tríceps', 'Deltoides anterior'],
    movement: 'Empuje horizontal',
    category: 'compuesto',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas y banco plano',
    difficulty: 'intermedio',
    description: 'Press plano con una mancuerna en cada mano. Permite bajar algo más que con barra y que cada lado trabaje por separado, con un estiramiento del pecho mayor en la parte baja.',
    steps: {
      prep: 'Siéntate en el banco con las mancuernas sobre los muslos. Túmbate llevándolas al pecho con ayuda de las rodillas y apoya los pies firmes en el suelo.',
      start: 'Extiende los brazos sobre el pecho con las palmas hacia los pies o ligeramente enfrentadas. Escápulas juntas y hacia abajo.',
      ecc: 'Baja las mancuernas de forma controlada hacia los lados del pecho, con los codos a unos 45–70° del torso.',
      turn: 'Detente cuando notes un buen estiramiento del pecho, sin que los hombros se adelanten.',
      con: 'Empuja hacia arriba y ligeramente hacia dentro siguiendo un arco natural.',
      end: 'Termina con los brazos extendidos sobre el pecho, sin chocar las mancuernas.'
    },
    mistakes: [
      'Dejar caer las mancuernas en la parte baja y rebotar.',
      'Abrir los codos a 90° y adelantar los hombros.',
      'Elegir un peso que no puedes llevar a la posición inicial con seguridad.',
      'Soltar las mancuernas de golpe al terminar la serie.'
    ],
    tips: [
      'Al acabar, lleva las mancuernas al pecho y apóyalas en los muslos al incorporarte.',
      'Es una buena alternativa a la barra si no tienes quien te asista.',
      'Aprovecha el mayor recorrido, pero sin forzar el hombro.'
    ],
    goals: ['hipertrofia', 'fuerza', 'resistencia'],
    reps: { fuerza: '5–8' },
    tension: {
      where: 'La demanda sobre el pecho es máxima en la parte baja, con el músculo estirado. Arriba, las mancuernas apenas generan tensión.',
      cue: 'Controla el estiramiento y empuja desde ahí: no hace falta juntar las mancuernas arriba.'
    },
    anim: { preset: 'bench', opts: { equip: 'dumbbell' }, p: ['chest'], s: ['triceps', 'frontDelt'] }
  },
  {
    id: 'press-inclinado-barra',
    name: 'Press inclinado con barra',
    groups: ['pecho'],
    primary: ['Pectoral mayor (porción clavicular)'],
    secondary: ['Deltoides anterior', 'Tríceps'],
    movement: 'Empuje inclinado',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra y banco inclinado',
    difficulty: 'intermedio',
    description: 'Press con barra en banco inclinado. Da más protagonismo a la parte superior del pecho y permite progresar en carga con facilidad.',
    steps: {
      prep: 'Ajusta el banco a unos 30°. Colócate con los ojos casi debajo de la barra y los pies firmes en el suelo.',
      start: 'Agarra la barra algo más abierta que los hombros, sácala del soporte y colócala sobre la parte alta del pecho.',
      ecc: 'Baja la barra con control hacia la parte alta del pecho, por debajo de las clavículas.',
      turn: 'Toca el pecho de forma suave, sin rebotar, manteniendo las escápulas juntas.',
      con: 'Empuja hacia arriba hasta la línea de los hombros sin despegar la cadera del banco.',
      end: 'Termina con los brazos extendidos y la barra estable antes de la siguiente repetición.'
    },
    mistakes: [
      'Inclinar el banco más de 45°: el ejercicio se convierte en un press de hombro.',
      'Bajar la barra hacia el cuello o hacia el abdomen.',
      'Rebotar en el pecho.',
      'Entrenar cerca del fallo sin barras de seguridad ni asistencia.'
    ],
    tips: [
      'Entre 15° y 30° de inclinación suele ser suficiente.',
      'Usa un compañero o un rack con seguros cuando la serie sea exigente.',
      'Si notas molestias en el hombro, prueba la versión con mancuernas.'
    ],
    goals: ['fuerza', 'hipertrofia'],
    tension: {
      where: 'La porción superior del pecho trabaja más en la parte baja del recorrido, cuando la barra se acerca al pecho.',
      cue: 'Baja con control y mantén el pecho alto: la tensión debe estar en el pectoral, no en el rebote.'
    },
    anim: { preset: 'bench', opts: { incline: 30, equip: 'barbell' }, p: ['chest'], s: ['frontDelt', 'triceps'] }
  },
  {
    id: 'contractor-pecho',
    name: 'Contractor de pecho (pec deck)',
    groups: ['pecho'],
    primary: ['Pectoral mayor'],
    secondary: ['Deltoides anterior'],
    movement: 'Aducción horizontal',
    category: 'aislamiento',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de contractor',
    difficulty: 'principiante',
    description: 'Aislamiento del pecho en máquina. La trayectoria guiada permite acercarse al fallo con seguridad y mantener tensión en la posición estirada.',
    steps: {
      prep: 'Ajusta el asiento para que las asas queden a la altura del pecho y el respaldo apoye toda la espalda.',
      start: 'Agarra las asas con los codos ligeramente flexionados y el pecho alto.',
      con: 'Junta las asas delante del pecho describiendo un arco, sin mover el torso.',
      turn: 'Aprieta el pecho un instante con las manos juntas.',
      ecc: 'Abre los brazos con control hasta notar el estiramiento del pecho.',
      end: 'Mantén la tensión antes de volver a cerrar; no dejes que el peso descanse.'
    },
    mistakes: [
      'Despegar la espalda del respaldo para mover más peso.',
      'Abrir demasiado y forzar el hombro en el estiramiento.',
      'Doblar y estirar los codos durante el movimiento.',
      'Recortar el recorrido en la apertura.'
    ],
    tips: [
      'Es una de las mejores opciones de aislamiento para el pecho porque guía el recorrido.',
      'Úsalo después de los press para sumar volumen con menos fatiga.',
      'Piensa en “abrazar un árbol”: el movimiento sale del hombro, no del codo.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La máquina mantiene resistencia en todo el arco. La mayor exigencia aparece en la apertura, con el pecho estirado.',
      cue: 'La fase de apertura debe ser lenta: ahí está el estímulo más valioso.'
    },
    anim: { preset: 'pec-deck', p: ['chest'], s: ['frontDelt'] }
  },
  {
    id: 'flexiones',
    name: 'Flexiones',
    groups: ['pecho'],
    primary: ['Pectoral mayor'],
    secondary: ['Tríceps', 'Deltoides anterior', 'Abdomen'],
    movement: 'Empuje horizontal',
    category: 'compuesto',
    equipment: ['peso-corporal'],
    equipmentLabel: 'Peso corporal',
    difficulty: 'principiante',
    description: 'Empuje horizontal con el propio cuerpo. No necesita material y se puede progresar elevando los pies, añadiendo pausas o lastre.',
    steps: {
      prep: 'Apoya las manos algo más abiertas que los hombros y los pies juntos o ligeramente separados.',
      start: 'Extiende los brazos y forma una línea recta de la cabeza a los talones, con abdomen y glúteos activos.',
      ecc: 'Baja el cuerpo en bloque, con los codos a unos 45° del torso.',
      turn: 'Llega con el pecho cerca del suelo sin que la cadera se hunda.',
      con: 'Empuja el suelo hasta extender los brazos, manteniendo el cuerpo recto.',
      end: 'Termina arriba con los hombros sobre las manos y repite.'
    },
    mistakes: [
      'Dejar caer la cadera o elevarla demasiado.',
      'Hacer medias repeticiones sin bajar el pecho.',
      'Abrir los codos en cruz.',
      'Adelantar la cabeza hacia el suelo.'
    ],
    tips: [
      'Si aún no puedes hacer buenas repeticiones, apoya las manos en un banco elevado.',
      'Cuando superes con facilidad las 20 repeticiones, añade lastre o eleva los pies.',
      'Útil para el objetivo de resistencia muscular y para entrenar fuera del gimnasio.'
    ],
    goals: ['resistencia', 'hipertrofia'],
    reps: { fuerza: '5–8 con lastre', hipertrofia: '8–20', resistencia: '15–30' },
    tension: {
      where: 'La mayor demanda sobre el pecho aparece abajo, con el pecho cerca del suelo y el músculo estirado.',
      cue: 'Baja despacio y no te quedes a medio camino: la parte baja es la que más cuenta.'
    },
    anim: { preset: 'pushup', p: ['chest'], s: ['triceps', 'frontDelt', 'abs'] }
  },
  {
    id: 'cruce-poleas-bajo',
    name: 'Cruce de poleas de abajo hacia arriba',
    groups: ['pecho'],
    primary: ['Pectoral mayor (porción clavicular)'],
    secondary: ['Deltoides anterior'],
    movement: 'Aducción horizontal ascendente',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Poleas bajas',
    difficulty: 'principiante',
    description: 'Variante del cruce de poleas con el cable desde abajo. El arco ascendente enfatiza la parte superior del pecho.',
    steps: {
      prep: 'Coloca las poleas en la posición más baja y agarra un estribo en cada mano.',
      start: 'Da un paso al frente, con los brazos abajo y algo por detrás del cuerpo y los codos ligeramente flexionados.',
      con: 'Sube las manos en arco hacia delante hasta la altura de la parte alta del pecho.',
      turn: 'Junta las manos un instante sin perder la postura.',
      ecc: 'Baja con control siguiendo el mismo arco hasta notar el estiramiento.',
      end: 'Mantén la tensión del cable antes de la siguiente repetición.'
    },
    mistakes: [
      'Convertir el movimiento en un curl doblando los codos.',
      'Subir las manos por encima de la cabeza.',
      'Encoger los hombros al final.',
      'Usar demasiado peso y perder el arco.'
    ],
    tips: [
      'Buen complemento de un press inclinado.',
      'Mantén el pecho alto durante toda la serie.',
      'Las poleas permiten tensión constante: aprovecha cada parte del recorrido.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'El cable mantiene la tensión en todo el arco; la posición estirada, con las manos abajo y atrás, es la más exigente.',
      cue: 'Controla la bajada y no dejes que el cable te arrastre los brazos hacia atrás.'
    },
    anim: { preset: 'crossover', opts: { low: true }, p: ['chest'], s: ['frontDelt'] }
  },

  /* ============================ ESPALDA ============================ */
  {
    id: 'dominadas',
    name: 'Dominadas',
    groups: ['espalda'],
    primary: ['Dorsal ancho'],
    secondary: ['Bíceps', 'Redondo mayor', 'Romboides', 'Deltoides posterior'],
    movement: 'Jalón vertical',
    category: 'compuesto',
    equipment: ['peso-corporal'],
    equipmentLabel: 'Barra de dominadas (peso corporal)',
    difficulty: 'avanzado',
    description: 'Jalón vertical con el propio peso. Es uno de los ejercicios más completos para la espalda y exige bastante fuerza relativa.',
    steps: {
      prep: 'Agarra la barra con las palmas hacia delante, algo más abierta que el ancho de los hombros.',
      start: 'Cuelga con los brazos extendidos, el abdomen firme y las piernas quietas.',
      con: 'Inicia llevando las escápulas hacia abajo y después tira de los codos hacia los costados hasta acercar el pecho a la barra.',
      turn: 'Llega con la barbilla por encima de la barra sin estirar el cuello.',
      ecc: 'Baja de forma controlada hasta extender por completo los brazos.',
      end: 'Mantén la posición colgada y estable antes de la siguiente repetición.'
    },
    mistakes: [
      'Balancear el cuerpo o patalear para subir.',
      'Recortar el recorrido y no extender los brazos abajo.',
      'Estirar el cuello para llegar con la barbilla.',
      'Dejarse caer en la fase de bajada.'
    ],
    tips: [
      'Si aún no puedes hacerlas, empieza con jalón al pecho, bandas elásticas o máquina asistida.',
      'Las negativas (bajar lento desde arriba) son una buena forma de progresar.',
      'El agarre supino (palmas hacia ti) aumenta la participación del bíceps.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    reps: { fuerza: '3–6 (con lastre si hace falta)', resistencia: 'Máximas repeticiones técnicas' },
    tension: {
      where: 'Con los brazos extendidos el dorsal está estirado y soporta todo el peso corporal. La demanda sigue siendo alta durante la subida.',
      cue: 'Baja hasta la extensión completa: el tramo inferior es donde el dorsal trabaja más estirado.'
    },
    anim: { preset: 'pullup', p: ['lats', 'biceps'], s: ['upperBack', 'rearDelt', 'forearm'] }
  },
  {
    id: 'jalon-pecho',
    name: 'Jalón al pecho',
    groups: ['espalda'],
    primary: ['Dorsal ancho'],
    secondary: ['Bíceps', 'Redondo mayor', 'Romboides'],
    movement: 'Jalón vertical',
    category: 'compuesto',
    equipment: ['polea', 'maquina'],
    equipmentLabel: 'Polea alta con barra',
    difficulty: 'principiante',
    description: 'Jalón vertical en polea. Permite ajustar la carga con precisión, por lo que es una gran alternativa o complemento a las dominadas.',
    steps: {
      prep: 'Ajusta el rodillo para que fije los muslos. Agarra la barra algo más abierta que los hombros.',
      start: 'Siéntate con los brazos extendidos y el torso ligeramente inclinado hacia atrás.',
      con: 'Lleva la barra hacia la parte superior del pecho tirando de los codos hacia abajo y hacia los costados.',
      turn: 'Con la barra cerca del pecho, junta las escápulas un instante.',
      ecc: 'Devuelve la barra hacia arriba de forma controlada hasta estirar completamente los brazos.',
      end: 'Deja que los hombros suban al final para estirar el dorsal, sin perder la postura.'
    },
    mistakes: [
      'Inclinarse muy atrás y convertir el ejercicio en un remo.',
      'Llevar la barra detrás de la nuca.',
      'Tirar con impulso del tronco.',
      'Soltar la barra hacia arriba sin control.'
    ],
    tips: [
      'Piensa en llevar los codos hacia los bolsillos.',
      'El agarre neutro o supino suele ser más cómodo para algunos hombros.',
      'Útil para acercarse al fallo con buena técnica.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'El dorsal está más estirado arriba, con los brazos extendidos. La polea mantiene la resistencia en todo el recorrido.',
      cue: 'No recortes arriba: la fase de estiramiento controlado aporta gran parte del estímulo.'
    },
    anim: { preset: 'pulldown', p: ['lats'], s: ['biceps', 'upperBack', 'rearDelt'] }
  },
  {
    id: 'remo-barra',
    name: 'Remo con barra',
    groups: ['espalda'],
    primary: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
    secondary: ['Bíceps', 'Deltoides posterior', 'Erectores de la columna'],
    movement: 'Jalón horizontal',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra libre',
    difficulty: 'intermedio',
    description: 'Remo con el torso inclinado. Trabaja toda la espalda y exige estabilidad del tronco y de la zona lumbar.',
    steps: {
      prep: 'Con la barra delante, colócate con los pies a la anchura de la cadera. Agarra la barra algo más abierta que los hombros.',
      start: 'Inclina el torso hacia delante desde la cadera (unos 30–45° sobre la horizontal), con las rodillas flexionadas y la espalda neutra.',
      con: 'Lleva la barra hacia la parte baja del abdomen tirando de los codos hacia atrás.',
      turn: 'Junta las escápulas un instante con la barra cerca del cuerpo.',
      ecc: 'Baja la barra de forma controlada hasta extender los brazos, sin cambiar el ángulo del torso.',
      end: 'Mantén la bisagra de cadera y la espalda neutra antes de la siguiente repetición.'
    },
    mistakes: [
      'Redondear la espalda baja.',
      'Levantar el torso en cada repetición para impulsar la barra.',
      'Tirar con los brazos sin mover las escápulas.',
      'Usar tanta carga que la técnica se convierte en un balanceo.'
    ],
    tips: [
      'Si tu zona lumbar se fatiga antes que la espalda, prueba el remo con apoyo en el pecho.',
      'Mantén el cuello alineado con el torso.',
      'Una carga algo menor con recorrido completo suele ser más útil que más peso con balanceo.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    tension: {
      where: 'La espalda alta trabaja más cerca del final, con la barra junto al abdomen. Con los brazos extendidos, el dorsal está estirado.',
      cue: 'Un torso estable permite que la tensión vaya a la espalda y no a la inercia.'
    },
    anim: { preset: 'row-barbell', p: ['lats', 'upperBack'], s: ['biceps', 'rearDelt', 'lowerBack'] }
  },
  {
    id: 'remo-mancuerna',
    name: 'Remo con mancuerna',
    groups: ['espalda'],
    primary: ['Dorsal ancho'],
    secondary: ['Romboides', 'Bíceps', 'Deltoides posterior'],
    movement: 'Jalón horizontal unilateral',
    category: 'compuesto',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuerna y banco plano',
    difficulty: 'principiante',
    description: 'Remo a una mano con apoyo en el banco. El apoyo reduce la carga sobre la zona lumbar y permite un buen recorrido.',
    steps: {
      prep: 'Apoya una rodilla y la mano del mismo lado en el banco. El otro pie queda en el suelo.',
      start: 'Con el torso casi paralelo al suelo, deja la mancuerna colgando con el brazo extendido.',
      con: 'Lleva la mancuerna hacia la cadera tirando del codo hacia atrás y arriba.',
      turn: 'Con el codo por detrás del torso, aprieta la espalda un instante.',
      ecc: 'Baja la mancuerna de forma controlada hasta extender el brazo y notar el estiramiento.',
      end: 'Mantén el torso estable, sin girar, y repite. Cambia de lado al terminar.'
    },
    mistakes: [
      'Girar el torso para subir más el peso.',
      'Llevar la mancuerna hacia el pecho en lugar de hacia la cadera.',
      'Recortar el recorrido abajo.',
      'Encoger el hombro hacia la oreja.'
    ],
    tips: [
      'Imagina que el codo dibuja un arco hacia la cadera.',
      'Empieza por el lado más débil y haz las mismas repeticiones con el otro.',
      'Buen ejercicio para corregir diferencias entre lados.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'El dorsal se estira al final de la bajada y trabaja intensamente al llevar el codo hacia atrás.',
      cue: 'El apoyo te permite concentrarte en el recorrido sin preocuparte por la zona lumbar.'
    },
    anim: { preset: 'row-dumbbell', p: ['lats'], s: ['upperBack', 'biceps', 'rearDelt'] }
  },
  {
    id: 'remo-maquina',
    name: 'Remo en máquina',
    groups: ['espalda'],
    primary: ['Dorsal ancho', 'Romboides', 'Trapecio medio'],
    secondary: ['Bíceps', 'Deltoides posterior'],
    movement: 'Jalón horizontal',
    category: 'compuesto',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de remo con apoyo de pecho',
    difficulty: 'principiante',
    description: 'Remo sentado con apoyo de pecho. Elimina la demanda lumbar y facilita concentrarse en la espalda.',
    steps: {
      prep: 'Ajusta el asiento para que las asas queden a la altura de la parte baja del pecho.',
      start: 'Apoya el pecho en el respaldo y agarra las asas con los brazos extendidos.',
      con: 'Tira de las asas llevando los codos hacia atrás, cerca del cuerpo.',
      turn: 'Junta las escápulas con los codos por detrás del torso.',
      ecc: 'Regresa de forma controlada hasta extender los brazos y dejar que las escápulas se separen.',
      end: 'Mantén el pecho apoyado durante toda la serie.'
    },
    mistakes: [
      'Separar el pecho del apoyo para impulsarse.',
      'Encoger los hombros al tirar.',
      'Mover solo los brazos sin implicar las escápulas.',
      'Dejar que el peso golpee la pila.'
    ],
    tips: [
      'Ideal para llevar series cerca del fallo con bajo riesgo.',
      'Prueba distintos agarres: neutro, prono o supino.',
      'Combínalo con un jalón vertical en la misma sesión.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'La resistencia es guiada y constante. La espalda media trabaja más al final, con los codos detrás del torso.',
      cue: 'Como el tronco está apoyado, todo el esfuerzo puede ir a la espalda.'
    },
    anim: { preset: 'row-seated', p: ['lats', 'upperBack'], s: ['biceps', 'rearDelt'] }
  },
  {
    id: 'pullover-polea',
    name: 'Pullover en polea',
    groups: ['espalda'],
    primary: ['Dorsal ancho'],
    secondary: ['Redondo mayor', 'Tríceps (cabeza larga)'],
    movement: 'Extensión de hombro',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Polea alta con barra recta o cuerda',
    difficulty: 'principiante',
    description: 'Aislamiento del dorsal con los brazos casi extendidos. Trabaja la extensión del hombro sin implicar tanto al bíceps.',
    steps: {
      prep: 'Coloca la polea en posición alta con una barra recta o una cuerda. Da un paso atrás.',
      start: 'Inclina el torso hacia delante desde la cadera, con los brazos extendidos al frente y por encima de la cabeza.',
      con: 'Lleva la barra en un arco hacia los muslos con los codos casi extendidos.',
      turn: 'Junto a los muslos, aprieta los dorsales un instante.',
      ecc: 'Regresa en el mismo arco hasta que los brazos queden por encima de la cabeza y notes el estiramiento.',
      end: 'Mantén el torso fijo durante toda la serie.'
    },
    mistakes: [
      'Doblar los codos y convertirlo en un jalón de tríceps.',
      'Mover el torso para ayudar a bajar la barra.',
      'Recortar el estiramiento arriba.',
      'Usar demasiado peso y perder el arco.'
    ],
    tips: [
      'Útil como ejercicio de preactivación antes de dominadas o jalones.',
      'También funciona al final de la sesión de espalda.',
      'La cuerda permite un recorrido algo mayor.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'El dorsal trabaja más estirado con los brazos por encima de la cabeza y sigue en tensión gracias al cable.',
      cue: 'Brazos largos y codos fijos: el movimiento sale solo del hombro.'
    },
    anim: { preset: 'pullover', p: ['lats'], s: ['triceps', 'upperBack'] }
  },

  {
    id: 'dominadas-supinas',
    name: 'Dominadas supinas (chin-up)',
    groups: ['espalda'],
    primary: ['Dorsal ancho', 'Bíceps'],
    secondary: ['Redondo mayor', 'Trapecio medio e inferior', 'Antebrazo'],
    movement: 'Tirón vertical',
    category: 'compuesto',
    equipment: ['peso-corporal'],
    equipmentLabel: 'Barra de dominadas',
    difficulty: 'intermedio',
    description: 'Dominada con las palmas hacia ti. El bíceps participa más que en la dominada prona, por lo que suele permitir más repeticiones.',
    steps: {
      prep: 'Agarra la barra con las palmas hacia ti, a la anchura de los hombros.',
      start: 'Cuelga con los brazos extendidos, el pecho alto y las piernas quietas.',
      con: 'Lleva los codos hacia abajo y hacia las costillas hasta que la barbilla supere la barra.',
      turn: 'Mantén un instante arriba con el pecho cerca de la barra.',
      ecc: 'Baja con control hasta extender los brazos por completo.',
      end: 'Empieza la siguiente repetición desde el estiramiento, sin balanceo.'
    },
    mistakes: [
      'Balancear las piernas para impulsarse.',
      'No extender los brazos abajo.',
      'Estirar el cuello para pasar la barbilla.',
      'Dejarse caer en la bajada.'
    ],
    tips: [
      'Si aún no completas repeticiones, usa una banda elástica o haz solo la bajada lenta.',
      'Cuando superes 12 repeticiones limpias, añade lastre.',
      'Combínala con un remo para cubrir la espalda media.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    reps: { fuerza: '3–6 con lastre', hipertrofia: '6–12', resistencia: '10–20 con ayuda si hace falta' },
    tension: {
      where: 'El dorsal recibe la mayor exigencia colgado y en la primera parte del tirón, con el músculo estirado.',
      cue: 'Baja hasta el final: la posición colgada forma parte del estímulo.'
    },
    anim: { preset: 'pullup', p: ['lats', 'biceps'], s: ['upperBack', 'forearm'] }
  },
  {
    id: 'jalon-neutro',
    name: 'Jalón con agarre neutro',
    groups: ['espalda'],
    primary: ['Dorsal ancho'],
    secondary: ['Bíceps', 'Braquial', 'Redondo mayor'],
    movement: 'Tirón vertical',
    category: 'compuesto',
    equipment: ['polea'],
    equipmentLabel: 'Polea alta con agarre neutro (en V)',
    difficulty: 'principiante',
    description: 'Jalón con las palmas enfrentadas. Es una posición cómoda para el hombro que permite un recorrido amplio y un buen estiramiento del dorsal.',
    steps: {
      prep: 'Coloca el agarre en V o el agarre neutro ancho y ajusta el rodillo sobre los muslos.',
      start: 'Siéntate con los brazos estirados arriba y el torso ligeramente inclinado hacia atrás.',
      con: 'Tira llevando los codos hacia las caderas hasta que el agarre llegue a la parte alta del pecho.',
      turn: 'Aprieta la espalda un instante sin encoger los hombros.',
      ecc: 'Sube con control hasta estirar los brazos y notar el dorsal estirado.',
      end: 'Mantén el pecho alto y repite sin balancear el torso.'
    },
    mistakes: [
      'Echar el torso muy atrás para ayudarse.',
      'Recortar la subida y perder el estiramiento.',
      'Tirar solo con los brazos.',
      'Encoger los hombros hacia las orejas.'
    ],
    tips: [
      'Excelente alternativa a la dominada si aún no dominas tu peso corporal.',
      'Piensa en llevar los codos a los bolsillos.',
      'Permite ajustar la carga de forma muy precisa.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'La polea mantiene tensión constante. El dorsal trabaja más estirado, con los brazos arriba.',
      cue: 'Deja que la polea suba tus brazos del todo, con control, antes de cada tirón.'
    },
    anim: { preset: 'pulldown', p: ['lats'], s: ['biceps', 'upperBack'] }
  },
  {
    id: 'remo-polea-sentado',
    name: 'Remo sentado en polea',
    groups: ['espalda'],
    primary: ['Dorsal ancho', 'Trapecio medio', 'Romboides'],
    secondary: ['Bíceps', 'Deltoides posterior', 'Erectores'],
    movement: 'Tirón horizontal',
    category: 'compuesto',
    equipment: ['polea'],
    equipmentLabel: 'Polea baja con agarre en V',
    difficulty: 'principiante',
    description: 'Remo horizontal en polea baja. La tensión constante del cable y la posibilidad de estirar hacia delante lo hacen muy completo para la espalda.',
    steps: {
      prep: 'Siéntate con los pies en la plataforma y las rodillas algo flexionadas. Agarra el triángulo.',
      start: 'Brazos extendidos al frente, con la espalda recta y ligeramente inclinada hacia delante.',
      con: 'Tira del agarre hacia el abdomen llevando los codos atrás y el torso vertical.',
      turn: 'Junta las escápulas un instante con el pecho alto.',
      ecc: 'Extiende los brazos con control dejando que los hombros se adelanten un poco para estirar.',
      end: 'Mantén la espalda neutra y repite.'
    },
    mistakes: [
      'Balancear el torso como si fuera un remo de barca.',
      'Redondear la zona lumbar al estirar.',
      'Tirar hacia el pecho con los codos muy abiertos (cambia el objetivo a la parte alta).',
      'No completar la extensión de los brazos.'
    ],
    tips: [
      'Una ligera inclinación del torso es normal; un balanceo grande, no.',
      'Cambiar el agarre (ancho o estrecho) modifica la zona de la espalda que más trabaja.',
      'Útil para acumular volumen de espalda con poca fatiga lumbar.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'El cable mantiene tensión en todo el recorrido; la posición adelantada estira el dorsal y la espalda media.',
      cue: 'Cada repetición empieza con un estiramiento controlado, no con un tirón brusco.'
    },
    anim: { preset: 'row-seated', opts: { cable: true }, p: ['lats', 'upperBack'], s: ['biceps', 'rearDelt', 'lowerBack'] }
  },
  {
    id: 'remo-pecho-apoyado',
    name: 'Remo con pecho apoyado',
    groups: ['espalda'],
    primary: ['Dorsal ancho', 'Trapecio medio', 'Romboides'],
    secondary: ['Bíceps', 'Deltoides posterior'],
    movement: 'Tirón horizontal',
    category: 'compuesto',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas y banco inclinado',
    difficulty: 'principiante',
    description: 'Remo tumbado boca abajo en un banco inclinado. El apoyo del pecho elimina el balanceo y la carga sobre la zona lumbar: toda la exigencia recae en la espalda.',
    steps: {
      prep: 'Ajusta el banco a 30–45° y túmbate boca abajo con el pecho apoyado en la parte alta.',
      start: 'Deja colgar las mancuernas con los brazos estirados y los hombros relajados hacia delante.',
      con: 'Tira de las mancuernas llevando los codos hacia atrás y hacia la cadera.',
      turn: 'Junta las escápulas un instante sin despegar el pecho del banco.',
      ecc: 'Baja con control hasta estirar los brazos y notar el estiramiento de la espalda.',
      end: 'Mantén el pecho apoyado y repite.'
    },
    mistakes: [
      'Despegar el pecho del banco para impulsar el peso.',
      'Encoger los hombros hacia las orejas.',
      'Recortar la bajada.',
      'Girar las muñecas y tirar con los bíceps.'
    ],
    tips: [
      'Muy recomendable si tienes molestias lumbares o vienes de entrenar piernas pesado.',
      'Permite acercarse al fallo con buena técnica.',
      'También existe en máquina (T-bar con apoyo): el principio es el mismo.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'La espalda trabaja en todo el recorrido; el estiramiento abajo y la contracción con los codos atrás son los puntos clave.',
      cue: 'Sin balanceo posible, cada repetición depende solo de tu espalda: controla las dos fases.'
    },
    anim: { preset: 'row-barbell', opts: { support: true }, p: ['lats', 'upperBack'], s: ['biceps', 'rearDelt'] }
  },
  {
    id: 'peso-muerto',
    name: 'Peso muerto convencional',
    groups: ['espalda', 'isquiotibiales', 'gluteos'],
    primary: ['Glúteo mayor', 'Isquiotibiales', 'Erectores de la columna'],
    secondary: ['Cuádriceps', 'Trapecio', 'Dorsal ancho', 'Antebrazo'],
    movement: 'Bisagra de cadera desde el suelo',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra olímpica y discos',
    difficulty: 'avanzado',
    description: 'Levantamiento de la barra desde el suelo. Es uno de los ejercicios con más carga posible y más fatiga general: muy útil para la fuerza, pero exige técnica sólida y una dosis prudente.',
    steps: {
      prep: 'Coloca los pies a la anchura de la cadera con la barra sobre la mitad del pie.',
      start: 'Agarra la barra justo por fuera de las piernas, baja la cadera, pon la espalda neutra y tensa los dorsales.',
      con: 'Empuja el suelo con las piernas y extiende cadera y rodillas a la vez, con la barra pegada al cuerpo.',
      turn: 'Termina de pie con la cadera extendida, sin echar el torso hacia atrás.',
      ecc: 'Baja llevando la cadera atrás y, cuando la barra pase las rodillas, flexiónalas hasta el suelo.',
      end: 'Apoya la barra, recoloca la espalda y repite desde parado.'
    },
    mistakes: [
      'Redondear la zona lumbar al tirar.',
      'Alejar la barra del cuerpo.',
      'Subir la cadera antes que los hombros.',
      'Hiperextender la espalda al final.',
      'Encadenar repeticiones con rebote sobre los discos.'
    ],
    tips: [
      'Es muy exigente para el cuerpo: el entrenador lo limita a un ejercicio exigente por sesión junto a otros pesados.',
      'Si tu objetivo es hipertrofia, el peso muerto rumano suele dar más estímulo por unidad de fatiga.',
      'Pide supervisión cualificada antes de usar cargas altas.'
    ],
    goals: ['fuerza'],
    reps: { fuerza: '2–5', hipertrofia: '5–8', resistencia: 'No recomendado' },
    tension: {
      where: 'La demanda es mayor al despegar la barra del suelo, con la cadera flexionada y los isquiotibiales y glúteos estirados.',
      cue: 'Antes de tirar, elimina la holgura: brazos largos, espalda tensa y la barra pegada a las piernas.'
    },
    anim: { preset: 'deadlift', p: ['glutes', 'hams', 'lowerBack'], s: ['quads', 'upperBack', 'lats', 'forearm'] }
  },

  /* ============================ HOMBROS ============================ */
  {
    id: 'press-militar',
    name: 'Press militar',
    groups: ['hombros'],
    primary: ['Deltoides anterior', 'Deltoides lateral'],
    secondary: ['Tríceps', 'Trapecio superior', 'Core'],
    movement: 'Empuje vertical',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra (de pie)',
    difficulty: 'intermedio',
    description: 'Empuje vertical de pie con barra. Trabaja los hombros y exige estabilidad de todo el cuerpo.',
    steps: {
      prep: 'Coloca la barra a la altura de la clavícula en el soporte. Agárrala algo más abierta que los hombros.',
      start: 'De pie, con los pies a la anchura de la cadera, apoya la barra sobre la parte alta del pecho con los codos ligeramente por delante.',
      con: 'Empuja la barra hacia arriba en línea recta, apartando un poco la cabeza para dejarla pasar.',
      turn: 'Con los brazos extendidos, lleva la cabeza de vuelta “a través de la ventana” bajo la barra.',
      ecc: 'Baja la barra de forma controlada hasta la parte alta del pecho.',
      end: 'Mantén glúteos y abdomen firmes para no arquear la zona lumbar.'
    },
    mistakes: [
      'Arquear la espalda baja para empujar más peso.',
      'Empujar la barra hacia delante en lugar de en vertical.',
      'Usar las piernas para impulsar la barra (eso es un push press).',
      'Bloquear los codos de golpe arriba.'
    ],
    tips: [
      'Aprieta glúteos y abdomen durante toda la repetición.',
      'Si tienes poca movilidad de hombro, la variante sentada con respaldo puede ser más cómoda.',
      'Respira y bloquea el tronco antes de cada repetición.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    tension: {
      where: 'La demanda es mayor en la parte baja y media, cuando la barra pasa frente a la cara y la palanca sobre el hombro es mayor.',
      cue: 'Una trayectoria vertical mantiene la carga sobre los hombros y no sobre la zona lumbar.'
    },
    anim: { preset: 'overhead', opts: { equip: 'barbell' }, p: ['frontDelt', 'sideDelt'], s: ['triceps', 'upperBack'] }
  },
  {
    id: 'press-mancuernas-hombro',
    name: 'Press de hombro con mancuernas',
    groups: ['hombros'],
    primary: ['Deltoides anterior', 'Deltoides lateral'],
    secondary: ['Tríceps', 'Trapecio superior'],
    movement: 'Empuje vertical',
    category: 'compuesto',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas y banco con respaldo',
    difficulty: 'principiante',
    description: 'Empuje vertical sentado con mancuernas. El respaldo aporta estabilidad y las mancuernas permiten una trayectoria natural para cada brazo.',
    steps: {
      prep: 'Ajusta el respaldo casi vertical (80–90°). Siéntate con las mancuernas sobre los muslos.',
      start: 'Lleva las mancuernas a la altura de los hombros, con los codos algo por delante del torso.',
      con: 'Empuja hacia arriba hasta casi extender los brazos, acercando ligeramente las mancuernas.',
      turn: 'Arriba, mantén el control sin chocar las mancuernas.',
      ecc: 'Baja de forma controlada hasta que las mancuernas queden a la altura de las orejas o un poco más abajo.',
      end: 'Mantén la espalda apoyada y el abdomen firme.'
    },
    mistakes: [
      'Separar la espalda del respaldo y arquearse.',
      'Bajar muy poco y recortar el recorrido.',
      'Abrir los codos completamente hacia los lados.',
      'Golpear las mancuernas arriba.'
    ],
    tips: [
      'Gira ligeramente los codos hacia delante (unos 30°) para mayor comodidad del hombro.',
      'Buen ejercicio para empezar con el empuje vertical.',
      'Al terminar, apoya las mancuernas en los muslos antes de soltarlas.'
    ],
    goals: ['hipertrofia', 'fuerza', 'resistencia'],
    reps: { fuerza: '5–8' },
    tension: {
      where: 'La tensión es mayor en la parte baja del recorrido y disminuye al extender los brazos.',
      cue: 'Baja hasta donde tu hombro esté cómodo: ese tramo inferior es el que más trabaja.'
    },
    anim: { preset: 'overhead', opts: { equip: 'dumbbell', seated: true }, p: ['frontDelt', 'sideDelt'], s: ['triceps'] }
  },
  {
    id: 'press-arnold',
    name: 'Press Arnold',
    groups: ['hombros'],
    primary: ['Deltoides anterior', 'Deltoides lateral'],
    secondary: ['Tríceps'],
    movement: 'Empuje vertical con rotación',
    category: 'compuesto',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas y banco con respaldo',
    difficulty: 'intermedio',
    description: 'Variante del press con mancuernas que añade una rotación del brazo. Empieza con las palmas hacia ti y termina con ellas hacia delante.',
    steps: {
      prep: 'Siéntate en un banco con respaldo y sujeta las mancuernas frente a los hombros.',
      start: 'Coloca las palmas mirando hacia ti, con los codos al frente y las mancuernas a la altura de la barbilla.',
      con: 'Mientras empujas hacia arriba, abre los codos hacia los lados y gira las palmas hacia delante.',
      turn: 'Termina con los brazos extendidos y las palmas al frente.',
      ecc: 'Baja invirtiendo el giro hasta volver a la posición inicial, con los codos al frente.',
      end: 'Mantén la espalda apoyada y el movimiento fluido.'
    },
    mistakes: [
      'Hacer el giro y el empuje por separado, en dos movimientos.',
      'Usar demasiado peso y perder el control del giro.',
      'Arquear la espalda al empujar.',
      'Recortar el recorrido abajo.'
    ],
    tips: [
      'Usa algo menos de peso que en el press con mancuernas normal.',
      'Si notas molestias al girar, vuelve al press convencional.',
      'Mantén un ritmo constante, sin tirones.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'El inicio, con los codos al frente, pone más demanda en el deltoides anterior; al abrir los codos participa más el lateral.',
      cue: 'El giro debe ser continuo: piensa en dibujar un semicírculo con los codos.'
    },
    anim: { preset: 'overhead', opts: { equip: 'dumbbell', seated: true, arnold: true }, p: ['frontDelt', 'sideDelt'], s: ['triceps'] }
  },
  {
    id: 'elevaciones-laterales',
    name: 'Elevaciones laterales',
    groups: ['hombros'],
    primary: ['Deltoides lateral'],
    secondary: ['Trapecio superior', 'Deltoides anterior'],
    movement: 'Abducción de hombro',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas',
    difficulty: 'principiante',
    description: 'El ejercicio de aislamiento más usado para el deltoides lateral, la porción que da anchura a los hombros.',
    steps: {
      prep: 'De pie, con una mancuerna en cada mano a los lados del cuerpo y los pies a la anchura de la cadera.',
      start: 'Inclina el torso muy ligeramente hacia delante y flexiona un poco los codos.',
      con: 'Eleva los brazos hacia los lados, guiando con los codos, hasta la altura de los hombros.',
      turn: 'Arriba, mantén un instante sin encoger los hombros.',
      ecc: 'Baja de forma controlada hasta casi tocar los costados, sin relajar del todo.',
      end: 'Mantén la postura sin balanceos y repite.'
    },
    mistakes: [
      'Balancear el cuerpo para subir las mancuernas.',
      'Encoger los hombros hacia las orejas.',
      'Subir las manos por encima de los codos.',
      'Usar demasiado peso y acortar el recorrido.'
    ],
    tips: [
      'Funciona mejor con pesos ligeros y repeticiones moderadas o altas.',
      'Piensa en empujar las mancuernas hacia las paredes laterales, no hacia el techo.',
      'La variante en polea mantiene la tensión al inicio del recorrido.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { hipertrofia: '10–20', resistencia: '15–30' },
    tension: {
      where: 'Con mancuernas, la tensión es mayor cerca de la altura del hombro, donde el brazo queda horizontal. Abajo, la resistencia es casi nula.',
      cue: 'Más peso suele significar más balanceo y menos trabajo del deltoides lateral.'
    },
    anim: { preset: 'lateral-raise', p: ['sideDelt'], s: ['upperBack', 'frontDelt'] }
  },
  {
    id: 'elevaciones-posteriores',
    name: 'Elevaciones posteriores',
    groups: ['hombros', 'deltoides-posteriores'],
    primary: ['Deltoides posterior'],
    secondary: ['Romboides', 'Trapecio medio'],
    movement: 'Abducción horizontal',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas',
    difficulty: 'principiante',
    description: 'Aislamiento del deltoides posterior con el torso inclinado. Equilibra el trabajo de empuje y contribuye a unos hombros más completos.',
    steps: {
      prep: 'De pie, con las rodillas algo flexionadas, inclina el torso hacia delante desde la cadera hasta casi la horizontal.',
      start: 'Deja que las mancuernas cuelguen bajo los hombros con los codos levemente flexionados.',
      con: 'Abre los brazos hacia los lados hasta que queden aproximadamente en línea con el torso.',
      turn: 'Arriba, mantén un instante sin juntar en exceso las escápulas.',
      ecc: 'Baja de forma controlada hasta la posición inicial.',
      end: 'Mantén la espalda neutra y el torso inmóvil.'
    },
    mistakes: [
      'Levantar el torso al subir las mancuernas.',
      'Juntar las escápulas en exceso, desplazando el trabajo a la espalda media.',
      'Usar demasiado peso y balancear.',
      'Redondear la espalda baja.'
    ],
    tips: [
      'Apoya la frente en un banco inclinado si quieres eliminar el balanceo.',
      'Pesos ligeros y repeticiones moderadas o altas suelen funcionar mejor.',
      'Piensa en llevar las manos hacia fuera, no hacia arriba.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { hipertrofia: '10–20', resistencia: '15–30' },
    tension: {
      where: 'La tensión es mayor cuando los brazos se acercan a la línea del torso, donde la palanca frente a la gravedad es más larga.',
      cue: 'Controla la bajada: los deltoides posteriores son pequeños y responden bien a un trabajo preciso.'
    },
    anim: { preset: 'rear-raise', p: ['rearDelt'], s: ['upperBack'] }
  },

  {
    id: 'elevaciones-laterales-polea',
    name: 'Elevaciones laterales en polea',
    groups: ['hombros'],
    primary: ['Deltoides lateral'],
    secondary: ['Trapecio superior', 'Supraespinoso'],
    movement: 'Abducción de hombro',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Polea baja con estribo',
    difficulty: 'principiante',
    description: 'Elevación lateral a un brazo con polea baja. El cable mantiene tensión desde el principio del recorrido, justo donde la mancuerna apenas carga el deltoides.',
    steps: {
      prep: 'Ponte de lado a una polea baja y agarra el estribo con la mano más alejada.',
      start: 'El brazo empieza por delante del cuerpo, cruzado ligeramente, con el codo un poco flexionado.',
      con: 'Eleva el brazo hacia el lado hasta la altura del hombro, guiando con el codo.',
      turn: 'Mantén un instante arriba sin encoger el hombro.',
      ecc: 'Baja con control hasta cruzar ligeramente por delante del cuerpo.',
      end: 'Completa todas las repeticiones y cambia de brazo.'
    },
    mistakes: [
      'Inclinar el torso para ayudar a subir.',
      'Subir la mano por encima del codo.',
      'Encoger el hombro hacia la oreja.',
      'Usar demasiado peso y acortar el recorrido.'
    ],
    tips: [
      'Agárrate al soporte con la otra mano para estabilizarte.',
      'Puedes alternarla con las elevaciones con mancuernas a lo largo de la semana.',
      'El deltoides lateral responde bien a rangos altos de repeticiones.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { fuerza: '8–12', hipertrofia: '10–20', resistencia: '15–25' },
    tension: {
      where: 'El cable carga el deltoides también abajo, en la posición más estirada, donde la mancuerna no genera casi resistencia.',
      cue: 'Empieza cada repetición desde el cruce y sube sin impulso.'
    },
    anim: { preset: 'lateral-raise', opts: { cable: true }, p: ['sideDelt'], s: ['upperBack'] }
  },
  {
    id: 'press-hombro-maquina',
    name: 'Press de hombro en máquina',
    groups: ['hombros'],
    primary: ['Deltoides anterior', 'Deltoides lateral'],
    secondary: ['Tríceps'],
    movement: 'Empuje vertical',
    category: 'compuesto',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de press de hombro',
    difficulty: 'principiante',
    description: 'Empuje vertical guiado. Requiere menos estabilidad que la barra o las mancuernas, lo que permite concentrar el esfuerzo en el hombro y acercarse al fallo con seguridad.',
    steps: {
      prep: 'Ajusta el asiento para que las asas queden a la altura de los hombros.',
      start: 'Apoya la espalda y agarra las asas con las muñecas rectas debajo de los codos.',
      con: 'Empuja hacia arriba hasta casi extender los codos.',
      turn: 'Mantén un instante arriba sin bloquear de golpe.',
      ecc: 'Baja con control hasta la altura de las orejas o algo más abajo.',
      end: 'Repite sin que el peso descanse en la pila.'
    },
    mistakes: [
      'Despegar la espalda del respaldo.',
      'Asiento demasiado alto: el recorrido se queda corto.',
      'Bloquear los codos con un golpe arriba.',
      'Dejar caer el peso.'
    ],
    tips: [
      'Buena opción para principiantes o como segundo empuje vertical.',
      'Mantén el pecho alto y los abdominales activos.',
      'Permite progresar con incrementos pequeños.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'La mayor exigencia aparece en la parte baja, con las asas a la altura de los hombros.',
      cue: 'Baja hasta abajo con control: es la parte del recorrido que más estimula.'
    },
    anim: { preset: 'overhead', opts: { seated: true, machine: true }, p: ['frontDelt', 'sideDelt'], s: ['triceps'] }
  },
  {
    id: 'elevaciones-frontales',
    name: 'Elevaciones frontales',
    groups: ['hombros'],
    primary: ['Deltoides anterior'],
    secondary: ['Pectoral (porción clavicular)'],
    movement: 'Flexión de hombro',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas',
    difficulty: 'principiante',
    description: 'Aislamiento del deltoides anterior. Ojo: este músculo ya trabaja mucho en todos los press, así que en la mayoría de rutinas es un ejercicio prescindible.',
    steps: {
      prep: 'De pie, con una mancuerna en cada mano delante de los muslos.',
      start: 'Brazos casi extendidos, abdomen firme y hombros abajo.',
      con: 'Eleva un brazo (o ambos) al frente hasta la altura de los hombros.',
      turn: 'Mantén un instante sin balancear el torso.',
      ecc: 'Baja con control hasta los muslos.',
      end: 'Repite alternando o con ambos brazos.'
    },
    mistakes: [
      'Balancear el cuerpo para subir el peso.',
      'Subir por encima de la cabeza sin necesidad.',
      'Arquear la espalda.',
      'Añadirlo a una rutina que ya tiene mucho press.'
    ],
    tips: [
      'El entrenador lo recomienda solo si no haces press de hombro ni de banca.',
      'Mejor invertir esas series en el deltoides lateral o el posterior.',
      'Cargas ligeras y técnica estricta.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La mayor resistencia aparece cerca de la horizontal, cuando el brazo está paralelo al suelo.',
      cue: 'Sube sin impulso y no pases de la altura de los hombros.'
    },
    anim: { preset: 'front-raise', p: ['frontDelt'], s: ['chest'] }
  },

  /* ======================= DELTOIDES POSTERIORES ======================= */
  {
    id: 'face-pull',
    name: 'Face pull',
    groups: ['deltoides-posteriores'],
    primary: ['Deltoides posterior'],
    secondary: ['Trapecio medio', 'Romboides', 'Manguito rotador'],
    movement: 'Jalón horizontal alto con rotación externa',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Polea a la altura de la cara con cuerda',
    difficulty: 'principiante',
    description: 'Jalón con cuerda hacia la cara. Trabaja el deltoides posterior y los rotadores externos del hombro.',
    steps: {
      prep: 'Coloca la polea a la altura de la cara con una cuerda. Agarra los extremos con las palmas enfrentadas.',
      start: 'Da un paso atrás con los brazos extendidos al frente y el cuerpo estable.',
      con: 'Tira de la cuerda hacia la cara separando los extremos y llevando los codos hacia fuera y arriba.',
      turn: 'Termina con las manos junto a las orejas y los codos a la altura de los hombros.',
      ecc: 'Regresa de forma controlada hasta extender los brazos.',
      end: 'Mantén el torso quieto y repite.'
    },
    mistakes: [
      'Inclinarse hacia atrás para tirar con el peso del cuerpo.',
      'Bajar los codos y convertirlo en un remo.',
      'Usar demasiado peso y perder la rotación externa.',
      'Encoger los hombros.'
    ],
    tips: [
      'Piensa en “hacer un doble bíceps” al final del movimiento.',
      'Funciona bien como ejercicio de calentamiento o al final de las sesiones de empuje y de jalón.',
      'Prioriza el control sobre la carga.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { hipertrofia: '12–20', resistencia: '15–30' },
    tension: {
      where: 'La tensión es mayor al final, con las manos junto a la cara y los hombros en rotación externa.',
      cue: 'Una pausa breve al final ayuda a sentir el trabajo del deltoides posterior.'
    },
    anim: { preset: 'face-pull', p: ['rearDelt'], s: ['upperBack'] }
  },
  {
    id: 'pajaro-maquina',
    name: 'Pájaro en máquina',
    groups: ['deltoides-posteriores'],
    primary: ['Deltoides posterior'],
    secondary: ['Romboides', 'Trapecio medio'],
    movement: 'Abducción horizontal',
    category: 'aislamiento',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de aperturas (contractor) en sentido inverso',
    difficulty: 'principiante',
    description: 'Aperturas inversas en máquina. La trayectoria guiada permite concentrarse en el deltoides posterior.',
    steps: {
      prep: 'Siéntate mirando hacia la máquina con el pecho apoyado. Ajusta las asas a la altura de los hombros.',
      start: 'Agarra las asas con los brazos extendidos al frente y los codos levemente flexionados.',
      con: 'Abre los brazos hacia atrás en un arco hasta que queden en línea con el torso.',
      turn: 'Mantén un instante sin juntar en exceso las escápulas.',
      ecc: 'Regresa de forma controlada hasta que las asas vuelvan al frente.',
      end: 'Mantén el pecho apoyado durante toda la serie.'
    },
    mistakes: [
      'Separar el pecho del respaldo.',
      'Doblar los codos durante el movimiento.',
      'Juntar mucho las escápulas, desplazando el trabajo a la espalda media.',
      'Dejar que el peso golpee la pila.'
    ],
    tips: [
      'Un agarre neutro o prono funciona bien; prueba cuál te resulta más cómodo.',
      'Ideal para acercarse al fallo con control.',
      'Las repeticiones moderadas o altas suelen funcionar bien en este músculo.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { hipertrofia: '10–20', resistencia: '15–30' },
    tension: {
      where: 'La máquina mantiene la resistencia en todo el arco, también al inicio, donde las mancuernas apenas generan tensión.',
      cue: 'Piensa en llevar las manos lejos, hacia las paredes laterales.'
    },
    anim: { preset: 'reverse-fly', p: ['rearDelt'], s: ['upperBack'] }
  },

  {
    id: 'pajaro-polea',
    name: 'Pájaro en polea (cruce invertido)',
    groups: ['deltoides-posteriores'],
    primary: ['Deltoides posterior'],
    secondary: ['Romboides', 'Trapecio medio'],
    movement: 'Abducción horizontal',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Dos poleas a la altura de los hombros',
    difficulty: 'intermedio',
    description: 'Apertura posterior con dos poleas cruzadas. El cable mantiene la tensión en todo el arco, también cuando los brazos están cruzados delante (posición estirada).',
    steps: {
      prep: 'Coloca las poleas a la altura de los hombros. Agarra el cable izquierdo con la mano derecha y viceversa.',
      start: 'Brazos cruzados al frente, con los codos casi extendidos.',
      con: 'Abre los brazos hacia atrás en arco, hasta que queden en línea con el torso.',
      turn: 'Mantén un instante sin juntar las escápulas en exceso.',
      ecc: 'Vuelve con control hasta cruzar los brazos.',
      end: 'Mantén la tensión y repite.'
    },
    mistakes: [
      'Convertirlo en un remo flexionando los codos.',
      'Echar el torso hacia atrás.',
      'Encoger los hombros.',
      'Usar demasiado peso.'
    ],
    tips: [
      'Piensa en llevar las manos lejos, hacia las paredes.',
      'El deltoides posterior responde bien a repeticiones altas.',
      'Si no tienes dos poleas, usa la máquina de pájaro.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { fuerza: '8–12', hipertrofia: '10–20', resistencia: '15–25' },
    tension: {
      where: 'Con los brazos cruzados el deltoides posterior está estirado y el cable ya lo carga.',
      cue: 'No te saltes el cruce: es la parte del recorrido que la mancuerna no cubre.'
    },
    anim: { preset: 'reverse-fly', opts: { cable: true }, p: ['rearDelt'], s: ['upperBack'] }
  },
  {
    id: 'elevacion-posterior-inclinado',
    name: 'Elevaciones posteriores en banco inclinado',
    groups: ['deltoides-posteriores'],
    primary: ['Deltoides posterior'],
    secondary: ['Trapecio medio', 'Romboides'],
    movement: 'Abducción horizontal',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas y banco inclinado',
    difficulty: 'principiante',
    description: 'Elevaciones posteriores tumbado boca abajo en un banco inclinado. El apoyo del pecho evita el balanceo y la carga lumbar.',
    steps: {
      prep: 'Ajusta el banco a unos 30° y túmbate boca abajo con una mancuerna en cada mano.',
      start: 'Deja colgar los brazos con los codos ligeramente flexionados.',
      con: 'Abre los brazos hacia los lados hasta la línea de los hombros.',
      turn: 'Mantén un instante arriba.',
      ecc: 'Baja con control hasta colgar los brazos.',
      end: 'Repite sin despegar el pecho del banco.'
    },
    mistakes: [
      'Despegar el pecho para impulsar.',
      'Juntar las escápulas en exceso (pasa el trabajo a la espalda media).',
      'Flexionar mucho los codos.',
      'Pesos demasiado altos.'
    ],
    tips: [
      'Una alternativa sencilla si no hay poleas ni máquina.',
      'Mueve el brazo como un ala, sin tirar hacia atrás.',
      'Pesos ligeros y control.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { fuerza: '8–12', hipertrofia: '10–20', resistencia: '15–25' },
    tension: {
      where: 'La tensión es máxima con los brazos cerca de la horizontal.',
      cue: 'Haz una pausa breve arriba y baja despacio.'
    },
    anim: { preset: 'rear-raise', opts: { bench: true }, p: ['rearDelt'], s: ['upperBack'] }
  },

  /* ============================ BÍCEPS ============================ */
  {
    id: 'curl-barra',
    name: 'Curl con barra',
    groups: ['biceps'],
    primary: ['Bíceps braquial'],
    secondary: ['Braquial', 'Braquiorradial'],
    movement: 'Flexión de codo',
    category: 'aislamiento',
    equipment: ['barra'],
    equipmentLabel: 'Barra recta o EZ',
    difficulty: 'principiante',
    description: 'El curl clásico. Permite usar más carga que otras variantes y trabajar ambos brazos a la vez.',
    steps: {
      prep: 'De pie, agarra la barra con las palmas hacia delante a la anchura de los hombros.',
      start: 'Con los brazos extendidos y los codos pegados a los costados, mantén el torso erguido.',
      con: 'Flexiona los codos y lleva la barra hacia los hombros sin mover los codos hacia delante.',
      turn: 'Arriba, aprieta el bíceps un instante.',
      ecc: 'Baja la barra de forma controlada hasta extender por completo los codos.',
      end: 'Mantén el cuerpo quieto y repite sin impulso.'
    },
    mistakes: [
      'Balancear el torso para subir la barra.',
      'Adelantar los codos al final del recorrido.',
      'No extender del todo los brazos abajo.',
      'Dejar caer la barra en la bajada.'
    ],
    tips: [
      'La barra EZ puede ser más cómoda para las muñecas.',
      'Controla la bajada al menos 2 segundos.',
      'Si necesitas balancearte, reduce la carga.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'Con peso libre, la tensión es máxima cuando el antebrazo está horizontal, a mitad del recorrido.',
      cue: 'Mantén los codos fijos: si se mueven, parte del trabajo pasa al hombro.'
    },
    anim: { preset: 'curl', opts: { equip: 'barbell' }, p: ['biceps'], s: ['forearm'] }
  },
  {
    id: 'curl-mancuernas',
    name: 'Curl con mancuernas',
    groups: ['biceps'],
    primary: ['Bíceps braquial'],
    secondary: ['Braquial', 'Braquiorradial'],
    movement: 'Flexión de codo con supinación',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas',
    difficulty: 'principiante',
    description: 'Curl con mancuernas, alternado o simultáneo. Permite girar la muñeca durante la subida para implicar más al bíceps.',
    steps: {
      prep: 'De pie, con una mancuerna en cada mano y los brazos a los lados.',
      start: 'Empieza con las palmas mirando hacia el cuerpo y los codos junto a los costados.',
      con: 'Flexiona el codo y gira la palma hacia arriba mientras subes la mancuerna.',
      turn: 'Arriba, con la palma hacia ti, aprieta el bíceps.',
      ecc: 'Baja de forma controlada, girando la muñeca de vuelta a la posición inicial.',
      end: 'Alterna brazos o repite con ambos a la vez.'
    },
    mistakes: [
      'Balancear el torso o el hombro.',
      'Mover los codos hacia delante.',
      'Bajar demasiado rápido.',
      'Recortar el recorrido abajo.'
    ],
    tips: [
      'Hacerlo alternado permite concentrarse en cada brazo.',
      'Útil para equilibrar diferencias entre brazos.',
      'Prueba un tempo controlado en la bajada.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La tensión es mayor a mitad del recorrido, con el antebrazo horizontal.',
      cue: 'La supinación (girar la palma hacia arriba) es una de las funciones del bíceps: aprovéchala.'
    },
    anim: { preset: 'curl', opts: { equip: 'dumbbell' }, p: ['biceps'], s: ['forearm'] }
  },
  {
    id: 'curl-inclinado',
    name: 'Curl inclinado',
    groups: ['biceps'],
    primary: ['Bíceps braquial (cabeza larga)'],
    secondary: ['Braquial'],
    movement: 'Flexión de codo con hombro extendido',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas y banco inclinado',
    difficulty: 'intermedio',
    description: 'Curl sentado en un banco inclinado. Los brazos quedan por detrás del torso, lo que estira más el bíceps al inicio del movimiento.',
    steps: {
      prep: 'Ajusta el banco a unos 45–60° y siéntate con una mancuerna en cada mano.',
      start: 'Deja los brazos colgando verticales, por detrás del torso, con las palmas hacia delante.',
      con: 'Flexiona los codos y sube las mancuernas sin adelantar los brazos.',
      turn: 'Arriba, aprieta el bíceps sin despegar la espalda.',
      ecc: 'Baja lentamente hasta extender del todo los brazos y notar el estiramiento.',
      end: 'Mantén la cabeza y la espalda apoyadas.'
    },
    mistakes: [
      'Adelantar los codos al subir.',
      'Despegar la espalda del banco.',
      'Usar demasiado peso para esta posición.',
      'No extender del todo los brazos.'
    ],
    tips: [
      'Usa menos peso que en el curl de pie.',
      'Si notas molestias en el hombro, sube un poco el respaldo.',
      'Complementa bien a un curl con barra en la misma sesión.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'Con el hombro extendido, el bíceps empieza el movimiento más estirado. La tensión sigue siendo mayor con el antebrazo horizontal.',
      cue: 'Aprovecha el estiramiento inicial bajando con control.'
    },
    anim: { preset: 'curl', opts: { equip: 'dumbbell', incline: true }, p: ['biceps'], s: ['forearm'] }
  },
  {
    id: 'curl-martillo',
    name: 'Curl martillo',
    groups: ['biceps'],
    primary: ['Braquial', 'Braquiorradial'],
    secondary: ['Bíceps braquial'],
    movement: 'Flexión de codo con agarre neutro',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas',
    difficulty: 'principiante',
    description: 'Curl con las palmas enfrentadas. Da más protagonismo al braquial y al braquiorradial, que aportan grosor al brazo y al antebrazo.',
    steps: {
      prep: 'De pie, con una mancuerna en cada mano y las palmas enfrentadas.',
      start: 'Brazos extendidos, codos junto a los costados y muñecas neutras.',
      con: 'Flexiona los codos y sube las mancuernas manteniendo el agarre neutro.',
      turn: 'Arriba, con los pulgares cerca de los hombros, aprieta un instante.',
      ecc: 'Baja de forma controlada hasta extender del todo.',
      end: 'Repite sin balanceos.'
    },
    mistakes: [
      'Girar las muñecas durante el movimiento.',
      'Balancear el torso.',
      'Mover los codos hacia delante.',
      'Soltar el peso en la bajada.'
    ],
    tips: [
      'Suele permitir algo más de carga que el curl con supinación.',
      'Buena opción si el curl con barra molesta en las muñecas.',
      'Puedes hacerlo cruzando la mancuerna hacia el pecho.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'La tensión es mayor con el antebrazo horizontal. El agarre neutro desplaza parte del trabajo hacia el braquial y el antebrazo.',
      cue: 'Agarre firme y muñeca neutra durante todo el recorrido.'
    },
    anim: { preset: 'curl', opts: { equip: 'hammer' }, p: ['biceps', 'forearm'], s: [] }
  },
  {
    id: 'curl-polea',
    name: 'Curl en polea',
    groups: ['biceps'],
    primary: ['Bíceps braquial'],
    secondary: ['Braquial', 'Braquiorradial'],
    movement: 'Flexión de codo',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Polea baja con barra o cuerda',
    difficulty: 'principiante',
    description: 'Curl con cable. La polea mantiene la resistencia en todo el recorrido, también al principio y al final.',
    steps: {
      prep: 'Coloca la polea en posición baja con una barra recta o EZ. Agárrala con las palmas hacia arriba.',
      start: 'Da un pequeño paso atrás, con los brazos extendidos y los codos junto a los costados.',
      con: 'Flexiona los codos y lleva la barra hacia los hombros.',
      turn: 'Arriba, aprieta el bíceps manteniendo los codos fijos.',
      ecc: 'Baja de forma controlada hasta extender los brazos sin que el peso toque la pila.',
      end: 'Mantén la postura estable y repite.'
    },
    mistakes: [
      'Inclinarse hacia atrás para ayudarse.',
      'Adelantar los codos al final.',
      'Dejar que el peso descanse en la pila entre repeticiones.',
      'Usar impulso.'
    ],
    tips: [
      'Excelente para series cercanas al fallo y para técnicas como las series descendentes.',
      'La cuerda permite un agarre neutro, similar al curl martillo.',
      'Puedes hacerlo a una mano para concentrarte en cada brazo.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'El cable reparte la resistencia de forma más uniforme que las mancuernas, con tensión también cerca de la extensión completa.',
      cue: 'Mantén el cable en tensión durante toda la serie.'
    },
    anim: { preset: 'curl', opts: { equip: 'cable' }, p: ['biceps'], s: ['forearm'] }
  },

  {
    id: 'curl-predicador',
    name: 'Curl en banco Scott (predicador)',
    groups: ['biceps'],
    primary: ['Bíceps braquial', 'Braquial'],
    secondary: ['Braquiorradial'],
    movement: 'Flexión de codo',
    category: 'aislamiento',
    equipment: ['barra', 'maquina'],
    equipmentLabel: 'Banco Scott con barra Z o máquina',
    difficulty: 'principiante',
    description: 'Curl con el brazo apoyado en un banco inclinado. El apoyo elimina el balanceo y la máxima exigencia aparece con el codo extendido, donde el bíceps está más estirado.',
    steps: {
      prep: 'Ajusta el asiento para que la axila quede cerca del borde superior del banco.',
      start: 'Apoya la parte posterior de los brazos y agarra la barra con los codos casi extendidos.',
      con: 'Flexiona los codos y sube la barra sin despegar los brazos del apoyo.',
      turn: 'Aprieta un instante arriba sin llevar la barra hasta los hombros.',
      ecc: 'Baja lento hasta casi extender los codos.',
      end: 'Empieza la siguiente repetición desde abajo, sin rebote.'
    },
    mistakes: [
      'Dejar caer la barra abajo y rebotar con el codo bloqueado.',
      'Despegar los brazos del banco.',
      'Recortar la parte baja (la más valiosa).',
      'Levantar los hombros para subir el peso.'
    ],
    tips: [
      'La investigación encuentra un estímulo notable en la parte baja de este curl: no la recortes.',
      'Usa un peso que puedas controlar con el brazo estirado.',
      'La barra Z suele ser más cómoda para las muñecas.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La resistencia es máxima con el codo casi extendido, cuando el bíceps está estirado.',
      cue: 'La bajada es lenta y llega hasta abajo; arriba la tensión casi desaparece.'
    },
    anim: { preset: 'curl', opts: { preacher: true }, p: ['biceps'], s: ['forearm'] }
  },
  {
    id: 'curl-bayesiano',
    name: 'Curl bayesiano en polea',
    groups: ['biceps'],
    primary: ['Bíceps braquial (cabeza larga)'],
    secondary: ['Braquial', 'Antebrazo'],
    movement: 'Flexión de codo con hombro en extensión',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Polea baja con estribo',
    difficulty: 'intermedio',
    description: 'Curl a un brazo de espaldas a la polea, con el brazo por detrás del cuerpo. El hombro en extensión estira la cabeza larga del bíceps y el cable la carga justo ahí.',
    steps: {
      prep: 'Coloca la polea baja o media, ponte de espaldas y agarra el estribo. Da un paso al frente.',
      start: 'Deja que el brazo quede por detrás del torso, con el codo extendido.',
      con: 'Flexiona el codo sin adelantar el brazo.',
      turn: 'Aprieta el bíceps con la mano cerca del hombro.',
      ecc: 'Extiende el codo lentamente hasta notar el estiramiento.',
      end: 'Completa las repeticiones y cambia de brazo.'
    },
    mistakes: [
      'Adelantar el codo al subir.',
      'Inclinar el torso hacia delante para compensar.',
      'Peso excesivo que impide estirar el brazo.',
      'Bajar de golpe.'
    ],
    tips: [
      'Una de las mejores variantes para trabajar el bíceps en posición estirada.',
      'El codo se queda quieto atrás durante todo el movimiento.',
      'Combínalo con un curl con barra para cubrir todo el recorrido.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'El cable carga el bíceps al máximo con el brazo estirado por detrás del cuerpo, su posición más larga.',
      cue: 'Deja que el cable estire el brazo atrás antes de cada repetición.'
    },
    anim: { preset: 'curl', opts: { bayesian: true }, p: ['biceps'], s: ['forearm'] }
  },
  {
    id: 'curl-concentrado',
    name: 'Curl concentrado',
    groups: ['biceps'],
    primary: ['Bíceps braquial'],
    secondary: ['Braquial'],
    movement: 'Flexión de codo',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuerna y banco',
    difficulty: 'principiante',
    description: 'Curl sentado con el codo apoyado en el interior del muslo. Fácil de aprender y muy estricto, pero el estiramiento del bíceps es menor que en el curl inclinado o el bayesiano.',
    steps: {
      prep: 'Siéntate en un banco con las piernas separadas y una mancuerna en una mano.',
      start: 'Apoya la parte posterior del brazo en el interior del muslo, con el codo extendido.',
      con: 'Flexiona el codo y sube la mancuerna hacia el hombro.',
      turn: 'Aprieta un instante arriba.',
      ecc: 'Baja con control hasta extender el brazo.',
      end: 'Completa la serie y cambia de brazo.'
    },
    mistakes: [
      'Mover el hombro para subir.',
      'Recortar la extensión abajo.',
      'Girar el torso para ayudarse.',
      'Usar demasiado peso.'
    ],
    tips: [
      'Útil como último ejercicio de bíceps del día.',
      'Gira ligeramente la palma hacia fuera al subir.',
      'Mira el músculo: ayuda a mantener la técnica estricta.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La resistencia es mayor con el antebrazo horizontal, a mitad del recorrido.',
      cue: 'Sube y baja sin pausas largas arriba.'
    },
    anim: { preset: 'curl', opts: { concentration: true }, p: ['biceps'], s: ['forearm'] }
  },

  /* ============================ TRÍCEPS ============================ */
  {
    id: 'extension-triceps-polea',
    name: 'Extensión de tríceps en polea',
    groups: ['triceps'],
    primary: ['Tríceps (cabezas lateral y medial)'],
    secondary: ['Ancóneo'],
    movement: 'Extensión de codo',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Polea alta con cuerda o barra',
    difficulty: 'principiante',
    description: 'El aislamiento de tríceps más popular. Los codos quedan fijos junto al cuerpo y solo se mueve el antebrazo.',
    steps: {
      prep: 'Coloca la polea en posición alta con una cuerda o barra. Agárrala y acércate a la máquina.',
      start: 'Pega los codos a los costados, con los antebrazos algo por encima de la horizontal.',
      con: 'Extiende los codos empujando hacia abajo hasta tener los brazos rectos.',
      turn: 'Abajo, aprieta el tríceps un instante. Con cuerda, separa ligeramente los extremos.',
      ecc: 'Sube de forma controlada sin que los codos se muevan.',
      end: 'Detente cuando los antebrazos queden un poco por encima de la horizontal y repite.'
    },
    mistakes: [
      'Mover los codos hacia delante y atrás.',
      'Inclinar el cuerpo sobre la polea para empujar con el peso corporal.',
      'Subir demasiado y perder la posición de los codos.',
      'Usar impulso.'
    ],
    tips: [
      'La cuerda permite un final algo más amplio que la barra.',
      'Mantén las muñecas rectas.',
      'Útil para acumular volumen sin estrés articular elevado.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'El cable mantiene tensión en todo el recorrido. Con los codos junto al cuerpo, la cabeza larga trabaja menos estirada que en las extensiones por encima de la cabeza.',
      cue: 'Codos fijos: solo se mueve el antebrazo.'
    },
    anim: { preset: 'pushdown', p: ['triceps'], s: ['forearm'] }
  },
  {
    id: 'press-frances',
    name: 'Press francés',
    groups: ['triceps'],
    primary: ['Tríceps (todas las cabezas)'],
    secondary: ['Ancóneo'],
    movement: 'Extensión de codo',
    category: 'aislamiento',
    equipment: ['barra'],
    equipmentLabel: 'Barra EZ y banco plano',
    difficulty: 'intermedio',
    description: 'Extensión de tríceps tumbado con barra. Trabaja las tres cabezas del tríceps con los brazos en flexión.',
    steps: {
      prep: 'Túmbate en un banco plano con una barra EZ y los pies firmes en el suelo.',
      start: 'Sostén la barra sobre la frente con los brazos extendidos y ligeramente inclinados hacia la cabeza.',
      ecc: 'Flexiona los codos y baja la barra de forma controlada hacia la frente o justo detrás de la cabeza.',
      turn: 'Al notar el estiramiento del tríceps, detente sin abrir los codos.',
      con: 'Extiende los codos para volver a la posición inicial sin mover los brazos.',
      end: 'Mantén los brazos inclinados hacia la cabeza para conservar la tensión.'
    },
    mistakes: [
      'Abrir los codos hacia los lados.',
      'Mover los brazos y convertirlo en un press.',
      'Bajar sin control hacia la cara.',
      'Usar demasiado peso para la articulación del codo.'
    ],
    tips: [
      'La barra EZ suele ser más cómoda para muñecas y codos.',
      'Bajar detrás de la cabeza aumenta el estiramiento del tríceps.',
      'Si te molestan los codos, prueba con mancuernas o polea.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La tensión es mayor en la parte baja, con el codo flexionado y el tríceps estirado.',
      cue: 'Controla la bajada y mantén los codos apuntando al techo.'
    },
    anim: { preset: 'skullcrusher', p: ['triceps'], s: [] }
  },
  {
    id: 'extension-sobre-cabeza',
    name: 'Extensión por encima de la cabeza',
    groups: ['triceps'],
    primary: ['Tríceps (cabeza larga)'],
    secondary: ['Cabezas lateral y medial'],
    movement: 'Extensión de codo con hombro flexionado',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuerna (sentado con respaldo)',
    difficulty: 'principiante',
    description: 'Extensión con los brazos por encima de la cabeza. Coloca la cabeza larga del tríceps en una posición muy estirada.',
    steps: {
      prep: 'Siéntate en un banco con respaldo y sujeta una mancuerna con ambas manos por el disco superior.',
      start: 'Eleva la mancuerna por encima de la cabeza con los brazos extendidos.',
      ecc: 'Flexiona los codos y baja la mancuerna por detrás de la cabeza, con los codos apuntando hacia arriba.',
      turn: 'Al notar un estiramiento profundo del tríceps, detente sin abrir los codos.',
      con: 'Extiende los codos para subir la mancuerna de nuevo.',
      end: 'Mantén el abdomen firme para no arquear la espalda.'
    },
    mistakes: [
      'Abrir mucho los codos hacia los lados.',
      'Arquear la espalda baja.',
      'Bajar sin control detrás de la cabeza.',
      'Mover los hombros en lugar de los codos.'
    ],
    tips: [
      'También puede hacerse con cuerda en polea, de espaldas a la máquina.',
      'Usa pesos moderados: la posición estirada es exigente para el codo.',
      'Complementa bien a la extensión en polea.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La tensión es máxima en la parte baja, con el tríceps (sobre todo la cabeza larga) en posición estirada.',
      cue: 'El estiramiento bajo control aporta gran parte del estímulo: no lo recortes.'
    },
    anim: { preset: 'overhead-ext', p: ['triceps'], s: [] }
  },
  {
    id: 'press-cerrado',
    name: 'Press de banca con agarre cerrado',
    groups: ['triceps'],
    primary: ['Tríceps'],
    secondary: ['Pectoral mayor', 'Deltoides anterior'],
    movement: 'Empuje horizontal',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra y banco plano',
    difficulty: 'intermedio',
    description: 'Variante del press de banca con las manos a la anchura de los hombros. Permite usar cargas altas con más énfasis en el tríceps.',
    steps: {
      prep: 'Túmbate en el banco como en el press de banca, con las escápulas juntas y los pies firmes.',
      start: 'Agarra la barra a la anchura de los hombros y sácala del soporte con los brazos extendidos.',
      ecc: 'Baja la barra hacia la parte baja del pecho con los codos cerca del cuerpo.',
      turn: 'Toca el pecho con suavidad, sin rebote.',
      con: 'Empuja la barra hacia arriba extendiendo los codos.',
      end: 'Termina con los brazos extendidos sobre los hombros.'
    },
    mistakes: [
      'Juntar demasiado las manos y forzar las muñecas.',
      'Abrir los codos hacia los lados.',
      'Rebotar la barra en el pecho.',
      'Despegar la cadera del banco.'
    ],
    tips: [
      'Las manos a la anchura de los hombros suelen ser suficientes.',
      'Es una buena forma de entrenar fuerza en el tríceps.',
      'Usa barras de seguridad o un compañero.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    tension: {
      where: 'El tríceps trabaja más en la mitad superior del recorrido, cuando los codos se extienden.',
      cue: 'Codos pegados al cuerpo para dirigir el trabajo hacia el tríceps.'
    },
    anim: { preset: 'bench', opts: { equip: 'barbell', close: true }, p: ['triceps'], s: ['chest', 'frontDelt'] }
  },

  {
    id: 'extension-polea-sobre-cabeza',
    name: 'Extensión de tríceps en polea sobre la cabeza',
    groups: ['triceps'],
    primary: ['Tríceps (cabeza larga)'],
    secondary: ['Tríceps (cabezas lateral y medial)'],
    movement: 'Extensión de codo con brazo elevado',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Polea con cuerda',
    difficulty: 'principiante',
    description: 'Extensión de codos de espaldas a la polea con los brazos por encima de la cabeza. Con el brazo elevado, la cabeza larga del tríceps trabaja estirada.',
    steps: {
      prep: 'Coloca la cuerda en la polea, agárrala y date la vuelta dando un paso al frente.',
      start: 'Inclina un poco el torso y lleva los brazos junto a la cabeza con los codos extendidos.',
      ecc: 'Flexiona los codos y deja que las manos vayan detrás de la cabeza.',
      turn: 'Nota el estiramiento del tríceps sin abrir los codos en exceso.',
      con: 'Extiende los codos hacia delante y arriba hasta estirar los brazos.',
      end: 'Mantén los codos en su sitio y repite.'
    },
    mistakes: [
      'Mover los hombros en lugar de los codos.',
      'Arquear la zona lumbar.',
      'Recortar el estiramiento.',
      'Abrir mucho los codos.'
    ],
    tips: [
      'Un estudio encontró aproximadamente un 40% más de crecimiento del tríceps con extensiones sobre la cabeza que con extensiones con el brazo abajo.',
      'La polea mantiene tensión constante y es cómoda para los codos.',
      'Postura en tijera (un pie adelantado) para estabilizarte.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La cabeza larga recibe la mayor exigencia con los codos flexionados detrás de la cabeza.',
      cue: 'Baja hasta el estiramiento con control y extiende sin balancear el torso.'
    },
    anim: { preset: 'overhead-ext', opts: { cable: true }, p: ['triceps'], s: [] }
  },
  {
    id: 'patada-triceps',
    name: 'Patada de tríceps',
    groups: ['triceps'],
    primary: ['Tríceps (cabezas lateral y medial)'],
    secondary: [],
    movement: 'Extensión de codo',
    category: 'aislamiento',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuerna y banco',
    difficulty: 'principiante',
    description: 'Extensión de codo con el brazo pegado al torso inclinado. Es sencilla, pero la mancuerna solo carga el tríceps al final del recorrido, con el músculo acortado.',
    steps: {
      prep: 'Apoya una rodilla y una mano en el banco, con la espalda paralela al suelo.',
      start: 'Lleva el brazo pegado al costado con el codo flexionado a 90°.',
      con: 'Extiende el codo hasta que el brazo quede recto hacia atrás.',
      turn: 'Mantén un instante con el tríceps contraído.',
      ecc: 'Vuelve con control a 90°.',
      end: 'Completa la serie y cambia de brazo.'
    },
    mistakes: [
      'Dejar caer el codo y mover el hombro.',
      'Balancear la mancuerna.',
      'Girar el torso.',
      'Usar demasiado peso.'
    ],
    tips: [
      'El entrenador prioriza otras opciones: la polea o las extensiones sobre la cabeza estimulan más.',
      'Si la haces, la versión en polea mantiene mejor la tensión.',
      'Útil como ejercicio final con cargas ligeras.'
    ],
    goals: ['resistencia', 'hipertrofia'],
    tension: {
      where: 'La mancuerna genera la mayor resistencia con el brazo extendido; abajo apenas hay tensión.',
      cue: 'Pausa arriba con el brazo recto, sin balanceo.'
    },
    anim: { preset: 'tri-kickback', p: ['triceps'], s: [] }
  },

  /* ============================ CUÁDRICEPS ============================ */
  {
    id: 'sentadilla',
    name: 'Sentadilla con barra',
    groups: ['cuadriceps', 'gluteos'],
    primary: ['Cuádriceps', 'Glúteo mayor'],
    secondary: ['Aductores', 'Erectores de la columna', 'Isquiotibiales'],
    movement: 'Dominante de rodilla',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra y rack',
    difficulty: 'intermedio',
    description: 'Uno de los ejercicios más completos para el tren inferior. Trabaja cuádriceps y glúteos con gran demanda de estabilidad del tronco.',
    steps: {
      prep: 'Coloca la barra en el rack a la altura de los hombros. Sitúala sobre la parte alta de la espalda, no sobre el cuello.',
      start: 'Retira la barra y colócate con los pies algo más abiertos que la cadera y las puntas ligeramente hacia fuera. Respira y tensa el abdomen.',
      ecc: 'Baja flexionando cadera y rodillas a la vez. Las rodillas siguen la dirección de los pies y la barra se mantiene sobre la mitad del pie.',
      turn: 'Baja hasta donde puedas mantener la espalda neutra (idealmente con el muslo cerca de la horizontal o más abajo). Sin rebote brusco.',
      con: 'Empuja el suelo con todo el pie para subir, manteniendo el pecho arriba y las rodillas alineadas.',
      end: 'Termina de pie con la cadera extendida. Respira antes de la siguiente repetición.'
    },
    mistakes: [
      'Dejar que las rodillas se vayan hacia dentro al subir.',
      'Levantar los talones del suelo.',
      'Redondear la espalda baja en la parte inferior.',
      'Subir la cadera mucho antes que el pecho.',
      'Entrenar pesado sin barras de seguridad.'
    ],
    tips: [
      'Usa siempre barras de seguridad en el rack.',
      'La profundidad adecuada depende de tu movilidad: prioriza una espalda neutra.',
      'Un calzado con buena base estable ayuda a mantener el equilibrio.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    tension: {
      where: 'La demanda sobre cuádriceps y glúteos es máxima en la parte baja, con las rodillas y la cadera muy flexionadas.',
      cue: 'La profundidad aumenta el rango en el que el músculo trabaja estirado. Baja tanto como tu técnica lo permita.'
    },
    anim: { preset: 'squat', p: ['quads', 'glutes'], s: ['lowerBack', 'hams'] }
  },
  {
    id: 'prensa',
    name: 'Prensa de piernas',
    groups: ['cuadriceps'],
    primary: ['Cuádriceps'],
    secondary: ['Glúteo mayor', 'Aductores'],
    movement: 'Dominante de rodilla',
    category: 'compuesto',
    equipment: ['maquina'],
    equipmentLabel: 'Prensa inclinada a 45°',
    difficulty: 'principiante',
    description: 'Empuje de piernas en máquina. Permite cargar mucho las piernas con poca demanda de equilibrio y sin carga sobre la columna.',
    steps: {
      prep: 'Siéntate con la espalda bien apoyada y los pies en la plataforma a la anchura de la cadera.',
      start: 'Empuja la plataforma, retira los seguros y quédate con las rodillas casi extendidas.',
      ecc: 'Baja la plataforma flexionando las rodillas hacia el pecho de forma controlada.',
      turn: 'Detente antes de que la zona lumbar se despegue del respaldo.',
      con: 'Empuja la plataforma con todo el pie hasta casi extender las rodillas.',
      end: 'No bloquees las rodillas de golpe. Coloca los seguros al terminar.'
    },
    mistakes: [
      'Bajar tanto que la pelvis se despega del asiento.',
      'Bloquear las rodillas de golpe arriba.',
      'Dejar que las rodillas se vayan hacia dentro.',
      'Recortar mucho el recorrido para mover más peso.'
    ],
    tips: [
      'Pies más bajos en la plataforma = más trabajo de cuádriceps; más altos = más glúteo e isquios.',
      'Excelente para acercarse al fallo con seguridad.',
      'Mantén las manos en las agarraderas laterales.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'El cuádriceps trabaja más en la parte baja, con las rodillas muy flexionadas.',
      cue: 'El recorrido útil es el que puedes hacer con la pelvis apoyada.'
    },
    anim: { preset: 'leg-press', p: ['quads'], s: ['glutes'] }
  },
  {
    id: 'sentadilla-hack',
    name: 'Sentadilla hack',
    groups: ['cuadriceps'],
    primary: ['Cuádriceps'],
    secondary: ['Glúteo mayor'],
    movement: 'Dominante de rodilla',
    category: 'compuesto',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina hack',
    difficulty: 'principiante',
    description: 'Sentadilla guiada con la espalda apoyada. Permite una gran flexión de rodilla con mucho énfasis en el cuádriceps.',
    steps: {
      prep: 'Colócate con la espalda apoyada en el respaldo y los hombros bajo las almohadillas.',
      start: 'Pies a la anchura de la cadera en la parte media de la plataforma. Libera los seguros.',
      ecc: 'Baja de forma controlada dejando que las rodillas avancen sobre los pies.',
      turn: 'Llega a la profundidad que te permita mantener la espalda apoyada.',
      con: 'Empuja la plataforma con todo el pie para volver arriba.',
      end: 'Termina con las rodillas casi extendidas y coloca los seguros al acabar.'
    },
    mistakes: [
      'Despegar la zona lumbar del respaldo en la parte baja.',
      'Levantar los talones.',
      'Rebotar en la parte inferior.',
      'Bloquear las rodillas arriba.'
    ],
    tips: [
      'Buena alternativa a la sentadilla si quieres enfocar el trabajo en el cuádriceps.',
      'Los pies más bajos aumentan la flexión de rodilla.',
      'Controla la bajada: la máquina facilita bajar rápido.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'La mayor tensión en el cuádriceps aparece en la parte baja, con las rodillas muy flexionadas.',
      cue: 'Al no tener que estabilizar el tronco, puedes llevar las series más cerca del fallo.'
    },
    anim: { preset: 'hack-squat', p: ['quads'], s: ['glutes'] }
  },
  {
    id: 'extension-piernas',
    name: 'Extensión de piernas',
    groups: ['cuadriceps'],
    primary: ['Cuádriceps (incluido el recto femoral)'],
    secondary: [],
    movement: 'Extensión de rodilla',
    category: 'aislamiento',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de extensión de cuádriceps',
    difficulty: 'principiante',
    description: 'El aislamiento más directo del cuádriceps. Es una de las pocas formas de trabajar bien el recto femoral.',
    steps: {
      prep: 'Ajusta el respaldo para que la rodilla quede alineada con el eje de la máquina. El rodillo, sobre la parte baja de la espinilla.',
      start: 'Siéntate con la espalda apoyada y agarra las asas laterales.',
      con: 'Extiende las rodillas hasta tener las piernas casi rectas.',
      turn: 'Arriba, aprieta el cuádriceps un instante.',
      ecc: 'Baja de forma controlada hasta que las rodillas vuelvan a unos 90° o algo más.',
      end: 'Mantén la cadera apoyada en el asiento y repite.'
    },
    mistakes: [
      'Ajustar mal el eje de la máquina respecto a la rodilla.',
      'Levantar la cadera del asiento.',
      'Dar patadas con impulso.',
      'Dejar caer el peso en la bajada.'
    ],
    tips: [
      'Inclinar el respaldo hacia atrás estira más el recto femoral.',
      'Funciona bien al final de la sesión de piernas.',
      'Útil para acercarse al fallo con poco estrés para la espalda.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La máquina reparte la resistencia en el arco. El cuádriceps trabaja intensamente al acercarse a la extensión.',
      cue: 'Controla también la bajada: es la mitad del estímulo.'
    },
    anim: { preset: 'leg-extension', p: ['quads'], s: [] }
  },
  {
    id: 'zancadas',
    name: 'Zancadas',
    groups: ['cuadriceps', 'gluteos'],
    primary: ['Cuádriceps', 'Glúteo mayor'],
    secondary: ['Aductores', 'Isquiotibiales'],
    movement: 'Dominante de rodilla unilateral',
    category: 'compuesto',
    equipment: ['mancuernas', 'peso-corporal'],
    equipmentLabel: 'Mancuernas o peso corporal',
    difficulty: 'intermedio',
    description: 'Ejercicio unilateral que trabaja cada pierna por separado. Exige equilibrio y estabilidad de la cadera.',
    steps: {
      prep: 'De pie con una mancuerna en cada mano (o sin peso) y los pies a la anchura de la cadera.',
      start: 'Da un paso amplio adelante. Mantén el torso erguido y el peso repartido entre ambos pies.',
      ecc: 'Baja flexionando ambas rodillas hasta que la de atrás quede cerca del suelo.',
      turn: 'Con la rodilla trasera cerca del suelo, mantén el equilibrio sin apoyarla de golpe.',
      con: 'Empuja con el pie delantero para volver a subir.',
      end: 'Vuelve a la posición inicial o avanza con la otra pierna. Trabaja ambos lados por igual.'
    },
    mistakes: [
      'Dar un paso demasiado corto, que carga en exceso la rodilla delantera.',
      'Dejar que la rodilla delantera se vaya hacia dentro.',
      'Inclinar mucho el torso hacia delante.',
      'Golpear el suelo con la rodilla trasera.'
    ],
    tips: [
      'Un paso más largo da más trabajo al glúteo; uno más corto, al cuádriceps.',
      'Empieza sin peso hasta dominar el equilibrio.',
      'La variante estática (zancada búlgara o split squat) es más fácil de controlar.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    reps: { fuerza: '5–8 por pierna', hipertrofia: '8–15 por pierna', resistencia: '15–25 por pierna' },
    tension: {
      where: 'La tensión sobre la pierna delantera es mayor en la parte baja, con cadera y rodilla muy flexionadas.',
      cue: 'Carga la pierna delantera: la trasera solo ayuda a mantener el equilibrio.'
    },
    anim: { preset: 'lunge', p: ['quads', 'glutes'], s: ['hams'] }
  },

  {
    id: 'sentadilla-bulgara',
    name: 'Sentadilla búlgara',
    groups: ['cuadriceps', 'gluteos'],
    primary: ['Cuádriceps', 'Glúteo mayor'],
    secondary: ['Aductores', 'Isquiotibiales'],
    movement: 'Sentadilla a una pierna',
    category: 'compuesto',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas y banco',
    difficulty: 'intermedio',
    description: 'Sentadilla a una pierna con el pie trasero apoyado en un banco. Trabaja cuádriceps y glúteo con un gran recorrido y menos carga sobre la columna que la sentadilla con barra.',
    steps: {
      prep: 'Colócate delante de un banco con una mancuerna en cada mano y apoya el empeine del pie trasero en él.',
      start: 'Pie delantero a una distancia que te permita bajar con el talón apoyado. Torso firme.',
      ecc: 'Baja flexionando la rodilla delantera hasta que el muslo quede casi paralelo al suelo.',
      turn: 'Mantén el equilibrio abajo con el peso sobre la pierna delantera.',
      con: 'Empuja el suelo con el pie delantero hasta subir.',
      end: 'Completa las repeticiones y cambia de pierna.'
    },
    mistakes: [
      'Empujar con la pierna trasera.',
      'Colocar el pie delantero demasiado cerca del banco.',
      'Dejar que la rodilla delantera se hunda hacia dentro.',
      'Bajar sin control.'
    ],
    tips: [
      'Torso más vertical: más cuádriceps. Torso algo inclinado y paso más largo: más glúteo.',
      'Empieza sin peso hasta dominar el equilibrio.',
      'Es exigente: déjala como único ejercicio de pierna a una pierna en la sesión.'
    ],
    goals: ['hipertrofia', 'fuerza', 'resistencia'],
    reps: { fuerza: '5–8', hipertrofia: '6–12', resistencia: '12–20' },
    tension: {
      where: 'Cuádriceps y glúteo reciben la mayor demanda en la parte baja, cuando están estirados.',
      cue: 'Baja hasta abajo con control y sube sin rebote.'
    },
    anim: { preset: 'lunge', opts: { bulgarian: true }, p: ['quads', 'glutes'], s: ['hams'] }
  },
  {
    id: 'sentadilla-frontal',
    name: 'Sentadilla frontal',
    groups: ['cuadriceps'],
    primary: ['Cuádriceps'],
    secondary: ['Glúteo mayor', 'Aductores', 'Erectores', 'Abdomen'],
    movement: 'Sentadilla',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra y rack',
    difficulty: 'avanzado',
    description: 'Sentadilla con la barra apoyada en la parte delantera de los hombros. El torso queda más vertical, lo que da más protagonismo al cuádriceps.',
    steps: {
      prep: 'Coloca la barra en el rack a la altura de la parte alta del pecho.',
      start: 'Apoya la barra sobre los deltoides delanteros con los codos altos y sácala con los pies a la anchura de los hombros.',
      ecc: 'Baja con el torso vertical y los codos altos, flexionando cadera y rodillas.',
      turn: 'Llega lo más profundo que permita tu movilidad con la espalda neutra.',
      con: 'Sube empujando el suelo y manteniendo los codos altos.',
      end: 'Termina de pie, con la barra estable.'
    },
    mistakes: [
      'Dejar caer los codos y que la barra ruede hacia delante.',
      'Redondear la espalda alta.',
      'Levantar los talones.',
      'Bajar sin control.'
    ],
    tips: [
      'Si las muñecas no lo permiten, usa el agarre cruzado o correas.',
      'Requiere movilidad de tobillo, cadera y muñeca: practica con poco peso.',
      'Muy exigente: el entrenador la cuenta como ejercicio de alta demanda.'
    ],
    goals: ['fuerza', 'hipertrofia'],
    tension: {
      where: 'El cuádriceps recibe la mayor demanda en la parte baja, con las rodillas muy flexionadas.',
      cue: 'Profundidad con control: la parte baja es la que más estímulo genera.'
    },
    anim: { preset: 'squat', opts: { front: true }, p: ['quads'], s: ['glutes', 'lowerBack', 'abs'] }
  },
  {
    id: 'sentadilla-goblet',
    name: 'Sentadilla goblet',
    groups: ['cuadriceps'],
    primary: ['Cuádriceps', 'Glúteo mayor'],
    secondary: ['Aductores', 'Abdomen'],
    movement: 'Sentadilla',
    category: 'compuesto',
    equipment: ['mancuernas'],
    equipmentLabel: 'Una mancuerna o kettlebell',
    difficulty: 'principiante',
    description: 'Sentadilla sujetando una mancuerna pegada al pecho. Es la mejor forma de aprender el patrón de sentadilla: el peso delante ayuda a mantener el torso erguido.',
    steps: {
      prep: 'Sujeta una mancuerna en vertical contra el pecho, con ambas manos bajo el disco superior.',
      start: 'Pies a la anchura de los hombros o algo más, con las puntas ligeramente hacia fuera.',
      ecc: 'Baja entre las piernas con el torso erguido y los codos dentro de las rodillas.',
      turn: 'Llega abajo con los talones apoyados.',
      con: 'Sube empujando el suelo con todo el pie.',
      end: 'Termina de pie con la mancuerna pegada al pecho.'
    },
    mistakes: [
      'Separar la mancuerna del pecho.',
      'Levantar los talones.',
      'Rodillas hacia dentro.',
      'Redondear la espalda abajo.'
    ],
    tips: [
      'Ideal para principiantes antes de pasar a la sentadilla con barra.',
      'Cuando la mancuerna más pesada se quede corta, pasa a la sentadilla o la sentadilla hack.',
      'Útil también como calentamiento específico.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { fuerza: '6–10', hipertrofia: '8–15', resistencia: '15–20' },
    tension: {
      where: 'El cuádriceps y el glúteo trabajan más en la parte baja de la sentadilla.',
      cue: 'Baja hasta donde mantengas la técnica y sube sin rebotar.'
    },
    anim: { preset: 'squat', opts: { goblet: true }, p: ['quads', 'glutes'], s: ['abs'] }
  },

  /* ========================== ISQUIOTIBIALES ========================== */
  {
    id: 'peso-muerto-rumano',
    name: 'Peso muerto rumano',
    groups: ['isquiotibiales', 'gluteos'],
    primary: ['Isquiotibiales', 'Glúteo mayor'],
    secondary: ['Erectores de la columna', 'Agarre'],
    movement: 'Bisagra de cadera',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra libre',
    difficulty: 'intermedio',
    description: 'Bisagra de cadera con las rodillas casi fijas. Trabaja isquiotibiales y glúteos en una posición muy estirada.',
    steps: {
      prep: 'De pie con la barra en las manos, agarre algo más abierto que la cadera y pies a la anchura de la cadera.',
      start: 'Rodillas ligeramente flexionadas, escápulas activas y espalda neutra.',
      ecc: 'Lleva la cadera hacia atrás mientras la barra baja pegada a los muslos. Las rodillas apenas cambian su flexión.',
      turn: 'Detente cuando notes un estiramiento intenso en los isquiotibiales, sin redondear la espalda (normalmente a la altura de la rodilla o de media espinilla).',
      con: 'Empuja la cadera hacia delante para volver a la posición de pie, con la barra cerca del cuerpo.',
      end: 'Termina erguido sin hiperextender la zona lumbar.'
    },
    mistakes: [
      'Redondear la espalda para bajar más.',
      'Flexionar mucho las rodillas y convertirlo en una sentadilla.',
      'Separar la barra de las piernas.',
      'Hiperextender la zona lumbar arriba.'
    ],
    tips: [
      'La profundidad la marca tu flexibilidad, no el suelo.',
      'Piensa en “cerrar una puerta con el trasero”.',
      'Las correas de agarre ayudan si el agarre falla antes que las piernas.'
    ],
    goals: ['fuerza', 'hipertrofia', 'resistencia'],
    reps: { fuerza: '4–6', hipertrofia: '6–12', resistencia: '12–20' },
    tension: {
      where: 'Los isquiotibiales están más estirados y bajo mayor demanda en la parte baja, con la cadera muy flexionada.',
      cue: 'Baja despacio: el estiramiento bajo carga es lo que hace este ejercicio tan efectivo.'
    },
    anim: { preset: 'rdl', p: ['hams', 'glutes'], s: ['lowerBack', 'forearm'] }
  },
  {
    id: 'curl-femoral',
    name: 'Curl femoral tumbado',
    groups: ['isquiotibiales'],
    primary: ['Isquiotibiales'],
    secondary: ['Gemelos'],
    movement: 'Flexión de rodilla',
    category: 'aislamiento',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de curl femoral tumbado',
    difficulty: 'principiante',
    description: 'Aislamiento de los isquiotibiales mediante la flexión de rodilla, tumbado boca abajo.',
    steps: {
      prep: 'Ajusta la máquina para que la rodilla quede alineada con el eje y el rodillo justo encima de los talones.',
      start: 'Túmbate boca abajo, agarra las asas y mantén la cadera apoyada.',
      con: 'Flexiona las rodillas llevando los talones hacia los glúteos.',
      turn: 'Arriba, aprieta un instante sin levantar la cadera.',
      ecc: 'Baja de forma controlada hasta casi extender las rodillas.',
      end: 'Mantén la tensión abajo, sin dejar que el peso descanse.'
    },
    mistakes: [
      'Levantar la cadera del banco al subir.',
      'Usar impulso.',
      'Recortar la extensión abajo.',
      'Ajustar mal el eje de la máquina.'
    ],
    tips: [
      'Puntas de los pies hacia la espinilla (flexión dorsal) para implicar más a los isquios.',
      'Combina bien con una bisagra de cadera en la misma semana.',
      'Controla la bajada al menos 2 segundos.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'La tensión es alta en todo el recorrido. Tumbado, con la cadera extendida, los isquios trabajan algo menos estirados que en la versión sentada.',
      cue: 'Mantén la cadera pegada al banco durante toda la serie.'
    },
    anim: { preset: 'leg-curl-lying', p: ['hams'], s: ['calves'] }
  },
  {
    id: 'curl-femoral-sentado',
    name: 'Curl femoral sentado',
    groups: ['isquiotibiales'],
    primary: ['Isquiotibiales'],
    secondary: ['Gemelos'],
    movement: 'Flexión de rodilla con cadera flexionada',
    category: 'aislamiento',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de curl femoral sentado',
    difficulty: 'principiante',
    description: 'Flexión de rodilla sentado. Con la cadera flexionada, los isquiotibiales trabajan en una posición más estirada que en la versión tumbada.',
    steps: {
      prep: 'Ajusta el respaldo para que la rodilla quede alineada con el eje y baja la almohadilla sobre los muslos.',
      start: 'Coloca el rodillo detrás de la parte baja de las piernas con las rodillas casi extendidas.',
      con: 'Flexiona las rodillas llevando los talones hacia abajo y atrás.',
      turn: 'Abajo, aprieta un instante.',
      ecc: 'Regresa de forma controlada hasta casi extender las rodillas.',
      end: 'Mantén la espalda apoyada y repite.'
    },
    mistakes: [
      'Dejar los muslos sueltos, sin la almohadilla ajustada.',
      'Separar la espalda del respaldo.',
      'Hacer el movimiento con impulso.',
      'No extender del todo arriba.'
    ],
    tips: [
      'Inclinar el torso hacia delante aumenta el estiramiento de los isquios.',
      'Es una de las variantes más eficaces para la hipertrofia de isquiotibiales.',
      'Combínalo con peso muerto rumano en la semana.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    tension: {
      where: 'Con la cadera flexionada, el músculo trabaja más estirado durante todo el recorrido.',
      cue: 'Aprovecha la extensión completa de la rodilla en cada repetición.'
    },
    anim: { preset: 'leg-curl-seated', p: ['hams'], s: ['calves'] }
  },
  {
    id: 'buenos-dias',
    name: 'Buenos días',
    groups: ['isquiotibiales'],
    primary: ['Isquiotibiales', 'Erectores de la columna'],
    secondary: ['Glúteo mayor'],
    movement: 'Bisagra de cadera',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra y rack',
    difficulty: 'avanzado',
    description: 'Bisagra de cadera con la barra sobre la espalda. Exige mucho control del tronco: se recomienda empezar con poca carga.',
    steps: {
      prep: 'Coloca la barra sobre la parte alta de la espalda, como en la sentadilla.',
      start: 'Pies a la anchura de la cadera, rodillas algo flexionadas y abdomen firme.',
      ecc: 'Lleva la cadera hacia atrás e inclina el torso hacia delante manteniendo la espalda neutra.',
      turn: 'Detente cuando notes el estiramiento de los isquios o el torso se acerque a la horizontal.',
      con: 'Empuja la cadera hacia delante para volver a la posición de pie.',
      end: 'Termina erguido, con el abdomen firme.'
    },
    mistakes: [
      'Redondear la espalda.',
      'Usar cargas altas antes de dominar la técnica.',
      'Flexionar demasiado las rodillas.',
      'Bajar más de lo que permite la flexibilidad.'
    ],
    tips: [
      'Empieza con la barra vacía o un palo hasta dominar la bisagra.',
      'No es imprescindible: el peso muerto rumano trabaja algo similar con menos riesgo.',
      'Mantén la mirada al frente y abajo, con el cuello neutro.'
    ],
    goals: ['hipertrofia', 'fuerza'],
    reps: { fuerza: '5–8', hipertrofia: '8–12', resistencia: '12–15' },
    tension: {
      where: 'La palanca es más larga con el torso cerca de la horizontal: ahí la demanda sobre isquios y zona lumbar es máxima.',
      cue: 'Poco peso, mucho control: el brazo de palanca hace que incluso cargas ligeras sean exigentes.'
    },
    anim: { preset: 'rdl', opts: { bar: 'back' }, p: ['hams', 'lowerBack'], s: ['glutes'] }
  },

  {
    id: 'peso-muerto-rumano-mancuernas',
    name: 'Peso muerto rumano con mancuernas',
    groups: ['isquiotibiales'],
    primary: ['Isquiotibiales', 'Glúteo mayor'],
    secondary: ['Erectores de la columna', 'Antebrazo'],
    movement: 'Bisagra de cadera',
    category: 'compuesto',
    equipment: ['mancuernas'],
    equipmentLabel: 'Mancuernas',
    difficulty: 'principiante',
    description: 'Bisagra de cadera con mancuernas. Mismo patrón que el rumano con barra, más fácil de aprender y con menos carga absoluta sobre la espalda.',
    steps: {
      prep: 'De pie con una mancuerna en cada mano delante de los muslos y los pies a la anchura de la cadera.',
      start: 'Rodillas ligeramente flexionadas, espalda neutra y hombros atrás.',
      ecc: 'Lleva la cadera hacia atrás bajando las mancuernas pegadas a las piernas.',
      turn: 'Detente cuando notes un estiramiento fuerte en los isquiotibiales, sin redondear la espalda.',
      con: 'Extiende la cadera llevándola hacia delante hasta quedar de pie.',
      end: 'Termina erguido sin echar el torso atrás.'
    },
    mistakes: [
      'Redondear la espalda para bajar más.',
      'Flexionar mucho las rodillas (se convierte en sentadilla).',
      'Separar las mancuernas de las piernas.',
      'Hiperextender la espalda arriba.'
    ],
    tips: [
      'Buena puerta de entrada al rumano con barra.',
      'Piensa en cerrar un cajón con el trasero.',
      'Bajar hasta media tibia suele ser suficiente.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    tension: {
      where: 'Los isquiotibiales reciben la mayor demanda abajo, cuando están más estirados.',
      cue: 'Baja despacio y para antes de perder la espalda neutra.'
    },
    anim: { preset: 'rdl', opts: { equip: 'dumbbell' }, p: ['hams', 'glutes'], s: ['lowerBack', 'forearm'] }
  },
  {
    id: 'curl-nordico',
    name: 'Curl nórdico',
    groups: ['isquiotibiales'],
    primary: ['Isquiotibiales'],
    secondary: ['Glúteo mayor', 'Gemelos'],
    movement: 'Flexión de rodilla excéntrica',
    category: 'aislamiento',
    equipment: ['peso-corporal'],
    equipmentLabel: 'Peso corporal y un anclaje para los tobillos',
    difficulty: 'avanzado',
    description: 'De rodillas con los tobillos sujetos, el cuerpo cae hacia delante frenado por los isquiotibiales. Es muy intenso en la fase excéntrica y produce mucho daño muscular al principio.',
    steps: {
      prep: 'Arrodíllate sobre una superficie acolchada y fija los tobillos bajo un soporte o con un compañero.',
      start: 'Cuerpo recto de las rodillas a la cabeza, glúteos y abdomen activos.',
      ecc: 'Inclínate hacia delante lo más lento posible, sin doblar la cadera.',
      turn: 'Cuando no puedas frenar más, apoya las manos en el suelo.',
      con: 'Empuja ligeramente con las manos y regresa usando los isquiotibiales.',
      end: 'Vuelve a la posición vertical y repite.'
    },
    mistakes: [
      'Doblar la cadera para acortar la palanca.',
      'Dejarse caer sin frenar.',
      'Hacer muchas series la primera vez (genera agujetas intensas).',
      'Hacerlo sin un anclaje firme.'
    ],
    tips: [
      'Empieza con 2 series de pocas repeticiones y progresa poco a poco.',
      'Una banda elástica atada en alto ayuda mientras ganas fuerza.',
      'Está asociado a la prevención de lesiones de isquiotibiales en el deporte.'
    ],
    goals: ['fuerza', 'hipertrofia'],
    reps: { fuerza: '3–6', hipertrofia: '4–8', resistencia: '6–10 con ayuda' },
    tension: {
      where: 'La exigencia crece a medida que el cuerpo se acerca al suelo y la palanca se alarga.',
      cue: 'Lo importante es frenar la caída: cuanto más lenta, mejor.'
    },
    anim: { preset: 'nordic', p: ['hams'], s: ['glutes', 'calves'] }
  },

  /* ============================ GLÚTEOS ============================ */
  {
    id: 'hip-thrust',
    name: 'Hip thrust',
    groups: ['gluteos'],
    primary: ['Glúteo mayor'],
    secondary: ['Isquiotibiales', 'Cuádriceps'],
    movement: 'Extensión de cadera',
    category: 'compuesto',
    equipment: ['barra'],
    equipmentLabel: 'Barra, banco y almohadilla',
    difficulty: 'intermedio',
    description: 'Empuje de cadera con la espalda apoyada en un banco. Permite cargar mucho el glúteo con poca demanda técnica.',
    steps: {
      prep: 'Siéntate en el suelo con la parte alta de la espalda contra el borde de un banco. Coloca la barra (con almohadilla) sobre la cadera.',
      start: 'Pies apoyados a la anchura de la cadera, a una distancia que deje las espinillas verticales arriba.',
      con: 'Empuja el suelo con los talones y eleva la cadera hasta que el torso quede paralelo al suelo.',
      turn: 'Arriba, aprieta los glúteos con la barbilla ligeramente recogida y sin arquear la zona lumbar.',
      ecc: 'Baja la cadera de forma controlada hasta casi tocar el suelo.',
      end: 'Mantén la tensión y repite.'
    },
    mistakes: [
      'Arquear la zona lumbar arriba en lugar de extender la cadera.',
      'Colocar los pies demasiado lejos o demasiado cerca.',
      'Empujar con las puntas de los pies.',
      'Mirar al techo y perder la posición del tronco.'
    ],
    tips: [
      'Usa una almohadilla para la barra: la presión sobre la cadera puede ser molesta.',
      'Piensa en llevar la pelvis hacia la barbilla al final.',
      'También puede hacerse en máquina o con bandas.'
    ],
    goals: ['hipertrofia', 'fuerza', 'resistencia'],
    tension: {
      where: 'La tensión sobre el glúteo es máxima arriba, con la cadera extendida. Es lo contrario de la sentadilla, que exige más en la posición estirada.',
      cue: 'Una pausa de 1 segundo arriba ayuda a mantener la tensión donde el ejercicio es más exigente.'
    },
    anim: { preset: 'hip-thrust', p: ['glutes'], s: ['hams', 'quads'] }
  },
  {
    id: 'patada-gluteo',
    name: 'Patada de glúteo en polea',
    groups: ['gluteos'],
    primary: ['Glúteo mayor'],
    secondary: ['Isquiotibiales'],
    movement: 'Extensión de cadera unilateral',
    category: 'aislamiento',
    equipment: ['polea'],
    equipmentLabel: 'Polea baja con tobillera',
    difficulty: 'principiante',
    description: 'Extensión de cadera a una pierna con cable. Aísla el glúteo y permite corregir diferencias entre lados.',
    steps: {
      prep: 'Coloca la tobillera en la polea baja y sujétate a la máquina con ambas manos.',
      start: 'Inclina un poco el torso, con la pierna de trabajo ligeramente adelantada y la rodilla algo flexionada.',
      con: 'Lleva la pierna hacia atrás extendiendo la cadera, sin arquear la zona lumbar.',
      turn: 'Al final, aprieta el glúteo un instante.',
      ecc: 'Regresa de forma controlada hasta la posición inicial.',
      end: 'Completa las repeticiones y cambia de pierna.'
    },
    mistakes: [
      'Arquear la espalda para llevar la pierna más atrás.',
      'Girar la cadera hacia fuera.',
      'Dar patadas rápidas con impulso.',
      'Usar demasiado peso.'
    ],
    tips: [
      'El recorrido útil termina cuando la cadera está extendida; más allá trabaja la zona lumbar.',
      'Mantén el abdomen firme.',
      'Funciona bien al final de la sesión de piernas.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { hipertrofia: '10–20 por pierna', resistencia: '15–30 por pierna' },
    tension: {
      where: 'El cable mantiene resistencia en todo el recorrido; el glúteo trabaja más cerca de la extensión de cadera.',
      cue: 'Controla el regreso: la pierna no debe caer.'
    },
    anim: { preset: 'kickback', p: ['glutes'], s: ['hams'] }
  },

  {
    id: 'abduccion-cadera',
    name: 'Abducción de cadera en máquina',
    groups: ['gluteos'],
    primary: ['Glúteo medio', 'Glúteo menor'],
    secondary: ['Tensor de la fascia lata', 'Glúteo mayor (fibras superiores)'],
    movement: 'Abducción de cadera',
    category: 'aislamiento',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de abductores',
    difficulty: 'principiante',
    description: 'Separación de las piernas contra resistencia. Trabaja el glúteo medio, que los ejercicios de sentadilla y bisagra estimulan menos.',
    steps: {
      prep: 'Siéntate con la espalda apoyada y las almohadillas por fuera de las rodillas.',
      start: 'Rodillas juntas y manos en las asas.',
      con: 'Separa las piernas todo lo que puedas sin despegar la cadera del asiento.',
      turn: 'Mantén un instante con las piernas abiertas.',
      ecc: 'Junta las piernas con control sin que las placas choquen.',
      end: 'Repite manteniendo la tensión.'
    },
    mistakes: [
      'Balancear el torso para abrir.',
      'Recortar el recorrido.',
      'Dejar que el peso golpee la pila.',
      'Usar solo cargas que no permiten abrir del todo.'
    ],
    tips: [
      'Inclinar el torso un poco hacia delante implica más al glúteo mayor.',
      'Funciona bien con repeticiones moderadas o altas.',
      'Complemento útil de un hip thrust o una sentadilla.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { fuerza: '8–12', hipertrofia: '10–20', resistencia: '15–30' },
    tension: {
      where: 'La máquina mantiene la tensión en todo el recorrido; la apertura máxima es la parte más exigente.',
      cue: 'Abre del todo y vuelve despacio.'
    },
    anim: { preset: 'hip-abduction', p: ['gluteMed'], s: ['glutes'] }
  },
  {
    id: 'puente-gluteo',
    name: 'Puente de glúteo',
    groups: ['gluteos'],
    primary: ['Glúteo mayor'],
    secondary: ['Isquiotibiales'],
    movement: 'Extensión de cadera',
    category: 'aislamiento',
    equipment: ['peso-corporal'],
    equipmentLabel: 'Peso corporal (opcional: disco o barra)',
    difficulty: 'principiante',
    description: 'Elevación de cadera tumbado en el suelo. Versión sencilla del hip thrust, con menos recorrido. Útil para aprender a extender la cadera con el glúteo.',
    steps: {
      prep: 'Túmbate boca arriba con las rodillas flexionadas y los pies apoyados a la anchura de la cadera.',
      start: 'Brazos a los lados, espalda apoyada y abdomen firme.',
      con: 'Empuja con los talones y eleva la cadera hasta alinear rodillas, cadera y hombros.',
      turn: 'Aprieta los glúteos un instante arriba.',
      ecc: 'Baja con control hasta casi tocar el suelo.',
      end: 'Repite sin perder la posición de los pies.'
    },
    mistakes: [
      'Arquear la zona lumbar arriba en lugar de extender la cadera.',
      'Empujar con las puntas de los pies.',
      'Separar las rodillas hacia fuera o hacia dentro.',
      'Hacerlo rápido y sin pausa.'
    ],
    tips: [
      'Cuando sea fácil, pasa al hip thrust con banco: tiene más recorrido.',
      'Hacerlo a una pierna duplica la dificultad sin material.',
      'Mete ligeramente la pelvis (retroversión) arriba.'
    ],
    goals: ['resistencia', 'hipertrofia'],
    reps: { fuerza: '6–10 con carga', hipertrofia: '10–20', resistencia: '15–30' },
    tension: {
      where: 'La mayor exigencia aparece arriba, con la cadera extendida.',
      cue: 'Pausa arriba con los glúteos apretados en cada repetición.'
    },
    anim: { preset: 'hip-thrust', opts: { floor: true }, p: ['glutes'], s: ['hams'] }
  },
  {
    id: 'hiperextension-45',
    name: 'Hiperextensión a 45° (enfocada al glúteo)',
    groups: ['gluteos', 'isquiotibiales'],
    primary: ['Glúteo mayor', 'Isquiotibiales'],
    secondary: ['Erectores de la columna'],
    movement: 'Extensión de cadera',
    category: 'compuesto',
    equipment: ['maquina', 'peso-corporal'],
    equipmentLabel: 'Banco de hiperextensiones a 45°',
    difficulty: 'principiante',
    description: 'Extensión de cadera en el banco a 45°. Con la espalda algo redondeada arriba y las puntas hacia fuera, el trabajo se dirige al glúteo y los isquiotibiales en posición estirada.',
    steps: {
      prep: 'Ajusta la almohadilla justo por debajo de la cadera y fija los pies en el soporte.',
      start: 'Cruza los brazos sobre el pecho y deja caer el torso hacia delante.',
      con: 'Extiende la cadera hasta que el cuerpo forme una línea recta.',
      turn: 'Aprieta los glúteos arriba sin arquear la zona lumbar.',
      ecc: 'Baja con control hasta notar el estiramiento.',
      end: 'Repite desde abajo.'
    },
    mistakes: [
      'Subir por encima de la línea del cuerpo e hiperextender la espalda.',
      'Almohadilla demasiado alta: bloquea la cadera.',
      'Movimiento rápido y con impulso.',
      'Mover solo la columna en lugar de la cadera.'
    ],
    tips: [
      'Añade un disco abrazado al pecho cuando superes 15–20 repeticiones.',
      'Fatiga menos que un peso muerto: buena opción en sesiones con mucho volumen.',
      'Gira ligeramente las puntas de los pies hacia fuera para implicar más glúteo.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { fuerza: '6–10 con disco', hipertrofia: '10–20', resistencia: '15–25' },
    tension: {
      where: 'Glúteo e isquiotibiales trabajan más abajo, con la cadera flexionada y el músculo estirado.',
      cue: 'Controla la bajada y sube con la cadera, no con la espalda.'
    },
    anim: { preset: 'back-extension', p: ['glutes', 'hams'], s: ['lowerBack'] }
  },

  /* =========================== PANTORRILLAS =========================== */
  {
    id: 'elevacion-talones-pie',
    name: 'Elevación de talones de pie',
    groups: ['pantorrillas'],
    primary: ['Gastrocnemio (gemelos)'],
    secondary: ['Sóleo'],
    movement: 'Extensión de tobillo',
    category: 'aislamiento',
    equipment: ['mancuernas', 'maquina'],
    equipmentLabel: 'Escalón con mancuerna o máquina de gemelos',
    difficulty: 'principiante',
    description: 'Elevación de talones con las rodillas extendidas. Trabaja sobre todo los gemelos (gastrocnemio).',
    steps: {
      prep: 'Colócate en un escalón (o en la máquina de gemelos) con la parte delantera de los pies en el borde. Sujeta una mancuerna con una mano y apóyate con la otra.',
      start: 'Rodillas extendidas (sin bloquear) y cuerpo erguido.',
      ecc: 'Baja los talones de forma controlada por debajo del nivel de la plataforma.',
      turn: 'Abajo, mantén el estiramiento 1–2 segundos sin rebote.',
      con: 'Sube los talones lo más alto posible, empujando con la parte delantera del pie.',
      end: 'Arriba, aprieta un instante antes de bajar de nuevo.'
    },
    mistakes: [
      'Rebotar abajo usando la elasticidad del tendón.',
      'Recortar el recorrido, sobre todo abajo.',
      'Flexionar las rodillas para ayudarse.',
      'Hacer repeticiones demasiado rápidas.'
    ],
    tips: [
      'La pausa abajo reduce el rebote elástico y aumenta el trabajo muscular.',
      'Las pantorrillas toleran bien rangos de repeticiones amplios.',
      'En máquina, las almohadillas sobre los hombros permiten usar más carga.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    reps: { fuerza: '6–10', hipertrofia: '8–20', resistencia: '20–30' },
    tension: {
      where: 'La mayor tensión aparece en la posición estirada, con el talón por debajo de la plataforma.',
      cue: 'Pausa abajo y recorrido completo: así el trabajo lo hace el músculo y no el tendón de Aquiles.'
    },
    anim: { preset: 'calf-standing', p: ['calves'], s: [] }
  },
  {
    id: 'elevacion-talones-sentado',
    name: 'Elevación de talones sentado',
    groups: ['pantorrillas'],
    primary: ['Sóleo'],
    secondary: ['Gastrocnemio'],
    movement: 'Extensión de tobillo con rodilla flexionada',
    category: 'aislamiento',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de gemelos sentado',
    difficulty: 'principiante',
    description: 'Elevación de talones sentado. Con la rodilla flexionada, el gemelo trabaja menos y el sóleo recibe más demanda.',
    steps: {
      prep: 'Siéntate con la almohadilla sobre la parte baja de los muslos y la parte delantera de los pies en la plataforma.',
      start: 'Libera el seguro con las rodillas flexionadas a unos 90°.',
      ecc: 'Baja los talones de forma controlada hasta el máximo estiramiento cómodo.',
      turn: 'Mantén abajo 1–2 segundos.',
      con: 'Sube los talones lo más alto posible.',
      end: 'Aprieta arriba y repite.'
    },
    mistakes: [
      'Rebotar en la parte baja.',
      'Recortar el recorrido.',
      'Mover el torso para impulsar el peso.',
      'Ir demasiado rápido.'
    ],
    tips: [
      'Combínalo con la versión de pie para trabajar ambos músculos de la pantorrilla.',
      'Las pausas y el tempo lento suelen funcionar bien aquí.',
      'Ajusta la almohadilla para que quede firme sobre los muslos.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { hipertrofia: '10–20', resistencia: '20–30' },
    tension: {
      where: 'La demanda es mayor en la posición estirada, con el talón abajo.',
      cue: 'Con la rodilla flexionada el gemelo se acorta y el sóleo hace la mayor parte del trabajo.'
    },
    anim: { preset: 'calf-seated', p: ['calves'], s: [] }
  },
  {
    id: 'elevacion-talones-prensa',
    name: 'Elevación de talones en prensa',
    groups: ['pantorrillas'],
    primary: ['Gastrocnemio (gemelos)'],
    secondary: ['Sóleo'],
    movement: 'Extensión de tobillo',
    category: 'aislamiento',
    equipment: ['maquina'],
    equipmentLabel: 'Prensa de piernas',
    difficulty: 'principiante',
    description: 'Elevación de talones en la prensa. Alternativa estable cuando no hay máquina de gemelos disponible.',
    steps: {
      prep: 'Siéntate en la prensa y apoya solo la parte delantera de los pies en el borde inferior de la plataforma.',
      start: 'Extiende las rodillas (sin bloquearlas) sin retirar los seguros si la máquina lo permite.',
      ecc: 'Deja que la plataforma flexione tus tobillos de forma controlada.',
      turn: 'Mantén el estiramiento 1–2 segundos.',
      con: 'Empuja con la parte delantera del pie extendiendo los tobillos.',
      end: 'Aprieta arriba y repite sin flexionar las rodillas.'
    },
    mistakes: [
      'Colocar los pies demasiado arriba y perder el apoyo.',
      'Flexionar las rodillas durante el movimiento.',
      'Rebotar abajo.',
      'Usar demasiado peso y recortar el recorrido.'
    ],
    tips: [
      'Mantén los seguros puestos si tu prensa lo permite.',
      'Asegura bien el apoyo de los pies antes de cargar.',
      'Útil al final de la sesión de piernas.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { hipertrofia: '10–20', resistencia: '20–30' },
    tension: {
      where: 'La mayor demanda está en la posición estirada, con los tobillos flexionados.',
      cue: 'Recorrido completo y pausa abajo.'
    },
    anim: { preset: 'calf-press', p: ['calves'], s: [] }
  },
  {
    id: 'elevacion-talones-una-pierna',
    name: 'Elevación de talones a una pierna',
    groups: ['pantorrillas'],
    primary: ['Gastrocnemio'],
    secondary: ['Sóleo'],
    movement: 'Extensión de tobillo',
    category: 'aislamiento',
    equipment: ['peso-corporal', 'mancuernas'],
    equipmentLabel: 'Escalón y mancuerna opcional',
    difficulty: 'principiante',
    description: 'Elevación de talones en un escalón con una sola pierna. El peso corporal ya supone una carga considerable, así que es ideal para entrenar en casa.',
    steps: {
      prep: 'Apoya la parte delantera de un pie en el borde de un escalón y sujétate a una pared o barra.',
      start: 'Cruza la otra pierna por detrás y empieza con el talón arriba.',
      ecc: 'Baja el talón lentamente por debajo del escalón hasta notar el estiramiento.',
      turn: 'Haz una pausa de 1–2 segundos abajo, sin rebote.',
      con: 'Sube el talón todo lo que puedas.',
      end: 'Completa la serie y cambia de pierna.'
    },
    mistakes: [
      'Rebotar abajo.',
      'Recortar la bajada.',
      'Flexionar la rodilla para ayudarse.',
      'Ir demasiado rápido.'
    ],
    tips: [
      'La parte baja (estirada) es la que más estímulo genera en la pantorrilla.',
      'Añade una mancuerna en la mano del mismo lado cuando sea fácil.',
      'Las pantorrillas toleran bien repeticiones altas.'
    ],
    goals: ['hipertrofia', 'resistencia'],
    reps: { fuerza: '8–12 con carga', hipertrofia: '10–20', resistencia: '20–30' },
    tension: {
      where: 'El gastrocnemio trabaja más en la parte baja, con el tobillo flexionado y la pantorrilla estirada.',
      cue: 'Baja hasta el fondo y haz una pausa: ahí está el estímulo.'
    },
    anim: { preset: 'calf-standing', opts: { single: true }, p: ['calves'], s: [] }
  },
  {
    id: 'elevacion-talones-maquina',
    name: 'Elevación de talones en máquina de pie',
    groups: ['pantorrillas'],
    primary: ['Gastrocnemio'],
    secondary: ['Sóleo'],
    movement: 'Extensión de tobillo',
    category: 'aislamiento',
    equipment: ['maquina'],
    equipmentLabel: 'Máquina de gemelos de pie',
    difficulty: 'principiante',
    description: 'Elevación de talones de pie con las almohadillas sobre los hombros. Con las rodillas extendidas el gastrocnemio está estirado, y la máquina permite cargar mucho y estable.',
    steps: {
      prep: 'Coloca los hombros bajo las almohadillas y la parte delantera de los pies en la plataforma.',
      start: 'Rodillas extendidas sin bloquear y talones arriba.',
      ecc: 'Baja los talones lentamente por debajo de la plataforma.',
      turn: 'Pausa de 1–2 segundos en el estiramiento.',
      con: 'Sube los talones todo lo posible.',
      end: 'Repite sin rebotar.'
    },
    mistakes: [
      'Rebotar abajo con el tendón.',
      'Flexionar las rodillas para empujar.',
      'Recortar el recorrido para mover más peso.',
      'Repeticiones demasiado rápidas.'
    ],
    tips: [
      'Un estudio encontró más crecimiento del gemelo entrenando en la parte estirada que con el recorrido completo: prioriza la parte baja.',
      'Puedes terminar la serie con repeticiones parciales abajo al llegar al fallo.',
      'Combínala con la versión sentada para cubrir el sóleo.'
    ],
    goals: ['hipertrofia', 'resistencia', 'fuerza'],
    reps: { fuerza: '6–10', hipertrofia: '8–15', resistencia: '15–25' },
    tension: {
      where: 'La mayor exigencia aparece abajo, con el gastrocnemio estirado.',
      cue: 'Baja lento y haz pausa en el estiramiento en cada repetición.'
    },
    anim: { preset: 'calf-standing', opts: { machine: true }, p: ['calves'], s: [] }
  }
];

/* Rangos orientativos por defecto según el tipo de ejercicio.
   Cada ejercicio puede sobrescribirlos con su propio campo "reps". */
const DEFAULT_REPS = {
  compuesto: { fuerza: '3–6', hipertrofia: '6–12', resistencia: '15–20' },
  aislamiento: { fuerza: '6–10', hipertrofia: '8–15', resistencia: '15–25' }
};

/* Índice por id para búsquedas rápidas */
const EXERCISE_INDEX = Object.fromEntries(EXERCISES.map(ex => [ex.id, ex]));
