/* ==========================================================================
   LORIAN — partners, suppliers & utility companies
   Lightweight, dependency-free controllers:
     · suppliers: pause / play + pause when the stage leaves the viewport
     · elevators: one sticky cabin, one company per scroll segment
     · utilities: a single staggered reveal when the wall enters the viewport
   Every loop yields to the accessibility "reduce motion" switch and to
   prefers-reduced-motion. No work is done while a module is off-screen.
   ========================================================================== */

(function () {
  "use strict";

  var doc = document;
  var html = doc.documentElement;
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  var suppliers = [
    "assets/partners/suppliers/metalpress.jpg",
    "assets/partners/suppliers/sal-north.jpg",
    "assets/partners/suppliers/building.jpg",
    "assets/partners/suppliers/bermad.png",
    "assets/partners/suppliers/telefire.webp",
    "assets/partners/suppliers/hatzalah.png",
    "assets/partners/suppliers/zik.png"
  ];

  var elevators = [
    { src: "assets/partners/elevators/electra.png", name: "אלקטרה מעליות" },
    { src: "assets/partners/elevators/inter-up.webp", name: "אינטר־אפ מעליות" },
    { src: "assets/partners/elevators/kone.png", name: "KONE" },
    { src: "assets/partners/elevators/alu.png", name: "עלו הנדסת מעליות" },
    { src: "assets/partners/elevators/schindler.png", name: "שינדלר" }
  ];

  function motionAllowed() {
    if (html.classList.contains("a11y-rm")) return false;
    if (html.classList.contains("a11y-motion-ok")) return true;
    return !(mq && mq.matches);
  }

  function raf(fn) {
    if (window.requestAnimationFrame) window.requestAnimationFrame(fn);
    else window.setTimeout(fn, 16);
  }

  function preload(list) {
    list.forEach(function (item) {
      var img = new Image();
      img.src = typeof item === "string" ? item : item.src;
    });
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /* ------------------------------------------------------------- suppliers */

  function initSuppliers() {
    var stage = doc.querySelector("[data-sup-stage]");
    if (!stage) return;

    var btn = stage.querySelector("[data-sup-toggle]");
    var playing = true;

    preload(suppliers);

    function setPlaying(next) {
      playing = next;
      stage.classList.toggle("is-paused", !playing);
      if (!btn) return;
      btn.setAttribute("aria-pressed", playing ? "false" : "true");
      btn.setAttribute("aria-label", playing ? "עצירת אנימציית הספקים" : "הפעלת אנימציית הספקים");
    }

    if (btn) {
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () { setPlaying(!playing); });
    }

    /* Stop the loop while the module is outside the viewport. */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          stage.classList.toggle("is-off", !entry.isIntersecting);
        });
      }, { rootMargin: "12% 0px" }).observe(stage);
    }

    /* Also stop when the browser tab is hidden. */
    doc.addEventListener("visibilitychange", function () {
      stage.classList.toggle("is-off", doc.hidden);
    });

    setPlaying(true);
  }

  /* ------------------------------------------------------------- elevators */

  function initLift() {
    var track = doc.querySelector("[data-lift-track]");
    if (!track) return;

    var stick = track.querySelector("[data-lift-stick]");
    var stage = track.querySelector("[data-lift-stage]");
    var logo = track.querySelector("[data-lift-logo]");
    var logoImg = track.querySelector("[data-lift-logo-img]");
    var nameEl = track.querySelector("[data-lift-name]");
    var countEl = track.querySelector("[data-lift-count]");
    var floorEl = track.querySelector("[data-lift-floor]");
    var bar = track.querySelector("[data-lift-bar]");
    var hint = track.querySelector("[data-lift-hint]");
    var railDots = track.querySelectorAll("[data-lift-dot]");
    if (!stick || !stage || !logo || !logoImg) return;

    var total = elevators.length;
    var current = -1;
    var visible = false;
    var queued = false;

    preload(elevators);

    function setCompany(i) {
      var next = clamp(i, 0, total - 1);
      if (next === current) return;
      current = next;
      logoImg.src = elevators[next].src;
      logoImg.alt = "";
      if (nameEl) nameEl.textContent = elevators[next].name;
      if (countEl) countEl.textContent = ("0" + (next + 1)).slice(-2) + " / 0" + total;
      if (floorEl) floorEl.textContent = ("0" + (next + 1)).slice(-2);

      for (var d = 0; d < railDots.length; d++) {
        railDots[d].classList.toggle("is-on", d === next);
      }

      logo.classList.remove("is-pop");
      void logo.offsetWidth;
      logo.classList.add("is-pop");
    }

    function update() {
      queued = false;

      if (!motionAllowed() || track.offsetParent === null) return;

      var rect = track.getBoundingClientRect();
      var top = parseFloat(window.getComputedStyle(stick).top) || 0;
      var travel = stick.offsetHeight;
      var span = rect.height - travel;
      if (span <= 0) return;

      var p = clamp((top - rect.top) / span, 0, 1);

      stage.classList.toggle("is-open", p > 0.02);

      /* Open the doors first, then give each company an equal slice. */
      var q = clamp((p - 0.05) / 0.9, 0, 1);
      setCompany(Math.min(total - 1, Math.floor(q * total)));

      if (bar) bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      if (hint) hint.classList.toggle("is-done", p > 0.86);
    }

    function onScroll() {
      if (!visible || queued) return;
      queued = true;
      raf(update);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          visible = entry.isIntersecting;
          if (visible) update();
        });
      }, { rootMargin: "22% 0px" }).observe(track);
    } else {
      visible = true;
      update();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { if (visible) update(); });
    window.addEventListener("load", function () { if (visible) update(); });

    /* honour the site's reduce-motion switch while the page is open */
    new MutationObserver(function () {
      if (motionAllowed() && visible) update();
    }).observe(html, { attributes: true, attributeFilter: ["class"] });

    if (mq && mq.addEventListener) {
      mq.addEventListener("change", function () {
        if (motionAllowed() && visible) update();
      });
    }

    setCompany(0);
    update();
  }

  /* ------------------------------------------------------------- utilities */

  function initUtilities() {
    var stage = doc.querySelector("[data-util-stage]");
    if (!stage) return;

    function live() {
      stage.classList.add("is-live");
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          live();
          io.disconnect();
        });
      }, { threshold: 0.2, rootMargin: "0px 0px -5% 0px" });
      io.observe(stage);

      /* Safety net for fast anchor jumps and restored scroll positions. */
      window.setTimeout(function () {
        var r = stage.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) live();
      }, 1400);
    } else {
      live();
    }
  }

  function init() {
    initSuppliers();
    initLift();
    initUtilities();
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
