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

/* ===== 5. linkModal inclut les params (QR + copie) ===== */
CFG={mode:'supabase',url:'https://x.supabase.co',anon:'eyJ123'};
let cap=null;const _m=modal;modal=(t,b)=>{cap=b;};
App.linkModal('tok99','Awa');modal=_m;
if(!cap.includes('su=https%3A%2F%2Fx.supabase.co'))throw new Error('linkModal sans params');
App.tokenModal('production').then?await App.tokenModal('production'):null;
cap=null;modal=(t,b)=>{cap=b;};await App.tokenModal('production');modal=_m;
if(!cap||!cap.includes('su='))throw new Error('tokenModal sans params');
console.log('✓ QR codes + liens copiés/WhatsApp (commerciales, atelier, caisse) transportent la config');

CFG={mode:'local',url:'',anon:''};
console.log('TFLINK: 5/5 OK');
})().catch(e=>{console.error('ÉCHEC TFLINK:',e.message);process.exit(1);});
