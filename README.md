# FIT SPLIT

**Entiende tu entrenamiento. Entrena con propósito.**

FIT SPLIT es una plataforma web educativa e interactiva sobre entrenamiento de fuerza, hipertrofia y resistencia muscular. Permite conocer métodos de entrenamiento, entrar en cada día de la semana, elegir un grupo muscular, aprender cada ejercicio con una animación por fases y construir una sesión según el objetivo del usuario.

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

La selección de ejercicios, el objetivo y las series por ejercicio se guardan en `localStorage`, es decir, en el navegador de cada usuario.

---

## Funcionalidades

| Sección | Qué permite hacer |
|---|---|
| **Inicio** | Animación en vivo (Push / Pull / Legs), métodos, elección de objetivo, recorrido en 6 pasos y fundamentos. |
| **Métodos** | 5 métodos (Push Pull Legs, Arnold Split, Upper / Lower, Full Body y Bro Split) con 10 variantes semanales y una tabla comparativa. |
| **Página de método** | Qué es, cómo funciona, ventajas, desventajas, para quién, calendario semanal interactivo, frecuencia por grupo muscular, recuperación, progresión y preguntas frecuentes. |
| **Sesión de un día** | Grupos musculares del día, ejercicios por grupo, selección con límite (por ejemplo 0 / 3 → 3 / 3), resumen lateral, copia de la selección entre días iguales y botón **Ver mi sesión** al completar todos los grupos. |
| **Ficha de ejercicio** | Animación SVG con Reproducir / Pausar / Reiniciar / velocidad y fases clicables, información rápida, técnica en 6 pasos sincronizada con la animación, errores frecuentes, recomendaciones, recomendaciones según el objetivo y tensión mecánica. |
| **Ejercicios** | Catálogo de 42 ejercicios con búsqueda (ignora acentos) y filtros por grupo muscular, equipamiento, dificultad y objetivo. |
| **Aprende** | 9 temas con widgets interactivos: escala de repeticiones, diagrama de tensión mecánica, simulador de RIR, calculadora de volumen, tabla de intensidad y ejemplo de doble progresión. |
| **Mi entrenamiento** | Resumen por día, prescripción según objetivo, volumen semanal estimado por grupo, editar, eliminar, limpiar y copiar el resumen. |

Rutas de ejemplo (enrutador por hash, el botón "atrás" funciona):

```
#/metodos/ppl                         → método
#/metodos/ppl/ppl6/lun/pecho          → sesión del lunes, grupo pecho
#/ejercicio/press-banca?m=ppl&v=ppl6&d=lun&g=pecho  → ejercicio con contexto de sesión
#/aprende/tension-mecanica            → tema educativo
#/mi-entrenamiento                    → constructor
```

---

## Estructura del proyecto

```
index.html              Estructura de la página, cabecera, menú, pie y carga de scripts
css/
  styles.css            Variables de diseño (tokens), componentes y figura animada
  responsive.css        Adaptación a portátil, tablet y móvil
js/
  data.js               DATOS: días, grupos musculares, equipamiento, objetivos,
                        tipos de sesión y métodos con sus variantes
  exercises.js          DATOS: base de datos de 42 ejercicios
  learn.js              DATOS: contenido de la sección Aprende
  workouts.js           LÓGICA: Planner (sesiones, límites, frecuencia, volumen)
                        y WorkoutStore (selección del usuario en localStorage)
  animations.js         ANIMACIONES: motor SVG con cinemática inversa y presets
  ui.js                 INTERFAZ: componentes reutilizables (tarjetas, escalas,
                        diálogos, avisos, iconos)
  views.js              INTERFAZ: una función por página
  app.js                INTERFAZ: enrutador, menú y delegación de eventos
assets/
  icons/favicon.svg
  images/og-image.png   Imagen al compartir el enlace
```

Los scripts se cargan en orden: datos → lógica → animaciones → interfaz.

### Flujo de datos

```
URL (#/metodos/ppl/ppl6/lun/pecho)
   │
   ▼
app.js (enrutador) ──► views.js (vista) ──► ui.js (componentes)
                           │
                           ├── Planner (workouts.js) ◄── data.js / exercises.js
                           ├── WorkoutStore (workouts.js) ◄──► localStorage
                           └── Animations (animations.js)
```

Cuando el usuario selecciona un ejercicio, `WorkoutStore` guarda el cambio y avisa a `app.js`, que actualiza la vista actual.

---

## Cómo ampliar el proyecto

### Añadir un método

Agrega un objeto a `METHODS` en `js/data.js`. Cada variante indica qué tipo de sesión toca cada día:

```js
{
  id: 'mi-metodo',
  name: 'Mi método',
  short: 'MM',
  tone: 'upper',
  variants: [
    { id: 'mm4', name: '4 días', description: '...',
      schedule: { lun: 'upper', mar: 'lower', jue: 'upper', vie: 'lower' } }
  ],
  // ...textos: what, how, advantages, disadvantages, forWhom, faq...
}
```

Si necesitas un tipo de sesión nuevo, añádelo a `SESSION_TYPES` con sus grupos musculares y límites. Las páginas del método, el calendario, las sesiones y Mi entrenamiento se generan solos.

### Añadir un ejercicio

Agrega un objeto a `EXERCISES` en `js/exercises.js` con sus grupos, músculos, técnica por fases y un preset de animación existente (`bench`, `squat`, `curl`, `rdl`, `row-barbell`...). Aparecerá en el catálogo, en los filtros y en las sesiones de sus grupos.

### Cómo funcionan las animaciones

Cada preset de `animations.js` construye el esqueleto de la figura para una posición `t` entre 0 (posición inicial) y 1 (punto de transición). Las manos y los pies se colocan donde deben estar y los codos y las rodillas se calculan con **cinemática inversa de dos segmentos** (ley del coseno), de modo que brazos y piernas mantienen siempre su longitud. Una línea de tiempo recorre las 5 fases (inicial, excéntrica, transición, concéntrica y final) y la excéntrica dura más que la concéntrica, como en una repetición controlada.

---

## Accesibilidad

- HTML semántico (`header`, `nav`, `main`, `section`, `article`, `aside`, `dialog`).
- Botones reales con estados `aria-pressed`, `aria-checked` y `aria-current`.
- Navegación completa por teclado, enlace "Saltar al contenido" y foco visible.
- El foco se mueve al título de cada página al navegar.
- Avisos en regiones `aria-live`.
- Respeta `prefers-reduced-motion`: las animaciones no se reproducen solas.

---

## Publicación en internet

Es un sitio estático: se puede publicar gratis en **GitHub Pages**, **Netlify**, **Vercel** o **Cloudflare Pages** sin servidor propio.

1. Subir la carpeta a un repositorio de GitHub.
2. Activar GitHub Pages (Settings → Pages → rama `main`, carpeta raíz) o conectar el repositorio en Netlify / Vercel.
3. (Opcional) Conectar un dominio propio.
4. Para que aparezca al buscar "FIT SPLIT" en Google: registrar el sitio en Google Search Console, añadir un `sitemap.xml` con la URL definitiva y solicitar la indexación. Google puede tardar desde unos días hasta un par de semanas.
5. Con la URL definitiva, actualizar `og:image` en `index.html` a una dirección absoluta y añadir la etiqueta `canonical`.

---

## Aviso

El contenido es educativo y general. No sustituye la valoración de un profesional sanitario o del ejercicio.
