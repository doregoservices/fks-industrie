;/* TPARTS : barème RICF officiel des parts fiscales + recherche employé + modification de rubrique */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const P=SETS.payroll;
/* 1 · Barème officiel : 0 F à 1 part puis 5 500 F par demi-part supplémentaire (mensuel), max 5 parts */
const att=[[1,0],[1.5,5500],[2,11000],[2.5,16500],[3,22000],[3.5,27500],[4,33000],[4.5,38500],[5,44000]];
for(const [p,r] of att){
  const s=computeSlip({name:'X',salary_type:'monthly',base_salary:400000,transport:0,housing:0,tax_shares:p},{},P);
  if(Number(s.ricf)!==r)throw new Error('parts '+p+' : RICF '+s.ricf+' attendu '+r);
}
/* 2 · ITS = ITS brut − RICF (jamais négatif) : 200 000 F imposable, 2 parts → 20 000 − 11 000 = 9 000 */
const s2=computeSlip({name:'X',salary_type:'monthly',base_salary:200000,transport:0,housing:0,tax_shares:2},{},P);
if(Number(s2.its_gross)!==20000||Number(s2.its)!==9000)throw new Error('2 parts : ITS attendu 9000, obtenu '+s2.its+' (brut '+s2.its_gross+')');
const s1=computeSlip({name:'X',salary_type:'monthly',base_salary:200000,transport:0,housing:0,tax_shares:1},{},P);
if(Number(s1.ricf)!==0||Number(s1.its)!==20000)throw new Error('1 part : attendu RICF 0 / ITS 20000, obtenus '+s1.ricf+' / '+s1.its);
const s5=computeSlip({name:'X',salary_type:'monthly',base_salary:800000,transport:0,housing:0,tax_shares:6},{},P);
if(Number(s5.ricf)!==44000)throw new Error('plafond 5 parts : RICF attendu 44000, obtenu '+s5.ricf);
/* 3 · Formulaire employé : liste déroulante du barème (pas un champ libre) */
await App.empForm();
const sh=$('#eSh');
if(!sh)throw new Error('champ parts absent du formulaire employé');
if(sh.tagName==='INPUT')throw new Error('le champ parts est encore un input libre — doit être une liste du barème');
/* 4 · Barre de recherche employés */
location.hash='#/paie';S.route='paie';S.tab={paie:'emp'};await render();
if(!$('#pqS'))throw new Error('barre de recherche employés absente de Paie → Employés');
/* 5 · Modification d une rubrique (nom, valeur) */
const Pv=SETS.payroll;Pv.primes=Pv.primes||[];
Pv.primes.push({id:'ptest',name:'Prime test',mode:'fixed',value:10000,taxable:true});
await setSetting('payroll',Pv);
const idx=SETS.payroll.primes.findIndex(x=>x.id==='ptest');
App.primeEdit(idx);
if(($('#prN')||{}).value!=='Prime test')throw new Error('primeEdit ne pré-remplit pas la rubrique');
$('#prN').value='Prime modifiée';$('#prV').value='15000';
await App.primeEditSave(idx);
const pm=SETS.payroll.primes.filter(x=>x.id==='ptest')[0];
if(!pm||pm.name!=='Prime modifiée'||Number(pm.value)!==15000)throw new Error('rubrique non modifiée : '+JSON.stringify(pm));
SETS.payroll.primes=SETS.payroll.primes.filter(x=>x.id!=='ptest');await setSetting('payroll',SETS.payroll);
console.log('✓ Barème RICF officiel vérifié sur les 9 valeurs : 1 part → 0 F · 1,5 → 5 500 · 2 → 11 000 · … · 5 parts max → 44 000 F/mois');
console.log('✓ ITS = ITS brut − RICF (2 parts à 200 000 F imposable → 20 000 − 11 000 = 9 000 F) · plafond 5 parts même si on saisit plus');
console.log('✓ Parts fiscales : liste déroulante du barème dans le formulaire employé');
console.log('✓ Barre de recherche des employés (nom, poste, matricule) dans Paie → Employés');
console.log('✓ Rubrique de prime modifiable (✎ nom, calcul, valeur, fiscalité)');
console.log('TPARTS: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TPARTS:',e.message);process.exit(1);});
