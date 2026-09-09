// ============================================================
// CaféPro — Fonction Supabase "send-report" (VERSION 2)
// Envoie au boss les points quotidiens et rapports mensuels
// via Resend (https://resend.com — gratuit).
//
// NOUVEAUTÉ v2 (10/09/2026) — gère les appels du CRON :
//   • mode "daily"   : construit et envoie le point du jour
//                      TOUS LES JOURS, MÊME SANS AUCUNE ACTIVITÉ
//                      (« néant » vaut mieux que le silence pour le boss)
//   • mode "monthly" : bilan mensuel compact (ventes, encaissé, dépenses)
//   • le mode relais (to/subject/html) est inchangé — c'est celui de l'app
//   • dédoublonnage : si le point du jour a déjà été envoyé (par l'app ou
//     par le cron), rien ne repart (journal email_log)
//
// DÉPLOIEMENT (10 min) :
// 1. Supabase → Edge Functions → « send-report » (déjà créée ? cliquez
//    dessus, remplacez TOUT le code par ce fichier → Deploy)
//    Sinon : « New Function » → nom : send-report → collez tout → Deploy
// 2. Dans « Secrets » de la fonction, ajoutez (conservés d'une version
//    à l'autre — à ne saisir qu'une seule fois) :
//      RESEND_API_KEY   = clé API de votre compte Resend (re_xxx)
//      REPORT_KEY       = le même mot de passe que dans l'app (Réglages → 📧)
//      EMAIL_FROM       = expéditeur, ex: CafePro <onboarding@resend.dev>
// 3. Rien d'autre : l'email du boss est lu dans les réglages de l'app.
// ============================================================

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const REPORT_KEY = Deno.env.get("REPORT_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "CafePro <onboarding@resend.dev>";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-report-key",
    },
  });

/* Accès direct à la base (clé service auto-injectée — contourne les
   politiques RLS, usage réservé au serveur) */
