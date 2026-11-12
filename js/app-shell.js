/* KasuhaNET progressive UI interactions. No dependencies; existing page logic remains intact. */
(function () {
  'use strict';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initReveal() {
    const targets = document.querySelectorAll(
      '.hero-grid > *, .section-head, .service-card, .price-card, .process-card, .link-card, .cta-box, .partner-box, .visual-card'
    );
    if (!targets.length || reduceMotion || !('IntersectionObserver' in window)) return;

    targets.forEach((element, index) => {
      element.setAttribute('data-app-reveal', '');
      const siblingIndex = Array.prototype.indexOf.call(element.parentElement.children, element);
      element.style.setProperty('--app-reveal-delay', Math.min(siblingIndex * 75, 300) + 'ms');
    });

    document.body.classList.add('app-motion-ready');
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

    targets.forEach(element => observer.observe(element));
  }

  function initNavigation() {
    const nav = document.getElementById('navLinks');
    const toggle = document.querySelector('.menu-toggle');
    if (!nav || !toggle) return;

    toggle.setAttribute('aria-controls', 'navLinks');
    toggle.setAttribute('aria-expanded', nav.classList.contains('active') ? 'true' : 'false');

    const sync = () => toggle.setAttribute('aria-expanded', nav.classList.contains('active') ? 'true' : 'false');
    const observer = new MutationObserver(sync);
    observer.observe(nav, { attributes: true, attributeFilter: ['class'] });

    nav.addEventListener('click', event => {
      if (event.target.closest('a')) {
        nav.classList.remove('active');
        sync();
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        nav.classList.remove('active');
        sync();
      }
    });
  }

  function initDialogMotion() {
    if (reduceMotion || !('MutationObserver' in window)) return;
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        const element = record.target;
        const isOpen = element.matches('dialog[open], .modal.show, .modal.is-open, .popup.show, .popup.is-open, [role="dialog"][aria-hidden="false"]');
        if (isOpen) element.classList.add('app-modal-visible');
        else element.classList.remove('app-modal-visible');
      });
    });
    document.querySelectorAll('dialog, .modal, .popup, [role="dialog"]').forEach(element => {
      observer.observe(element, { attributes: true, attributeFilter: ['open', 'class', 'aria-hidden'] });
    });
  }

  function init() {
    initReveal();
    initNavigation();
    initDialogMotion();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
