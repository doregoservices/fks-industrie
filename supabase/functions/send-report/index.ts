// ============================================================
// CaféPro — Fonction Supabase "send-report"
// Envoie au boss les points quotidiens et rapports mensuels
// (avec pièce jointe Excel) via Resend (https://resend.com — gratuit)
//
// DÉPLOIEMENT (10 min) :
// 1. Supabase → Edge Functions → « New Function » → nom : send-report
// 2. Collez TOUT ce fichier dans l'éditeur → Deploy
// 3. Dans « Secrets » de la fonction, ajoutez :
//      RESEND_API_KEY   = clé API de votre compte Resend (re_xxx)
//      REPORT_KEY       = un mot de passe secret de votre choix (ex: b3f0s-mot-de-passe)
//      EMAIL_FROM       = expéditeur, ex: CafePro <onboarding@resend.dev>
//                         (avec un domaine vérifié chez Resend : CafePro <caisse@votredomaine.ci>)
// 4. Dans l'application → Réglages → 📧 Envoi des rapports :
//      email du boss + REPORT_KEY (le même qu'au point 3)
// ============================================================

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const REPORT_KEY = Deno.env.get("REPORT_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "CafePro <onboarding@resend.dev>";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-report-key, apikey, Authorization",
    },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY non configuré" }, 500);
  if (!REPORT_KEY || req.headers.get("x-report-key") !== REPORT_KEY)
    return json({ error: "Clé d'envoi (REPORT_KEY) invalide" }, 401);

  let body: { to?: string; subject?: string; html?: string; attachment?: { filename?: string; base64?: string } };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }
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
