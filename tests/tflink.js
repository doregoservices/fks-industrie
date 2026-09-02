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
console.log('TFLINK: 7/7 OK');
})().catch(e=>{console.error('ÉCHEC TFLINK:',e.message);process.exit(1);});
