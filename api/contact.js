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
// ---- Branded HTML email (table layout + inline CSS for email-client compatibility; no JS, no external assets) ----
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
const SOURCES = { hero: 'טופס בראש העמוד', footer: 'טופס בתחתית העמוד' };
function row(label, valueHtml) {
  return '<tr><td style="padding:14px 20px;border-bottom:1px solid #ece6d6;" dir="rtl" align="right">' +
    '<div style="font-size:12px;line-height:18px;color:#8a7a4a;font-weight:700;letter-spacing:.3px;">' + label + '</div>' +
    '<div style="font-size:17px;line-height:26px;color:#14151b;font-weight:600;word-break:break-word;overflow-wrap:anywhere;">' + valueHtml + '</div></td></tr>';
}
function buildEmailHtml(d) {
  const font = "Arial,'Segoe UI',Helvetica,sans-serif";
  const rows = row('שם פרטי', esc(d.firstName)) + row('שם משפחה', esc(d.lastName)) +
    row('מספר טלפון', '<a href="tel:' + esc(d.phone) + '" dir="ltr" style="color:#14151b;text-decoration:none;unicode-bidi:embed;">' + esc(d.phone) + '</a>') +
    (SOURCES[d.source] ? row('מקור הפנייה', esc(SOURCES[d.source])) : '') +
    row('תאריך ושעת קבלה', esc(d.when));
  return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>LORIAN | פנייה חדשה</title></head>' +
    '<body dir="rtl" style="margin:0;padding:0;background:#f3efe6;font-family:' + font + ';">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">פנייה חדשה התקבלה מ' + esc(d.firstName) + ' ' + esc(d.lastName) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3efe6;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e4dcc6;border-radius:18px;overflow:hidden;">' +
    // header: L mark + LORIAN
    '<tr><td dir="ltr" align="center" style="background:#14151b;padding:28px 20px;border-bottom:3px solid #d4af37;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>' +
    '<td width="52" height="52" align="center" valign="middle" style="width:52px;height:52px;background:#14151b;border:2px solid #d4af37;border-radius:12px;color:#d4af37;font-family:Georgia,\'Times New Roman\',serif;font-size:32px;line-height:52px;font-weight:700;">L</td>' +
    '<td style="padding-left:14px;color:#fcebc7;font-family:Georgia,\'Times New Roman\',serif;font-size:28px;letter-spacing:6px;font-weight:700;">LORIAN</td>' +
    '</tr></table></td></tr>' +
    // title
    '<tr><td dir="rtl" align="right" style="padding:30px 24px 8px;">' +
    '<h1 style="margin:0;font-size:24px;line-height:32px;color:#14151b;">פנייה חדשה התקבלה מהאתר</h1>' +
    '<p style="margin:8px 0 0;font-size:15px;line-height:24px;color:#5b5a55;">מבקר באתר השאיר פרטים וממתין לחזרה. הפרטים מופיעים להלן.</p></td></tr>' +
    // details
    '<tr><td style="padding:16px 24px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf7ef;border:1px solid #ece6d6;border-radius:12px;">' + rows + '</table></td></tr>' +
    // call button
    '<tr><td align="center" style="padding:20px 24px 30px;"><a href="tel:' + esc(d.phone) + '" style="display:inline-block;background:#d4af37;color:#14151b;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:999px;">חיוג לפונה</a></td></tr>' +
    // footer
    '<tr><td align="center" style="background:#14151b;padding:20px;color:#c7c4be;font-size:13px;line-height:20px;"><span style="color:#d4af37;font-weight:700;letter-spacing:3px;">LORIAN</span><br>הודעה אוטומטית מטופס יצירת הקשר באתר</td></tr>' +
    '</table></td></tr></table></body></html>';
}
// Display name only: the actual sender address is still CONTACT_FROM (must be a verified Resend sender).
function brandedFrom(addr) { const a = String(addr).trim(); return a.indexOf('<') === -1 ? '"LORIAN | פנייה חדשה מהאתר" <' + a + '>' : a; }
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
      body: JSON.stringify({ from: brandedFrom(CONTACT_FROM), to: [CONTACT_TO], subject: 'LORIAN | פנייה חדשה מאתר החברה', text, html: buildEmailHtml({ firstName, lastName, phone, source, when }) }),
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) { console.error('contact: provider rejected, status', r.status); return send(res, 502, { ok: false, error: 'send_failed' }); }
    if (sid) done.set(sid, now);
    return send(res, 200, { ok: true });
  } catch (e) { console.error('contact: send failed', e && e.name); return send(res, 502, { ok: false, error: 'send_failed' }); }
};
