// ============================================================
// CaféPro — Fonction Supabase "send-report" (VERSION 2.2)
// Envoie au boss les points quotidiens et rapports mensuels
// via Resend (https://resend.com — gratuit).
//
// NOUVEAUTÉ v2.2 (10/09/2026) — le cron envoie un email complet :
//   • logo + nom de la société (lus dans les réglages de l'app)
//   • PIÈCE JOINTE Excel du point quotidien (3 feuilles :
//     Ventes du jour, Commerciales, Caisse du jour) générée
//     sans aucune dépendance (mini-générateur XLSX intégré)
//
// NOUVEAUTÉ v2 (10/09/2026) — gère les appels du CRON :
//   • mode "daily"   : construit et envoie le point du jour
//                      TOUS LES JOURS, MÊME SANS AUCUNE ACTIVITÉ
//   • mode "monthly" : bilan mensuel compact
//   • mode relais (to/subject/html) inchangé — c'est celui de l'app
//   • dédoublonnage : si le point du jour a déjà été envoyé (par
//     l'app ou par le cron), rien ne repart (journal email_log)
//
// CORS v2.1 : le navigateur envoie authorization/apikey — ils
//   DOIVENT être autorisés, sinon il bloque l'envoi avant même
//   de l'essayer (« fonction injoignable » à tort).
//
// DÉPLOIEMENT (10 min) :
// 1. Supabase → Edge Functions → « send-report » (déjà créée ? cliquez
//    dessus, remplacez TOUT le code par ce fichier → Deploy)
// 2. Dans « Secrets » de la fonction (conservés d'une version à
//    l'autre — à ne saisir qu'une seule fois) :
//      RESEND_API_KEY   = clé API de votre compte Resend (re_xxx)
//      REPORT_KEY       = le même mot de passe que dans l'app (Réglages → 📧)
//      EMAIL_FROM       = expéditeur, ex: CafePro <onboarding@resend.dev>
// 3. Rien d'autre : l'email du boss, le logo et le nom de la société
//    sont lus dans les réglages de l'app.
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
      // ⚠️ CORS : le navigateur envoie authorization + apikey — ils DOIVENT
      // être autorisés ici, sinon le navigateur bloque l'envoi avant même
      // de l'essayer (l'app affiche alors « fonction injoignable » à tort)
      "Access-Control-Allow-Headers":
        "Content-Type, x-report-key, X-Report-Key, authorization, Authorization, apikey, Apikey, APIKEY",
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

/* ── Réglages société (nom + logo) lus dans l'app ─────────────── */
async function companyInfo(): Promise<{ name: string; logo: string }> {
  try {
    const rows = await db("settings?key=eq.company&select=value");
    let v: any = rows && rows[0] && rows[0].value;
    if (typeof v === "string") {
      try {
        v = JSON.parse(v);
      } catch {
        v = null;
      }
    }
    return { name: (v && v.name) || "CaféPro", logo: (v && v.logo) || "" };
  } catch {
    return { name: "CaféPro", logo: "" };
  }
}

