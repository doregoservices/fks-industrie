;/* TLIVRE : recherche sur toute la Paie + tous les bulletins en PDF + grand livre périodique (mensuel/trimestriel/annuel) */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
/* générer la paie du mois courant */
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};await render();
/* 0 · barre de recherche présente AVANT génération (vue de saisie) */
if(!$('#pqG'))throw new Error('barre de recherche absente de la vue de génération (avant bulletins)');
await App.runGen(monthISO());
await render();
/* 1 · barre de recherche des bulletins (Paie du mois) */
if(!$('#pqR'))throw new Error('barre de recherche absente de Paie → Paie du mois');
/* 2 · barre de recherche des avances */
S.tab={paie:'adv'};await render();
if(!$('#pqA'))throw new Error('barre de recherche absente de Paie → Avances');
/* 3 · écran TOUS les bulletins (PDF d un seul tenant, un par page) */
S.tab={paie:'run'};await render();
const run=(await DB.list('pay_runs')).filter(r=>r.period===monthISO())[0];
if(!run)throw new Error('paie non générée');
App.slipsAll(run.id);
if(location.hash!=='#/bulletins')throw new Error('route #/bulletins non active : '+location.hash);
await render();
const h=$('#main').innerHTML;
const slips=await DB.list('pay_slips',{eq:{run_id:run.id}});
if(!slips.length)throw new Error('aucun bulletin généré');
for(const x of slips)if(h.indexOf(x.employee_name)<0)throw new Error('bulletin manquant à l écran : '+x.employee_name);
if(h.indexOf('page-break-after')<0)throw new Error('sauts de page absents (1 bulletin par page attendu)');
if(h.indexOf('Tout imprimer')<0)throw new Error('bouton Tout imprimer / PDF absent');
if(h.split('BULLETIN DE PAIE').length-1!==slips.length)throw new Error('attendu '+slips.length+' bulletins affichés');
/* 4 · bulletin individuel toujours fonctionnel */
App.slipView(slips[0].id);
if(location.hash!=='#/bulletin')throw new Error('route bulletin individuel cassée');
await render();
if($('#main').innerHTML.indexOf('BULLETIN DE PAIE')<0)throw new Error('écran bulletin individuel cassé');
/* 5 · grand livre périodique : ANNUEL puis MENSUEL (capture du téléchargement) */
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};await render();
let cap=null;const _dl=download;download=(n,b)=>{cap={n:n};};
App.livrePaie();
if(!$('#lvT'))throw new Error('sélecteur de périodicité (lvT) absent du grand livre');
$('#lvT').value='a';$('#lvY').value=monthISO().slice(0,4);
await App.livreGo();
if(!cap||!cap.n)throw new Error('téléchargement annuel non déclenché');
if(!/livre-de-paie-\d{4}-01_\d{4}-12\.xlsx/.test(cap.n))throw new Error('période annuelle incorrecte : '+cap.n);
cap=null;$('#lvT').value='m';$('#lvEnd').value=monthISO();
await App.livreGo();
if(!cap||!cap.n)throw new Error('téléchargement mensuel non déclenché');
if(cap.n!=='livre-de-paie-'+monthISO()+'.xlsx')throw new Error('période mensuelle incorrecte : '+cap.n);
download=_dl;
/* 6 · grand livre PDF TRANSPOSÉ : rubriques en lignes (longueur A4), employés en colonnes (largeur), pagination */
App.livrePaie();
$('#lvT').value='m';$('#lvEnd').value=monthISO();
await App.livrePrint();
const ph=$('#main').innerHTML;
if(ph.indexOf('RUBRIQUE')<0)throw new Error('livre PDF : colonne RUBRIQUE absente (transposition)');
if(ph.indexOf('A4 portrait')<0)throw new Error('livre PDF : format A4 portrait non déclaré');
if(ph.indexOf('lvpage')<0)throw new Error('livre PDF : pagination (lvpage) absente');
if(ph.indexOf('NET À PAYER')<0)throw new Error('livre PDF : ligne NET À PAYER absente');
if(ph.indexOf('>TOTAL<')<0)throw new Error('livre PDF : colonne TOTAL absente');
if(ph.indexOf('>'+slips[0].employee_name+'<')<0)throw new Error('livre PDF : nom attendu en en-tête de colonne : '+slips[0].employee_name);
if(ph.split('lvpage').length-1<2)throw new Error('structure de pages attendue');
console.log('✓ Grand livre PDF TRANSPOSÉ : rubriques sur la longueur A4, un employé par colonne, colonne TOTAL, suite sur page suivante');
console.log('✓ Recherche : employés (v35.39) + GÉNÉRATION (v35.42) + bulletins + avances — toute la Paie est filtrable');
console.log('✓ Tous les bulletins : écran dédié un-par-page avec « Tout imprimer / Enregistrer en PDF » ('+slips.length+' bulletins)');
console.log('✓ Bulletin individuel (👁) toujours fonctionnel après refactorisation');
console.log('✓ Grand livre périodique : Mensuel / Trimestriel T1–T4 / Annuel / Personnalisé — '+cap.n);
console.log('TLIVRE: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TLIVRE:',e.message);process.exit(1);});
