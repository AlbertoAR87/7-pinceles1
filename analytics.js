(() => {
  const id = 'G-EP929LYQG4';
  const key = '7p-analytics-consent-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  // Authentication URLs must never load a third-party tag, even after Auth removes the token.
  const sensitive = !!location.search || (!!location.hash && !/^#(inicio|contenido|mision|actividades|evento|asociados|transparencia|contacto)$/.test(location.hash));
  const production = location.hostname === 'sietepinceles.es';
  let started = false;
  let choice = null;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && ['accepted', 'rejected'].includes(saved.choice) && saved.expires > Date.now()) choice = saved.choice;
  } catch { /* Storage may be unavailable; consent remains unset. */ }
  const panel = document.createElement('section');
  panel.className = 'cookie-panel';
  panel.setAttribute('aria-label', 'Preferencias de analítica');
  panel.innerHTML = '<h2>¿Nos ayudas a mejorar la web?</h2><p>Con tu permiso, usamos Google Analytics para conocer las visitas y el uso de la web. Puedes rechazarlo y seguir usando todas sus funciones. <a href="privacidad.html#analitica">Privacidad y cookies</a>.</p><div class="cookie-actions"><button type="button" class="btn" data-choice="rejected">Rechazar analítica</button><button type="button" class="btn" data-choice="accepted">Aceptar analítica</button></div>';
  panel.hidden = choice !== null;
  document.body.append(panel);
  const settings = document.querySelector('[data-cookie-settings]');
  let returnFocus = false;
  settings?.addEventListener('click', () => {
    returnFocus = true;
    panel.hidden = false;
    panel.querySelector('button').focus();
  });
  function gtag() { (window.dataLayer ||= []).push(arguments); }
  function start() {
    if (started || sensitive || !production) return;
    started = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = [];
    window.gtag = gtag;
    gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    const page = location.origin + location.pathname;
    gtag('config', id, {
      send_page_view: false,
      page_location: page,
      page_referrer: '',
      page_title: location.pathname.endsWith('privacidad.html') ? 'Privacidad · 7 Pinceles' : '7 Pinceles',
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 60 * 60 * 24 * 180,
      cookie_update: false,
      cookie_flags: 'SameSite=Lax;Secure'
    });
    gtag('event', 'page_view', { page_location: page, page_referrer: '' });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }
  function eraseCookies() {
    for (const entry of document.cookie.split(';')) {
      const name = entry.trim().split('=')[0];
      if (name !== '_ga' && !name.startsWith('_ga_')) continue;
      for (const domain of ['', location.hostname, '.' + location.hostname]) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure' + (domain ? '; Domain=' + domain : '');
      }
    }
  }
  function stop() {
    window['ga-disable-' + id] = true;
    eraseCookies();
    // Unload the tag; do not send a consent ping after withdrawal.
    if (started) location.reload();
  }
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    let accepted = false;
    try {
      const saved = JSON.parse(event.newValue);
      accepted = saved?.choice === 'accepted' && saved.expires > Date.now();
    } catch {}
    if (!accepted) stop();
  });
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-choice]');
    if (!button) return;
    choice = button.dataset.choice;
    try { localStorage.setItem(key, JSON.stringify({ choice, expires: Date.now() + lifetime })); } catch {}
    panel.hidden = true;
    if (returnFocus) settings?.focus();
    if (choice === 'accepted') start();
    else stop();
  });
  if (choice === 'accepted') start();
  else eraseCookies();
})();
