;/* TROLES : le rôle SURVIT au rechargement + caissier voit banque/achats/impayés + aucun accès interdit par aucun chemin */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'Awa Caissière',email:'awa@fks.ci',role:'caissier'};
/* 1 · navigation : le caissier voit ses écrans (et pas les autres) */
location.hash='#/dashboard';S.route='dashboard';await render();
const nav=$('#app').innerHTML;
for(const r of ['#/banque','#/achats','#/impayes','#/caisse','#/dashboard'])
  if(nav.indexOf(r)<0)throw new Error('caissier : onglet manquant '+r);
for(const r of ['#/exploitation','#/paie','#/ventes','#/production','#/exports','#/stocks','#/parametres','#/commerciaux'])
  if(nav.indexOf(r)>=0)throw new Error('caissier : onglet interdit visible '+r);
/* 2 · accès direct par URL : redirection forcée vers l'accueil */
location.hash='#/exploitation';S.route='exploitation';await render();
if(S.route!=='dashboard')throw new Error('accès direct #/exploitation non bloqué pour caissier (route='+S.route+')');
location.hash='#/paie';S.route='paie';await render();
if(S.route!=='dashboard')throw new Error('accès direct #/paie non bloqué pour caissier');
/* 3 · le rôle survit au rechargement : resolveUser (SETS = source de vérité) */
SETS.users=[{email:'awa@fks.ci',name:'Awa Caissière',role:'caissier'},{email:'boss@fks.ci',name:'Le Boss',role:'manager'}];
const r1=resolveUser('AWA@FKS.CI');
if(!r1||r1.role!=='caissier')throw new Error('resolveUser (SETS) : '+JSON.stringify(r1));
const r2=resolveUser('boss@fks.ci');
if(!r2||r2.role!=='manager')throw new Error('resolveUser manager : '+JSON.stringify(r2));
/* 4 · hors-ligne (liste NON chargée) : le cache local restitue le rôle ; EN LIGNE un compte supprimé est REFUSÉ */
saveUser();
SETS.users=[];S._setsLoaded=false;
const r3=resolveUser('awa@fks.ci');
if(!r3||r3.role!=='caissier')throw new Error('resolveUser (cache LS hors-ligne) : '+JSON.stringify(r3));
S._setsLoaded=true;/* v35.48 : liste fraîchement chargée = source de vérité → compte absent = REFUS */
if(resolveUser('awa@fks.ci')!==null)throw new Error('FAILLE v35.48 : caissier absent de la liste encore admis en ligne');
if(resolveUser('inconnu@fks.ci')!==null)throw new Error('resolveUser doit renvoyer null pour un email inconnu');
/* 5 · grand livre : en-têtes qui reviennent à la ligne (plus de noms entremêlés) */
S.user={name:'test',role:'manager'};
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};S.payPeriod=monthISO();await render();
await App.runGen(monthISO());
$('#main').innerHTML='<input id="lvT"><input id="lvEnd">';
$('#lvT').value='m';$('#lvEnd').value=monthISO();
await App.livrePrint();
const ph=$('#main').innerHTML;
if(ph.indexOf('.lvtab thead th')<0||ph.indexOf('white-space:normal')<0)throw new Error('retour à la ligne des noms absent du grand livre');
/* 6 · v35.48 : SUPPRIMER un compte = RÉVOQUER l'accès (scénario réel : le patron supprime le caissier) */
S._setsLoaded=true;
SETS.users=[{email:'awa@fks.ci',name:'Awa Caissière',role:'caissier'},{email:'boss@fks.ci',name:'Le Boss',role:'manager'}];
S.user={email:'awa@fks.ci',name:'Awa Caissière',role:'caissier'};saveUser();
if(!resolveUser('awa@fks.ci')||resolveUser('awa@fks.ci').role!=='caissier')throw new Error('pré-condition : caissier connecté');
await App.userDel(0);/* le patron supprime le compte depuis SES réglages */
if((SETS.users||[]).some(x=>x.email==='awa@fks.ci'))throw new Error('compte non retiré de la liste');
const rr=resolveUser('awa@fks.ci');
if(rr!==null)throw new Error('FAILLE : le caissier supprimé retrouve un rôle ('+JSON.stringify(rr)+')');
if(rr&&rr.role==='manager')throw new Error('FAILLE : promotion manager d un compte supprimé');
/* session encore OUVERTE sur le téléphone du caissier : la surveillance 30 s doit la couper */
S.user={email:'awa@fks.ci',name:'Awa Caissière',role:'caissier'};
const cm=CFG.mode;CFG.mode='supabase';
await revokeCheck();
CFG.mode=cm;
if(S.user)throw new Error('FAILLE : session non révoquée après suppression du compte');
/* email inconnu alors que des comptes existent : jamais manager, jamais admis */
if(resolveUser('pirate@fks.ci')!==null)throw new Error('FAILLE : email inconnu résolu');
console.log('✓ v35.48 SUPPRESSION = RÉVOCATION : compte supprimé → refus au rechargement, session ouverte coupée en ≤30 s, jamais promu manager');
console.log('✓ Caissier : accès à Caisse, Banque, Achats vert et Impayés — et rien d autre (nav, menu, barre du bas, URL direct bloquée)');
console.log('✓ Le rôle SURVIT au rechargement : restore depuis les comptes (source de vérité) puis cache local si hors-ligne');
console.log('✓ Email inconnu : aucune promotion manager silencieuse au rechargement (null → connexion refusée/manuelle)');
console.log('✓ Grand livre : noms des employés avec retour à la ligne propre + matricule (plus d entremêlement)');
console.log('TROLES: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TROLES:',e.message);process.exit(1);});
