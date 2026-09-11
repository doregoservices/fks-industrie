;/* TRESCUE : le PATRON n'est JAMAIS enfermé dehors — récupération par code PIN gestionnaire (v35.50) */
;(async()=>{
await loadSettings();await seedDemo();S.user=null;SES=null;
const _m=CFG.mode,_u=CFG.url,_a=CFG.anon,_f=global.fetch,_sk=SETS.admin_pin;
CFG.mode='supabase';CFG.url='https://fake.supabase.co';CFG.anon='fakekey';
location.hash='#/login';S.route='login';await render();
if(!$('#lgEmail'))throw new Error('écran de connexion e-mail absent');
/* des comptes existent + e-mail du patron inconnu → la connexion ouvre le SAUVETAGE (pas un refus sec) */
S._setsLoaded=true;
SETS.users=[{email:'awa@fks.ci',name:'Awa',role:'caissier'}];SETS.admin_pin='1234';
global.fetch=async(u,o)=>{const url=String(u);
  if(url.indexOf('/auth/v1/token')>=0)return new Response(JSON.stringify({access_token:'tok',refresh_token:'r',user:{id:'u1'}}),{status:200});
  return new Response(JSON.stringify([]),{status:200});};
$('#lgEmail').value='patron@fks.ci';$('#lgPass').value='secret';
await App.login();
if(!SES)throw new Error('FAILLE UX : e-mail inconnu doit ouvrir le sauvetage, pas purger la session');
/* mauvais PIN → refus net, rien de créé */
$('#rcPin').value='0000';
await App.rescueGo('patron@fks.ci');
if(SES)throw new Error('mauvais PIN : la session doit être purgée');
if((SETS.users||[]).some(x=>x.email==='patron@fks.ci'))throw new Error('mauvais PIN : aucun compte ne doit être créé');
/* PIN par défaut 1234 : le nouveau PIN est EXIGÉ avant de rétablir l'accès */
SES={access_token:'tok',email:'patron@fks.ci'};
$('#rcPin').value='1234';$('#rcNew').value='';
await App.rescueGo('patron@fks.ci');
if((SETS.users||[]).some(x=>x.email==='patron@fks.ci'))throw new Error('le nouveau PIN doit être exigé avant de créer le compte');
$('#rcPin').value='1234';$('#rcNew').value='4321';
await App.rescueGo('patron@fks.ci');
const me=(SETS.users||[]).find(x=>x.email==='patron@fks.ci');
if(!me||me.role!=='manager')throw new Error('patron non inscrit comme manager');
if(String(SETS.admin_pin)!=='4321')throw new Error('le PIN 1234 par défaut doit être remplacé');
if(!S.user||S.user.role!=='manager')throw new Error('patron non connecté comme manager');
/* PIN personnalisé : accès direct, le PIN ne change pas */
SES={access_token:'tok',email:'patron2@fks.ci'};
App.rescueModal('patron2@fks.ci');
$('#rcPin').value='4321';
await App.rescueGo('patron2@fks.ci');
const me2=(SETS.users||[]).find(x=>x.email==='patron2@fks.ci');
if(!me2||me2.role!=='manager')throw new Error('récupération avec PIN personnalisé échouée');
if(String(SETS.admin_pin)!=='4321')throw new Error('avec un PIN personnalisé, le PIN ne doit pas changer');
CFG.mode=_m;CFG.url=_u;CFG.anon=_a;global.fetch=_f;SETS.admin_pin=_sk;S.user=null;SES=null;
console.log('✓ PATRON JAMAIS ENFERMÉ DEHORS : e-mail inconnu → fenêtre de sauvetage (code PIN gestionnaire)');
console.log('✓ PIN par défaut 1234 : nouveau PIN EXIGÉ (le trou du PIN public est refermé au premier sauvetage)');
console.log('✓ Mauvais PIN → refus net : un ex-employé avec un login ne peut pas se promouvoir manager');
console.log('TRESCUE: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TRESCUE:',e.message);process.exit(1);});
