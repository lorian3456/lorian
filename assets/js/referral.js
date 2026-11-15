/* חבר מביא בניין — reveal, count-up, parallax. Honours reduced-motion + site switch. */
(function () {
  "use strict";
  var doc = document, html = doc.documentElement;
  var sec = doc.getElementById("referral");
  if (!sec) return;
  var stage = sec.querySelector("[data-ref-stage]");
  var num = sec.querySelector("[data-ref-count]");
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var counted = false;

  function motionAllowed() {
    if (html.classList.contains("a11y-rm")) return false;
    if (html.classList.contains("a11y-motion-ok")) return true;
    return !(mq && mq.matches);
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  function sync() {
    var on = motionAllowed();
    sec.classList.toggle("is-anim", on);
    if (!on) { sec.classList.add("is-live"); if (num) num.textContent = fmt(num.getAttribute("data-ref-count")); }
  }

  function countUp() {
    if (!num || counted) return;
    counted = true;
    var target = parseInt(num.getAttribute("data-ref-count"), 10) || 0;
    if (!motionAllowed()) { num.textContent = fmt(target); return; }
    var t0 = null, dur = 1600;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      num.textContent = fmt(Math.round(target * e));
      if (p < 1) window.requestAnimationFrame(step); else num.textContent = fmt(target);
    }
    num.textContent = "0";
    window.requestAnimationFrame(step);
  }

  function live() { sec.classList.add("is-live"); window.setTimeout(countUp, 500); }

  sync();
  if ("IntersectionObserver" in window) {
    var seen = false;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        sec.classList.toggle("is-off", !en.isIntersecting);
        if (en.isIntersecting && !seen) { seen = true; live(); }
      });
    }, { threshold: 0.18 }).observe(sec);
  } else { live(); }

  new MutationObserver(sync).observe(html, { attributes: true, attributeFilter: ["class"] });
  if (mq && mq.addEventListener) mq.addEventListener("change", sync);

  /* gentle pointer parallax on bills & coins (fine pointers only) */
  if (stage && window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
    var layers = stage.querySelectorAll("[data-depth]");
    for (var i = 0; i < layers.length; i++) layers[i].style.setProperty("--dp", layers[i].getAttribute("data-depth") + "px");
    var queued = false, px = 0, py = 0;
    sec.addEventListener("pointermove", function (e) {
      if (!motionAllowed()) return;
      var r = stage.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (queued) return; queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        stage.style.setProperty("--mx", Math.max(-1, Math.min(1, px)).toFixed(3));
        stage.style.setProperty("--my", Math.max(-1, Math.min(1, py)).toFixed(3));
      });
    }, { passive: true });
  }
})();
