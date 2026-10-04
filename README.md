# FIT SPLIT

**Entiende tu entrenamiento. Entrena con propósito.**

FIT SPLIT es una plataforma web educativa e interactiva sobre entrenamiento de fuerza, hipertrofia y resistencia muscular. Guía al usuario paso a paso: define su objetivo, elige un método y una frecuencia y selecciona los ejercicios de cada día con un **entrenador integrado** que recomienda los ejercicios con mejor respaldo científico y no permite sesiones con exceso de fatiga. Al terminar, el usuario tiene un **panel personal** desde el que entrena cualquier día, modifica su rutina y mantiene su **racha**.

Proyecto universitario de Ingeniería de Software. Hecho con HTML5, CSS3 y JavaScript moderno, sin backend ni frameworks. La única librería externa es **three.js** (para las animaciones 3D), incluida dentro del proyecto en `assets/vendor/`, así que no depende de ningún servidor externo.

---

## Cómo ejecutarlo

Opción 1: abrir `index.html` directamente en el navegador (doble clic).

Opción 2 (recomendada para desarrollo): servir la carpeta con cualquier servidor estático:

```bash
npx serve .
# o
python3 -m http.server 8080
```

y abrir `http://localhost:8080`.

El objetivo, el plan, la rutina, el entrenamiento en curso, el historial y la racha se guardan en `localStorage`, es decir, en el navegador de cada usuario.

---

## Recorrido del usuario

| Paso | Qué ocurre |
|---|---|
| **Pregunta inicial** | En la primera visita, antes de todo, la página pregunta: *¿Qué quieres conseguir?* (fuerza, hipertrofia o resistencia muscular). |
| **1 · Objetivo** | Ajusta repeticiones, series, esfuerzo (RIR), descansos y los límites del entrenador. |
| **2 · Método** | 5 métodos (Push Pull Legs, Arnold Split, Upper / Lower, Full Body, Bro Split), cada uno en pestañas: qué es, ventajas y desventajas, para quién, preguntas y comparativa. |
| **3 · Frecuencia** | Variantes de cada método. Al cambiar la frecuencia solo se actualizan las tarjetas de la semana. |
| **4 · Ejercicios** | Se eligen los ejercicios de **todos** los grupos del día. El entrenador marca los recomendados, bloquea lo que no es seguro y puede completar el día por ti. «Guardar y continuar» lleva al siguiente día pendiente. |
| **5 · Rutina lista** | Al terminar la semana, el inicio pasa a ser el **panel personal**, y así se mantiene cada vez que se abre la página. |
| **Entrenar** | Desde el panel, cualquier día: un ejercicio cada vez con animación, series, descanso y **Siguiente ejercicio**. |
| **Final** | Resumen, racha y recordatorio: **lo más importante es la alimentación**. |

El indicador de pasos superior es solo informativo: muestra en qué paso estás, no es un enlace.

### Panel personal

- **Hoy toca:** la sesión del día con su rutina ordenada, duración estimada y botón para empezar (o descanso y próximo entrenamiento).
- **Racha:** entrenamientos seguidos mientras se cumplan los días planificados de cada semana; si un día falla, se puede recuperar otro día de esa semana. Muestra la semana actual, la mejor racha y el total.
- **Mi semana:** los 7 días con su rutina, estado (hecho / pendiente) y botones **Entrenar** y **Editar**.
- **Dos botones directos:** «Cambiar método de entrenamiento» y «Cambiar ejercicios del método actual».
- **Abajo:** cambiar objetivo y borrar los datos.
- **Reanudar entrenamiento:** el botón animado de la cabecera solo aparece mientras hay un entrenamiento sin terminar (caduca a las 24 h).

### El entrenador (`js/coach.js`)

Cada ejercicio tiene una **exigencia** (alta, media o baja) y una **valoración** para ganar músculo. Las reglas no se pueden saltar:

| Regla | Límite |
|---|---|
| Ejercicios muy exigentes (sentadilla, peso muerto, press de banca, dominadas…) | máximo **2 por sesión** |
| Ejercicios por sesión | 5 (fuerza) · 8 (hipertrofia) · 9 (resistencia) |
| Series por músculo y sesión | ≈ 9, o 12 si la sesión se centra en 1–2 grupos |
| Grupos sin ejercicios | se reserva hueco para ellos |

