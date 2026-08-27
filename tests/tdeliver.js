;/* ULTRAREVIEW LIVRAISON : réinitialisation propre + rendu mode Supabase + écran Réglages complet */
;(async()=>{
await loadSettings();
await seedDemo();
S.user={name:'Direction GFE',role:'manager',email:'direction@gfe.ci'};

/* ===== 1. RÉINITIALISATION : conserve connexion, session, file hors-ligne ===== */
LS.set('cafepro_cfg',JSON.stringify({mode:'supabase',url:'https://fake.supabase.co',anon:'k'}));
LS.set('cafepro_session','{"access_token":"t"}');
LS.set('cafepro_outbox','[{"source_type":"sales"}]');
if(!JSON.parse(LS.get('cafepro_products')||'[]').length)throw new Error('pré-requis: données locales présentes');
let fn=null;const _cb=confirmBox;confirmBox=(t,m,l,f)=>{fn=f;};
App.resetAll();
if(!fn)throw new Error('confirmBox non appelé');
fn();confirmBox=_cb;
if(LS.get('cafepro_cfg')===null||!JSON.parse(LS.get('cafepro_cfg')).url)throw new Error('config Supabase perdue !');
if(LS.get('cafepro_session')===null)throw new Error('session perdue');
if(LS.get('cafepro_outbox')===null)throw new Error('file hors-ligne perdue');
if(LS.get('cafepro_products')!==null)throw new Error('données locales non effacées');
console.log('✓ Réinitialisation : données locales effacées, mais connexion Supabase + session + file hors-ligne conservées');

/* ===== 2. ÉCRAN RÉGLAGES COMPLET ===== */
LS.set('cafepro_cfg',JSON.stringify({mode:'supabase',url:'https://fake.supabase.co',anon:'k'}));
CFG=Object.assign({mode:'local',url:'',anon:''},JSON.parse(LS.get('cafepro_cfg')||'{}'));
S.route='parametres';location.hash='#/parametres';await render();
const set=$('#main').innerHTML;
['Société','Accès','Comptes à accès restreint','Correspondance des comptes','Taux de paie','Zone sensible','rapports au boss','Supabase'].forEach(x=>{
  if(!set.includes(x))throw new Error('Réglages : section manquante → '+x);});
if(set.includes('id="stPin"'))throw new Error('champ PIN local affiché à tort en mode Supabase');
if(!set.includes('uMail'))throw new Error('champ e-mail utilisateur absent en mode Supabase');
console.log('✓ Réglages en mode Supabase : toutes les sections présentes, champ e-mail utilisateur ok, PIN local masqué');

/* ===== 3. RENDU GÉNÉRAL EN MODE SUPABASE (données locales de secours) ===== */
for(const r of ['dashboard','ventes','caisse','paie','exploitation','exports','apropos','stocks']){
  S.route=r;location.hash='#/'+r;
  try{await render();}catch(e){throw new Error('mode supabase · écran '+r+' : '+e.message);}
  if($('#main').innerHTML.includes('NaN'))throw new Error('mode supabase · NaN sur '+r);
}
console.log('✓ 8 écrans rendus en mode Supabase sans erreur ni NaN');
CFG={mode:'local',url:'',anon:''};
console.log('TDELIVER: 3/3 OK');
})().catch(e=>{console.error('ÉCHEC TDELIVER:',e.message);process.exit(1);});
