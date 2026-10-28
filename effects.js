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
        await navigator.clipboard.writeText('https://sietepinceles.es/#noticias');
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
