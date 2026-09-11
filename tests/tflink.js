;/* TEST : liens terrain auto-porteurs de la config Supabase */
;(async()=>{
await loadSettings();
await seedDemo();
S.user={name:'test',role:'manager'};

/* ===== 1. cfgQ / formLink ===== */
if(cfgQ()!=='')throw new Error('cfgQ devrait être vide en local');
CFG={mode:'supabase',url:'https://x.supabase.co',anon:'eyJ123'};
const q=cfgQ();
if(!q.startsWith('?su=https%3A%2F%2Fx.supabase.co&sk=eyJ123'))throw new Error('cfgQ supabase: '+q);
const fl=formLink('tok42');
if(!fl.includes('#/f/tok42?su='))throw new Error('formLink sans params: '+fl);
console.log('✓ Liens auto-porteurs : '+fl);

/* ===== 2. applyCfgFromUrl : téléphone vierge ===== */
CFG={mode:'local',url:'',anon:''};LS.set('cafepro_cfg',null);
location.href='https://gfeinfos-hue.github.io/fks-industrie/?su=https%3A%2F%2Fx.supabase.co&sk=eyJ123#/f/tok42';
if(applyCfgFromUrl()!==true)throw new Error('applyCfgFromUrl devrait configurer');
if(CFG.mode!=='supabase'||CFG.url!=='https://x.supabase.co'||CFG.anon!=='eyJ123')throw new Error('CFG mal configurée: '+JSON.stringify(CFG));
if(JSON.parse(LS.get('cafepro_cfg')).url!=='https://x.supabase.co')throw new Error('CFG non sauvegardée');
console.log('✓ Téléphone vierge + lien avec params → config Supabase appliquée et mémorisée (avant même le routage)');

/* ===== 3. Ne remplace JAMAIS une config existante ===== */
location.href='https://gfeinfos-hue.github.io/fks-industrie/?su=https%3A%2F%2FAUTRE.supabase.co&sk=zzz#/f/tok42';
if(applyCfgFromUrl()!==false)throw new Error('applyCfgFromUrl a écrasé la config !');
if(CFG.url!=='https://x.supabase.co')throw new Error('config écrasée: '+CFG.url);
console.log('✓ Sécurité : une config déjà présente n’est jamais écrasée par un lien');

/* ===== 4. Lien sans params → aucun changement ===== */
CFG={mode:'local',url:'',anon:''};location.href='https://gfeinfos-hue.github.io/fks-industrie/#/f/tok42';
if(applyCfgFromUrl()!==false)throw new Error('lien simple ne devrait rien changer');
if(CFG.mode!=='local')throw new Error('mode altéré');
console.log('✓ Lien sans params (mode local) : rien ne change — le local ne peut pas toucher Supabase');

/* ===== 5. linkModal (par id) inclut les params (QR + copie) ===== */
CFG={mode:'supabase',url:'https://x.supabase.co',anon:'eyJ123'};
let cap=null;const _m=modal;modal=(t,b)=>{cap=b;};
const ags=await DB.list('sales_agents');const ag0=ags[0]||await DB.insert('sales_agents',{name:'Awa',token:'tok99',active:true});
await App.linkModal(ag0.id);modal=_m;
if(!cap||!cap.includes('su=https%3A%2F%2Fx.supabase.co'))throw new Error('linkModal sans params');
App.tokenModal('production').then?await App.tokenModal('production'):null;
cap=null;modal=(t,b)=>{cap=b;};await App.tokenModal('production');modal=_m;
if(!cap||!cap.includes('su='))throw new Error('tokenModal sans params');
console.log('✓ QR codes + liens copiés/WhatsApp (commerciales, atelier, caisse) transportent la config');

CFG={mode:'local',url:'',anon:''};

/* ===== 6. LE BUG DU LIEN PARTAGÉ : params APRÈS le # ===== */
CFG={mode:'local',url:'',anon:''};
location.href='https://gfeinfos-hue.github.io/fks-industrie/#/f/tok42?su=https%3A%2F%2Fpyfb.supabase.co&sk=abc456';
location.hash='#/f/tok42?su=https%3A%2F%2Fpyfb.supabase.co&sk=abc456';
if(applyCfgFromUrl()!==true)throw new Error('config du hash ignorée');
if(CFG.url!=='https://pyfb.supabase.co'||CFG.anon!=='abc456')throw new Error('config hash mal lue : '+CFG.url);
await render();
const h6=$('#app').innerHTML;
if(!h6.includes('Lien introuvable'))throw new Error('token pollué par les params (routeur)');
if(h6.includes('pyfb.supabase.co&sk'))throw new Error('jeton non nettoyé');
console.log('✓ Lien partagé (#/f/TOK?su=…&sk=…) : config lue depuis le hash + jeton nettoyé');

/* ===== 7. Couper / réactiver un lien (départ de l entreprise) ===== */
location.hash='#/dashboard';
await App.linkCut(ag0.id);
const ag7b=(await DB.list('sales_agents',{eq:{id:ag0.id}}))[0];
if(ag7b.active!==false)throw new Error('lien non coupé');
location.hash='#/f/'+ag0.token;await render();
if(!$('#app').innerHTML.includes('désactivé'))throw new Error('message lien désactivé absent');
await App.linkOn(ag0.id);
location.hash='#/f/'+ag0.token;await render();
if(!$('#app').innerHTML.includes('Mes ventes'))throw new Error('lien non réactivé');
console.log('✓ Couper un lien (départ) puis le réactiver : écran « désactivé » puis saisie accessible de nouveau');
/* 8. hors ligne : la vente est gardée sur le téléphone puis livrée dès le retour du réseau */
global.navigator.onLine=false;
const r8=await formSend('sales','BORIS',{date:todayISO(),agent_id:'boris',agent_name:'BORIS',lines:[{name:'Café 1kg',qty:2,price:1000}],total:2000});
if(!r8.offline)throw new Error('formSend aurait dû passer par l outbox (hors ligne)');
let out8=JSON.parse(LS.get('cafepro_outbox')||'[]');
if(out8.length!==1)throw new Error('outbox : 1 élément attendu, '+out8.length);
const pend8a=(await DB.list('pending_entries')).filter(p=>(p.payload||{}).agent_name==='BORIS');
if(pend8a.length)throw new Error('rien ne doit partirre tant que le réseau est coupé');
global.navigator.onLine=true;
const n8=await outboxFlush();
if(n8!==1)throw new Error('outboxFlush devrait livrer 1 envoi (retour '+n8+')');
out8=JSON.parse(LS.get('cafepro_outbox')||'[]');
if(out8.length!==0)throw new Error('outbox devrait être vide après flush : '+out8.length);
const pend8=(await DB.list('pending_entries')).filter(p=>(p.payload||{}).agent_name==='BORIS'&&p.status==='pending');
if(pend8.length!==1)throw new Error('la vente de BORIS devrait être dans À valider après le retour du réseau : '+pend8.length);
console.log('✓ Hors ligne : vente gardée sur le téléphone puis livrée dans 📥 À valider au retour du réseau (flush auto : ouverture du lien · online · toutes les 30 s)');
/* 9. refus RLS (base qui refuse les envois terrain) : message explicite, pas « réseau » */
global.navigator.onLine=true;
const _ins9=DB.insert;const _req9=Supa.req;const _mode9=CFG.mode;CFG.mode='supabase';const _base9=DB._base;DB._base=Supa;
Supa.req=async()=>{throw new Error('Erreur Supabase 401 : new row violates row-level security policy for table "pending_entries"');};
const r9=await formSend('sales','BORIS',{date:todayISO(),agent_name:'BORIS',lines:[],total:0});
if(!r9.refused)throw new Error('formSend devrait signaler le refus RLS');
const s9=await submitSalesPoint('boris','BORIS',todayISO(),[{name:'X',qty:1,price:100}],'cash','');
if(!s9.refused)throw new Error('submitSalesPoint devrait propager refused');
if(!terrainPoliciesSql().includes('form_insert'))throw new Error('terrainPoliciesSql sans form_insert');
Supa.req=_req9;DB.insert=_ins9;CFG.mode=_mode9;DB._base=_base9;LS.set('cafepro_outbox','[]');
console.log('✓ Refus RLS : signalé comme « la base refuse les envois — Réglages → 🔍 Vérifier la base » (plus de faux « réseau ») ; Vérifier la base fournit toujours le SQL des politiques terrain');
/* 10. écran terrain : bande des envois en attente + bouton Renvoyer + version affichée */
LS.set('cafepro_outbox',JSON.stringify([{source_type:'sales',source_name:'BORIS',payload:{agent_name:'BORIS',total:20000}},{source_type:'sales',source_name:'BORIS',payload:{agent_name:'BORIS',total:1}}]));
const sh10=formShell('Mes ventes','test','CONTENU');
if(!sh10.includes('2 envois en attente'))throw new Error('bande d attente absente : '+sh10.slice(0,200));
if(!sh10.includes('Renvoyer maintenant'))throw new Error('bouton Renvoyer absent');
if(!sh10.includes('CaféPro '+APP_VER))throw new Error('version absente de l écran terrain');
global.navigator.onLine=true;
await App.formResend();
const out10=JSON.parse(LS.get('cafepro_outbox')||'[]');
if(out10.length!==0)throw new Error('outbox devrait être vide après Renvoyer : '+out10.length);
const p10=(await DB.list('pending_entries')).filter(p=>(p.payload||{}).agent_name==='BORIS');
if(p10.length<2)throw new Error('les 2 envois BORIS devraient être livrés : '+p10.length);
console.log('✓ Écran terrain : « 2 envois en attente » + bouton Renvoyer maintenant + version '+APP_VER+' affichée ; Renvoyer livre tout dans À valider');
/* 11. insertion silencieuse : en ligne, l'envoi NE demande PAS la relecture de la ligne (plus de faux refus RLS) */
CFG.mode='supabase';const _base11=DB._base;DB._base=Supa;
let cap11=null;const _req11=Supa.req;Supa.req=async(t,q,m,b,x)=>{cap11={t:t,q:q,m:m,b:b,x:x};return null;};
const r11=await formSend('sales','BORIS',{date:todayISO(),agent_name:'BORIS',lines:[],total:0});
if(!r11.ok||r11.offline||r11.refused)throw new Error('envoi silencieux échoué : '+JSON.stringify(r11));
if(cap11.t!=='pending_entries'||cap11.m!=='POST')throw new Error('mauvais appel : '+JSON.stringify({t:cap11.t,m:cap11.m}));
if(cap11.q!==null)throw new Error('la query doit être vide (pas de select=*) : '+cap11.q);
if(cap11.x&&cap11.x.Prefer)throw new Error('pas de Prefer return=representation attendu');
if(!cap11.b||!cap11.b[0]||cap11.b[0].status!=='pending')throw new Error('corps incorrect');
outboxPush({source_type:'sales',source_name:'BORIS',payload:{agent_name:'BORIS',total:1}});
const n11=await outboxFlush();
if(n11!==1)throw new Error('flush silencieux : 1 envoi attendu, '+n11);
Supa.req=_req11;CFG.mode=_mode9;DB._base=_base11;
console.log('✓ Insertion silencieuse : POST sans select/Prefer (formSend + outboxFlush) — la relecture RLS ne peut plus bloquer un envoi qui a réussi');
console.log('TFLINK: 11/11 OK');
})().catch(e=>{console.error('ÉCHEC TFLINK:',e.message);process.exit(1);});
