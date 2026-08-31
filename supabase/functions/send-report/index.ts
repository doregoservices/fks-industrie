// ============================================================
// CaféPro — Fonction Supabase "send-report" v2
// Envoie au boss les points quotidiens et rapports mensuels.
//
// DEUX MODES :
//  1. RELAY (inchangé) — l'app poste {to, subject, html, attachment?}
//  2. PROGRAMMÉ — {mode:'daily'} ou {mode:'monthly'} : la fonction
//     calcule elle-même le point depuis la base et l'envoie.
//     Déclenché par pg_cron (voir cron-emails.sql) :
//       • Point quotidien à 22h00 — liste les commerciales qui
//         n'ont PAS envoyé leurs ventes (envoi même si incomplet)
//       • Rapport mensuel le 3 du mois à 10h00 (mois précédent)
//     Anti-doublon : table email_log (kind, ref, status).
//
// DÉPLOIEMENT :
//  1. Supabase → Edge Functions → send-report → remplacer par ce
//     fichier → Deploy
//  2. Secrets de la fonction :
//      RESEND_API_KEY            = clé Resend (re_xxx)
//      REPORT_KEY                = mot de passe (le même que dans l'app)
//      EMAIL_FROM                = ex: FKS Industrie <onboarding@resend.dev>
//      BOSS_EMAIL                = email du boss (mode programmé)
//      SUPABASE_SERVICE_ROLE_KEY = Settings → API → service_role key
//  3. SQL Editor → coller cron-emails.sql → Run
// ============================================================

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const REPORT_KEY = Deno.env.get("REPORT_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "CafePro <onboarding@resend.dev>";
const BOSS_EMAIL = Deno.env.get("BOSS_EMAIL") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

let CORS_ORIGIN = "*";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": CORS_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type, x-report-key, apikey, Authorization",
    },
  });

const fcfa = (n: number) =>
  Math.round(n).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") + " FCFA";
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const T = (title: string, rows: string[][]) =>
  `<tr><td colspan="2" style="background:#f5efe7;padding:8px 10px;font-weight:700;color:#5a4030">${title}</td></tr>` +
  rows.map((r) => `<tr><td style="padding:5px 10px;border-top:1px solid #eee">${r[0]}</td><td style="padding:5px 10px;border-top:1px solid #eee;text-align:right;font-weight:600">${r[1]}</td></tr>`).join("");

async function sb(table: string, query: string): Promise<any[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) throw new Error(`${table}: ${r.status}`);
  return r.json();
}
async function sbInsert(table: string, row: Record<string, unknown>) {
  await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}
