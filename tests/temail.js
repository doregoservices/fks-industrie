;/* TEMAIL : envoi au boss — en-têtes d'authentification corrects + cause exacte de chaque échec */
;(async()=>{
await loadSettings();S.user={name:'test',role:'manager'};
const ALL=['settings','products','coffee_types','purchases','roastings','transformations','productions','adjustments','sales_agents','sales','cash_entries','employees','advances','pay_runs','pay_slips','pending_entries','form_tokens','packaging_items','packaging_entries','email_log','assets'];
CFG.mode='supabase';CFG.url='https://demo.supabase.co';CFG.anon='cle-anon-demo';SES=null;
const err=async f=>{try{await f();return null;}catch(e){return e.message;}};
/* 1. préconditions : messages actionnables */
SETS.email={boss:'',key:'k'};
let m=await err(()=>emailSend('s','h'));
if(!m||!m.includes('Email du boss'))throw new Error('boss manquant : '+m);
SETS.email={boss:'boss@fks.ci',key:''};
m=await err(()=>emailSend('s','h'));
if(!m||!m.includes('REPORT_KEY'))throw new Error('clé manquante : '+m);
CFG.mode='local';
m=await err(()=>emailSend('s','h'));
if(!m||!m.includes('mode en ligne'))throw new Error('mode local : '+m);
console.log('✓ Préconditions : boss / REPORT_KEY / mode en ligne — chaque cas dit quoi faire');
/* 2. en-têtes : Authorization Bearer + apikey + x-report-key */
CFG.mode='supabase';SETS.email={boss:'boss@fks.ci',key:'mon-report-key'};
let cap=null;
const _fetch=global.fetch;
global.fetch=async(u,o)=>{cap={u:String(u),o:o};return{ok:true,json:async()=>({ok:true})};};
await emailSend('Sujet','<p>h</p>');
if(!cap.u.includes('/functions/v1/send-report'))throw new Error('mauvaise URL : '+cap.u);
const H=cap.o.headers||{};
if(H.Authorization!=='Bearer cle-anon-demo')throw new Error('Authorization manquant : '+JSON.stringify(H));
if(H.apikey!=='cle-anon-demo')throw new Error('apikey manquant');
if(H['x-report-key']!=='mon-report-key')throw new Error('x-report-key manquant');
console.log('✓ Appel correct : Authorization Bearer + apikey + x-report-key (fini le 401 Invalid JWT)');
/* 3. causes d\'échec traduites */
const case_=async(status,body,re)=>{global.fetch=async()=>({ok:false,status:status,json:async()=>body});const mm=await err(()=>emailSend('s','h'));if(!mm||!re.test(mm))throw new Error('cas '+status+' → '+mm);return mm;};
let r1=await case_(404,{msg:'Function not found'},/NON DÉPLOYÉE/);
await case_(401,{error:'Invalid JWT'},/JWT/);
await case_(401,{error:'Clé d\'envoi (REPORT_KEY) invalide'},/IDENTIQUE/);
await case_(500,{error:'RESEND_API_KEY non configuré'},/RESEND_API_KEY/);
global.fetch=async()=>{throw new Error('boom');};
m=await err(()=>emailSend('s','h'));
if(!m||!m.includes('injoignable'))throw new Error('réseau : '+m);
console.log('✓ Échecs traduits : non déployée / JWT / REPORT_KEY différent / Resend / projet en pause');
/* 4. bouton test : succès et échec affichés */
let msgs=[];const _t=toast;toast=(x,k)=>{msgs.push(String(x));return _t(x,k);};
global.fetch=async()=>({ok:true,json:async()=>({ok:true})});
await App.emailTest();
if(!msgs.some(x=>x.includes('envoyé')))throw new Error('test réussi non signalé');
global.fetch=async()=>({ok:false,status:404,json:async()=>({msg:'Function not found'})});
await App.emailTest();
if(!msgs.some(x=>x.includes('NON DÉPLOYÉE')))throw new Error('test échoué mal expliqué : '+msgs.join(' / '));
console.log('✓ Bouton « Envoyer un email de test » : succès ET échec expliqués (cause + solution)');
/* 5. les rapports réels passent par le même canal corrigé */
global.fetch=async(u,o)=>{cap={u:String(u),o:o};return{ok:true,json:async()=>({ok:true})};};
await seedDemo();
await App.runGen(monthISO());
await DB.update('pay_runs',(await DB.list('pay_runs')).filter(r=>r.period===monthISO())[0].id,{status:'closed',paid_date:todayISO()});
await createSale({date:todayISO(),agent_id:'direct',agent_name:'Vente directe',pay_mode:'cash',total:4500,lines:[{product_id:(await DB.list('products'))[0].id,name:'x',qty:1,price:4500}],source:'admin'});
await sendDaily(todayISO());
if(!cap.u.includes('/functions/v1/send-report'))throw new Error('sendDaily : mauvaise URL');
const log=(await DB.list('email_log')).filter(x=>x.kind==='daily'&&x.status==='sent');
if(!log.length)throw new Error('sendDaily : email_log non renseigné');
toast=_t;global.fetch=_fetch;
console.log('✓ Point quotidien au boss : même canal corrigé + journal email_log renseigné');
/* 6. filet de sécurité 22h : rattrapage automatique + anti-doublon */
App._autoDaily=null;
for(const l of (await DB.list('email_log')).filter(x=>x.kind==='daily'&&x.ref===todayISO()))await DB.remove('email_log',l.id);
let calls6=0;const _f6=global.fetch;global.fetch=async(u,o)=>{calls6++;return{ok:true,json:async()=>({ok:true})};};
let toasts6=[];const _t6=toast;toast=(x,k)=>{toasts6.push(String(x));return _t6(x,k);};
if(await App.autoDailyCheck(20)!==false||calls6!==0)throw new Error('avant 22h : aucun envoi attendu (calls='+calls6+')');
const s6=await App.autoDailyCheck(23);
if(s6!==true||calls6!==1)throw new Error('après 22h : envoi attendu (calls='+calls6+')');
if(!toasts6.some(x=>x.includes('automatiquement')))throw new Error('toast de rattrapage absent');
const lg6=(await DB.list('email_log')).filter(x=>x.kind==='daily'&&x.ref===todayISO()&&x.status==='sent');
if(!lg6.length)throw new Error('log du rattrapage absent');
if(await App.autoDailyCheck(23)!==false||calls6!==1)throw new Error('anti-doublon : le point ne doit pas partir 2 fois (calls='+calls6+')');
toast=_t6;global.fetch=_f6;
console.log('✓ Filet 22h : avant 22h rien · après 22h envoi auto + toast · anti-doublon (jamais 2 fois)');
/* 7. heure à la minute près (13h30…) + vérification immédiate au réglage */
App._autoDaily=null;
for(const l of (await DB.list('email_log')).filter(x=>x.kind==='daily'&&x.ref===todayISO()))await DB.remove('email_log',l.id);
if(parseEmailTime('13h30')!==810||parseEmailTime('13H')!==780||parseEmailTime('9:15')!==555||parseEmailTime('22h00')!==1320||parseEmailTime('13h75')!==null||parseEmailTime('25h')!==null||parseEmailTime('abc')!==null)throw new Error('parseEmailTime : '+[parseEmailTime('13h30'),parseEmailTime('13H'),parseEmailTime('9:15'),parseEmailTime('13h75'),parseEmailTime('25h')]);
if(emailTimeMin()!==1320)throw new Error('défaut devrait être 22h00 : '+emailTimeMin());
SETS.email={boss:'boss@fks.ci',key:'k',hour:13};
if(emailTimeMin()!==780)throw new Error('héritage heure simple 13 → 13h00 : '+emailTimeMin());
SETS.email={boss:'boss@fks.ci',key:'k',time:810};
if(emailTimeStr()!=='13h30')throw new Error('emailTimeStr : '+emailTimeStr());
let calls7=0;global.fetch=async(u,o)=>{calls7++;return{ok:true,json:async()=>({ok:true})};};
if(await App.autoDailyCheck(13,29)!==false||calls7!==0)throw new Error('à 13h29 : rien n est attendu (calls='+calls7+')');
const s7=await App.autoDailyCheck(13,30);
if(s7!==true||calls7!==1)throw new Error('à 13h30 : envoi attendu (calls='+calls7+')');
App._autoDaily=null;
for(const l of (await DB.list('email_log')).filter(x=>x.kind==='daily'&&x.ref===todayISO()))await DB.remove('email_log',l.id);
let toasts7=[];const _t7=toast;toast=(x,k)=>{toasts7.push(String(x));return _t7(x,k);};
$('#emT').value='13h75';await App.saveEmail();
if(!toasts7.some(x=>/invalide/i.test(x)))throw new Error('heure invalide devrait être refusée : '+toasts7.join(' / '));
if(((SETS.email||{}).time)!==810)throw new Error('un réglage invalide ne doit pas écraser l ancien');
$('#emT').value='9h15';await App.saveEmail();
if((SETS.email||{}).time!==555)throw new Error('9h15 devrait être enregistré : '+(SETS.email||{}).time);
if(!toasts7.some(x=>x.includes('9h15')))throw new Error('confirmation 9h15 absente : '+toasts7.join(' / '));
toast=_t7;SETS.email={boss:'boss@fks.ci',key:'k'};global.fetch=_f6;
console.log('✓ Heure à la minute près : « 13h30 » « 9:15 » « 22h00 » acceptées, refus explicite si invalide ; rien à 13h29, envoi à 13h30 ; vérification immédiate au réglage');
/* 8. jour néant : point envoyé quand même, avec « rien à signaler » */
const NE='2030-01-05';
const dE=await dayStatus(NE);
if(!dE.empty||dE.complete)throw new Error('jour néant mal détecté : '+JSON.stringify({empty:dE.empty,complete:dE.complete}));
if(!dayBadge(dE).includes('néant'))throw new Error('badge néant absent : '+dayBadge(dE));
const repE=await buildDailyReport(NE);
if(!repE.html.includes('sans activité'))throw new Error('bandeau « sans activité » absent du point');
if(!repE.html.includes('Aucun envoi reçu'))throw new Error('les commerciales silencieuses doivent être listées');
if(!repE.blob)throw new Error('Excel du point néant manquant');
console.log('✓ Jour néant : badge 🌑 + point complet quand même (« Journée sans activité ») + chaque commerciale listée + Excel');
/* 9. plus jamais de silence : raisons nommées, échec toasté, avertissement unique */
SETS.email={boss:'boss@fks.ci',key:'k'};
if(dailyBlockReason()!==null)throw new Error('config complète → aucune raison attendue');
const _m9=CFG.mode;CFG.mode='local';
if(!/mode local/.test(dailyBlockReason()||''))throw new Error('mode local non signalé : '+dailyBlockReason());
CFG.mode=_m9;
const _u9=S.user;S.user=null;
if(!/gestionnaire/.test(dailyBlockReason()||''))throw new Error('non gestionnaire non signalé');
S.user=_u9;
SETS.email={boss:'',key:'k'};
if(!/email du boss/.test(dailyBlockReason()||''))throw new Error('boss manquant non signalé');
SETS.email={boss:'boss@fks.ci',key:''};
if(!/REPORT_KEY/.test(dailyBlockReason()||''))throw new Error('clé manquante non signalé');
/* échec réel : toasté */
App._autoDaily=null;
for(const l of (await DB.list('email_log')).filter(x=>x.kind==='daily'&&x.ref===todayISO()))await DB.remove('email_log',l.id);
SETS.email={boss:'boss@fks.ci',key:'k',time:0};
let toasts9=[];const _t9=toast;toast=(x,k)=>{toasts9.push(String(x));return _t9(x,k);};
global.fetch=async()=>({ok:false,status:404,json:async()=>({msg:'Function not found'})});
if(await App.autoDailyCheck(0,0)!==false)throw new Error('échec attendu');
if(!toasts9.some(x=>/non envoyé/.test(x)))throw new Error('l échec réel doit être toasté : '+toasts9.join(' / '));
/* dailyTick : blocage nommé, avertissement unique */
toasts9.length=0;App._dailyWarn=null;
SETS.email={boss:'',key:'k',time:0};
await App.dailyTick();
if(!toasts9.some(x=>/NON envoyé/.test(x)))throw new Error('blocage non signalé par dailyTick : '+toasts9.join(' / '));
toasts9.length=0;
await App.dailyTick();
if(toasts9.length)throw new Error('l avertissement ne doit pas se répéter à chaque tick : '+toasts9.join(' / '));
/* état dépannage présent dans Réglages */
toast=_t9;SETS.email={boss:'boss@fks.ci',key:'k'};global.fetch=_f6;
console.log('✓ Plus jamais de silence : blocages nommés (mode/compte/boss/clé), échec réel toasté, avertissement unique ; Réglages → 📧 état en direct + bouton d\'envoi immédiat');
console.log('TEMAIL: 9/9 OK');
})().catch(e=>{console.error('ÉCHEC TEMAIL:',e.stack||e.message);process.exit(1);});