Si una regla impide elegir un ejercicio, la tarjeta se marca como bloqueada y explica el motivo. El panel **Control del entrenador** muestra ejercicios, ejercicios exigentes, series y duración estimada.

Los **recomendados** se apoyan en estudios que priorizan cargar el músculo en posición estirada: extensión de tríceps sobre la cabeza (Maeo 2023), curl femoral sentado (Maeo 2021), gemelo en la parte baja (Kassiano 2023), sentadilla profunda (Kubo 2019), hip thrust y sentadilla (Plotkin 2023), extensión de piernas (Pedrosa 2022) y curl en la parte inicial del recorrido (Pedrosa 2023). Las referencias con enlace están en `COACH_REFS` y en el tema *Cómo elige los ejercicios el entrenador* de la sección Aprende.

Además:

- **Ejercicios:** 72 ejercicios (de 5 a 11 por grupo muscular) con búsqueda y filtros. Cada uno abre una ficha con animación y pestañas: resumen, técnica en 6 pasos, errores, consejos, objetivo y tensión mecánica.
- **Aprende:** 11 temas en pestañas, con widgets interactivos y lecturas.

### Orden automático de la rutina

`Planner.orderRoutine()` en `js/workouts.js` ordena los ejercicios elegidos así:

1. Ejercicios **compuestos** antes que los de aislamiento.
2. Grupos musculares **grandes** (pecho, espalda, cuádriceps) antes que los pequeños (bíceps, tríceps, pantorrillas).
3. Entre ejercicios parecidos, los más exigentes y técnicos primero, cuando hay menos fatiga.

Un ejercicio elegido en dos grupos (por ejemplo, la sentadilla en cuádriceps y glúteos) se hace una sola vez.

---

## Rutas

```
#/plan/objetivo        paso 1 (también la pregunta inicial)
#/plan/metodo          paso 2
#/plan/frecuencia      paso 3
#/                     inicio: planificación o panel personal
#/plan/dia/lun         paso 4 (ejercicios del lunes)
#/entrenar             entrenamiento en curso
#/entrenar/fin         final del entrenamiento
#/ejercicios           biblioteca de ejercicios
#/ejercicio/sentadilla ficha de un ejercicio
#/aprende/alimentacion tema educativo
#/sobre                sobre el proyecto
```

---

## Estructura del proyecto

```
index.html              Estructura, cabecera (retroceso, Inicio, Reanudar) y carga de scripts
css/
  styles.css            Variables de diseño, componentes y cuerpo animado
  responsive.css        Adaptación a portátil, tablet y móvil
js/
  data.js               DATOS: días, grupos, objetivos, tipos de sesión, métodos,
                        mensaje de alimentación
  exercises.js          DATOS: 72 ejercicios
  learn.js              DATOS: contenido de la sección Aprende
  workouts.js           LÓGICA: Planner (sesiones, orden automático) y WorkoutStore
                        (objetivo, plan, rutina, entrenamiento en curso, historial y racha)
  coach.js              ENTRENADOR: valoraciones, recomendados con estudios, límites
                        de seguridad, series y descansos, autocompletado
  animations.js         ANIMACIONES: patrones de movimiento, cinemática inversa
                        y versión 2D (SVG)
  animations3d.js       ANIMACIONES 3D: maniquí de cristal con músculos, equipamiento
                        y cámara giratoria (three.js)
  ui.js                 INTERFAZ: componentes (tarjetas, pestañas, diálogos, avisos)
  views.js              INTERFAZ: una función por pantalla
  app.js                INTERFAZ: enrutador, cabecera y delegación de eventos
assets/
  vendor/three.min.js   three.js r149 (licencia MIT, ver three-LICENSE.txt)
  icons/favicon.svg
  images/og-image.png   Imagen al compartir el enlace
```

### Flujo de datos