async function sendMail(to: string, subject: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error("Resend: " + (await r.text()));
}
const wrap = (title: string, body: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#333">
     <div style="background:#5a4030;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
       <div style="font-size:20px;font-weight:700">☕ ${title}</div>
       <div style="opacity:.85;font-size:13px">FKS Industrie — envoyé automatiquement par CaféPro</div>
     </div>
     <div style="border:1px solid #e5ddd3;border-top:0;border-radius:0 0 10px 10px;padding:14px">${body}</div>
   </div>`;
const dFR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

async function dailyReport(D: string, force: boolean) {
  const done = await sb("email_log", `select=id,status&kind=eq.daily&ref=eq.${D}&status=eq.sent&limit=1`);
  if (done.length && !force) return { skipped: "point déjà envoyé pour le " + D };

  const [sales, agents, pend, cash, prods] = await Promise.all([
    sb("sales", `select=agent_name,total,pay_mode,credit_status&date=eq.${D}`),
    sb("sales_agents", "select=name&active=eq.true"),
    sb("pending_entries", "select=source_name,source_type,payload&status=eq.pending&order=created_at.asc"),
    sb("cash_entries", `select=type,account,amount,imputable&date=eq.${D}`),
    sb("productions", `select=roasted_used,lines&date=eq.${D}`),
  ]);

  const totVentes = sales.reduce((a, s) => a + Number(s.total || 0), 0);
  const credits = sales.filter((s) => s.credit_status === "credit");
  const byAgent = new Map<string, number>();
  sales.forEach((s) => byAgent.set(s.agent_name || "—", (byAgent.get(s.agent_name || "—") || 0) + Number(s.total || 0)));
  const names = new Set(sales.map((s) => (s.agent_name || "").trim()).filter(Boolean));
  const manquantes = agents.map((a) => String(a.name).trim()).filter((n) => n && !names.has(n));

  const cin = cash.filter((e) => e.type === "in").reduce((a, e) => a + Number(e.amount || 0), 0);
  const cout = cash.filter((e) => e.type === "out").reduce((a, e) => a + Number(e.amount || 0), 0);
  const mIn = cash.filter((e) => e.type === "in" && e.account === "momo").reduce((a, e) => a + Number(e.amount || 0), 0);
  const mOut = cash.filter((e) => e.type === "out" && e.account === "momo").reduce((a, e) => a + Number(e.amount || 0), 0);
  const kgRoast = prods.reduce((a, p) => a + Number(p.roasted_used || 0), 0);
  const unites = prods.reduce((a, p) => a + (p.lines || []).reduce((b: number, l: any) => b + Number(l.qty || 0), 0), 0);

  let body = "";
  if (manquantes.length)
    body += `<div style="background:#fdecea;border:1px solid #f5b7b0;border-radius:8px;padding:10px 12px;margin-bottom:12px">
      <b style="color:#b03a2e">⚠️ Ventes non reçues de ${manquantes.length} commerciale(s) :</b>
      ${manquantes.map(esc).join(", ")} — relancez-les (saisie possible jusqu'à 7 jours en arrière).</div>`;
  if (pend.length)
    body += `<div style="background:#fef9e7;border:1px solid #f7dc6f;border-radius:8px;padding:10px 12px;margin-bottom:12px">
      <b style="color:#9a7d0a">📥 ${pend.length} saisie(s) en attente de validation</b> dans l'app (non comptées ici).</div>`;
  body += `<table style="width:100%;border-collapse:collapse;font-size:14px">`;
  body += T("🛒 Ventes du " + dFR(D), [
    ["Chiffre d'affaires", `<span style="color:#1e8449">${fcfa(totVentes)}</span>`],
    ["Ventes", String(sales.length)],
    ...Array.from(byAgent.entries()).map(([n, t]) => [esc(n), fcfa(t)] as [string, string]),
    ["Dont crédit en cours", credits.length ? fcfa(credits.reduce((a, s) => a + Number(s.total || 0), 0)) + " (" + credits.length + ")" : "—"],
  ]);
  body += T("💰 Caisse du jour", [
    ["Entrées (espèces)", fcfa(cin - mIn)],
    ["Entrées (Mobile Money)", fcfa(mIn)],
    ["Sorties (espèces)", fcfa(cout - mOut)],
    ["Sorties (Mobile Money)", fcfa(mOut)],
  ]);
  if (kgRoast || unites)
    body += T("🏭 Production", [
      ["Café torréfié transformé", Math.round(kgRoast * 10) / 10 + " kg"],
      ["Unités conditionnées", String(unites)],
    ]);
  body += `</table>`;
  if (!sales.length && !cash.length)
    body = `<p style="text-align:center;color:#888">Aucune vente ni mouvement de caisse enregistré ce jour.</p>`;
  body += `<p style="font-size:11.5px;color:#999;margin-top:12px">Point envoyé automatiquement à 22h00. Rapport détaillé (Excel) disponible dans l'application — 📈 Exploitation.</p>`;

  await sendMail(BOSS_EMAIL, `☕ Point du ${dFR(D)} — CA ${fcfa(totVentes)}${manquantes.length ? " ⚠️ " + manquantes.length + " manquante(s)" : ""}`, wrap("Point quotidien — " + dFR(D), body));
  await sbInsert("email_log", { id: crypto.randomUUID(), kind: "daily", ref: D, sent_at: new Date().toISOString(), status: "sent", detail: manquantes.length ? "manquantes: " + manquantes.join(", ") : "complet" });
  return { sent: true, ca: totVentes, manquantes };
}

async function monthlyReport(force: boolean) {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const M = first.toISOString().slice(0, 7);
  const from = M + "-01";
  const to = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const label = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][first.getUTCMonth()] + " " + first.getUTCFullYear();

  const done = await sb("email_log", `select=id&kind=eq.monthly&ref=eq.${M}&status=eq.sent&limit=1`);
  if (done.length && !force) return { skipped: "rapport déjà envoyé pour " + M };

  const [sales, pur, cash, runs, prods] = await Promise.all([
    sb("sales", `select=total,credit_status&date=gte.${from}&date=lte.${to}`),
    sb("purchases", `select=qty_kg,amount&date=gte.${from}&date=lte.${to}`),
    sb("cash_entries", `select=type,category,amount,imputable&date=gte.${from}&date=lte.${to}`),
    sb("pay_runs", `select=total_net,status&period=eq.${M}`),
    sb("productions", `select=roasted_used,lines&date=gte.${from}&date=lte.${to}`),
  ]);

  const ca = sales.reduce((a, s) => a + Number(s.total || 0), 0);
  const impayes = sales.filter((s) => s.credit_status === "credit").reduce((a, s) => a + Number(s.total || 0), 0);
  const kg = pur.reduce((a, p) => a + Number(p.qty_kg || 0), 0);
  const achats = pur.reduce((a, p) => a + Number(p.amount || 0), 0);
  const out = cash.filter((e) => e.type === "out" && e.imputable !== false).reduce((a, e) => a + Number(e.amount || 0), 0);
  const inImp = cash.filter((e) => e.type === "in" && e.imputable !== false).reduce((a, e) => a + Number(e.amount || 0), 0);
  const byCat = new Map<string, number>();
  cash.filter((e) => e.type === "out" && e.imputable !== false).forEach((e) => byCat.set(e.category || "divers", (byCat.get(e.category || "divers") || 0) + Number(e.amount || 0)));
  const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const paie = runs.reduce((a, r) => a + Number(r.total_net || 0), 0);
  const kgRoast = prods.reduce((a, p) => a + Number(p.roasted_used || 0), 0);
  const unites = prods.reduce((a, p) => a + (p.lines || []).reduce((b: number, l: any) => b + Number(l.qty || 0), 0), 0);
  const res = inImp - out;

  let body = `<table style="width:100%;border-collapse:collapse;font-size:14px">`;
  body += T("🛒 Activité", [
    ["Chiffre d'affaires", `<span style="color:#1e8449">${fcfa(ca)}</span>`],
    ["Ventes", String(sales.length)],
    ["Crédit non encaissé", impayes ? fcfa(impayes) : "—"],
  ]);
  body += T("🏭 Production", [
    ["Café vert acheté", Math.round(kg) + " kg (" + fcfa(achats) + ")"],
    ["Café torréfié transformé", Math.round(kgRoast) + " kg"],
    ["Unités conditionnées", String(unites)],
  ]);
  body += T("💰 Trésorerie imputable", [
    ["Encaissements", fcfa(inImp)],
    ...top.map(([c, v]) => [esc(c), fcfa(v)] as [string, string]),
    ["Paie nette versée", paie ? fcfa(paie) : "—"],
    ["Résultat de trésorerie", `<b style="color:${res >= 0 ? "#1e8449" : "#b03a2e"}">${fcfa(res)}</b>`],
  ]);
  body += `</table>`;
  body += `<p style="font-size:11.5px;color:#999;margin-top:12px">Synthèse envoyée automatiquement le 3 du mois à 10h. Le compte d'exploitation détaillé (Excel, stocks, paie, impôts) se génère dans l'application — 📈 Exploitation → 📨.</p>`;

  await sendMail(BOSS_EMAIL, `📊 Rapport ${label} — CA ${fcfa(ca)} · résultat ${fcfa(res)}`, wrap("Rapport mensuel — " + label, body));
  await sbInsert("email_log", { id: crypto.randomUUID(), kind: "monthly", ref: M, sent_at: new Date().toISOString(), status: "sent", detail: "auto" });
  return { sent: true, mois: M, ca, resultat: res };
}