function shell(title: string, body: string, company: { name: string; logo: string }) {
  return (
    `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>` +
    (company.logo
      ? `<p style="text-align:center;margin:0 0 6px"><img src="${company.logo}" style="height:52px;object-fit:contain"></p>`
      : "") +
    `<h2>${company.logo ? "" : "☕ "}${esc(company.name || "CaféPro")}</h2>` +
    `<h3>${esc(title)}</h3>${body}` +
    `<p style="color:#999;font-size:11px">Généré automatiquement — ${esc(company.name || "CaféPro")} · Réalisé par Doregoservices · 07 17 57 95 56</p></body></html>`
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

/* ══════════════════════════════════════════════════════════════
   MINI-GÉNÉRATEUR XLSX (aucune dépendance — ZIP stocké + XML)
   Testé à l'identique hors ligne : produit des classeurs valides
   (3 feuilles, texte accentué, nombres). Mêmes octets que le test.
   ══════════════════════════════════════════════════════════════ */
/* XLSX-BEGIN (bloc testé — ne pas modifier sans re-tester) */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u) {
  let c = 0xffffffff;
  for (let i = 0; i < u.length; i++) c = CRC_TABLE[(c ^ u[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u16(n) {
  return [n & 255, (n >> 8) & 255];
}
function u32(n) {
  return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
}
function buildZip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const nb = enc.encode(f.name);
    const crc = crc32(f.data);
    const lh = new Uint8Array(30 + nb.length);
    lh.set(u32(0x04034b50), 0);
    lh.set(u16(20), 4);
    lh.set(u16(0), 6);
    lh.set(u16(0), 8);
    lh.set(u16(0), 10);
    lh.set(u16(0), 12);
    lh.set(u32(crc), 14);
    lh.set(u32(f.data.length), 18);
    lh.set(u32(f.data.length), 22);
    lh.set(u16(nb.length), 26);
    lh.set(u16(0), 28);
    lh.set(nb, 30);
    parts.push(lh, f.data);
    const ce = new Uint8Array(46 + nb.length);
    ce.set(u32(0x02014b50), 0);
    ce.set(u16(20), 4);
    ce.set(u16(20), 6);
    ce.set(u16(0), 8);
    ce.set(u16(0), 10);
    ce.set(u16(0), 12);
    ce.set(u16(0), 14);
    ce.set(u32(crc), 16);
    ce.set(u32(f.data.length), 20);
    ce.set(u32(f.data.length), 24);
    ce.set(u16(nb.length), 28);
    ce.set(u16(0), 30);
    ce.set(u16(0), 32);
    ce.set(u16(0), 34);
    ce.set(u16(0), 36);
    ce.set(u32(0), 38);
    ce.set(u32(offset), 42);
    ce.set(nb, 46);
    centrals.push(ce);
    offset += lh.length + f.data.length;
  }
  const cdLen = centrals.reduce((a, c) => a + c.length, 0);
  const eocd = new Uint8Array(22);
  eocd.set(u32(0x06054b50), 0);
  eocd.set(u16(0), 4);
  eocd.set(u16(0), 6);
  eocd.set(u16(files.length), 8);
  eocd.set(u16(files.length), 10);
  eocd.set(u32(cdLen), 12);
  eocd.set(u32(offset), 16);
  eocd.set(u16(0), 20);
  const out = new Uint8Array(offset + cdLen + 22);
  let p = 0;
  for (const x of parts) {
    out.set(x, p);
    p += x.length;
  }
  for (const c of centrals) {
    out.set(c, p);
    p += c.length;
  }
  out.set(eocd, p);
  return out;
}
function escX(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function colName(i) {
  let s = "";
  i++;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}
function sheetXml(rows) {
  let out =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
  rows.forEach((row, ri) => {
    out += "<row r=\"" + (ri + 1) + "\">";
    row.forEach((c, ci) => {
      if (c === null || c === undefined || c === "") return;
      const ref = colName(ci) + (ri + 1);
      if (typeof c === "number" && isFinite(c)) out += "<c r=\"" + ref + "\"><v>" + c + "</v></c>";
      else {
        const v = typeof c === "object" && c !== null && "v" in c ? c.v : c;
        if (v === null || v === undefined || v === "") return;
        out += "<c r=\"" + ref + "\" t=\"inlineStr\"><is><t xml:space=\"preserve\">" + escX(v) + "</t></is></c>";
      }
    });
    out += "</row>";
  });
  return out + "</sheetData></worksheet>";
}
function buildXlsx(sheets) {
  const enc = new TextEncoder();
  let ct =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
  let wbRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
  let wb =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
  sheets.forEach((sh, i) => {
    const n = i + 1;
    ct +=
      '<Override PartName="/xl/worksheets/sheet' + n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    wbRels +=
      '<Relationship Id="rId' + n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + n + '.xml"/>';
    wb += '<sheet name="' + escX(sh.name) + '" sheetId="' + n + '" r:id="rId' + n + '"/>';
  });
  ct += "</Types>";
  wb += "</sheets></workbook>";
  wbRels += "</Relationships>";
  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf/></cellXfs></styleSheet>';
  const files = [
    { name: "[Content_Types].xml", data: enc.encode(ct) },
    { name: "_rels/.rels", data: enc.encode(rels) },
    { name: "xl/workbook.xml", data: enc.encode(wb) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(wbRels) },
    { name: "xl/styles.xml", data: enc.encode(styles) },
  ];
  sheets.forEach((sh, i) =>
    files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: enc.encode(sheetXml(sh.rows)) })
  );
  return buildZip(files);
}
function b64(u) {
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
  return btoa(s);
}
/* XLSX-END */

/* ── POINT QUOTIDIEN (toujours envoyé, même néant) — avec Excel ── */
async function daily(): Promise<{
  skip?: string;
  to?: string;
  subject?: string;
  html?: string;
  ref?: string;
  attachment?: { filename: string; base64: string };
}> {
  const D = new Date().toISOString().slice(0, 10); // serveur UTC = heure de Côte d'Ivoire (GMT+0)
  if (await alreadySent("daily", D)) return { skip: `Point du ${D} déjà envoyé — rien à faire` };
  const to = await bossEmail();
  const company = await companyInfo();
  const [sales, cash, pend, agents, allCash] = await Promise.all([
    db(`sales?date=eq.${D}&select=agent_name,pay_mode,client,total,lines`),
    db(`cash_entries?date=eq.${D}&select=created_at,type,account,category,label,amount`),
    db(`pending_entries?source_type=eq.sales&status=eq.pending&select=source_name,payload,created_at`),
    db(`sales_agents?active=eq.true&select=name`),
    db(`cash_entries?select=type,account,amount`),
  ]);
  const pendD = (pend as any[]).filter((p) => ((p.payload || {}) as any).date === D);
  const tot = (sales as any[]).reduce((a, s) => a + Number(s.total || 0), 0);
  const pendTot = pendD.reduce((a, p) => a + Number(((p.payload || {}) as any).total || 0), 0);
  const names = [
    ...new Set(
      [].concat(
        (agents as any[]).map((a) => a.name),
        (sales as any[]).map((s) => s.agent_name || ""),
        pendD.map((p) => ((p.payload || {}) as any).agent_name || p.source_name || "")
      )
    ),
  ]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)));
  const rows: string[] = [];
  const shA: any[][] = [["COMMERCIALES DU " + D], [], ["Commerciale", "Validées", "Montant validé", "À valider", "Montant à valider", "Détail à valider"]];
  for (const n of names) {
    const active = n === "Vente directe" || (agents as any[]).some((a) => a.name === n);
    const vs = (sales as any[]).filter((s) => (s.agent_name || "") === n);
    const ps = pendD.filter((p) => ((((p.payload || {}) as any).agent_name || p.source_name) || "") === n);
    const vt = vs.reduce((x, s) => x + Number(s.total || 0), 0);
    const pt = ps.reduce((x, p) => x + Number(((p.payload || {}) as any).total || 0), 0);
    const envoi = !vs.length && !ps.length ? (active ? '<span class="bad">🔴 Aucun envoi reçu</span>' : "—") : "";
    rows.push(
      `<tr><td><b>${esc(n)}</b>${active ? "" : ' <span style="font-size:10px;color:#999">(hors équipe)</span>'}</td>` +
        `<td>${vs.length ? `<span class="ok">${vs.length} validée${vs.length > 1 ? "s" : ""} · ${money(vt)}</span>` : "—"}</td>` +
        `<td>${ps.length ? `<span class="bad">${ps.length} à valider · ${money(pt)}</span>` : "—"}</td><td>${envoi}</td></tr>`
    );
    shA.push([
      n,
      vs.length,
      vs.reduce((x, s) => x + Number(s.total || 0), 0),
      ps.length,
      ps.reduce((x, p) => x + Number(((p.payload || {}) as any).total || 0), 0),
      ps.map((p) => ((((p.payload || {}) as any).lines || []) as any[]).map((l) => `${l.name} ×${Number(l.qty) || 0}`).join(", ")).join(" + "),
    ]);
  }
  rows.push(
    `<tr class="tot"><td>TOTAL (${(sales as any[]).length} vente(s) validée(s))</td><td>${money(tot)}</td>` +
      `<td>${pendD.length ? `<span class="bad">${money(pendTot)} à valider</span>` : "—"}</td><td></td></tr>`
  );
  shA.push(["TOTAL", (sales as any[]).length, tot, pendD.length, pendTot, ""]);
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
      : "") +
      `<table><tr><th>Commerciale</th><th>✅ Validées</th><th>⏳ À valider</th><th>Envoi du jour</th></tr>${rows.join("")}</table>` +
      `<h3>Caisse du jour</h3><table><tr><th></th><th style="text-align:right">Montant</th></tr>` +
      `<tr><td>Entrées</td><td style="text-align:right" class="ok">${money(cashIn)}</td></tr>` +
      `<tr><td>Sorties</td><td style="text-align:right" class="bad">${money(cashOut)}</td></tr></table>` +
      `<p>Soldes en fin de journée — Espèces : <b>${money(bal.cash)}</b> · Mobile Money : <b>${money(bal.momo)}</b></p>`,
    company
  );
  /* Feuille Ventes du jour (mêmes colonnes que l'app) */
  const shV: any[][] = [["POINT DU " + D], [], ["COMMERCIALE", "RÈGLEMENT", "PRODUIT", "QTÉ", "P.U.", "MONTANT", "CLIENT"]];
  (sales as any[]).forEach((s) =>
    ((s.lines || []) as any[]).forEach((l) =>
      shV.push([
        s.agent_name || "Vente directe",
        s.pay_mode === "credit" ? "Crédit" : s.pay_mode === "momo" ? "MoMo" : "Espèces",
        l.name,
        Number(l.qty) || 0,
        Number(l.price) || 0,
        (Number(l.qty) || 0) * (Number(l.price) || 0),
        s.client || "",
      ])
    )
  );
  shV.push(["TOTAL", "", "", "", "", tot, ""]);
  /* Feuille Caisse du jour */
  const shC: any[][] = [["CAISSE DU " + D], [], ["HEURE", "TYPE", "MOYEN", "CATÉGORIE", "LIBELLÉ", "ENTRÉE", "SORTIE"]];
  (cash as any[]).forEach((e) =>
    shC.push([
      String((e.created_at || "").slice(11, 16)),
      e.type === "in" ? "Entrée" : "Sortie",
      e.account === "momo" ? "MoMo" : "Espèces",
      e.category || "",
      e.label || "",
      e.type === "in" ? Number(e.amount) : "",
      e.type === "out" ? Number(e.amount) : "",
    ])
  );
  shC.push(["TOTAUX", "", "", "", "", cashIn, cashOut]);
  const xlsx = buildXlsx([
    { name: "Ventes du jour", rows: shV },
    { name: "Commerciales", rows: shA },
    { name: "Caisse du jour", rows: shC },
  ]);
  return {
    to,
    subject: `Point du ${D} — ${company.name}`,
    html,
    ref: D,
    attachment: { filename: `Point_${D}.xlsx`, base64: b64(xlsx) },
  };
}

