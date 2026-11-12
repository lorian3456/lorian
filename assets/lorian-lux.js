/* ==========================================================================
   LORIAN — UI POLISH & MOTION LAYER (behaviour)
   Progressive enhancement only: without JS the page is fully visible.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  var raf = window.requestAnimationFrame || function (fn) { return window.setTimeout(fn, 16); };
  var osReduce = false;

  try {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    osReduce = !!(mq && mq.matches);
  } catch (e) {}

  function motionAllowed() {
    if (html.classList.contains('a11y-rm')) return false;
    if (html.classList.contains('a11y-motion-ok')) return true;
    return !osReduce;
  }

  /* ---------------------------------------------------------------- chrome */
  var progress = null;
  var topBtn = null;
  var navMap = {};
  var navSections = [];
  var ticking = false;

  function buildChrome() {
    progress = doc.createElement('div');
    progress.id = 'lx-progress';
    progress.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(progress);

    topBtn = doc.createElement('button');
    topBtn.id = 'lx-top';
    topBtn.type = 'button';
    topBtn.setAttribute('aria-label', 'חזרה לראש העמוד');
    topBtn.setAttribute('title', 'חזרה לראש העמוד');
    topBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    doc.body.appendChild(topBtn);

    topBtn.addEventListener('click', function () {
      try {
        window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
    });

    var links = [].slice.call(doc.querySelectorAll('.a11y-hdr nav:not(.m-nav) a[href^="#"]'));
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      if (!id) return;
      (navMap[id] = navMap[id] || []).push(link);
    });
    navSections = Object.keys(navMap)
      .map(function (id) { return doc.getElementById(id); })
      .filter(Boolean);
  }

  function updateActiveNav() {
    if (!navSections.length) return;
    var current = null;
    for (var i = 0; i < navSections.length; i++) {
      var r = navSections[i].getBoundingClientRect();
      if (r.top - 170 <= 0 && r.bottom - 170 > 0) { current = navSections[i].id; break; }
    }
    if (!current && (window.pageYOffset + window.innerHeight) >= doc.documentElement.scrollHeight - 8) {
      current = navSections[navSections.length - 1].id;
    }
    Object.keys(navMap).forEach(function (id) {
      navMap[id].forEach(function (link) {
        link.classList.toggle('lx-active', id === current);
      });
    });
  }

  function onScroll() {
    var y = window.pageYOffset || html.scrollTop;
    var max = html.scrollHeight - window.innerHeight;

    html.classList.toggle('lx-scrolled', y > 24);

    if (progress) {
      progress.style.width = (max > 0 ? Math.min(1, y / max) * 100 : 0).toFixed(2) + '%';
    }
    if (topBtn) topBtn.classList.toggle('lx-show', y > 560);

    updateActiveNav();
    ticking = false;
  }

  function bindScroll() {
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      raf(onScroll);
    }, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* -------------------------------------------------------------- ambience */
  function ambience() {
    var aura = doc.querySelector('body > div.a11y-scope.fixed.inset-0');
    if (aura) aura.classList.add('lx-aura');
  }

  function addParticles(host) {
    var wrap = doc.createElement('div');
    wrap.className = 'lx-particles';
    wrap.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 16; i++) {
      var s = doc.createElement('span');
      s.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      s.style.setProperty('--s', (2 + Math.random() * 4).toFixed(1) + 'px');
      s.style.setProperty('--dur', (16 + Math.random() * 15).toFixed(1) + 's');
      s.style.setProperty('--del', (-Math.random() * 28).toFixed(1) + 's');
      wrap.appendChild(s);
    }
    host.appendChild(wrap);
  }

  /* ---------------------------------------------------------------- markup */
  function markEyebrows() {
    var main = doc.getElementById('main-content');
    if (!main) return;
    [].forEach.call(main.querySelectorAll('span.uppercase, span[class*="uppercase"]'), function (el) {
      if (el.closest('.glass-panel, .glass-gold-subtle, .lr-skip, .lr-plate')) return;
      el.classList.add('lx-eyebrow');
    });
  }

  function decorateCard(card) {
    if (!card || card.classList.contains('lx-card')) return;
    card.classList.add('lx-card');
    var ico = card.querySelector('.material-symbols-outlined');
    if (ico && ico.parentElement) ico.parentElement.classList.add('lx-icon');
  }

  function decorate() {
    markEyebrows();

    [].forEach.call(doc.querySelectorAll('#advantages .grid > div'), function (card, i) {
      decorateCard(card);
      if (card.querySelector('.lx-index')) return;
      var n = doc.createElement('span');
      n.className = 'lx-index';
      n.setAttribute('aria-hidden', 'true');
      n.textContent = ('0' + (i + 1)).slice(-2);
      card.appendChild(n);
    });

    [].forEach.call(doc.querySelectorAll('#services .grid > div, #process .grid > div, #portfolio .grid > div'), decorateCard);

    var contactPanel = doc.querySelector('#contact .glass-panel');
    if (contactPanel) contactPanel.classList.add('lx-frame');

    var heroFrame = doc.querySelector('main > section:first-of-type .glass-panel');
    if (heroFrame) {
      heroFrame.classList.add('lx-frame');
      if (motionAllowed()) addParticles(heroFrame);
    }

    /* gold buttons get the light sweep */
    [].forEach.call(doc.querySelectorAll('header a, main a, main button, footer a'), function (el) {
      var cls = el.className;
      if (typeof cls !== 'string') return;
      if (/bg-gradient-to-r|bg-\[#d4af37\]|gold-glow/.test(cls)) el.classList.add('lx-shine');
    });
  }

  /* ---------------------------------------------------------------- reveal */
  function reveal() {
    var main = doc.getElementById('main-content');
    if (!main || !('IntersectionObserver' in window)) return;

    var targets = [];

    function add(el, type, delay) {
      if (!el || el.getAttribute('data-lx') !== null) return;
      el.setAttribute('data-lx', type || '');
      el.style.setProperty('--lx-d', (delay || 0).toFixed(2) + 's');
      targets.push(el);
    }

    function insideCard(el, stop) {
      var p = el.parentElement;
      while (p && p !== stop) {
        if (p.classList.contains('glass-panel') || p.classList.contains('glass-gold-subtle')) return true;
        p = p.parentElement;
      }
      return false;
    }

    /* hero: stagger the blocks inside the glass frame instead of the frame itself */
    var hero = main.querySelector('section');
    if (hero) {
      var frame = hero.querySelector('.glass-panel');
      var content = frame && frame.querySelector('[class*="col-span-7"]');
      if (content) {
        [].forEach.call(content.children, function (el, i) {
          add(el, i === 2 ? 'title' : '', 0.05 + i * 0.08);
        });
      }
      var quickForm = frame && frame.querySelector('#quick-form');
      if (quickForm) add(quickForm, 'card', 0.32);
    }

    /* every other section */
    [].forEach.call(main.querySelectorAll('section'), function (section) {
      if (section === hero) return;
      var nodes = section.querySelectorAll('h2, h3, blockquote, .glass-panel, .glass-gold-subtle, .lr-marquee, .lr-orbit, p');
      [].forEach.call(nodes, function (el) {
        if (el.closest('header, nav, #a11y-root')) return;
        if (el.getAttribute('data-lx') !== null) return;
        if (insideCard(el, section)) return;

        var type = 'card';
        if (/^(H[1-6]|BLOCKQUOTE|P)$/.test(el.tagName)) type = 'title';
        if (el.classList.contains('lr-marquee') || el.classList.contains('lr-orbit')) type = 'wide';

        var idx = [].indexOf.call(el.parentNode.children, el);
        add(el, type, Math.min(Math.max(idx, 0), 5) * 0.07);
      });
    });

    /* utility pages: one content panel */
    if (!main.querySelector('section')) {
      var panel = main.querySelector('.glass-panel');
      add(panel, 'card', 0);
      [].forEach.call(main.querySelectorAll('h1'), function (h) { add(h, 'title', 0.12); });
    }

    if (!targets.length) return;

    html.classList.add('lx-on');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('lx-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { io.observe(el); });

    /* Safety net: if the browser restored a scroll position or jumped to an
       in-page anchor before the observer was ready, reveal what is visible. */
    function revealVisible() {
      targets.forEach(function (el) {
        if (el.classList.contains('lx-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add('lx-in');
          io.unobserve(el);
        }
      });
    }

    window.setTimeout(revealVisible, 350);
    window.setTimeout(revealVisible, 1600);
    window.addEventListener('load', function () { window.setTimeout(revealVisible, 250); });
    window.addEventListener('hashchange', function () { window.setTimeout(revealVisible, 700); });
  }

  /* ----------------------------------------------------------- interactions */
  function spotlight() {
    [].forEach.call(doc.querySelectorAll('.lx-frame'), function (frame) {
      var queued = false;
      var lastX = 0;
      var lastY = 0;

      frame.addEventListener('pointermove', function (e) {
        var r = frame.getBoundingClientRect();
        lastX = ((e.clientX - r.left) / r.width) * 100;
        lastY = ((e.clientY - r.top) / r.height) * 100;
        if (queued) return;
        queued = true;
        raf(function () {
          frame.style.setProperty('--lx-mx', lastX.toFixed(1) + '%');
          frame.style.setProperty('--lx-my', lastY.toFixed(1) + '%');
          queued = false;
        });
      }, { passive: true });
    });
  }

  function tilt() {
    if (!motionAllowed()) return;
    try {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    } catch (e) {
      return;
    }

    [].forEach.call(doc.querySelectorAll('#advantages .grid > div, #services .grid > div, #portfolio .grid > div'), function (card) {
      var queued = false;
      var lastX = 0;
      var lastY = 0;

      card.addEventListener('pointermove', function (e) {
        if (!motionAllowed()) return;
        var r = card.getBoundingClientRect();
        lastX = ((e.clientX - r.left) / r.width) * 100;
        lastY = ((e.clientY - r.top) / r.height) * 100;
        if (queued) return;
        queued = true;
        raf(function () {
          card.style.setProperty('--lx-x', lastX.toFixed(1) + '%');
          card.style.setProperty('--lx-y', lastY.toFixed(1) + '%');
          card.style.transition = 'transform .12s linear';
          var rx = (0.5 - lastY / 100) * 4;
          var ry = (lastX / 100 - 0.5) * 5;
          card.style.transform = 'perspective(1000px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
          queued = false;
        });
      }, { passive: true });

      card.addEventListener('pointerleave', function () {
        card.style.transition = 'transform .6s cubic-bezier(.22,.61,.36,1)';
        card.style.transform = '';
        window.setTimeout(function () { card.style.transition = ''; }, 620);
      });
    });
  }

  function init() {
    ambience();
    decorate();
    buildChrome();
    bindScroll();
    spotlight();
    tilt();
    if (motionAllowed()) reveal();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
