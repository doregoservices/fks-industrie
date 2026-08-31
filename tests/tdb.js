;/* TDB : vérificateur base v3 — tables ET colonnes manquantes, SQL de migration auto (CREATE + ALTER) */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
/* 1. filet global */
let cap=null;const _toast=toast;toast=(m,k)=>{cap=m;return _toast(m,k);};
onUnhandledRej({reason:new Error('Erreur Supabase 404 : adjustments')});
if(!cap||!cap.includes('adjustments'))throw new Error('filet : toast non affiché');
cap=null;onUnhandledRej({reason:new Error('Session expirée — reconnectez-vous.')});
if(cap!==null)throw new Error('filet : doublon session');
toast=_toast;
console.log('✓ Filet global : erreurs silencieuses affichées (sans doublon session)');
/* 2. mode local */
let mod=null;const _modal=modal;modal=(t,b)=>{mod={t:t,b:b};};
CFG.mode='local';CFG.url='';CFG.anon='';
await App.dbCheck();
if(!mod||!mod.b.includes('mode en ligne'))throw new Error('dbCheck local');
console.log('✓ Hors mode en ligne → invitation à connecter Supabase');
/* mock PostgREST : dictionnaire tables→colonnes */
CFG.mode='supabase';CFG.url='https://demo.supabase.co';CFG.anon='cle';SES=null;
const FULL={};for(const t in TABLE_COLS)FULL[t]=TABLE_COLS[t].map(c=>c[0]);
const mk=schema=>async(u)=>{
  const m=String(u).match(/\/rest\/v1\/(\w+)\?select=([^&]*)&limit=1/);
  if(!m)return{ok:false,status:404,json:async()=>({})};
  const t=m[1];const cols=decodeURIComponent(m[2]).split(',').filter(Boolean);
  if(!schema[t])return{ok:false,status:404,json:async()=>({code:'PGRST205'})};
  const miss=cols.filter(c=>schema[t].indexOf(c)<0);
  if(miss.length){
    if(t==='adjustments')return{ok:false,status:400,json:async()=>({code:'PGRST204',message:"Could not find the '"+miss.join(',')+"' column of '"+t+"' in the schema cache"})};
    return{ok:false,status:400,json:async()=>({code:'42703',message:'column '+t+'.'+miss[0]+' does not exist'})};
  }
  return{ok:true,json:async()=>([])};
};
const _fetch=global.fetch;
/* 3. base complète */
global.fetch=mk(FULL);
await App.dbCheck();
if(!mod||!mod.b.includes('Base complète'))throw new Error('complet : '+(mod&&mod.b.slice(0,50)));
console.log('✓ Base complète : 21 tables + toutes leurs colonnes détectées');
/* 4. CAS RÉEL : adjustments sans type_id/name + table form_tokens absente */
const OLD=JSON.parse(JSON.stringify(FULL));
OLD.adjustments=OLD.adjustments.filter(c=>c!=='type_id'&&c!=='name');
OLD.products=OLD.products.filter(c=>c!=='packaging'&&c!=='type_id'&&c!=='type_name'&&c!=='type_kg'&&c!=='recipes');
OLD.productions=OLD.productions.filter(c=>c!=='type_lines');
delete OLD.form_tokens;
global.fetch=mk(OLD);
await App.dbCheck();
const sql=(mod.b.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)||[])[1]||'';
if(!sql.includes('alter table adjustments add column if not exists type_id text'))throw new Error('SQL : ALTER type_id absent → '+sql.slice(0,120));
if(!sql.includes('add column if not exists name text'))throw new Error('SQL : ALTER name absent');
if(!sql.includes('create table if not exists form_tokens'))throw new Error('SQL : CREATE form_tokens absent');
['packaging jsonb','type_id text','type_name text','type_kg numeric','recipes jsonb'].forEach(f=>{if(!sql.includes('add column if not exists '+f))throw new Error('SQL products : '+f+' absent');});
if(!sql.includes('add column if not exists type_lines jsonb'))throw new Error('SQL productions : type_lines absent');
if(!mod.b.includes('type_id')||!mod.b.includes('form_tokens')||!mod.b.includes('products'))throw new Error('résumé incomplet');
console.log('✓ Formats réels couverts : PostgreSQL « column x.y does not exist » + PostgREST multi-colonnes → ALTER complets générés');
/* 5. injoignable / pause */
global.fetch=async()=>{throw new Error('network');};
await App.dbCheck();
if(!mod||!/injoignable/i.test(mod.b))throw new Error('pause non gérée');
console.log('✓ Projet injoignable → conduite à tenir (pause/URL)');
/* 6. session expirée */
global.fetch=async()=>({ok:false,status:401,json:async()=>({message:'JWT expired'})});
await App.dbCheck();
if(!mod||!mod.t.includes('Session expirée'))throw new Error('session non détectée');
console.log('✓ Session expirée → se reconnecter');
/* 7. alerte silencieuse après connexion : colonnes aussi */
cap=null;const t2=toast;toast=(m,k)=>{cap=m;return t2(m,k);};
global.fetch=mk(OLD);
await dbCheckSilent();
if(!cap||!cap.includes('manquant'))throw new Error('silencieux : '+cap);
global.fetch=mk(FULL);cap=null;await dbCheckSilent();
if(cap!==null)throw new Error('silencieux : alerte à tort');
toast=t2;global.fetch=_fetch;modal=_modal;
console.log('✓ Après connexion : alerte dès qu\'un élément manque (table OU colonne)');
/* 8. adjSave n\'envoie plus les colonnes nulles (compat anciennes bases) */
S.route='production';S.tab={production:'adj'};location.hash='#/production';
await render();
$('#jQ').value='25';$('#jR').value='Stock initial';
let ins=null;const _i=DB.insert;DB.insert=async function(t,o){ins={t:t,o:o};return _i.apply(this,arguments);};
await App.adjSave();
DB.insert=_i;
if(!ins||ins.t!=='adjustments')throw new Error('adjSave : insert non capturé');
if('type_id' in ins.o||'name' in ins.o||'product_id' in ins.o)throw new Error('adjSave : colonnes nulles envoyées → '+JSON.stringify(ins.o));
if(Number(ins.o.qty)!==25)throw new Error('adjSave : qty');
console.log('✓ Ajustement café vert : plus de colonnes nulles envoyées → passe même sur une ancienne base');
/* 9. BUG MAJEUR : en mode en ligne, l'id n'était pas envoyé (aucune table ne le génère) */
const _f2=global.fetch;let posted=null;
global.fetch=async(u,o)=>{if(o&&o.method==='POST'){posted=JSON.parse(o.body);return{ok:true,json:async()=>posted};}return{ok:true,json:async()=>([])};};
CFG.mode='supabase';CFG.url='https://demo.supabase.co';CFG.anon='cle';SES=null;
setDbAdapter();
let back=await DB.insert('adjustments',{date:todayISO(),level:'green',qty:10,reason:'test'});
const p0=Array.isArray(posted)?posted[0]:posted;
if(!p0||!p0.id)throw new Error('insert en ligne : id toujours absent');
if(!p0.created_at)throw new Error('insert en ligne : created_at absent');
const withId=await DB.insert('adjustments',{id:'mon-id',date:todayISO(),level:'green',qty:5});
if(withId.id!=='mon-id')throw new Error('id fourni écrasé !');
const many=await DB.insert('adjustments',[{qty:1},{id:'x2',qty:2}]);
const pm=Array.isArray(posted)?posted:[posted];
if(!pm[0].id||pm[1].id!=='x2')throw new Error('insert tableau : ids incorrects');
global.fetch=_f2;
console.log('✓ Insert en ligne : id + created_at générés automatiquement (1 objet, tableau, id fourni respecté)');
console.log('TDB: 9/9 OK');
})().catch(e=>{console.error('ÉCHEC TDB:',e.stack||e.message);process.exit(1);});
