(function () {
  'use strict';

  var KEY = 'lorian-a11y-v1';
  var STEPS = [0.85, 1, 1.15, 1.3, 1.5, 1.75];   // text size scale steps
  var DEFAULT_STEP = 1;
  var MAX_LEVEL = 3;                               // line / letter spacing levels
  var root = document.documentElement;

  function defaults() {
    return {
      fontStep: DEFAULT_STEP, lineSpacing: 0, letterSpacing: 0,
      readableFont: false, highlightHeadings: false, highlightLinks: false, highlightButtons: false,
      highContrast: false, grayscale: false, focusHighlight: false, keyboardAssist: false,
      reduceMotion: null // null = follow the operating system preference
    };
  }

  /* ---------- storage (never throws) ---------- */
  var storageOK = true;
  function readStored() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { storageOK = false; return null; }
  }
  function writeStored(state) {
    try {
      if (isDefault(state)) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, JSON.stringify(state));
      storageOK = true;
      return true;
    } catch (e) { storageOK = false; return false; }
  }
  function isDefault(s) {
    var d = defaults();
    for (var k in d) { if (s[k] !== d[k]) return false; }
    return true;
  }
  function sanitize(src) {
    var s = defaults();
    if (!src || typeof src !== 'object') return s;
    if (typeof src.fontStep === 'number' && src.fontStep >= 0 && src.fontStep < STEPS.length) s.fontStep = Math.round(src.fontStep);
    if (typeof src.lineSpacing === 'number' && src.lineSpacing >= 0 && src.lineSpacing <= MAX_LEVEL) s.lineSpacing = Math.round(src.lineSpacing);
    if (typeof src.letterSpacing === 'number' && src.letterSpacing >= 0 && src.letterSpacing <= MAX_LEVEL) s.letterSpacing = Math.round(src.letterSpacing);
    ['readableFont', 'highlightHeadings', 'highlightLinks', 'highlightButtons', 'highContrast', 'grayscale', 'focusHighlight', 'keyboardAssist']
      .forEach(function (k) { if (typeof src[k] === 'boolean') s[k] = src[k]; });
    if (typeof src.reduceMotion === 'boolean') s.reduceMotion = src.reduceMotion;
    return s;
  }

  var state = sanitize(readStored());

  /* ---------- OS motion preference ---------- */
  var mq = null;
  try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}
  function osReduce() { return !!(mq && mq.matches); }
  function motionEffective() { return state.reduceMotion === null ? osReduce() : state.reduceMotion; }

  /* ---------- apply state to the document (runs immediately, before first paint) ---------- */
  function setClass(name, on) { root.classList.toggle(name, !!on); }
  function applyState() {
    var scale = STEPS[state.fontStep];
    root.style.setProperty('--a11y-fs', String(scale));
    setClass('a11y-fs', scale !== 1);
    setClass('a11y-fs-lg', scale >= 1.5);
    for (var i = 1; i <= MAX_LEVEL; i++) {
      setClass('a11y-lh-' + i, state.lineSpacing === i);
      setClass('a11y-ls-' + i, state.letterSpacing === i);
    }
    setClass('a11y-rf', state.readableFont);
    setClass('a11y-hh', state.highlightHeadings);
    setClass('a11y-hl', state.highlightLinks);
    setClass('a11y-hb', state.highlightButtons);
    setClass('a11y-hc', state.highContrast);
    setClass('a11y-gray', state.grayscale);
    setClass('a11y-focus', state.focusHighlight);
    setClass('a11y-kb', state.keyboardAssist);
    setClass('a11y-rm', motionEffective());
    setClass('a11y-motion-ok', state.reduceMotion === false);
  }
  applyState();

  /* ---------- UI (built once the DOM is ready) ---------- */
  function init() {
    var rootEl = document.getElementById('a11y-root');
    if (!rootEl) return;
    var fab = document.getElementById('a11y-fab');
    var panel = document.getElementById('a11y-panel');
    var title = document.getElementById('a11y-title');
    var closeBtn = document.getElementById('a11y-close');
    var live = document.getElementById('a11y-live');
    var note = document.getElementById('a11y-storage-note');
    var hint = document.getElementById('a11y-kbhint');
    var hintCur = document.getElementById('a11y-kbcur');
    var opts = {};
    [].forEach.call(rootEl.querySelectorAll('[data-opt]'), function (b) { opts[b.getAttribute('data-opt')] = b; });

    function announce(msg) {
      if (!live) return;
      live.textContent = '';
      window.setTimeout(function () { live.textContent = msg; }, 40);
    }

    /* status derived from what is really applied on <html>, so the UI can never claim a state that is not in effect */
    function has(c) { return root.classList.contains(c); }
    function levelText(n) { return n === 0 ? 'כבוי' : 'דרגה ' + n + ' מתוך ' + MAX_LEVEL; }
    function pct(step) { return Math.round(STEPS[step] * 100) + '%'; }

    function setOpt(name, on, status, disabled) {
      var b = opts[name]; if (!b) return;
      b.classList.toggle('is-on', !!on);
      if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (disabled) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      var st = b.querySelector('.a11y-opt-status');
      if (st) st.textContent = status;
    }

    function render() {
      var scale = parseFloat(root.style.getPropertyValue('--a11y-fs')) || 1;
      var step = STEPS.indexOf(scale);
      var sizeTxt = Math.round(scale * 100) + '%' + (scale === 1 ? ' (ברירת מחדל)' : '');
      var atMax = step === STEPS.length - 1, atMin = step === 0;
      setOpt('fontUp', scale > 1, atMax ? 'מקסימום – ' + Math.round(scale * 100) + '%' : 'גודל נוכחי: ' + sizeTxt, atMax);
      setOpt('fontDown', scale < 1, atMin ? 'מינימום – ' + Math.round(scale * 100) + '%' : 'גודל נוכחי: ' + sizeTxt, atMin);
      var lvl = 0, k;
      for (k = 1; k <= MAX_LEVEL; k++) if (has('a11y-lh-' + k)) lvl = k;
      setOpt('lineSpacing', lvl > 0, levelText(lvl));
      lvl = 0;
      for (k = 1; k <= MAX_LEVEL; k++) if (has('a11y-ls-' + k)) lvl = k;
      setOpt('letterSpacing', lvl > 0, levelText(lvl));
      var map = { readableFont: 'a11y-rf', highlightHeadings: 'a11y-hh', highlightLinks: 'a11y-hl', highlightButtons: 'a11y-hb',
                  highContrast: 'a11y-hc', grayscale: 'a11y-gray', focusHighlight: 'a11y-focus', keyboardAssist: 'a11y-kb' };
      Object.keys(map).forEach(function (n) { var on = has(map[n]); setOpt(n, on, on ? 'פעיל' : 'כבוי'); });
      var rm = has('a11y-rm');
      setOpt('reduceMotion', rm, rm ? (state.reduceMotion === null ? 'פעיל (לפי הגדרת המערכת)' : 'פעיל') : 'כבוי');
      var rs = opts.resetSize;
      if (rs) { if (scale === 1) rs.setAttribute('aria-disabled', 'true'); else rs.removeAttribute('aria-disabled'); }
      hint.hidden = !has('a11y-kb');
      if (note) {
        if (storageOK) { note.className = 'a11y-note'; note.textContent = 'ההגדרות נשמרות בדפדפן במכשיר זה ויופעלו גם בביקור הבא.'; }
        else { note.className = 'a11y-note warn'; note.textContent = 'לא ניתן לשמור הגדרות בדפדפן זה. ההגדרות יחולו רק בביקור הנוכחי.'; }
      }
    }

    function commit() { applyState(); writeStored(state); render(); }

    /* ---------- open / close ---------- */
    function isOpen() { return !panel.hidden; }
    function openPanel() {
      panel.hidden = false;
      fab.setAttribute('aria-expanded', 'true');
      title.focus();
    }
    function closePanel(returnFocus) {
      panel.hidden = true;
      fab.setAttribute('aria-expanded', 'false');
      if (returnFocus) fab.focus();
    }
    fab.addEventListener('click', function () { if (isOpen()) closePanel(true); else openPanel(); });
    closeBtn.addEventListener('click', function () { closePanel(true); });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) { e.preventDefault(); closePanel(true); }
    });
    var footBtn = document.getElementById('a11y-open-footer');
    if (footBtn) footBtn.addEventListener('click', function () { if (!isOpen()) openPanel(); else title.focus(); });

    /* ---------- actions ---------- */
    function cycle(v) { return v >= MAX_LEVEL ? 0 : v + 1; }
    var actions = {
      fontUp: function () {
        if (state.fontStep >= STEPS.length - 1) { announce('הגעת לגודל הטקסט המקסימלי: ' + pct(state.fontStep)); return; }
        state.fontStep++; commit(); announce('גודל הטקסט: ' + pct(state.fontStep));
      },
      fontDown: function () {
        if (state.fontStep <= 0) { announce('הגעת לגודל הטקסט המינימלי: ' + pct(state.fontStep)); return; }
        state.fontStep--; commit(); announce('גודל הטקסט: ' + pct(state.fontStep));
      },
      resetSize: function () {
        if (state.fontStep === DEFAULT_STEP) { announce('גודל הטקסט כבר במצב המקורי'); return; }
        state.fontStep = DEFAULT_STEP; commit(); announce('גודל הטקסט חזר למקור: 100%');
      },
      lineSpacing: function () { state.lineSpacing = cycle(state.lineSpacing); commit(); announce('מרווח בין שורות: ' + levelText(state.lineSpacing)); },
      letterSpacing: function () { state.letterSpacing = cycle(state.letterSpacing); commit(); announce('מרווח בין אותיות: ' + levelText(state.letterSpacing)); },
      reduceMotion: function () { state.reduceMotion = !motionEffective(); commit(); },
      reset: function () {
        state = defaults();
        applyState();
        try { window.localStorage.removeItem(KEY); storageOK = true; } catch (e) { storageOK = false; }
        render();
        announce('הגדרות הנגישות אופסו לברירת המחדל');
      }
    };
    ['readableFont', 'highlightHeadings', 'highlightLinks', 'highlightButtons', 'highContrast', 'grayscale', 'focusHighlight', 'keyboardAssist']
      .forEach(function (n) { actions[n] = function () { state[n] = !state[n]; commit(); }; });

    Object.keys(opts).forEach(function (n) {
      opts[n].addEventListener('click', function () {
        if (actions[n]) actions[n]();
      });
    });

    /* ---------- keyboard assist: show which element currently has focus ---------- */
    function nameOf(el) {
      if (!el || el === document.body) return '';
      var t = el.getAttribute('aria-label');
      if (!t && el.labels && el.labels.length) t = el.labels[0].textContent;
      if (!t) t = el.getAttribute('title');
      if (!t) t = el.textContent;
      if (!t && el.placeholder) t = el.placeholder;
      t = (t || el.tagName).replace(/\s+/g, ' ').trim();
      return t.length > 70 ? t.slice(0, 67) + '…' : t;
    }
    document.addEventListener('focusin', function (e) {
      if (!has('a11y-kb') || !hintCur) return;
      var n = nameOf(e.target);
      hintCur.textContent = n ? 'ממוקד כעת: ' + n : '';
    });

    /* follow live changes of the OS motion preference while the user has not chosen explicitly */
    if (mq) {
      var onChange = function () { if (state.reduceMotion === null) { applyState(); render(); } };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