async function db(path: string, method = "GET", body?: unknown): Promise<any> {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(body ? { Prefer: "return=minimal" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`DB ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return method === "GET" ? await r.json() : null;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " F";
const CSS =
  "body{font-family:Arial,sans-serif;color:#2b211a}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left}th{background:#6f4e37;color:#fff}.tot{font-weight:bold;background:#f4ece2}.ok{color:#1d7a4f;font-weight:bold}.bad{color:#c0392b;font-weight:bold}h2,h3{color:#6f4e37}";
function shell(title: string, body: string) {
  return (
    `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>` +
    `<h2>☕ ${esc(title)}</h2>${body}` +
    `<p style="color:#999;font-size:11px">Généré automatiquement — CaféPro · Réalisé par Doregoservices · 07 17 57 95 56</p></body></html>`
  );
}

async function bossEmail(): Promise<string> {
  const rows = await db("settings?key=eq.email&select=value");
  let v: any = rows && rows[0] && rows[0].value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  const to = (v && v.boss) || "";
  if (!to) throw new Error("Email du boss absent — Réglages → 📧 dans l'app");
  return to;
}

async function alreadySent(kind: string, ref: string): Promise<boolean> {
  const logs = await db(`email_log?kind=eq.${kind}&ref=eq.${ref}&select=status`);
  return (logs || []).some((l: any) => l.status === "sent" || l.status === "update_pending");
}
async function logSend(kind: string, ref: string, detail: string) {
  await db("email_log", "POST", {
    kind,
    ref,
    sent_at: new Date().toISOString(),
    status: "sent",
    detail,
  });
}

/* ── POINT QUOTIDIEN (toujours envoyé, même néant) ─────────────── */
async function daily(): Promise<{ skip?: string; to?: string; subject?: string; html?: string; ref?: string }> {
  const D = new Date().toISOString().slice(0, 10); // serveur UTC = heure de Côte d'Ivoire (GMT+0)
  if (await alreadySent("daily", D)) return { skip: `Point du ${D} déjà envoyé — rien à faire` };
  const to = await bossEmail();
  const [sales, cash, pend, agents, allCash] = await Promise.all([
    db(`sales?date=eq.${D}&select=agent_name,total,pay_mode,credit_status`),
    db(`cash_entries?date=eq.${D}&select=type,account,amount`),
    db(`pending_entries?source_type=eq.sales&status=eq.pending&select=source_name,payload,created_at`),
    db(`sales_agents?active=eq.true&select=name`),
    db(`cash_entries?select=type,account,amount`),
  ]);
  const pendD = (pend as any[]).filter((p) => ((p.payload || {}) as any).date === D);
  const tot = (sales as any[]).reduce((a, s) => a + Number(s.total || 0), 0);
  const pendTot = pendD.reduce((a, p) => a + Number(((p.payload || {}) as any).total || 0), 0);
  const rows: string[] = [];
  for (const a of agents as any[]) {
    const vs = (sales as any[]).filter((s) => s.agent_name === a.name);
    const ps = pendD.filter((p) => (((p.payload || {}) as any).agent_name || p.source_name) === a.name);
    const vt = vs.reduce((x, s) => x + Number(s.total || 0), 0);
    const pt = ps.reduce((x, p) => x + Number(((p.payload || {}) as any).total || 0), 0);
    const rej = ps.length > 0 || vs.length > 0 ? "" : '<span class="bad">🔴 Aucun envoi reçu</span>';
    rows.push(
      `<tr><td><b>${esc(a.name)}</b></td><td>${vs.length ? `<span class="ok">${vs.length} validée${vs.length > 1 ? "s" : ""} · ${money(vt)}</span>` : "—"}</td>` +
        `<td>${ps.length ? `<span class="bad">${ps.length} à valider · ${money(pt)}</span>` : "—"}</td><td>${rej}</td></tr>`
    );
  }
  rows.push(
    `<tr class="tot"><td>TOTAL (${(sales as any[]).length} vente(s) validée(s))</td><td>${money(tot)}</td>` +
      `<td>${pendD.length ? `<span class="bad">${money(pendTot)} à valider</span>` : "—"}</td><td></td></tr>`
  );
  const cashIn = (cash as any[]).filter((e) => e.type === "in").reduce((a, e) => a + Number(e.amount || 0), 0);
  const cashOut = (cash as any[]).filter((e) => e.type === "out").reduce((a, e) => a + Number(e.amount || 0), 0);
  const bal = { cash: 0, momo: 0 };
  (allCash as any[]).forEach((e) => {
    const v = Number(e.amount || 0);
    bal[e.account === "momo" ? "momo" : "cash"] += e.type === "in" ? v : -v;
  });
  const vide = !(sales as any[]).length && !(cash as any[]).length && !pendD.length;
  const html = shell(
    "Point quotidien du " + D,
    (vide
      ? `<p style="background:#f4ece2;border-left:4px solid #6f4e37;padding:10px 12px"><b>🌑 Journée sans activité.</b> Aucune vente, aucun mouvement de caisse, aucun envoi reçu — rien à signaler ce jour.</p>`
      : `<h3>Point du ${esc(D)}</h3>`) +
      `<table><tr><th>Commerciale</th><th>✅ Validées</th><th>⏳ À valider</th><th>Envoi du jour</th></tr>${rows.join("")}</table>` +
      `<h3>Caisse du jour</h3><table><tr><th></th><th style="text-align:right">Montant</th></tr>` +
      `<tr><td>Entrées</td><td style="text-align:right" class="ok">${money(cashIn)}</td></tr>` +
      `<tr><td>Sorties</td><td style="text-align:right" class="bad">${money(cashOut)}</td></tr></table>` +
      `<p>Soldes en fin de journée — Espèces : <b>${money(bal.cash)}</b> · Mobile Money : <b>${money(bal.momo)}</b></p>`
  );
  return { to, subject: `Point du ${D} — CaféPro`, html, ref: D };
}

/* ── BILAN MENSUEL COMPACT (rappel) ───────────────────────────── */
async function monthly(): Promise<{ skip?: string; to?: string; subject?: string; html?: string; ref?: string }> {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const P = new Date(first.getTime() - 86400000).toISOString().slice(0, 7);
  const firstISO = first.toISOString().slice(0, 10);
  if (await alreadySent("monthly", P)) return { skip: `Bilan ${P} déjà envoyé` };
  const to = await bossEmail();
  const [sales, cash] = await Promise.all([
    db(`sales?date=gte.${P}-01&date=lt.${firstISO}&select=agent_name,total,pay_mode,credit_status`),
    db(`cash_entries?date=gte.${P}-01&date=lt.${firstISO}&select=type,amount,imputable`),
  ]);
  const tot = (sales as any[]).reduce((a, s) => a + Number(s.total || 0), 0);
  const encaisse = (sales as any[]).filter((s) => s.pay_mode !== "credit").reduce((a, s) => a + Number(s.total || 0), 0);
  const credit = (sales as any[]).filter((s) => s.pay_mode === "credit" && s.credit_status === "due").reduce((a, s) => a + Number(s.total || 0), 0);
  const depenses = (cash as any[]).filter((e) => e.type === "out" && e.imputable !== false).reduce((a, e) => a + Number(e.amount || 0), 0);
  const byAg: Record<string, number> = {};
  (sales as any[]).forEach((s) => {
    const k = s.agent_name || "Vente directe";
    byAg[k] = (byAg[k] || 0) + Number(s.total || 0);
  });
  const vide = !(sales as any[]).length && !(cash as any[]).length;
  const html = shell(
    "Bilan du mois " + P,
    (vide
      ? `<p style="background:#f4ece2;border-left:4px solid #6f4e37;padding:10px 12px"><b>🌑 Mois sans activité enregistrée.</b></p>`
      : `<h3>Bilan ${esc(P)}</h3>`) +
      `<table><tr><th>Commerciale</th><th style="text-align:right">Ventes du mois</th></tr>` +
      Object.keys(byAg).map((n) => `<tr><td>${esc(n)}</td><td style="text-align:right">${money(byAg[n])}</td></tr>`).join("") +
      `<tr class="tot"><td>TOTAL (${(sales as any[]).length} vente(s))</td><td style="text-align:right">${money(tot)}</td></tr></table>` +
      `<p>Encaissé comptant : <b class="ok">${money(encaisse)}</b> · À crédit : <b class="bad">${money(credit)}</b> · Dépenses imputables : <b class="bad">${money(depenses)}</b></p>` +
      `<p style="font-size:12px;color:#666">📊 Le rapport mensuel complet (résultat détaillé + annexes DGI Excel) se prépare dans l'application : CaféPro → Exploitation.</p>`
  );
  return { to, subject: `Bilan du mois ${P} — CaféPro`, html, ref: P };
}

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error("Resend: " + (await r.text()));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY non configuré" }, 500);
  if (!REPORT_KEY || req.headers.get("x-report-key") !== REPORT_KEY)
    return json({ error: "Clé d'envoi (REPORT_KEY) invalide" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  /* Appels du cron : la fonction construit et envoie le rapport elle-même */
  if (body && body.mode === "daily") {
    try {
      const r = await daily();
      if (r.skip) return json({ ok: true, skipped: r.skip });
      await sendViaResend(r.to!, r.subject!, r.html!);
      await logSend("daily", r.ref!, "cron");
      return json({ ok: true, mode: "daily", ref: r.ref });
    } catch (e) {
      return json({ error: String((e as Error).message || e) }, 500);
    }
  }
  if (body && body.mode === "monthly") {
    try {
      const r = await monthly();
      if (r.skip) return json({ ok: true, skipped: r.skip });
      await sendViaResend(r.to!, r.subject!, r.html!);
      await logSend("monthly", r.ref!, "cron");
      return json({ ok: true, mode: "monthly", ref: r.ref });
    } catch (e) {
      return json({ error: String((e as Error).message || e) }, 500);
    }
  }

  /* Mode relais (appelé par l'app) — inchangé */
  const { to, subject, html, attachment } = body ?? {};
  if (!to || !subject || !html) return json({ error: "Champs requis : to, subject, html" }, 400);
  const payload: Record<string, unknown> = { from: EMAIL_FROM, to: [to], subject, html };
  if (attachment?.filename && attachment?.base64) {
    payload.attachments = [{ filename: attachment.filename, content: attachment.base64 }];
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) return json({ error: "Resend: " + (await r.text()) }, 502);
  return json({ ok: true });
});
