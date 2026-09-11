// ============================================================
// CaféPro — Fonction Supabase "user-admin" (v1 — 11/09/2026)
// Crée / supprime les LOGINS d'accès aux données (auth.users)
// directement depuis l'application, pour ne jamais ouvrir le
// tableau de bord Supabase.
//
// DÉPLOIEMENT (5 minutes, UNE SEULE FOIS) :
// 1. Supabase → votre projet → Edge Functions → « Create function »
// 2. Nom : user-admin  → collez TOUT ce fichier → Deploy
// 3. Dans « Secrets » de la fonction (à saisir une seule fois) :
//      USERMGT_KEY = la même clé que dans l'appli
//                    (Réglages → 👤 Comptes → Clé d'administration
//                     des comptes → Enregistrer)
// 4. C'est tout. Dans l'appli :
//    • créer un compte  → le login est créé ET actif immédiatement
//    • supprimer un compte → le login est supprimé aussi
//      (plus aucune ligne SQL à copier)
//
// Sécurité : la clé de service (SUPABASE_SERVICE_ROLE_KEY) reste
// côté serveur — elle ne quitte JAMAIS Supabase. L'appli ne
// présente que la clé USERMGT_KEY, comme pour send-report.
// ============================================================

const KEY = Deno.env.get("USERMGT_KEY") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-usermgt-key",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true }, 204);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!KEY) return json({ error: "USERMGT_KEY non configuré" }, 500);
  if (req.headers.get("x-usermgt-key") !== KEY)
    return json({ error: "Clé d'administration (USERMGT_KEY) invalide" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const H = {
    apikey: SRV,
    Authorization: "Bearer " + SRV,
    "Content-Type": "application/json",
  };

  /* Créer un login — actif immédiatement (aucun e-mail de confirmation) */
  if (body && body.action === "create") {
    if (!body.email || !body.password)
      return json({ error: "email et password requis" }, 400);
    try {
      const r = await fetch(SB_URL + "/auth/v1/admin/users", {
        method: "POST",
        headers: H,
        body: JSON.stringify({
          email: body.email,
          password: body.password,
          email_confirm: true,
          user_metadata: { name: body.name || "" },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        return json({ ok: false, error: (j && (j.msg || j.message)) || ("HTTP " + r.status) }, r.status);
      return json({ ok: true, user_id: (j && j.user && j.user.id) || (j && j.id) || null });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  /* Supprimer le login d'un e-mail (silencieux si aucun login existe) */
  if (body && body.action === "delete") {
    if (!body.email) return json({ error: "email requis" }, 400);
    try {
      const l = await fetch(SB_URL + "/auth/v1/admin/users?per_page=1000", { headers: H });
      const lj = await l.json().catch(() => ({}));
      const u = ((lj && lj.users) || []).find(
        (x: any) => String(x.email).toLowerCase() === String(body.email).toLowerCase()
      );
      if (!u) return json({ ok: true, note: "aucun login Supabase pour cet e-mail" });
      const r = await fetch(SB_URL + "/auth/v1/admin/users/" + u.id, { method: "DELETE", headers: H });
      return json({ ok: r.ok }, r.ok ? 200 : r.status);
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  return json({ error: "action inconnue (create | delete)" }, 400);
});
