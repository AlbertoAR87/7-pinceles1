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
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
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
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring);
  let frame = 0, x = 0, y = 0;
  const hideRing = () => ring.classList.remove('visible');
  document.addEventListener('pointermove', event => {
    if (reduced.matches || !finePointer.matches || event.pointerType !== 'mouse' || document.querySelector('dialog[open]')) {
      hideRing(); return;
    }
    x = event.clientX; y = event.clientY;
    ring.classList.toggle('interactive', !!event.target.closest('a, button, summary'));
    if (!frame) frame = requestAnimationFrame(() => {
      ring.style.left = x + 'px'; ring.style.top = y + 'px';
      ring.classList.add('visible'); frame = 0;
    });
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', hideRing);
  window.addEventListener('blur', hideRing);
  document.addEventListener('visibilitychange', hideRing);
  reduced.addEventListener('change', () => { hideRing(); observeSections(); });
  finePointer.addEventListener('change', hideRing);
  observeSections();
})();
