/* ============================================================
   FORMONIK — interactions
   Sticky header · mobile drawer · scroll reveals ·
   animated counters · form handling · back-to-top
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Hero scroll-scrub stage ----
     Pins the hero, scrubs the video by scroll progress, and
     cross-fades the text panels. Falls back to a normal looping
     hero on small screens / reduced motion. */
  (function heroScrub() {
    const stage = document.getElementById('heroStage');
    const video = document.querySelector('.hero-video');
    if (!stage || !video) return;
    const panels = Array.prototype.slice.call(stage.querySelectorAll('.hero-panel'));
    const dots = Array.prototype.slice.call(stage.querySelectorAll('.hero-dots b'));
    const bar = document.getElementById('heroProgress');
    const hint = document.getElementById('heroHint');
    const scrim = stage.querySelector('.hero-scrim');
    const veil = stage.querySelector('.hero-textveil');
    const small = window.matchMedia('(max-width: 820px)');
    let activeIdx = -1;

    function setActive(idx) {
      if (idx === activeIdx) return;
      activeIdx = idx;
      panels.forEach((p, i) => p.classList.toggle('active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    }

    if (reduceMotion || small.matches) {
      // Fallback: normal single-panel hero, video loops on its own.
      setActive(0);
      video.loop = true;
      const pl = video.play();
      if (pl && pl.catch) pl.catch(() => {});
      return;
    }

    // Scrub mode — pin the stage and drive currentTime from scroll.
    stage.classList.add('scrub');
    setActive(0);
    video.loop = false;
    video.pause();

    let target = 0, raf = null, ready = false;

    function tick() {
      raf = null;
      if (!ready || !video.duration) return;
      const cur = video.currentTime;
      const diff = target - cur;
      if (Math.abs(diff) > 0.02) {
        try { video.currentTime = cur + diff * 0.22; } catch (e) {}
        raf = requestAnimationFrame(tick);
      } else {
        try { video.currentTime = target; } catch (e) {}
      }
    }
    function queue() { if (raf == null) raf = requestAnimationFrame(tick); }

    function update() {
      const rect = stage.getBoundingClientRect();
      const total = stage.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
      if (ready && video.duration) { target = p * (video.duration - 0.06); queue(); }
      let idx = Math.floor(p * panels.length);
      if (idx >= panels.length) idx = panels.length - 1;
      if (idx < 0) idx = 0;
      setActive(idx);
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (hint) hint.style.opacity = p > 0.015 ? '0' : '';
      // gradually lift the overall darkness so the sunset video brightens…
      if (scrim) scrim.style.opacity = (1 - p * 0.92).toFixed(3);
      // …but keep a strong veil behind the text column so it stays readable
      if (veil) veil.style.opacity = Math.max(0.62, 1 - p * 0.38).toFixed(3);
    }

    function onReady() { ready = true; try { video.currentTime = 0; } catch (e) {} update(); }
    if (video.readyState >= 1) onReady();
    else video.addEventListener('loadedmetadata', onReady);

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ---- Fluid Island nav ---- */
  const siteNav = document.getElementById('siteNav');
  const navList = document.getElementById('navList');
  const navIndicator = document.getElementById('navIndicator');
  const navLinks = navList ? Array.prototype.slice.call(navList.querySelectorAll('a[data-spy]')) : [];
  const toTop = document.getElementById('toTop');
  const heroStageEl = document.getElementById('heroStage');

  // a) adaptive theme (dark glass over hero, light over page) + condense + back-to-top
  const onScroll = () => {
    const y = window.scrollY;
    if (siteNav) {
      siteNav.classList.toggle('scrolled', y > 20);
      // dark while the hero still covers the top strip of the viewport
      const overDark = heroStageEl ? heroStageEl.getBoundingClientRect().bottom > 72 : y < 200;
      siteNav.classList.toggle('over-dark', overDark);
    }
    if (toTop) toTop.classList.toggle('show', y > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // c) sliding highlight indicator + scroll-spy active state
  let spyActive = null, navHovering = false;
  function moveIndicator(el) {
    if (!el || !navIndicator) return;
    navIndicator.style.setProperty('--nx', el.offsetLeft + 'px');
    navIndicator.style.setProperty('--nw', el.offsetWidth + 'px');
    navIndicator.classList.add('show');
  }
  function refreshIndicator() {
    if (navHovering) return;
    if (spyActive) moveIndicator(spyActive);
    else if (navIndicator) navIndicator.classList.remove('show');
  }
  navLinks.forEach((a) => {
    a.addEventListener('mouseenter', () => { navHovering = true; moveIndicator(a); });
    a.addEventListener('focus', () => { navHovering = true; moveIndicator(a); });
  });
  if (navList) navList.addEventListener('mouseleave', () => { navHovering = false; refreshIndicator(); });
  if ('IntersectionObserver' in window && navLinks.length) {
    const linkById = {};
    navLinks.forEach((a) => { linkById[a.getAttribute('data-spy')] = a; });
    const sections = navLinks.map((a) => document.getElementById(a.getAttribute('data-spy'))).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          navLinks.forEach((l) => l.classList.remove('active'));
          const link = linkById[e.target.id];
          if (link) { link.classList.add('active'); spyActive = link; refreshIndicator(); }
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach((s) => spy.observe(s));
  }
  window.addEventListener('resize', refreshIndicator);

  // d) full-screen overlay menu + hamburger morph
  const burger = document.getElementById('navBurger');
  const overlay = document.getElementById('navOverlay');
  const openMenu = () => {
    overlay.classList.add('open');
    burger.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    overlay.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  if (burger && overlay) {
    burger.addEventListener('click', () => {
      overlay.classList.contains('open') ? closeMenu() : openMenu();
    });
    overlay.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---- Back to top ---- */
  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---- Scroll reveal ---- */
  const revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---- Process line fill ---- */
  const procSteps = document.querySelectorAll('.proc-step');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const pio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); pio.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    procSteps.forEach((el) => pio.observe(el));
  } else {
    procSteps.forEach((el) => el.classList.add('in'));
  }

  /* ---- Animated counters ---- */
  const counters = document.querySelectorAll('[data-count]');
  const runCounter = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    if (reduceMotion) { el.textContent = target; return; }
    const duration = 1500;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { runCounter(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  } else {
    counters.forEach(runCounter);
  }

  /* ---- Smooth anchor scroll with header offset ---- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const island = document.querySelector('.nav-island');
      const offset = (island ? island.getBoundingClientRect().height : 56) + 30;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---- Contact form ----
     Submits natively (POST) to Formonik's real backend (emailSent.php).
     We only guard against double-submit; the server handles captcha,
     mailing and the confirmation page. */
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      if (!form.checkValidity()) return; // let native validation show errors
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '.7';
        const label = btn.querySelector('.btn-label');
        if (label) label.textContent = 'Sending…';
      }
      // do NOT preventDefault — allow the native POST to emailSent.php
    });
  }

  /* ---- Captcha refresh ---- */
  const captchaImg = document.getElementById('captchaImg');
  const captchaReload = document.getElementById('captchaReload');
  if (captchaImg && captchaReload) {
    captchaReload.addEventListener('click', () => {
      const base = captchaImg.getAttribute('data-src') || 'captcha.php';
      captchaImg.src = base + (base.indexOf('?') > -1 ? '&' : '?') + 't=' + Date.now();
    });
  }

  /* ---- Current year ---- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
