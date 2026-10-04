/* =====================================================================
   FIT SPLIT · install.js
   ---------------------------------------------------------------------
   «Descargar app»: una ventana pregunta qué dispositivo usa la persona
   (se marca el que detecta el navegador) y muestra cómo instalarla:

   - Android  → descarga la app nativa (.apk) que GitHub construye a
                partir de esta misma web (carpeta android-app/).
   - iPhone   → Apple no permite instalar con un botón: guía de Safari
                «Compartir → Añadir a pantalla de inicio» (app web).
   - Ordenador → instalación del navegador (Chrome / Edge) si existe.

   También registra el service worker (sw.js) para que la app web
   funcione sin conexión.
   ===================================================================== */

const Install = (() => {
  'use strict';

  const APK_URL = 'https://github.com/yesithpradog-max/Fit_split/releases/download/android-latest/fit-split.apk';
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const isIOSSafari = isIOS && !/crios|fxios|edgios|opios|gsa\//i.test(ua);
  const isNativeApp = /FitSplitApp/.test(ua) || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const isStandalone = () => isNativeApp || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const detected = isAndroid ? 'android' : isIOS ? 'ios' : 'desktop';

  /* Instalación del navegador (Chrome / Edge en Android y ordenador) */
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; refreshButtons(); UI.toast('FIT SPLIT se ha instalado.'); });

  /* Service worker: la app web funciona sin conexión */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !isNativeApp) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  const svg = (d, extra = '') => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ${extra}>${d}</svg>`;
  const I = {
    download: svg('<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/>'),
    android: svg('<path d="M7 10h10v7.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 17.5z"/><path d="M7 9a5 5 0 0 1 10 0z"/><path d="M8.5 4.5l1.3 2M15.5 4.5l-1.3 2M4.5 11v4.5M19.5 11v4.5M10 19v2.5M14 19v2.5"/>'),
    apple: svg('<path d="M15.5 4.5c-.9.1-2 .7-2.6 1.5-.6.7-1 1.7-.9 2.7 1 0 2-.6 2.6-1.4.6-.8 1-1.8.9-2.8z" fill="currentColor" stroke="none"/><path d="M12 8.6c-1-.1-2.2-.9-3.6-.8-1.9.1-3.6 1.6-3.6 4.4 0 3.6 2.4 7.8 4.2 7.8 1 0 1.5-.6 3-.6s2 .6 3 .6c1.4 0 2.8-2.4 3.5-4.4-1.7-.7-2.6-2.4-2.4-4.1.1-1.1.8-2 1.6-2.6-.8-1-2-1.4-3-1.3-1.2.1-2 .9-2.7 1z" fill="currentColor" stroke="none"/>'),
    desktop: svg('<rect x="3.5" y="4.5" width="17" height="11" rx="1.5"/><path d="M9 19.5h6M12 15.5v4"/>'),
    share: svg('<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 10.5H5.5v9.5h13v-9.5H17"/>'),
    plusSquare: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8.5v7M8.5 12h7"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>')
  };

  const OS = [
    { id: 'android', label: 'Android', icon: I.android },
    { id: 'ios', label: 'iPhone / iPad', icon: I.apple },
    { id: 'desktop', label: 'Ordenador', icon: I.desktop }
  ];

  function panel(id) {
    if (id === 'android') {
      return `<div class="inst-panel">
          <p class="inst-lead">App nativa de FIT SPLIT para Android. Funciona sin conexión.</p>
          <a class="btn btn-primary btn-block" href="${APK_URL}" download="fit-split.apk">${I.download}<span>Descargar para Android (.apk)</span></a>
          <ol class="inst-steps">
            <li>Abre el archivo <strong>fit-split.apk</strong> cuando termine la descarga (en la notificación o en «Descargas»).</li>
            <li>Si el teléfono lo pide, permite <strong>«Instalar apps desconocidas»</strong> para tu navegador. Es necesario porque la app no está en Google Play.</li>
            <li>Pulsa <strong>Instalar</strong> y abre FIT SPLIT desde tu pantalla de inicio.</li>
          </ol>
          ${deferred ? `<p class="inst-alt">¿Prefieres no instalar archivos? <button type="button" class="text-link" data-inst="prompt">Instálala desde Chrome</button>.</p>` : ''}
        </div>`;
    }
    if (id === 'ios') {
      return `<div class="inst-panel">
          <p class="inst-lead">En iPhone y iPad, Apple solo permite instalar apps de fuera de la App Store desde Safari, añadiéndolas a la pantalla de inicio. Queda con su icono, a pantalla completa y funciona sin conexión.</p>
          ${isIOS && !isIOSSafari ? `<p class="inst-warn">Estás usando otro navegador: abre <strong>${esc(location.href.split('#')[0])}</strong> en <strong>Safari</strong> para poder instalarla.</p>` : ''}
          <ol class="inst-steps inst-steps-ios">
            <li><span class="inst-ico">${I.share}</span><span>En Safari, toca el botón <strong>Compartir</strong> (abajo en iPhone, arriba en iPad).</span></li>
            <li><span class="inst-ico">${I.plusSquare}</span><span>Desliza y elige <strong>«Añadir a pantalla de inicio»</strong>.</span></li>
            <li><span class="inst-ico inst-ico-app"><img src="assets/icons/app/apple-touch-icon.png" alt=""></span><span>Toca <strong>Añadir</strong>. El icono de FIT SPLIT aparecerá con tus apps.</span></li>
          </ol>
        </div>`;
    }
    return `<div class="inst-panel">
        <p class="inst-lead">Instálala en tu ordenador para abrirla como un programa, en su propia ventana y sin conexión.</p>
        ${deferred
          ? `<button type="button" class="btn btn-primary btn-block" data-inst="prompt">${I.download}<span>Instalar en este ordenador</span></button>`
          : `<ol class="inst-steps">
              <li>En <strong>Chrome</strong> o <strong>Edge</strong>, pulsa el icono de instalar de la barra de direcciones o abre el menú <strong>⋮</strong> → <strong>«Instalar FIT SPLIT»</strong>.</li>
              <li>En <strong>Safari</strong> (Mac): menú <strong>Archivo → «Añadir al Dock»</strong>.</li>
            </ol>`}
        <p class="inst-alt">Para el móvil, abre esta página en el teléfono y pulsa «Descargar app».</p>
      </div>`;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function open(initial = detected) {
    let current = initial;
    const dlg = UI.openDialog(`
        <button type="button" class="icon-btn dialog-close" data-dialog-close aria-label="Cerrar">${I.x}</button>
        <h2 class="dialog-title">Descargar la app</h2>
        <p class="dialog-text">¿Qué dispositivo tienes?</p>
        <div class="inst-os" role="radiogroup" aria-label="Dispositivo">
          ${OS.map(o => `<button type="button" class="inst-os-btn" role="radio" data-os="${o.id}" aria-checked="${o.id === current}">
              ${o.icon}<span>${o.label}</span>${o.id === detected ? '<small>Tu dispositivo</small>' : ''}</button>`).join('')}
        </div>
        <div class="inst-body" data-inst-body>${panel(current)}</div>`, { label: 'Descargar la app' });
    const body = dlg.querySelector('[data-inst-body]');
    dlg.addEventListener('click', async e => {
      const os = e.target.closest('[data-os]');
      if (os) {
        current = os.dataset.os;
        dlg.querySelectorAll('[data-os]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.os === current)));
        body.innerHTML = panel(current);
        return;
      }
      if (e.target.closest('[data-inst="prompt"]') && deferred) {
        deferred.prompt();
        const choice = await deferred.userChoice.catch(() => null);
        deferred = null;
        if (choice && choice.outcome === 'accepted') dlg.close();
        else body.innerHTML = panel(current);
      }
    });
    return dlg;
  }

  /* Botones «Descargar app» de la página: se ocultan dentro de la app instalada */
  function refreshButtons() {
    document.querySelectorAll('[data-install-app]').forEach(b => { b.hidden = isStandalone(); });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-install-app]');
    if (b) { e.preventDefault(); open(); }
  });
  document.addEventListener('DOMContentLoaded', refreshButtons);
  window.addEventListener('hashchange', () => setTimeout(refreshButtons, 60));

  return { open, get standalone() { return isStandalone(); }, detected, APK_URL };
})();
