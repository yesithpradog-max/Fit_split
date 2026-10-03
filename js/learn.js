/* =====================================================================
   FIT SPLIT · learn.js
   ---------------------------------------------------------------------
   Contenido de la biblioteca "Aprende". Cada tema tiene:
   - lead: entrada breve
   - sections: bloques con título, párrafos y listas
   - keyPoints: ideas clave
   - myths: ideas erróneas frecuentes y su matiz
   - widget: componente interactivo opcional (ver views.js)
   - refs: lecturas recomendadas
   ===================================================================== */

const LEARN_TOPICS = [
  {
    id: 'alimentacion',
    title: 'Alimentación',
    icon: 'leaf',
    short: 'El factor más determinante para ver resultados.',
    readTime: 5,
    lead: 'Entrenar genera el estímulo, pero sin una alimentación adecuada el cuerpo no tiene con qué adaptarse. Ninguna rutina, por buena que sea, produce resultados por sí sola.',
    sections: [
      {
        h: 'Por qué es lo más importante',
        p: [
          'El entrenamiento es la señal; la alimentación aporta la energía y los materiales para construir y recuperar. Si comes muy por debajo de lo que gastas o con poca proteína, el progreso en fuerza y masa muscular se frena aunque entrenes bien.',
          'Por eso insistimos: seguir una rutina no hace aparecer resultados de forma mágica. Los resultados vienen de combinar entrenamiento, alimentación, descanso y constancia durante semanas y meses.'
        ]
      },
      {
        h: 'Proteína',
        p: [
          'Es el nutriente clave para mantener y ganar masa muscular. La evidencia sugiere que alrededor de 1,6 g por kilogramo de peso corporal al día maximiza en promedio las ganancias en personas que entrenan, con un rango razonable de 1,6 a 2,2 g/kg.'
        ],
        list: [
          'Repártela en 3–5 comidas a lo largo del día.',
          'Fuentes: huevos, lácteos, carnes, pescado, legumbres, tofu.',
          'Los suplementos de proteína son una opción práctica, no una obligación.'
        ]
      },
      {
        h: 'Energía según tu objetivo',
        list: [
          'Ganar músculo: un ligero superávit calórico facilita el progreso.',
          'Perder grasa: un déficit moderado permite conservar el músculo si mantienes el entrenamiento y la proteína.',
          'Fuerza y rendimiento: come lo suficiente para entrenar con energía y recuperarte entre sesiones.'
        ]
      },
      {
        h: 'Hábitos básicos',
        list: [
          'Prioriza alimentos poco procesados: verduras, frutas, cereales integrales y legumbres.',
          'Mantente hidratado a lo largo del día.',
          'Ningún suplemento sustituye una buena alimentación diaria.',
          'Si tienes una condición médica o necesidades especiales, consulta a un profesional de la nutrición.'
        ]
      }
    ],
    keyPoints: [
      'Sin una alimentación adecuada, la rutina por sí sola no da resultados.',
      'Proteína: alrededor de 1,6 g/kg al día como referencia (1,6–2,2).',
      'La energía total depende de tu objetivo.',
      'Los resultados llegan con constancia: semanas y meses, no días.'
    ],
    myths: [
      { myth: 'Si entreno duro, puedo comer cualquier cosa.', reality: 'El entrenamiento no compensa una alimentación insuficiente o desequilibrada.' },
      { myth: 'Los suplementos son imprescindibles para ganar músculo.', reality: 'Pueden ser cómodos, pero lo esencial es la alimentación de cada día.' }
    ],
    refs: [
      'Morton, R. W. et al. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. British Journal of Sports Medicine.',
      'Jäger, R. et al. (2017). International Society of Sports Nutrition Position Stand: protein and exercise. Journal of the International Society of Sports Nutrition.'
    ]
  },
  {
    id: 'hipertrofia',
    title: 'Hipertrofia',
    icon: 'growth',
    short: '¿Qué es y qué factores influyen en el crecimiento muscular?',
    readTime: 5,
    lead: 'La hipertrofia es el aumento del tamaño de las fibras musculares como adaptación al entrenamiento. No depende de un único factor, sino de cómo se combinan el estímulo, el volumen, la recuperación y la constancia.',
    sections: [
      {
        h: '¿Qué ocurre en el músculo?',
        p: [
          'Cuando un músculo produce fuerza contra una resistencia, sus fibras soportan tensión. Ciertos sensores celulares detectan esa tensión y ponen en marcha procesos que, con el tiempo, aumentan la cantidad de proteínas contráctiles dentro de las fibras.',
          'Ese proceso es lento: una sesión aislada apenas cambia nada, pero la repetición del estímulo durante semanas y meses sí produce cambios medibles.'
        ]
      },
      {
        h: 'Factores que influyen',
        list: [
          'Tensión mecánica: considerada el estímulo principal, aunque no el único.',
          'Esfuerzo: las series que se acercan al fallo reclutan más fibras de alto umbral.',
          'Volumen: el número de series efectivas por grupo muscular a la semana.',
          'Recuperación: sueño, nutrición (sobre todo proteína y energía suficiente) y gestión de la fatiga.',
          'Factores individuales: genética, edad, sexo, historial de entrenamiento.'
        ]
      },
      {
        h: '¿Y el rango de repeticiones?',
        p: [
          'Los estudios muestran crecimiento muscular con un rango amplio de cargas, aproximadamente de 5 a 30 repeticiones por serie, siempre que el esfuerzo sea alto. El rango de 6 a 15 repeticiones es un punto de partida práctico porque equilibra carga, fatiga y tiempo.',
          'No existe un número mágico: 10 repeticiones no son “exclusivas” de la hipertrofia, igual que 5 no son exclusivas de la fuerza.'
        ],
        widget: 'rep-scale'
      }
    ],
    keyPoints: [
      'El crecimiento muscular es una adaptación lenta a un estímulo repetido.',
      'La tensión mecánica es central, pero no actúa sola: esfuerzo, volumen y recuperación también cuentan.',
      'Diferentes rangos de repeticiones pueden producir hipertrofia si las series son exigentes.'
    ],
    myths: [
      { myth: 'Solo creces si entrenas entre 8 y 12 repeticiones.', reality: 'Hay hipertrofia en un rango mucho más amplio cuando el esfuerzo es suficiente.' },
      { myth: 'Si no hay agujetas, no hay crecimiento.', reality: 'El dolor muscular tardío no es un buen indicador del estímulo. Suele disminuir al repetir un ejercicio.' }
    ],
    refs: [
      'Schoenfeld, B. J. (2010). The mechanisms of muscle hypertrophy and their application to resistance training. Journal of Strength and Conditioning Research.',
      'Schoenfeld, B. J., Grgic, J., Ogborn, D. y Krieger, J. W. (2017). Strength and hypertrophy adaptations between low- vs. high-load resistance training. Journal of Strength and Conditioning Research.'
    ]
  },
  {
    id: 'fuerza',
    title: 'Fuerza',
    icon: 'bolt',
    short: '¿Qué significa desarrollar fuerza?',
    readTime: 4,
    lead: 'La fuerza es la capacidad de producir tensión para vencer una resistencia. Mejorarla depende del tamaño del músculo, pero también de que el sistema nervioso aprenda a usarlo mejor.',
    sections: [
      {
        h: 'Dos componentes de la fuerza',
        list: [
          'Muscular: un músculo más grande tiene más capacidad de producir fuerza.',
          'Neural: el sistema nervioso aprende a reclutar más fibras, a activarlas más rápido y a coordinar mejor los músculos que intervienen en el gesto.'
        ],
        p: [
          'Por eso al empezar a entrenar se gana fuerza muy rápido, antes de que el músculo crezca de forma notable: gran parte de la mejora inicial es aprendizaje.'
        ]
      },
      {
        h: 'Especificidad',
        p: [
          'La fuerza es bastante específica. Mejoras más en los ejercicios, rangos de movimiento y velocidades que practicas. Si tu objetivo es levantar más en sentadilla, tienes que practicar la sentadilla con cargas altas.',
          'Las cargas altas (aproximadamente 1–6 repeticiones) son las más específicas para expresar fuerza máxima, pero también se gana fuerza con más repeticiones, sobre todo al principio.'
        ]
      },
      {
        h: 'Cómo suele entrenarse',
        list: [
          'Cargas altas respecto al máximo, con descansos largos (2–5 minutos).',
          'Series lejos del fallo en la mayoría de los casos (RIR 1–3) para mantener la técnica.',
          'Práctica frecuente de los ejercicios principales.',
          'Trabajo complementario en rangos más altos para construir músculo.'
        ]
      }
    ],
    keyPoints: [
      'Ganar fuerza combina adaptaciones del músculo y del sistema nervioso.',
      'La especificidad importa: practica el gesto que quieres mejorar.',
      'Las cargas altas son las más específicas, pero no las únicas que funcionan.'
    ],
    myths: [
      { myth: 'Para ganar fuerza hay que ir siempre al fallo.', reality: 'En el entrenamiento de fuerza se suelen dejar repeticiones en reserva para mantener la técnica y gestionar la fatiga.' },
      { myth: 'Más músculo siempre significa más fuerza inmediata.', reality: 'El músculo ayuda, pero la habilidad técnica y la coordinación también determinan cuánto levantas.' }
    ],
    refs: [
      'American College of Sports Medicine (2009). Progression models in resistance training for healthy adults. Medicine & Science in Sports & Exercise.',
      'Schoenfeld, B. J. et al. (2017). Strength and hypertrophy adaptations between low- vs. high-load resistance training. Journal of Strength and Conditioning Research.'
    ]
  },
  {
    id: 'resistencia-muscular',
    title: 'Resistencia muscular',
    icon: 'repeat',
    short: '¿Cómo funciona la capacidad de repetir esfuerzos?',
    readTime: 3,
    lead: 'La resistencia muscular es la capacidad de un músculo para repetir un movimiento o sostener un esfuerzo durante más tiempo antes de que la fatiga obligue a parar.',
    sections: [
      {
        h: '¿Qué mejora?',
        list: [
          'La capacidad del músculo para tolerar y eliminar los productos de la fatiga.',
          'La red de capilares que lleva oxígeno al músculo.',
          'La eficiencia del gesto: moverse mejor cuesta menos energía.'
        ]
      },
      {
        h: 'Cómo suele entrenarse',
        p: [
          'Con cargas bajas o moderadas, series largas (normalmente 15–30 repeticiones o más) y descansos cortos, de 30 a 90 segundos.',
          'Los descansos cortos forman parte del estímulo: obligan al músculo a empezar cada serie sin haberse recuperado del todo.'
        ]
      },
      {
        h: 'Superposición con la hipertrofia',
        p: [
          'Las series largas también pueden generar hipertrofia si se acercan al fallo. Por eso no tiene sentido hablar de rangos “para tonificar”: lo que cambia entre objetivos es la prioridad, no un efecto exclusivo.'
        ],
        widget: 'rep-scale'
      }
    ],
    keyPoints: [
      'Se entrena con más repeticiones, cargas menores y descansos cortos.',
      'Mantener la técnica bajo fatiga es parte del objetivo.',
      'No es incompatible con ganar músculo.'
    ],
    myths: [
      { myth: 'Muchas repeticiones con poco peso “tonifican” y no hacen crecer el músculo.', reality: 'El “tono” depende de la cantidad de músculo y de grasa corporal. Las series largas y exigentes también generan hipertrofia.' }
    ],
    refs: [
      'American College of Sports Medicine (2009). Progression models in resistance training for healthy adults. Medicine & Science in Sports & Exercise.'
    ]
  },
  {
    id: 'tension-mecanica',
    title: 'Tensión mecánica',
    icon: 'tension',
    short: 'El componente central de la señal que lleva a la adaptación muscular.',
    readTime: 6,
    lead: 'La tensión mecánica es la fuerza que soportan las fibras musculares cuando producen fuerza contra una resistencia. Se considera un componente fundamental de la señal que inicia las adaptaciones musculares, aunque no actúa sola.',
    sections: [
      {
        h: 'De la carga a la adaptación',
        p: [
          'Cuando levantas una carga, el músculo tiene que producir fuerza para moverla o frenarla. Esa fuerza tensa las fibras y sus estructuras internas. Las células musculares detectan esa tensión y la traducen en señales químicas que, repetidas en el tiempo, llevan a adaptaciones como el aumento del tamaño y de la fuerza.'
        ],
        widget: 'tension-flow'
      },
      {
        h: 'Conceptos clave',
        defs: [
          { t: 'Resistencia externa', d: 'La carga que hay que mover: una barra, una mancuerna, el cable de una polea o el propio peso corporal.' },
          { t: 'Producción de fuerza', d: 'La respuesta del músculo para mover o frenar esa resistencia. Depende de la carga, de la palanca y de la velocidad.' },
          { t: 'Tensión de las fibras', d: 'Cuánta fuerza soporta cada fibra activa. Una fibra que se contrae lentamente puede producir más fuerza que una que se contrae muy rápido.' },
          { t: 'Proximidad al fallo', d: 'Al acercarse al fallo, el cuerpo recluta las fibras de mayor umbral y la velocidad baja. Por eso las últimas repeticiones exigentes cuentan mucho.' },
          { t: 'Carga', d: 'Con cargas altas, muchas fibras se reclutan desde la primera repetición. Con cargas bajas, se reclutan sobre todo al final de la serie, cerca del fallo.' },
          { t: 'Control del movimiento', d: 'Un recorrido controlado mantiene la tensión en el músculo objetivo. Los rebotes y el impulso trasladan parte del trabajo a la inercia o a otras estructuras.' }
        ]
      },
      {
        h: 'Más peso no siempre es mejor estímulo',
        p: [
          'Levantar más peso no significa automáticamente generar un mejor estímulo para todos los objetivos. Si el aumento de carga obliga a recortar el recorrido, a usar impulso o a que otros músculos compensen, la tensión sobre el músculo objetivo puede incluso disminuir.',
          'Para la fuerza máxima, mover cargas altas es necesario porque es lo que se quiere expresar. Para la hipertrofia, cargas moderadas llevadas cerca del fallo pueden generar un estímulo comparable.'
        ]
      },
      {
        h: 'No es lo único que importa',
        p: [
          'La tensión mecánica es central, pero el resultado depende también del volumen total, de la frecuencia, de la recuperación, de la nutrición y de factores individuales. Otros mecanismos, como el estrés metabólico, se siguen estudiando y su papel exacto todavía se debate.'
        ]
      }
    ],
    keyPoints: [
      'La tensión mecánica es un componente fundamental de la señal de adaptación.',
      'El esfuerzo (proximidad al fallo) determina cuántas fibras reciben tensión alta.',
      'Más peso con peor técnica puede reducir la tensión en el músculo objetivo.',
      'Volumen, recuperación y constancia completan la ecuación.'
    ],
    myths: [
      { myth: 'La tensión mecánica es literalmente lo único que produce crecimiento.', reality: 'Es el estímulo principal según la evidencia actual, pero el resultado depende de muchos otros factores.' },
      { myth: 'Cuanto más peso levantes, más tensión tendrá el músculo.', reality: 'La tensión sobre un músculo concreto depende también de la técnica, el recorrido y la proximidad al fallo.' }
    ],
    refs: [
      'Wackerhage, H. et al. (2019). Stimuli and sensors that initiate skeletal muscle hypertrophy following resistance exercise. Journal of Applied Physiology.',
      'Schoenfeld, B. J. (2010). The mechanisms of muscle hypertrophy and their application to resistance training. Journal of Strength and Conditioning Research.'
    ]
  },
  {
    id: 'seleccion-ejercicios',
    title: 'Cómo elige los ejercicios el entrenador',
    shortTitle: 'Elegir ejercicios',
    icon: 'coach',
    short: 'Qué dice la investigación sobre los ejercicios más eficaces y por qué FIT SPLIT limita la fatiga de cada sesión.',
    readTime: 7,
    lead: 'No todos los ejercicios estimulan igual a un músculo. La investigación reciente apunta a un patrón: los ejercicios que cargan el músculo cuando está estirado suelen dar muy buenos resultados. FIT SPLIT usa esa evidencia para recomendar ejercicios y, además, pone límites para que una sesión no acumule más fatiga de la que puedes recuperar.',
    sections: [
      {
        h: 'La posición estirada importa',
        p: [
          'Varios estudios comparan el mismo músculo entrenado en distintas partes del recorrido. Cuando la carga es mayor con el músculo estirado, el crecimiento suele ser igual o mayor que con el músculo acortado. Por eso el entrenador prioriza ejercicios como el curl femoral sentado, las extensiones de tríceps por encima de la cabeza, el curl inclinado o la sentadilla profunda.',
          'Esto no significa que los demás ejercicios no sirvan: cualquier ejercicio llevado cerca del fallo con buena técnica produce estímulo. Significa que, a igualdad de esfuerzo, algunos rinden más por serie.'
        ],
        list: [
          'Tríceps: la extensión con el brazo por encima de la cabeza produjo alrededor de 1,4 veces más crecimiento que con el brazo abajo.',
          'Isquiotibiales: el curl sentado (cadera flexionada, músculo más estirado) superó al curl tumbado.',
          'Gemelos: entrenar la parte baja del recorrido, con el talón por debajo del escalón, dio más crecimiento.',
          'Glúteos: la sentadilla profunda hizo crecer más el glúteo que la media sentadilla; el hip thrust logró un resultado parecido al de la sentadilla.',
          'Cuádriceps: en la extensión de piernas, trabajar con la rodilla flexionada (músculo estirado) fue más eficaz.'
        ]
      },
      {
        h: 'Cómo valora cada ejercicio',
        defs: [
          { t: 'Recomendado (estrella)', d: 'Ejercicios con buen respaldo para el grupo muscular: tensión en la posición estirada, recorrido completo y facilidad para progresar.' },
          { t: 'Exigencia', d: 'Cuánta fatiga general provoca. Un peso muerto o una sentadilla con barra cansan todo el cuerpo; una extensión en polea, casi solo el músculo trabajado.' },
          { t: 'Valoración', d: 'Una nota interna de 1 a 5 que ordena las opciones de cada grupo. Las más bajas no se prohíben, pero el entrenador te sugiere alternativas.' }
        ]
      },
      {
        h: 'Los límites del entrenador',
        p: [
          'Más ejercicios no es mejor. Los beneficios de añadir series en la misma sesión se reducen a partir de un punto, mientras la fatiga y el riesgo de lesión siguen subiendo. Por eso FIT SPLIT no te deja seleccionar sin control:'
        ],
        list: [
          'Como máximo 2 ejercicios muy exigentes por sesión (por ejemplo, sentadilla y peso muerto rumano). El tercero queda bloqueado.',
          'Un número máximo de ejercicios por sesión según tu objetivo: 5 para fuerza, 8 para hipertrofia y 9 para resistencia.',
          'Un máximo de series por músculo y sesión (unas 9, o 12 si la sesión se centra en uno o dos grupos).',
          'Hueco reservado para los grupos que aún no tienen ejercicios, para que la sesión quede equilibrada.',
          'Los ejercicios se ordenan solos: compuestos y exigentes primero, cuando estás más fresco.'
        ]
      },
      {
        h: 'Tu parte del trabajo',
        p: [
          'El entrenador reduce los riesgos de la planificación, pero la técnica, el calentamiento y elegir cargas que puedas controlar dependen de ti. Ante dolor o una lesión previa, consulta a un profesional sanitario antes de entrenar.'
        ]
      }
    ],
    keyPoints: [
      'Los ejercicios que cargan el músculo estirado suelen rendir más por serie.',
      'Cualquier ejercicio funciona si te acercas al fallo con buena técnica: la estrella indica los más eficaces.',
      'Más ejercicios por sesión no es mejor: la fatiga crece más rápido que el beneficio.',
      'FIT SPLIT limita los ejercicios muy exigentes a 2 por sesión.'
    ],
    myths: [
      { myth: 'Cuantos más ejercicios hagas para un músculo en un día, más crece.', reality: 'Pasadas unas 10–12 series por músculo y sesión, el beneficio extra es pequeño y la fatiga sigue aumentando. Es mejor repartir el volumen en la semana.' },
      { myth: 'Solo sirven los ejercicios básicos con barra.', reality: 'Las máquinas y las poleas permiten cargar el músculo estirado con seguridad y acercarse al fallo con menos riesgo. Son herramientas, no atajos.' },
      { myth: 'El “bombeo” al final del recorrido es la señal de un buen ejercicio.', reality: 'La sensación de congestión no predice bien el crecimiento. La tensión en la posición estirada parece más importante.' }
    ],
    refs: [
      { text: 'Maeo, S. et al. (2023). Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position.', url: 'https://onlinelibrary.wiley.com/doi/10.1080/17461391.2022.2100279' },
      { text: 'Maeo, S. et al. (2021). Greater hamstrings muscle hypertrophy but similar damage protection after training at long versus short muscle lengths.', url: 'https://www.researchgate.net/publication/344445943_Greater_Hamstrings_Muscle_Hypertrophy_but_Similar_Damage_Protection_after_Training_at_Long_versus_Short_Muscle_Lengths' },
      { text: 'Kassiano, W. et al. (2023). Greater gastrocnemius muscle hypertrophy after partial range of motion training performed at long muscle lengths.', url: 'https://www.researchgate.net/publication/365127382_Greater_gastrocnemius_muscle_hypertrophy_after_partial_range_of_motion_training_performed_at_long_muscle_lengths' },
      { text: 'Lengthened partial repetitions elicit similar muscular adaptations as full range of motion repetitions during resistance training in trained individuals.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11829627/' },
      { text: 'Kubo, K. et al. (2019). Effects of squat training with different depths on lower limb muscle volumes (resumen de Stronger by Science).', url: 'https://www.strongerbyscience.com/research-spotlight-squat-depth/' },
      { text: 'Pedrosa, G. F. et al. (2022). Partial range of motion training elicits favorable improvements in muscular adaptations when carried out at long muscle lengths (resumen de Stronger by Science).', url: 'https://www.strongerbyscience.com/leg-extension-muscle-growth/' },
      { text: 'Plotkin, D. et al. (2023). Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift.', url: 'https://www.biorxiv.org/content/10.1101/2023.06.21.545949v1' },
      { text: 'Pedrosa, G. F. et al. (2023). Training in the initial range of motion promotes greater muscle adaptations than at final in the arm curl.', url: 'https://www.mdpi.com/2075-4663/11/2/39' },
      { text: 'Is there too much of a good thing? Meta-regressions of the effect of per-session volume on hypertrophy and strength (2023).', url: 'https://sportrxiv.org/index.php/server/preprint/view/537' }
    ]
  },
  {
    id: 'volumen',
    title: 'Volumen',
    icon: 'layers',
    short: '¿Cuánto entrenamiento haces y cómo se mide?',
    readTime: 4,
    lead: 'El volumen de entrenamiento es la cantidad total de trabajo que realizas. Para planificar la hipertrofia, la forma más práctica de medirlo es contar las series efectivas por grupo muscular a la semana.',
    sections: [
      {
        h: 'Formas de medirlo',
        list: [
          'Series efectivas: series suficientemente exigentes (normalmente con RIR 0–4). Es la medida más práctica.',
          'Tonelaje: series × repeticiones × carga. Útil en algunos contextos, pero mezcla cosas distintas.',
          'Repeticiones totales: útil sobre todo para la resistencia muscular.'
        ],
        widget: 'volume-calc'
      },
      {
        h: '¿Cuánto volumen?',
        p: [
          'La relación entre volumen e hipertrofia es de tipo dosis-respuesta: más series semanales tienden a producir más crecimiento, hasta un punto en el que la recuperación se convierte en el límite.',
          'Como referencia general, muchas personas progresan con unas 10–20 series semanales por grupo muscular. Quien empieza suele necesitar menos; las personas avanzadas pueden tolerar más. La respuesta es individual.'
        ]
      },
      {
        h: 'Repartir el volumen',
        p: [
          'El mismo volumen semanal se puede repartir en una, dos o tres sesiones. Cuando el volumen está igualado, las diferencias entre frecuencias suelen ser pequeñas, pero repartirlo ayuda a que cada serie se haga con menos fatiga acumulada.'
        ]
      }
    ],
    keyPoints: [
      'Cuenta series efectivas por grupo muscular y semana.',
      'Más volumen tiende a dar más resultados hasta que la recuperación se convierte en el límite.',
      'Aumenta el volumen de forma gradual y observa cómo respondes.'
    ],
    myths: [
      { myth: 'Cuanto más volumen, siempre mejor.', reality: 'A partir de cierto punto, más series añaden fatiga sin añadir estímulo útil.' },
      { myth: 'Las series fáciles cuentan igual que las exigentes.', reality: 'Una serie muy lejos del fallo aporta poco estímulo para la hipertrofia.' }
    ],
    refs: [
      'Schoenfeld, B. J., Ogborn, D. y Krieger, J. W. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass. Journal of Sports Sciences.',
      'Schoenfeld, B. J., Ogborn, D. y Krieger, J. W. (2016). Effects of resistance training frequency on measures of muscle hypertrophy. Sports Medicine.'
    ]
  },
  {
    id: 'intensidad',
    title: 'Intensidad',
    icon: 'gauge',
    short: 'Una palabra con varios significados. Conviene definirla bien.',
    readTime: 4,
    lead: '“Intensidad” se usa de formas distintas en el gimnasio y en la ciencia del entrenamiento. Para evitar confusiones, conviene especificar de qué intensidad se habla.',
    sections: [
      {
        h: 'Tres usos habituales',
        widget: 'intensity-table'
      },
      {
        h: '¿Por qué importa la diferencia?',
        p: [
          'Una serie de 20 repeticiones al 50 % de 1RM tiene una intensidad de carga baja, pero si llega al fallo, el esfuerzo es máximo. Una serie de 3 repeticiones al 85 % de 1RM tiene una intensidad de carga alta, pero si se queda con 5 repeticiones en reserva, el esfuerzo es moderado.',
          'Por eso, en FIT SPLIT hablamos de “carga” (cuánto peso respecto a tu máximo) y de “esfuerzo” (cuánto te acercas al fallo, medido con el RIR).'
        ]
      }
    ],
    keyPoints: [
      'Intensidad de carga: porcentaje de tu máximo.',
      'Intensidad de esfuerzo: proximidad al fallo (RIR o RPE).',
      'Especifica siempre a cuál te refieres.'
    ],
    myths: [
      { myth: 'Entrenar intenso significa sudar mucho y terminar agotado.', reality: 'La sensación de cansancio general no mide bien ni la carga ni el esfuerzo de cada serie.' }
    ],
    refs: [
      'Helms, E. R. et al. (2016). Application of the repetitions in reserve-based rating of perceived exertion scale for resistance training. Strength and Conditioning Journal.'
    ]
  },
  {
    id: 'rir',
    title: 'RIR',
    icon: 'target',
    short: 'Repeticiones en reserva: una forma práctica de medir el esfuerzo.',
    readTime: 4,
    lead: 'RIR significa Repeticiones en Reserva: cuántas repeticiones más podrías haber hecho con buena técnica al terminar una serie. Es una forma sencilla de medir y regular el esfuerzo.',
    sections: [
      {
        h: 'Cómo se interpreta',
        widget: 'rir',
        list: [
          'RIR 3: podrías haber hecho aproximadamente tres repeticiones más.',
          'RIR 1: podrías haber hecho aproximadamente una repetición más.',
          'RIR 0: fallo; no podrías completar otra repetición con técnica adecuada.'
        ]
      },
      {
        h: 'Para qué sirve',
        p: [
          'Permite ajustar la carga cada día según cómo te encuentres. Si un día la carga habitual te deja en RIR 0 en lugar de RIR 2, quizá estás más fatigado y conviene ajustar.',
          'También ayuda a planificar: una serie de hipertrofia suele estar entre RIR 0 y 3; una de fuerza, normalmente entre RIR 1 y 3.'
        ]
      },
      {
        h: 'Aprender a estimarlo',
        p: [
          'Al principio es normal subestimar cuántas repeticiones quedan. La precisión mejora con la práctica, sobre todo cerca del fallo. Una forma de calibrarlo es llevar ocasionalmente una serie al fallo en un ejercicio seguro (por ejemplo, en máquina) y comparar con lo que habías estimado.'
        ]
      }
    ],
    keyPoints: [
      'RIR = repeticiones que podrías haber hecho con buena técnica.',
      'No es necesario llegar al fallo en todas las series.',
      'La precisión al estimarlo mejora con la experiencia.'
    ],
    myths: [
      { myth: 'Tienes que llegar al fallo siempre para progresar.', reality: 'Las series con 1–3 repeticiones en reserva pueden producir resultados similares con menos fatiga.' }
    ],
    refs: [
      'Zourdos, M. C. et al. (2016). Novel resistance training-specific rating of perceived exertion scale measuring repetitions in reserve. Journal of Strength and Conditioning Research.',
      'Refalo, M. C. et al. (2023). Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: a systematic review with meta-analysis. Sports Medicine.'
    ]
  },
  {
    id: 'recuperacion',
    title: 'Recuperación',
    icon: 'moon',
    short: 'El entrenamiento estimula; la recuperación permite adaptarse.',
    readTime: 4,
    lead: 'El entrenamiento genera el estímulo, pero la adaptación se consolida durante la recuperación. Sin descanso suficiente, la fatiga se acumula y el progreso se estanca.',
    sections: [
      {
        h: 'Pilares de la recuperación',
        widget: 'recovery-list'
      },
      {
        h: 'Señales de que algo no va bien',
        list: [
          'El rendimiento baja durante varias sesiones seguidas.',
          'Dolor articular persistente o molestias que no mejoran.',
          'Sueño de peor calidad, irritabilidad o falta de motivación prolongada.',
          'Cargas habituales que se sienten mucho más pesadas sin motivo aparente.'
        ]
      },
      {
        h: 'Descargas',
        p: [
          'Una semana de descarga reduce temporalmente el volumen o la carga (por ejemplo, la mitad de series) para disipar la fatiga acumulada. No es una pérdida de tiempo: ayuda a llegar fresco al siguiente bloque de entrenamiento.'
        ]
      }
    ],
    keyPoints: [
      'El sueño es la herramienta de recuperación más importante.',
      'Una ingesta suficiente de proteína y energía apoya la adaptación.',
      'Ajustar el volumen y planificar descargas evita acumular fatiga.'
    ],
    myths: [
      { myth: 'Descansar es perder progreso.', reality: 'El progreso se consolida durante el descanso; entrenar sin recuperarse limita los resultados.' }
    ],
    refs: [
      'American College of Sports Medicine (2009). Progression models in resistance training for healthy adults. Medicine & Science in Sports & Exercise.'
    ]
  },
  {
    id: 'sobrecarga-progresiva',
    title: 'Sobrecarga progresiva',
    shortTitle: 'Progresión',
    icon: 'stairs',
    short: 'Cómo aumentar la demanda del entrenamiento de forma gradual.',
    readTime: 4,
    lead: 'Para seguir adaptándose, el cuerpo necesita que la demanda del entrenamiento aumente con el tiempo. La sobrecarga progresiva consiste en incrementar esa demanda de forma gradual y sostenible.',
    sections: [
      {
        h: 'Formas de progresar',
        list: [
          'Más repeticiones con la misma carga.',
          'Más carga con las mismas repeticiones.',
          'Más series (más volumen semanal).',
          'Mejor técnica o un recorrido más completo con la misma carga.',
          'Menos repeticiones en reserva con la misma carga.'
        ]
      },
      {
        h: 'Ejemplo: doble progresión',
        p: [
          'Es una de las formas más sencillas. Eliges un rango, por ejemplo 8–12 repeticiones. Cuando completas todas las series con 12 repeticiones y buena técnica, aumentas la carga y vuelves a empezar cerca de 8.'
        ],
        widget: 'progression'
      },
      {
        h: 'Progresar no siempre es lineal',
        p: [
          'Al principio se progresa casi cada semana. Con la experiencia, el progreso se vuelve más lento y menos regular. Habrá días peores por sueño, estrés o fatiga, y es normal.',
          'Registrar las sesiones (ejercicio, carga, repeticiones y RIR) es la mejor forma de saber si realmente progresas.'
        ]
      }
    ],
    keyPoints: [
      'La demanda debe aumentar con el tiempo para seguir adaptándose.',
      'Hay muchas formas de progresar además de añadir peso.',
      'Registra tus sesiones para tomar decisiones con datos.'
    ],
    myths: [
      { myth: 'Hay que subir peso en cada sesión.', reality: 'Subir repeticiones, mejorar la técnica o añadir series también es progresar.' }
    ],
    refs: [
      'American College of Sports Medicine (2009). Progression models in resistance training for healthy adults. Medicine & Science in Sports & Exercise.'
    ]
  }
];

