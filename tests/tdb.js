;/* TDB : vérificateur de base v2 (sonde directe des 21 tables) + filet global d'erreurs */
;(async()=>{
await loadSettings();S.user={name:'test',role:'manager'};
const ALL=['settings','products','coffee_types','purchases','roastings','transformations','productions','adjustments','sales_agents','sales','cash_entries','employees','advances','pay_runs','pay_slips','pending_entries','form_tokens','packaging_items','packaging_entries','email_log','assets'];
/* 1. filet global : une erreur silencieuse devient un toast visible */
let cap=null;const _toast=toast;toast=(m,k)=>{cap=m;return _toast(m,k);};
onUnhandledRej({reason:new Error('Erreur Supabase 404 : adjustments')});
if(!cap||!cap.includes('adjustments'))throw new Error('filet : toast non affiché');
cap=null;onUnhandledRej({reason:new Error('Session expirée — reconnectez-vous.')});
if(cap!==null)throw new Error('filet : doublon sur session expirée');
toast=_toast;
console.log('✓ Filet global : toute erreur silencieuse affichée en toast (sans doublon session)');
/* 2. vérificateur : mode local → message explicite */
let mod=null;const _modal=modal;modal=(t,b)=>{mod={t:t,b:b};};
CFG.mode='local';CFG.url='';CFG.anon='';
await App.dbCheck();
if(!mod||!mod.b.includes('mode en ligne'))throw new Error('dbCheck local : message inattendu');
console.log('✓ Hors mode en ligne → invitation à connecter Supabase');
/* sonde fetch : répond selon la table demandée */
const mkFetch=(fail404,fail401,netFail)=>async(u)=>{
  if(netFail)throw new Error('network');
  const m=String(u).match(/\/rest\/v1\/(\w+)\?/);
  if(!m)return{ok:false,status:404,json:async()=>({})};
  const t=m[1];
  if(fail401)return{ok:false,status:401,json:async()=>({message:'JWT expired'})};
  if(fail404.includes(t))return{ok:false,status:404,json:async()=>({code:'PGRST205'})};
  return{ok:true,json:async()=>([])};
};
const _fetch=global.fetch;
/* 3. base complète : 21/21 tables répondent */
CFG.mode='supabase';CFG.url='https://demo.supabase.co';CFG.anon='cle';SES=null;
global.fetch=mkFetch([],false,false);
await App.dbCheck();
if(!mod||!mod.b.includes('Base complète'))throw new Error('dbCheck complet : '+(mod&&mod.b.slice(0,60)));
console.log('✓ Sonde directe : base complète détectée (21/21 tables, sans OpenAPI)');
/* 4. tables manquantes : SQL de réparation auto-généré */
global.fetch=mkFetch(['adjustments','form_tokens'],false,false);
await App.dbCheck();
if(!mod||!mod.t.indexOf('manquante')<0)throw new Error('dbCheck : titre '+(mod&&mod.t));
const sql=(mod.b.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)||[])[1]||'';
if(!sql.includes('create table if not exists adjustments'))throw new Error('SQL : DDL adjustments absent');
if(!mod.b.includes('gestionnaire_full'))throw new Error('SQL : policy gestionnaire_full absente');
if(!mod.b.includes('form_tokens_select'))throw new Error('SQL : policy publique form_tokens absente');
console.log('✓ Tables manquantes : SQL complet généré (DDL + RLS + policies), prêt à copier');
/* 5. projet en pause / URL incorrecte */
global.fetch=mkFetch([],false,true);
await App.dbCheck();
if(!mod||!/injoignable/i.test(mod.b))throw new Error('dbCheck : pause non gérée');
if(!mod.b.includes('pause'))throw new Error('dbCheck : conseil pause absent');
console.log('✓ Projet injoignable → explication pause/URL + conduite à tenir');
/* 6. session expirée */
global.fetch=mkFetch([],true,false);
await App.dbCheck();
if(!mod||!mod.t.includes('Session expirée'))throw new Error('dbCheck : session non détectée');
console.log('✓ Session expirée → détection claire (se reconnecter)');
/* 7. contrôle silencieux après connexion */
cap=null;const t2=toast;toast=(m,k)=>{cap=m;return t2(m,k);};
global.fetch=mkFetch(['adjustments','form_tokens'],false,false);
await dbCheckSilent();
if(!cap||!cap.includes('2 tables'))throw new Error('contrôle silencieux : alerte absente ('+cap+')');
global.fetch=mkFetch([],false,false);
cap=null;await dbCheckSilent();
if(cap!==null)throw new Error('contrôle silencieux : alerte à tort ('+cap+')');
toast=t2;global.fetch=_fetch;modal=_modal;
console.log('✓ Après connexion : alerte seulement si des tables manquent réellement');
console.log('TDB: 7/7 OK');
})().catch(e=>{console.error('ÉCHEC TDB:',e.stack||e.message);process.exit(1);});
