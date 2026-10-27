// Vercel serverless function: POST /api/contact
// All secrets and the destination address come from environment variables (see .env.example).
// Nothing here is exposed to the browser.
const PHONE = /^(?:\+972|972|0)(?:5\d|[23489]|7\d)\d{7}$/;
const NAME = /^[\p{L}][\p{L}\s'"׳״.\-]{1,39}$/u;
const WINDOW_MS = 10 * 60 * 1000, MAX_HITS = 5, DEDUPE_MS = 5 * 60 * 1000;
const hits = new Map();   // ip -> timestamps (best effort, per instance)
const done = new Map();   // submissionId -> time of successful send

function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k);
  return list.length > MAX_HITS;
}
function clean(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function send(res, code, body) { res.setHeader('Cache-Control', 'no-store'); res.status(code).json(body); }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, error: 'method' }); }
  const origin = req.headers.origin;
  if (origin) { try { if (new URL(origin).host !== req.headers.host) return send(res, 403, { ok: false, error: 'origin' }); } catch (e) { return send(res, 403, { ok: false, error: 'origin' }); } }
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'unknown').split(',')[0].trim();
  if (limited(ip)) return send(res, 429, { ok: false, error: 'rate' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  if (clean(b.hp, 200)) return send(res, 200, { ok: true });          // honeypot: bots get a fake success
  const firstName = clean(b.firstName, 40), lastName = clean(b.lastName, 40);
  const phone = clean(b.phone, 20).replace(/[\s\-().]/g, ''), source = clean(b.source, 20), sid = clean(b.submissionId, 64);
  if (!NAME.test(firstName) || !NAME.test(lastName) || !PHONE.test(phone)) return send(res, 400, { ok: false, error: 'validation' });
  const now = Date.now();
  for (const [k, t] of done) if (now - t > DEDUPE_MS) done.delete(k);
  if (sid && done.has(sid)) return send(res, 200, { ok: true });          // double submit of the same form: do not email twice
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) { console.error('contact: email is not configured'); return send(res, 500, { ok: false, error: 'config' }); }
  const when = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'full', timeStyle: 'medium' });
  const text = 'פנייה חדשה התקבלה דרך טופס יצירת הקשר באתר.\n\n' +
    'שם פרטי: ' + firstName + '\nשם משפחה: ' + lastName + '\nמספר טלפון: ' + phone + '\nתאריך ושעת קבלה: ' + when + '\n';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
      // fixed subject, recipient and sender come only from the server: no user data reaches any email header
      body: JSON.stringify({ from: CONTACT_FROM, to: [CONTACT_TO], subject: 'פנייה חדשה מאתר החברה', text }),
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) { console.error('contact: provider rejected, status', r.status); return send(res, 502, { ok: false, error: 'send_failed' }); }
    if (sid) done.set(sid, now);
    return send(res, 200, { ok: true });
  } catch (e) { console.error('contact: send failed', e && e.name); return send(res, 502, { ok: false, error: 'send_failed' }); }
};
