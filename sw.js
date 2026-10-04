/* =====================================================================
   FIT SPLIT · sw.js (service worker)
   ---------------------------------------------------------------------
   Guarda la web en el dispositivo para que la app instalada funcione
   sin conexión. Estrategia: se responde con la copia guardada y, a la
   vez, se descarga la versión nueva para la próxima visita.
   Al cambiar archivos de la web, sube VERSION para renovar la copia.
   ===================================================================== */
const VERSION = 'fitsplit-v1';
const FILES = [
  './',
  'index.html',
  'assets/anatomy/anatomy-data.js',
  'assets/icons/app/apple-touch-icon.png',
  'assets/icons/app/icon-192.png',
  'assets/icons/app/icon-512.png',
  'assets/icons/app/icon-maskable-512.png',
  'assets/icons/favicon.svg',
  'assets/images/og-image.png',
  'assets/vendor/three.min.js',
  'css/responsive.css',
  'css/styles.css',
  'js/anatomy3d.js',
  'js/animations.js',
  'js/animations3d.js',
  'js/app.js',
  'js/biomech.js',
  'js/coach.js',
  'js/data.js',
  'js/exercises.js',
  'js/install.js',
  'js/learn.js',
  'js/poses3d.js',
  'js/props3d.js',
  'js/ui.js',
  'js/views.js',
  'js/workouts.js',
  'manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'fitsplit-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Tipografías de Google: se guardan la primera vez que se usan
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open('fitsplit-fonts').then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Navegación: siempre la página principal (la app usa rutas con #)
  const key = req.mode === 'navigate' ? new Request('index.html') : req;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(key, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
