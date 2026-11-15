/* ==========================================================================
   LORIAN — partners, suppliers & utility companies
   Lightweight, dependency-free controllers:
     · suppliers: pause / play + pause when the stage leaves the viewport
     · elevators: one cabin with prev / next / skip buttons (floors = companies)
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
    "assets/partners/suppliers/zik.png",
    "assets/partners/suppliers/bermad.png",
    "assets/partners/suppliers/telefire.webp",
    "assets/partners/suppliers/sal-north.jpg",
    "assets/partners/suppliers/building.jpg",
    "assets/partners/suppliers/hatzalah.png",
    "assets/partners/suppliers/binyah-water.png"
  ];

  var elevators = [
    { src: "assets/partners/elevators/electra.png", name: "אלקטרה מעליות" },
    { src: "assets/partners/elevators/inter-up.webp", name: "אינטר־אפ מעליות" },
    { src: "assets/partners/elevators/kone.png", name: "KONE" },
    { src: "assets/partners/elevators/schindler.png", name: "שינדלר" },
    { src: "assets/partners/elevators/al-rad.png", name: "על־רד הנדסת מעליות" },
    { src: "assets/partners/elevators/kol-lift.png", name: "כל ליפט" },
    { src: "assets/partners/elevators/elevator-co.jpg", name: "חברת מעליות" }
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

    var stage = track.querySelector("[data-lift-stage]");
    var logo = track.querySelector("[data-lift-logo]");
    var logoImg = track.querySelector("[data-lift-logo-img]");
    var nameEl = track.querySelector("[data-lift-name]");
    var countEl = track.querySelector("[data-lift-count]");
    var floorEl = track.querySelector("[data-lift-floor]");
    var bar = track.querySelector("[data-lift-bar]");
    var live = track.querySelector("[data-lift-live]");
    var prevBtn = track.querySelector("[data-lift-prev]");
    var nextBtn = track.querySelector("[data-lift-next]");
    var skipLink = track.querySelector("[data-lift-skip]");
    var railDots = track.querySelectorAll("[data-lift-dot]");
    if (!stage || !logo || !logoImg) return;

    var total = elevators.length;
    var current = 0;
    var busy = false;
    var opened = false;
    var timer = 0;
    var DOOR_MS = 650;

    preload(elevators);

    function pad(n) { return ("0" + n).slice(-2); }

    function paint(i) {
      current = clamp(i, 0, total - 1);
      logoImg.src = elevators[current].src;
      logoImg.alt = "";
      if (nameEl) nameEl.textContent = elevators[current].name;
      if (countEl) countEl.textContent = pad(current + 1) + " / " + pad(total);
      if (floorEl) floorEl.textContent = pad(current + 1);
      if (bar) bar.style.transform = "scaleX(" + ((current + 1) / total).toFixed(4) + ")";
      for (var d = 0; d < railDots.length; d++) {
        railDots[d].classList.toggle("is-on", d === current);
      }
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.disabled = current === total - 1;
      if (live) live.textContent = "קומה " + (current + 1) + " מתוך " + total + ": " + elevators[current].name;
      logo.classList.remove("is-pop");
      void logo.offsetWidth;
      logo.classList.add("is-pop");
    }

    function openDoors() { stage.classList.add("is-open"); opened = true; }

    /* Close the doors, swap the "floor", open again. */
    function go(i) {
      var target = clamp(i, 0, total - 1);
      if (target === current || busy) return;
      if (!motionAllowed()) { paint(target); return; }
      busy = true;
      stage.classList.remove("is-open");
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        paint(target);
        openDoors();
        window.setTimeout(function () { busy = false; }, 280);
      }, DOOR_MS);
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { go(current - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(current + 1); });

    /* Skip: jump to whatever comes after the elevators module. */
    if (skipLink) {
      skipLink.addEventListener("click", function (e) {
        var target = doc.getElementById("suppliers-utilities");
        if (!target) return;
        e.preventDefault();
        var smooth = motionAllowed() ? "smooth" : "auto";
        try { target.scrollIntoView({ behavior: smooth, block: "start" }); }
        catch (err) { target.scrollIntoView(); }
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        try { target.focus({ preventScroll: true }); } catch (err2) { /* ignore */ }
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, "", "#suppliers-utilities");
        }
      });
    }

    /* Keyboard: arrows move between floors while focus is inside the module. */
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { go(current + 1); }
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") { go(current - 1); }
    });

    /* Touch: swipe on the cabin. */
    var sx = null;
    stage.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) < 40) return;
      go(dx < 0 ? current + 1 : current - 1);   /* swipe left = next (RTL-agnostic, matches carousel feel) */
    }, { passive: true });

    /* Doors open the first time the cabin scrolls into view. */
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !opened) {
            window.setTimeout(openDoors, 250);
            io.disconnect();
          }
        });
      }, { threshold: 0.35 });
      io.observe(stage);
    } else {
      openDoors();
    }

    paint(0);
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