```
URL (#/plan/dia/lun)
   │
   ▼
app.js (enrutador) ──► views.js (vista) ──► ui.js (componentes)
                           │
                           ├── Planner (workouts.js) ◄── data.js / exercises.js
                           ├── Coach (coach.js): reglas y recomendaciones
                           ├── WorkoutStore (workouts.js) ◄──► localStorage
                           └── Animations (animations.js)
```

Cuando cambian los datos (por ejemplo, al elegir un ejercicio), `WorkoutStore` avisa a `app.js`, que llama a `update()` de la vista: solo se vuelve a dibujar lo que cambió, sin recargar ni mover la página.

---

## Cómo funcionan las animaciones

Cada ejercicio usa un patrón de movimiento (`bench`, `squat`, `curl`, `rdl`...). El patrón construye el esqueleto para una posición `t` entre 0 (posición inicial) y 1 (punto de transición). Manos y pies se colocan donde deben estar y codos y rodillas se calculan con **cinemática inversa de dos segmentos** (ley del coseno). Una línea de tiempo recorre las 5 fases del movimiento y la excéntrica dura más que la concéntrica.

### Vista 3D (`js/animations3d.js`)

- El esqueleto del patrón se convierte a 3D: en la vista lateral se añade la anchura del cuerpo; en las vistas frontales la profundidad se reconstruye a partir de la longitud real de cada segmento.
- El maniquí se construye con superficies anatómicas (torso, cuello, cabeza, brazos, manos, piernas y pies) y más de 60 vientres musculares con textura de fibras. Los músculos que trabaja el ejercicio se iluminan con el color de su sesión.
- La piel es de **cristal**: un volumen semitransparente con brillo en los bordes (efecto Fresnel). Se dibuja solo la superficie exterior para que no aparezcan costuras internas.
- El equipamiento (barras, mancuernas, poleas, bancos, máquinas) se genera a partir del mismo patrón.
- **Cámara:** arrastrar para girar, rueda o dos dedos para acercar, flechas del teclado, y botones 3/4, Lateral, Frontal, Espalda y Arriba.
- Las miniaturas de las tarjetas se renderizan en 3D una sola vez y se guardan en memoria.
- Si el navegador no admite WebGL, se usa automáticamente la animación 2D en SVG.

## Cómo ampliar el proyecto

- **Nuevo método:** añadir un objeto a `METHODS` en `js/data.js` con sus variantes (`schedule` indica la sesión de cada día).
- **Nuevo ejercicio:** añadir un objeto a `EXERCISES` en `js/exercises.js` con un patrón de animación existente, y su exigencia y valoración en `COACH_RATINGS` (`js/coach.js`). Para destacarlo, añadir su id a `RECOMMENDED`.
- **Nuevo tema educativo:** añadir un objeto a `LEARN_TOPICS` en `js/learn.js`.

Las pantallas se generan solas a partir de los datos.

---

## Accesibilidad

- HTML semántico, botones reales, pestañas con roles ARIA y navegación con flechas del teclado.
- Foco visible, enlace "Saltar al contenido" y foco en el título al cambiar de pantalla.
- Avisos en regiones `aria-live`.
- Respeta `prefers-reduced-motion`: las animaciones no se reproducen solas.

---

## Enlaces

Todos los enlaces internos se comprueban recorriendo el sitio completo (sin enlaces rotos). Los únicos enlaces externos son las 9 referencias a estudios científicos (sección Aprende y recomendados), que abren en una pestaña nueva.

## Publicación en internet

Es un sitio estático: se puede publicar gratis en **GitHub Pages**, **Netlify**, **Vercel** o **Cloudflare Pages**.

1. Subir la carpeta a un repositorio de GitHub.
2. Activar GitHub Pages (Settings → Pages → rama `main`, carpeta raíz) o conectar el repositorio en Netlify / Vercel.
3. (Opcional) Conectar un dominio propio.
4. Para aparecer al buscar "FIT SPLIT" en Google: registrar el sitio en Google Search Console, añadir un `sitemap.xml` con la URL definitiva y solicitar la indexación.
5. Con la URL definitiva, actualizar `og:image` en `index.html` a una dirección absoluta y añadir la etiqueta `canonical`.

---

## Aviso

El contenido es educativo y general. No sustituye la valoración de un profesional sanitario, de la nutrición o del ejercicio.
