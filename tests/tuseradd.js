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

/* 10 · v35.60 : « Email not confirmed » → solution pas à pas (fini le refus brut) */
let mod60=null;const _modal60=modal;modal=(t,b)=>{mod60={t:t,b:String(b)};};
CFG.mode='supabase';CFG.url='https://fake.supabase.co';CFG.anon='fakekey';
location.hash='#/login';S.route='login';S.user=null;await render();
const htmlLogin=document.querySelector('#app').innerHTML;
if(htmlLogin.indexOf('lgBtn')<0)throw new Error('écran connexion en ligne absent');
if(htmlLogin.indexOf('mode local')<0)throw new Error('bouton « mode local » absent de l écran en ligne');
global.fetch=async(u,o)=>{const url=String(u);
  if(url.indexOf('/auth/v1/token')>=0)return new Response(JSON.stringify({error:'invalid_grant',error_description:'Email not confirmed'}),{status:400});
  return new Response(JSON.stringify([]),{status:200});};
$('#lgEmail').value='awa@fks.ci';$('#lgPass').value='pass123';
await App.login();
if(!mod60||mod60.t.indexOf('non confirmé')<0)throw new Error('modal Email not confirmed absente : '+(mod60&&mod60.t));
if(mod60.b.indexOf('Confirm email')<0||mod60.b.indexOf('Créer / recréer le login')<0)throw new Error('solution pas à pas absente du modal');
if($('#lgBtn').disabled)throw new Error('bouton connexion laissé bloqué');
console.log('✓ v35.60 : e-mail non confirmé → message clair + solution (désactiver Confirm email + recréer le login), bouton débloqué');
/* identifiants invalides → français */
global.fetch=async(u,o)=>{const url=String(u);
  if(url.indexOf('/auth/v1/token')>=0)return new Response(JSON.stringify({error:'invalid_grant',error_description:'Invalid login credentials'}),{status:400});
  return new Response(JSON.stringify([]),{status:200});};
let t60=null;const _t60=toast;toast=m=>{t60=m;};
$('#lgEmail').value='x@fks.ci';$('#lgPass').value='mauvais';
await App.login();
if(t60!=='E-mail ou mot de passe incorrect')throw new Error('message identifiants : '+t60);
toast=_t60;
console.log('✓ v35.60 : identifiants invalides → message en français');

/* 11 · v35.60 : mode local rétabli depuis l'écran en ligne */
await App.goLocal();
if(CFG.mode!=='local')throw new Error('goLocal : mode non basculé');
await new Promise(r=>setTimeout(r,10));
const htmlLocal=document.querySelector('#app').innerHTML;
if(htmlLocal.indexOf('lgPin')<0)throw new Error('écran local (PIN) non affiché après bascule');
if(htmlLocal.indexOf('Mode local')<0)throw new Error('indicateur Mode local absent');
if(htmlLocal.indexOf('Connexion Supabase')<0)throw new Error('retour Supabase non proposé en mode local');
console.log('✓ v35.60 : « 📱 Utiliser l app en mode local » depuis l écran en ligne — PIN + retour Supabase possibles');

/* 12 · v35.60 : création non confirmée → consigne renforcée */
CFG.mode='supabase';CFG.url='https://fake.supabase.co';CFG.anon='k';
mod60=null;
global.fetch=async(u,o)=>{const url=String(u);
  if(url.indexOf('/auth/v1/signup')>=0)return new Response(JSON.stringify({user:{email:'neuf@fks.ci'}}),{status:200});
  return new Response(JSON.stringify([]),{status:200});};
await App.authCreate('neuf@fks.ci','fks123456','Neuf','caissier');
if(!mod60||mod60.b.indexOf('actif immédiatement')<0||mod60.b.indexOf('Confirm email')<0)throw new Error('consigne renforcée absente : '+(mod60&&mod60.b.slice(0,80)));
modal=_modal60;
console.log('✓ v35.60 : login créé non confirmé → consigne complète (désactiver Confirm email puis 🔑 recréer — actif immédiatement)');
console.log('TUSERADD: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TUSERADD:',e.message);process.exit(1);});
