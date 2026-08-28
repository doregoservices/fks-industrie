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
console.log('TEMAIL: 5/5 OK');
})().catch(e=>{console.error('ÉCHEC TEMAIL:',e.stack||e.message);process.exit(1);});
