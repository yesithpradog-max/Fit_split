# FIT SPLIT

**Entiende tu entrenamiento. Entrena con propósito.**

FIT SPLIT es una plataforma web educativa e interactiva sobre entrenamiento de fuerza, hipertrofia y resistencia muscular. Guía al usuario paso a paso: define su objetivo, elige un método y una frecuencia, selecciona los ejercicios de cada día (la aplicación los ordena de la forma más eficaz) y entrena ejercicio por ejercicio con animaciones de un cuerpo transparente que muestra los músculos que trabajan.

Proyecto universitario de Ingeniería de Software. Hecho con HTML5, CSS3 y JavaScript moderno, sin backend, sin frameworks y sin dependencias que instalar.

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

El objetivo, el plan, la selección de ejercicios y el entrenamiento en curso se guardan en `localStorage`, es decir, en el navegador de cada usuario.

---

## Recorrido del usuario

| Paso | Qué ocurre |
|---|---|
| **Pregunta inicial** | En la primera visita, antes de todo, la página pregunta: *¿Qué quieres conseguir?* (fuerza, hipertrofia o resistencia muscular). |
| **1 · Objetivo** | Ajusta repeticiones, series, esfuerzo (RIR) y descanso de todos los ejercicios. |
| **2 · Método** | 5 métodos (Push Pull Legs, Arnold Split, Upper / Lower, Full Body, Bro Split). Al tocar uno se muestra su detalle en pestañas: qué es, ventajas y desventajas, para quién, preguntas y comparativa. |
| **3 · Frecuencia** | Variantes de cada método (por ejemplo, PPL de 3, 5 o 6 días). Al cambiar la frecuencia solo se actualizan las tarjetas de la semana, sin recargar la página. |
| **4 · Ejercicios del día** | El usuario elige los ejercicios de **todos** los grupos musculares del día. Los ejercicios **recomendados** aparecen primero y destacados. La aplicación calcula el **orden automático** de la rutina. |
| **5 · Entrenar** | Un ejercicio cada vez: animación, series y repeticiones según el objetivo, registro de series, temporizador de descanso y botón **Siguiente ejercicio**. |
| **Final** | Resumen y recordatorio: **lo más importante es la alimentación**; la rutina por sí sola no produce resultados mágicamente. |

Además:

- **Cabecera mínima:** flecha para retroceder, logo e Inicio. Si hay un entrenamiento en curso, aparece un botón animado **Reanudar entrenamiento**, y el inicio muestra la opción **Continuar entrenamiento**.
- **Inicio:** planificación paso a paso (objetivo, método, frecuencia), **fundamentos importantes** (alimentación primero) y accesos a la biblioteca.
- **Ejercicios:** 42 ejercicios con búsqueda y filtros (grupo, equipamiento, dificultad, objetivo). Cada uno abre una ficha con animación y pestañas: resumen, técnica en 6 pasos, errores, consejos, recomendaciones según el objetivo y tensión mecánica.
- **Aprende:** 10 temas (alimentación, hipertrofia, fuerza, resistencia, tensión mecánica, volumen, intensidad, RIR, recuperación y sobrecarga progresiva) organizados en pestañas, con widgets interactivos.

### Orden automático de la rutina

`Planner.orderRoutine()` en `js/workouts.js` ordena los ejercicios elegidos así:

1. Ejercicios **compuestos** antes que los de aislamiento.
2. Grupos musculares **grandes** (pecho, espalda, cuádriceps) antes que los pequeños (bíceps, tríceps, pantorrillas).
3. Entre ejercicios parecidos, los más técnicos primero, cuando hay menos fatiga.

Un ejercicio elegido en dos grupos (por ejemplo, la sentadilla en cuádriceps y glúteos) se hace una sola vez.

---

## Rutas

```
#/plan/objetivo        paso 1 (también la pregunta inicial)
#/plan/metodo          paso 2
#/plan/frecuencia      paso 3
#/plan/dia/lun         paso 4 (ejercicios del lunes)
#/entrenar             paso 5 (entrenamiento en curso)
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
  exercises.js          DATOS: 42 ejercicios y ejercicios recomendados por grupo
  learn.js              DATOS: contenido de la sección Aprende
  workouts.js           LÓGICA: Planner (sesiones, límites, orden automático) y
                        WorkoutStore (objetivo, plan, selección y entrenamiento en curso)
  animations.js         ANIMACIONES: cuerpo transparente con músculos, cinemática
                        inversa y patrones de movimiento
  ui.js                 INTERFAZ: componentes (tarjetas, pestañas, diálogos, avisos)
  views.js              INTERFAZ: una función por pantalla
  app.js                INTERFAZ: enrutador, cabecera y delegación de eventos
assets/
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
                           ├── WorkoutStore (workouts.js) ◄──► localStorage
                           └── Animations (animations.js)
```

Cuando cambian los datos (por ejemplo, al elegir un ejercicio), `WorkoutStore` avisa a `app.js`, que llama a `update()` de la vista: solo se vuelve a dibujar lo que cambió, sin recargar ni mover la página.

---

## Cómo funcionan las animaciones

Cada ejercicio usa un patrón de movimiento (`bench`, `squat`, `curl`, `rdl`...). El patrón construye el esqueleto para una posición `t` entre 0 (posición inicial) y 1 (punto de transición). Las manos y los pies se colocan donde deben estar y los codos y las rodillas se calculan con **cinemática inversa de dos segmentos** (ley del coseno).

Sobre el esqueleto se dibuja un **cuerpo transparente**: un contorno claro con relleno oscuro translúcido, los huesos de forma tenue y **todos los músculos** como vientres musculares. Los músculos que trabaja el ejercicio se iluminan con el color de su tipo de sesión (brillantes los principales, suaves los secundarios). Una línea de tiempo recorre las 5 fases del movimiento y la excéntrica dura más que la concéntrica.

---

## Cómo ampliar el proyecto

- **Nuevo método:** añadir un objeto a `METHODS` en `js/data.js` con sus variantes (`schedule` indica la sesión de cada día).
- **Nuevo ejercicio:** añadir un objeto a `EXERCISES` en `js/exercises.js` con un patrón de animación existente. Para destacarlo, añadir su id a `RECOMMENDED`.
- **Nuevo tema educativo:** añadir un objeto a `LEARN_TOPICS` en `js/learn.js`.

Las pantallas se generan solas a partir de los datos.

---

## Accesibilidad

- HTML semántico, botones reales, pestañas con roles ARIA y navegación con flechas del teclado.
- Foco visible, enlace "Saltar al contenido" y foco en el título al cambiar de pantalla.
- Avisos en regiones `aria-live`.
- Respeta `prefers-reduced-motion`: las animaciones no se reproducen solas.

---

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
