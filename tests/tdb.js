;/* TDB : plus aucune erreur silencieuse + vérificateur de base Supabase avec SQL manquant auto-généré */
;(async()=>{
await loadSettings();S.user={name:'test',role:'manager'};
/* 1. filet global : une erreur silencieuse devient un toast visible */
let cap=null;const _toast=toast;toast=(m,k)=>{cap=m;return _toast(m,k);};
onUnhandledRej({reason:new Error('Erreur Supabase 404 : adjustments')});
if(!cap||!cap.includes('adjustments'))throw new Error('filet : toast non affiché ('+cap+')');
cap=null;onUnhandledRej({reason:new Error('Session expirée — reconnectez-vous.')});
if(cap!==null)throw new Error('filet : doublon sur session expirée');
cap=null;onUnhandledRej({reason:'échec texte'});
if(!cap||!cap.includes('échec texte'))throw new Error('filet : raison texte non affichée');
toast=_toast;
console.log('✓ Filet global : toute erreur silencieuse affichée en toast (sauf doublon session)');
/* 2. vérificateur : mode local → message explicite */
let mod=null;const _modal=modal;modal=(t,b)=>{mod={t:t,b:b};};
CFG.mode='local';CFG.url='';CFG.anon='';
await App.dbCheck();
if(!mod||!mod.b.includes('mode en ligne'))throw new Error('dbCheck local : message inattendu');
console.log('✓ Vérificateur : hors mode en ligne → invitation à connecter Supabase');
/* 3. base complète : 21/21 */
CFG.mode='supabase';CFG.url='https://demo.supabase.co';CFG.anon='cle';SES=null;
const ALL=['settings','products','coffee_types','purchases','roastings','transformations','productions','adjustments','sales_agents','sales','cash_entries','employees','advances','pay_runs','pay_slips','pending_entries','form_tokens','packaging_items','packaging_entries','email_log','assets'];
const defs={};ALL.forEach(t=>defs[t]={});
const _fetch=global.fetch;global.fetch=async()=>({ok:true,json:async()=>({definitions:defs})});
await App.dbCheck();
if(!mod||!mod.b.includes('Base complète'))throw new Error('dbCheck complet : '+ (mod&&mod.b.slice(0,60)));
console.log('✓ Vérificateur : base complète détectée ('+ALL.length+'/21 tables)');
/* 4. table manquante : SQL de réparation auto-généré */
delete defs.adjustments;delete defs.form_tokens;
mod=null;
await App.dbCheck();
if(!mod||!mod.t.includes('manquante'))throw new Error('dbCheck : titre inattendu '+(mod&&mod.t));
if(!mod.b.includes('adjustments'))throw new Error('dbCheck : adjustments non listé');
const sql=(mod.b.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)||[])[1]||'';
if(!String(sql).includes('create table if not exists adjustments'))throw new Error('SQL : DDL adjustments absent');
if(!String(mod.b).includes('gestionnaire_full'))throw new Error('SQL : policy gestionnaire_full absente');
if(!String(mod.b).includes('form_tokens_select'))throw new Error('SQL : policy publique form_tokens absente');
console.log('✓ Vérificateur : SQL manquant généré (DDL + RLS + policies) prêt à copier');
/* 5. projet injoignable */
global.fetch=async()=>{throw new Error('offline');};
mod=null;
await App.dbCheck();
if(!mod||!/impossible/i.test(mod.b))throw new Error('dbCheck : injoignable non géré');
global.fetch=_fetch;modal=_modal;
console.log('✓ Vérificateur : projet injoignable → message clair (pas de crash)');
/* 6. contrôle silencieux après connexion */
cap=null;const t2=toast;toast=(m,k)=>{cap=m;return t2(m,k);};
global.fetch=async()=>({ok:true,json:async()=>({definitions:defs})});
await dbCheckSilent();
if(!cap||!cap.includes('2 tables'))throw new Error('contrôle silencieux : alerte absente ('+cap+')');
toast=t2;global.fetch=_fetch;
console.log('✓ Après connexion : alerte automatique « 2 tables manquantes → Réglages »');
console.log('TDB: 6/6 OK');
})().catch(e=>{console.error('ÉCHEC TDB:',e.stack||e.message);process.exit(1);});