/* Temas que aparecen en la portada ("Aprende los fundamentos") */
const FUNDAMENTALS = ['alimentacion', 'seleccion-ejercicios', 'tension-mecanica', 'rir', 'recuperacion', 'sobrecarga-progresiva'];

/* Contenido de apoyo para los widgets interactivos */
const INTENSITY_MEANINGS = [
  { name: 'Intensidad de carga', measure: '% de 1RM', example: '80 % de 1RM ≈ una carga que podrías levantar unas 8 veces', use: 'Programación de fuerza' },
  { name: 'Intensidad de esfuerzo', measure: 'RIR o RPE', example: 'RIR 1 = te queda aproximadamente una repetición', use: 'Regular la proximidad al fallo' },
  { name: 'Uso coloquial', measure: 'Sensación general', example: '“Hoy entrené muy intenso”', use: 'Poco útil para planificar' }
];

const RECOVERY_PILLARS = [
  { title: 'Sueño', text: 'Unas 7–9 horas para la mayoría de adultos. Dormir poco de forma habitual reduce el rendimiento y la recuperación.', icon: 'moon' },
  { title: 'Nutrición', text: 'Proteína suficiente repartida en el día y energía adecuada para tu objetivo.', icon: 'leaf' },
  { title: 'Gestión de la fatiga', text: 'No todas las series necesitan llegar al fallo. Ajusta el volumen según cómo respondes.', icon: 'gauge' },
  { title: 'Tiempo entre sesiones', text: 'Deja normalmente 48–72 horas antes de entrenar de nuevo el mismo grupo con alto volumen.', icon: 'calendar' },
  { title: 'Estrés general', text: 'El trabajo, el estudio y el descanso también afectan a tu capacidad de recuperarte.', icon: 'pulse' }
];