Deno.serve(async (req: Request) => {
  CORS_ORIGIN = req.headers.get("origin") || "*";
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY non configuré" }, 500);
  if (!REPORT_KEY || req.headers.get("x-report-key") !== REPORT_KEY)
    return json({ error: "Clé d'envoi (REPORT_KEY) invalide" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON invalide" }, 400); }

  // ---- mode programmé ----
  if (body?.mode === "daily" || body?.mode === "monthly") {
    if (!BOSS_EMAIL) return json({ error: "BOSS_EMAIL non configuré (secret de la fonction)" }, 500);
    if (!SB_URL || !SB_KEY) return json({ error: "SUPABASE_SERVICE_ROLE_KEY non configuré" }, 500);
    try {
      const D = body.date || new Date().toISOString().slice(0, 10);
      const r = body.mode === "daily" ? await dailyReport(D, !!body.force) : await monthlyReport(!!body.force);
      return json({ ok: true, mode: body.mode, ...r });
    } catch (e) {
      try {
        await sbInsert("email_log", { id: crypto.randomUUID(), kind: body.mode, ref: body.date || new Date().toISOString().slice(0, 10), sent_at: new Date().toISOString(), status: "failed", detail: String(e).slice(0, 300) });
      } catch (_) { /* ignore */ }
      return json({ error: String(e) }, 500);
    }
  }

  // ---- mode relais (app) ----
  const { to, subject, html, attachment } = body ?? {};
  if (!to || !subject || !html) return json({ error: "Champs requis : to, subject, html" }, 400);
  const payload: Record<string, unknown> = { from: EMAIL_FROM, to: [to], subject, html };
  if (attachment?.filename && attachment?.base64) payload.attachments = [{ filename: attachment.filename, content: attachment.base64 }];
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) return json({ error: "Resend: " + (await r.text()) }, 502);
  return json({ ok: true });
});
