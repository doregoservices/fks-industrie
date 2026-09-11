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
/* 4 · hors-ligne (SETS vide) : le cache local restitue le rôle, jamais manager par défaut */
saveUser();
SETS.users=[];
const r3=resolveUser('awa@fks.ci');
if(!r3||r3.role!=='caissier')throw new Error('resolveUser (cache LS) : '+JSON.stringify(r3));
if(resolveUser('inconnu@fks.ci')!==null)throw new Error('resolveUser doit renvoyer null pour un email inconnu');
/* 5 · grand livre : en-têtes qui reviennent à la ligne (plus de noms entremêlés) */
S.user={name:'test',role:'manager'};
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};S.payPeriod=monthISO();await render();
await App.runGen(monthISO());
$('#main').innerHTML='<input id="lvT"><input id="lvEnd">';
$('#lvT').value='m';$('#lvEnd').value=monthISO();
await App.livrePrint();
const ph=$('#main').innerHTML;
if(ph.indexOf('white-space:normal;overflow-wrap:anywhere')<0)throw new Error('retour à la ligne des noms absent du grand livre');
if(ph.indexOf('.lvpage th{white-space:normal!important}')<0)throw new Error('règle impression white-space absente');
console.log('✓ Caissier : accès à Caisse, Banque, Achats vert et Impayés — et rien d autre (nav, menu, barre du bas, URL direct bloquée)');
console.log('✓ Le rôle SURVIT au rechargement : restore depuis les comptes (source de vérité) puis cache local si hors-ligne');
console.log('✓ Email inconnu : aucune promotion manager silencieuse au rechargement (null → connexion refusée/manuelle)');
console.log('✓ Grand livre : noms des employés avec retour à la ligne propre + matricule (plus d entremêlement)');
console.log('TROLES: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TROLES:',e.message);process.exit(1);});