/* ── BILAN MENSUEL COMPACT (rappel) ───────────────────────────── */
async function monthly(): Promise<{ skip?: string; to?: string; subject?: string; html?: string; ref?: string }> {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const P = new Date(first.getTime() - 86400000).toISOString().slice(0, 7);
  const firstISO = first.toISOString().slice(0, 10);
  if (await alreadySent("monthly", P)) return { skip: `Bilan ${P} déjà envoyé` };
  const to = await bossEmail();
  const company = await companyInfo();
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
      : "") +
      `<table><tr><th>Commerciale</th><th style="text-align:right">Ventes du mois</th></tr>` +
      Object.keys(byAg).map((n) => `<tr><td>${esc(n)}</td><td style="text-align:right">${money(byAg[n])}</td></tr>`).join("") +
      `<tr class="tot"><td>TOTAL (${(sales as any[]).length} vente(s))</td><td style="text-align:right">${money(tot)}</td></tr></table>` +
      `<p>Encaissé comptant : <b class="ok">${money(encaisse)}</b> · À crédit : <b class="bad">${money(credit)}</b> · Dépenses imputables : <b class="bad">${money(depenses)}</b></p>` +
      `<p style="font-size:12px;color:#666">📊 Le rapport mensuel complet (résultat détaillé + annexes DGI Excel) se prépare dans l'application : CaféPro → Exploitation.</p>`,
    company
  );
  return { to, subject: `Bilan du mois ${P} — ${company.name}`, html, ref: P };
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  attachment?: { filename: string; base64: string }
): Promise<void> {
  const payload: Record<string, unknown> = { from: EMAIL_FROM, to: [to], subject, html };
  if (attachment?.filename && attachment?.base64) {
    payload.attachments = [{ filename: attachment.filename, content: attachment.base64 }];
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
      await sendViaResend(r.to!, r.subject!, r.html!, r.attachment);
      await logSend("daily", r.ref!, "cron");
      return json({ ok: true, mode: "daily", ref: r.ref, attachment: !!r.attachment });
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
