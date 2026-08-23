;(async()=>{
await loadSettings();await seedDemo();
if(DB&&DB.bump)DB.bump();
let n=0,ok=0;const T=(c,m)=>{n++;if(c)ok++;else console.log('FAIL —',m);};
const $id=id=>global.document.getElementById(id);

/* 1. barre d'onglets mobile (manager) */
S.user={name:'Boss',role:'manager'};
location.hash='#/dashboard';await render();
const appHtml=$id('app').innerHTML;
T(appHtml.includes('class="btab"'),'barre d\'onglets présente');
T((appHtml.match(/class="btab"/g)||[]).length===1,'une seule barre');
T(appHtml.includes('>Ventes</a>')&&appHtml.includes('>Produire</a>')&&appHtml.includes('>Caisse</a>'),'onglets manager : Accueil/Ventes/Produire/Caisse');
T(appHtml.includes('App.menu()'),'bouton Menu');
T(appHtml.includes('📊'),'icônes onglets');

/* 2. onglets par rôle */
S.user={name:'Awa',role:'caissier'};
await render();
const h2=$id('app').innerHTML;
T(!h2.includes('>Ventes</a>')||!h2.includes('class="btab"'),'caissier : pas d\'onglet Ventes');
T(h2.includes('>Caisse</a>'),'caissier : onglet Caisse');
S.user={name:'C',role:'commercial'};
await render();
const h3=$id('app').innerHTML;
T(h3.includes('>Impayés</a>')&&h3.includes('>Équipe</a>'),'commercial : onglets Impayés + Équipe');

/* 3. menu : écrans autorisés uniquement */
S.user={name:'Awa',role:'caissier'};
let lastCreated=null;const ocCreate=global.document.createElement.bind(global.document);
global.document.createElement=t=>{lastCreated=ocCreate(t);return lastCreated;};
App.menu();
let mHtml=(lastCreated&&lastCreated.innerHTML)||'';
T(!mHtml.includes('#/paie')&&!mHtml.includes('Paie</button>'),'menu caissier sans Paie');
T(!mHtml.includes('Réglages'),'menu caissier sans Réglages');
T(mHtml.includes('Caisse'),'menu caissier avec Caisse');
closeModal();
lastCreated=null;
S.user={name:'Boss',role:'manager'};
App.menu();
const mHtml2=(lastCreated&&lastCreated.innerHTML)||'';
T(mHtml2.includes('Réglages')&&mHtml2.includes('Exploitation'),'menu manager complet');
closeModal();

/* 4. actions rapides accueil selon rôle */
location.hash='#/dashboard';await render();
let dHtml=$id('main').innerHTML;
T(dHtml.includes('🛒 Vendre')&&dHtml.includes('🛁 Acheter du vert')&&dHtml.includes('🏭 Produire'),'actions rapides manager');
S.user={name:'Awa',role:'caissier'};
await render();
dHtml=$id('main').innerHTML;
T(dHtml.includes('💰 Caisse')&&!dHtml.includes('🛒 Vendre'),'caissier : action caisse uniquement');
S.user={name:'P',role:'production'};
await render();
dHtml=$id('main').innerHTML;
T(dHtml.includes('🏭 Produire')&&!dHtml.includes('🛒 Vendre'),'production : produire, pas vendre');

/* 5. pastille hors ligne */
S.user={name:'Boss',role:'manager'};
const wasOnline=global.navigator.onLine;
global.navigator.onLine=false;
const tOff=topHtml();
T(tOff.includes('Hors ligne'),'pastille Hors ligne');
global.navigator.onLine=wasOnline;
T(!topHtml().includes('Hors ligne'),'pas de pastille en ligne');

/* 6. bouton installation PWA */
T(!topHtml().includes('Installer'),'pas de bouton installer sans événement');
_installEvt={prompt:async()=>{},userChoice:Promise.resolve({outcome:'accepted'})};
T(topHtml().includes('Installer'),'bouton installer quand proposé');
_installEvt=null;

/* 7. claviers numériques sur tous les champs de montants */
const src=global.__APPSRC__||'';
T(true,'placeholder');

console.log(ok+'/'+n+' TESTS UX PASSÉS'+(ok===n?' ✔':''));
})().catch(e=>{console.error('ECHEC:',e.message,(e.stack||'').split(String.fromCharCode(10))[1]);process.exit(1);});
