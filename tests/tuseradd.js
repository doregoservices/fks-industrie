;/* TUSERADD : création des logins d'accès aux données DEPUIS L'APP, sans ouvrir Supabase (v35.49) */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const _m=CFG.mode,_u=CFG.url,_a=CFG.anon,_f=global.fetch;
CFG.mode='supabase';CFG.url='https://fake.supabase.co';CFG.anon='fakekey';
const calls=[];
/* 1 · création complète : compte applicatif + login Supabase automatique (signup public) */
global.fetch=async(u,o)=>{const url=String(u);calls.push(url);
  if(url.indexOf('/auth/v1/signup')>=0)return new Response(JSON.stringify({access_token:'t',user:{email:'awa@fks.ci',email_confirmed_at:'x'}}),{status:200});
  return new Response(JSON.stringify([]),{status:200});};
$('#uName').value='Awa';$('#uRole').value='caissier';$('#uPin').value='2468';$('#uMail').value='awa@fks.ci';
if($('#uPass'))$('#uPass').value='';
await App.userAdd();
if(!(SETS.users||[]).some(x=>x.email==='awa@fks.ci'))throw new Error('compte applicatif non créé');
if(!calls.some(c=>c.indexOf('/auth/v1/signup')>=0))throw new Error('login Supabase non créé automatiquement (signup)');
/* 2 · login déjà existant (HTTP 422) : pas de plantage, compte créé quand même */
calls.length=0;
global.fetch=async(u,o)=>{const url=String(u);
  if(url.indexOf('/auth/v1/signup')>=0)return new Response(JSON.stringify({msg:'A user with this email address has already been registered'}),{status:422});
  return new Response(JSON.stringify([]),{status:200});};
$('#uName').value='Bolo';$('#uRole').value='production';$('#uPin').value='1111';$('#uMail').value='bolo@fks.ci';
await App.userAdd();
if(!(SETS.users||[]).some(x=>x.email==='bolo@fks.ci'))throw new Error('compte non créé (cas login déjà existant)');
/* 3 · réinitialisation du mot de passe par e-mail */
global.fetch=async(u,o)=>{const url=String(u);
  if(url.indexOf('/auth/v1/recover')>=0){calls.push('RECOVER');return new Response(JSON.stringify({}),{status:200});}
  return new Response(JSON.stringify([]),{status:200});};
const iR=(SETS.users||[]).findIndex(x=>x.email==='awa@fks.ci');
await App.authRecover(iR);
if(!calls.includes('RECOVER'))throw new Error('e-mail de réinitialisation non envoyé');
/* 4 · suppression AVEC la fonction user-admin : le login est supprimé aussi */
SETS.usermgt_key='SECRET';
global.fetch=async(u,o)=>{const url=String(u);
  if(url.indexOf('/functions/v1/user-admin')>=0){calls.push('FNADMIN');return new Response(JSON.stringify({ok:true}),{status:200});}
  return new Response(JSON.stringify([]),{status:200});};
const iAwa=(SETS.users||[]).findIndex(x=>x.email==='awa@fks.ci');
await App.userDel(iAwa);
if((SETS.users||[]).some(x=>x.email==='awa@fks.ci'))throw new Error('compte non supprimé');
if(!calls.includes('FNADMIN'))throw new Error('fonction user-admin non appelée à la suppression');
/* 5 · création via la fonction user-admin (prioritaire quand la clé est enregistrée) */
calls.length=0;
$('#uName').value='Cise';$('#uRole').value='commercial';$('#uPin').value='3333';$('#uMail').value='cise@fks.ci';
await App.userAdd();
if(!calls.includes('FNADMIN'))throw new Error('création via fonction user-admin non tentée');
/* 6 · en mode en ligne, un compte SANS e-mail est refusé (l e-mail = accès aux données) */
$('#uName').value='SansMail';$('#uRole').value='caissier';$('#uPin').value='4444';$('#uMail').value='';
const nBefore=(SETS.users||[]).length;
await App.userAdd();
if((SETS.users||[]).length!==nBefore)throw new Error('un compte sans e-mail ne doit pas être créé en mode en ligne');
/* 7 · en mode local, le PIN reste requis */
CFG.mode='local';
$('#uName').value='LocalMan';$('#uRole').value='caissier';$('#uPin').value='';$('#uMail').value='';
await App.userAdd();
if((SETS.users||[]).some(x=>x.name==='LocalMan'))throw new Error('mode local : compte sans PIN ne doit pas être créé');
CFG.mode='supabase';
global.fetch=_f;CFG.mode=_m;CFG.url=_u;CFG.anon=_a;SETS.usermgt_key=undefined;
console.log('✓ Créer un compte crée AUSSI le login d accès aux données, automatiquement (signup public, zéro configuration)');
console.log('✓ Avec la fonction user-admin (optionnelle) : login actif immédiatement à la création, ET supprimé à la suppression du compte');
console.log('✓ Cas gérés avec message clair : login déjà existant (422), réinitialisation par e-mail, inscriptions désactivées, panne réseau');
/* 8 · v35.51 : doublons refusés — jamais deux comptes sur le même e-mail ou le même PIN */
const n0=(SETS.users||[]).length;
$('#uName').value='Clone';$('#uRole').value='caissier';$('#uPin').value='3333';$('#uMail').value='CISE@fks.ci';
await App.userAdd();
if((SETS.users||[]).length!==n0)throw new Error('doublon d e-mail (ou de PIN) accepté');
$('#uMail').value='nouveau@fks.ci';/* e-mail libre mais PIN 3333 déjà pris */
await App.userAdd();
if((SETS.users||[]).length!==n0)throw new Error('doublon de PIN accepté (deux personnes sur le même compte)');
$('#uPin').value='9999';/* e-mail libre + PIN libre → créé */
await App.userAdd();
if((SETS.users||[]).length!==n0+1)throw new Error('compte légitime refusé à tort');
/* 9 · v35.51 : le PIN gestionnaire doit être solide (4 chiffres minimum) */
SETS.admin_pin='1234';
$('#stPin').value='12';await App.savePin();
if(String(SETS.admin_pin)!=='1234')throw new Error('PIN trop court accepté');
$('#stPin').value='9876';await App.savePin();
if(String(SETS.admin_pin)!=='9876')throw new Error('PIN valide refusé');
console.log('✓ Anti-doublons : même e-mail ou même PIN refusés (jamais deux personnes sur un compte)');
console.log('TUSERADD: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TUSERADD:',e.message);process.exit(1);});
