// Decorative enhancements remain independent from authentication.
(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const nav = document.querySelector('#mainNav');
  const menu = document.querySelector('#menuBtn');
  const groups = [...document.querySelectorAll('.nav-group')];
  const closeGroups = () => groups.forEach(group => { group.open = false; });
  const closeNav = () => {
    closeGroups();
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
  };
  groups.forEach(group => {
    group.addEventListener('toggle', () => {
      if (group.open) groups.forEach(other => { if (other !== group) other.open = false; });
    });
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) closeNav();
    else if (event.target.closest('.main-nav a, #authOpenBtn')) closeNav();
  });
  document.addEventListener('focusin', event => {
    if (!header.contains(event.target)) closeNav();
  });
  header.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = groups.find(group => group.open);
    if (open) { open.open = false; open.querySelector('summary').focus(); }
    else { closeNav(); menu.focus(); }
  });
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const targets = [...document.querySelectorAll('.section:not(.hero) > .eyebrow, .section:not(.hero) h2, .card, .feature, .event-card')];
  let observer;
  // Animate only on arrival: content is never hidden while waiting for JavaScript.
  function observeSections() {
    observer?.disconnect();
    targets.forEach(el => el.classList.remove('reveal-arrival'));
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-arrival');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    targets.forEach(el => observer.observe(el));
  }
  reduced.addEventListener('change', observeSections);
  // Native pointer stays unchanged; indicate the section in the navigation instead.
  if ('IntersectionObserver' in window) {
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    document.querySelectorAll('main > section[id]').forEach(section => sectionObserver.observe(section));
  }
  observeSections();
  const copyNews = document.querySelector('[data-copy-news]');
  if (copyNews) {
    copyNews.hidden = false;
    copyNews.addEventListener('click', async () => {
      const status = document.querySelector('[data-copy-news-status]');
      const fallback = document.querySelector('[data-copy-news-fallback]');
      copyNews.disabled = true;
      try {
        await navigator.clipboard.writeText('https://sietepinceles.es/#newsHeading');
        fallback.hidden = true;
        status.textContent = 'Enlace copiado. Ya puedes pegarlo donde quieras compartirlo.';
      } catch {
        fallback.hidden = false;
        status.textContent = 'No se ha podido copiar automáticamente. Puedes copiarlo en el campo de abajo.';
        const input = fallback.querySelector('input');
        input.focus();
        input.select();
      } finally {
        copyNews.disabled = false;
      }
    });
  }
})();

// Visibility is local to each field; passwords stay hidden on submit and close.
(() => {
  const controls = [];
  document.querySelectorAll('input[type="password"]').forEach(input => {
    const wrapper = document.createElement('span');
    wrapper.className = 'password-control';
    input.before(wrapper);
    wrapper.append(input);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-eye';
    toggle.setAttribute('aria-controls', input.id);
    toggle.innerHTML = '<svg viewBox="0 0 40 32" aria-hidden="true" focusable="false"><path class="eye-lid" d="M3 17C7 8 11 6 19 8c8-4 15 2 18 9-6 9-12 10-18 8C11 27 6 23 3 17Z"/><path class="eye-fold" d="M8 7 6 4m12 1 1-3m11 5 3-3M8 26l-2 3m23-3 2 3"/><ellipse class="eye-iris" cx="20" cy="17" rx="7" ry="8"/><ellipse class="eye-pupil" cx="20" cy="17" rx="2.5" ry="6"/><circle class="eye-glint" cx="22" cy="14" r="1.4"/><circle class="eye-bump" cx="8" cy="13" r="2"/><circle class="eye-bump" cx="31" cy="22" r="2.2"/><path class="eye-slash" d="M5 3 35 29"/></svg>';
    const hide = () => {
      input.type = 'password';
      toggle.setAttribute('aria-label', 'Mostrar contraseña');
      toggle.setAttribute('aria-pressed', 'false');
    };
    hide();
    toggle.addEventListener('click', event => {
      event.preventDefault();
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      toggle.setAttribute('aria-pressed', String(show));
    });
    wrapper.append(toggle);
    input.form?.addEventListener('submit', hide, true);
    controls.push(hide);
  });
  document.querySelector('#authDialog')?.addEventListener('close', () => controls.forEach(hide => hide()));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) controls.forEach(hide => hide());
  });
})();

// Public totals: no profiles, identities or session data are requested.
(() => {
  const web = document.querySelector('[data-community-web]');
  const members = document.querySelector('[data-community-members]');
  if (!web || !members) return;
  let busy = false;
  async function refresh() {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const response = await fetch('https://gboifuaaswbqumxxijed.supabase.co/rest/v1/rpc/community_counts', {
        method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000),
        headers: {apikey: 'sb_publishable_b8DSnE44g2Amxx_1l2eK0w_ZKVlEGlK', 'Content-Type': 'application/json'},
        body: '{}'
      });
      if (!response.ok) throw new Error('Unavailable');
      const counts = await response.json();
      if (![counts.web_accounts, counts.active_members].every(n => Number.isSafeInteger(n) && n >= 0) || counts.active_members > counts.web_accounts) throw new Error('Invalid totals');
      web.textContent = new Intl.NumberFormat('es-ES').format(counts.web_accounts);
      members.textContent = new Intl.NumberFormat('es-ES').format(counts.active_members);
      web.removeAttribute('aria-label'); members.removeAttribute('aria-label');
    } catch {
      for (const el of [web, members]) { el.textContent = '—'; el.setAttribute('aria-label', 'Total no disponible temporalmente'); }
    } finally { busy = false; }
  }
  void refresh();
  setInterval(() => { void refresh(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
})();

// Event sharing always uses the public URL, without account or session details.
(() => {
  const share = document.querySelector('[data-share-event]');
  const copy = document.querySelector('[data-copy-event]');
  if (!share || !copy) return;
  const status = document.querySelector('[data-share-event-status]');
  const fallback = document.querySelector('[data-share-event-fallback]');
  const url = 'https://sietepinceles.es/#evento';
  share.hidden = false; copy.hidden = false;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      fallback.hidden = true;
      status.textContent = 'Enlace copiado. Ya puedes pegarlo en WhatsApp, redes o donde quieras compartirlo.';
    } catch {
      fallback.hidden = false;
      status.textContent = 'No se ha podido copiar automáticamente. Selecciona y copia el enlace del campo.';
      const input = fallback.querySelector('input'); input.focus(); input.select();
    }
  }
  async function act(nativeShare) {
    if (share.disabled) return;
    share.disabled = true; copy.disabled = true; status.textContent = '';
    try {
      if (nativeShare && typeof navigator.share === 'function') {
        try {
          await navigator.share({title:'Pinceladas del Caos · 7 Pinceles',text:'Preinscripción al taller de pintura de miniaturas en Xerinola. Fecha y horario por confirmar. Necesitas una cuenta web; no hace falta ser socio.',url});
          fallback.hidden = true; status.textContent = 'Opciones para compartir cerradas.';
        } catch (error) {
          if (error.name === 'AbortError') status.textContent = 'Has cerrado las opciones para compartir. Puedes copiar el enlace cuando quieras.';
          else await copyLink();
        }
      } else await copyLink();
    } finally { share.disabled = false; copy.disabled = false; }
  }
  share.addEventListener('click', () => { void act(true); });
  copy.addEventListener('click', () => { void act(false); });
})();
