;/* TEST : employés modifiables + archivage/désarchivage + absences + bulletin pro + remise à zéro */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const per=todayISO().slice(0,7);

/* 1. modification complète d un employé (formulaire) */
let cap=null;const _m=modal;modal=(t,b)=>{cap=b;};
const e1=(await DB.list('employees')).filter(e=>e.active!==false)[0];
await App.empForm(e1.id);
if(!cap||!cap.includes('Salaire de base')||!cap.includes('Zone (exonération'))throw new Error('formulaire édition absent');
modal=_m;
$('#main').innerHTML='<input id="eN"><input id="eP"><input id="eT"><input id="eH"><input id="eS"><input id="eB"><input id="eTr"><input id="eHo"><input id="eSh"><input id="eZ">';
$('#eN').value=e1.name;$('#eP').value='Chef atelier';$('#eT').value='0700000000';$('#eH').value=e1.hire_date||todayISO();$('#eS').value='monthly';$('#eB').value='200000';$('#eTr').value='25000';$('#eHo').value='0';$('#eSh').value='2';$('#eZ').value='bouake';
await App.empSave(e1.id);
const e1b=(await DB.list('employees',{eq:{id:e1.id}}))[0];
if(e1b.position!=='Chef atelier'||Number(e1b.base_salary)!==200000||e1b.zone!=='bouake')throw new Error('modification employé non appliquée');
console.log('✓ Employé : toutes les données modifiables (poste, salaire, transport, zone…)');

/* 2. archivage → section archivés → désarchivage */
const _cf=confirmBox;confirmBox=(t,m,l,fn)=>{Promise.resolve(fn()).catch(()=>{});};
await App.empArchive(e1.id);
await new Promise(r=>setTimeout(r,30));
let e1c=(await DB.list('employees',{eq:{id:e1.id}}))[0];
if(e1c.active!==false)throw new Error('archive immédiate attendue');
S.route='paie';S.tab={paie:'emp'};location.hash='#/paie';await render();
const h2=$('#main').innerHTML;
if(!h2.includes('Employés archivés (1)'))throw new Error('section archivés absente');
if(!h2.includes('Désarchiver'))throw new Error('bouton désarchiver absent');
await App.empUnarchive(e1.id);
await new Promise(r=>setTimeout(r,30));
e1c=(await DB.list('employees',{eq:{id:e1.id}}))[0];
if(e1c.active===false)throw new Error('désarchivage non appliqué');
await render();
if($('#main').innerHTML.includes('Employés archivés (1)'))throw new Error('section archivés devrait être vide');
console.log('✓ Archivage : section « Employés archivés » + désarchivage, historique conservé');

/* 3. absences : formule base ÷ 30 par jour */
const sl=computeSlip(e1c,{absence_days:2});
if(Math.abs(sl.abs_ded-Math.round(200000*2/30))>1)throw new Error('retenue absences : attendu '+Math.round(200000*2/30)+', eu '+sl.abs_ded);
console.log('✓ Absences : 2 jours sur base 200 000 F → retenue '+sl.abs_ded+' F (base ÷ 30 × jours)');

/* 4. paie complète + bulletin professionnel */
S.tab={paie:'run'};S.payPeriod=per;await render();
if(!$('#main').innerHTML.includes('Absences'))throw new Error('aide absences absente de la paie du mois');
await App.runGen(per);
const run=(await DB.list('pay_runs')).filter(r=>r.period===per).slice(-1)[0];
const s1=(await DB.list('pay_slips',{eq:{run_id:run.id}})).filter(x=>x.employee_id===e1.id)[0];
if(!s1)throw new Error('bulletin non généré');
if(Number(s1.transport_exo)!==24000)throw new Error('exo Bouaké attendue 24000, eue '+s1.transport_exo);
if(Number(s1.base)!==200000)throw new Error('base ne doit contenir aucune prime ('+s1.base+')');
await App.slipView(s1.id);
await new Promise(r=>setTimeout(r,20));
const hb=$('#main').innerHTML;
for(const m of ['BULLETIN DE PAIE','NET À PAYER','GAINS','RETENUES','CHARGES PATRONALES','COÛT TOTAL EMPLOYEUR','exonérés d','Imprimer / PDF','Signature employé'])if(!hb.includes(m))throw new Error('bulletin incomplet : '+m+' manquant');
console.log('✓ Bulletin professionnel : en-tête société, gains détaillés (base sans primes, exo zone), retenues, charges patronales, signatures, impression');

/* 5. remise à zéro de la base */
CFG={mode:'supabase',url:'https://x.supabase.co',anon:'k'};
S.route='parametres';location.hash='#/parametres';await render();
if(!$('#main').innerHTML.includes('Vider la base en ligne'))throw new Error('bouton vidage base absent');
CFG={mode:'local',url:'',anon:''};
const n1=(await DB.list('sales')).length,n2=(await DB.list('productions')).length;
if(!n1||!n2)throw new Error('données attendues avant vidage');
let ok=false;let wipeP=null;confirmBox=(t,m,l,fn)=>{ok=true;wipeP=fn();};
await App.dbWipe();await wipeP;await new Promise(r=>setTimeout(r,50));
confirmBox=(t,m,l,fn)=>{fn();};
if(!ok)throw new Error('dbWipe non exécutable');
if((await DB.list('sales')).length|| (await DB.list('productions')).length||((await DB.list('employees')).filter(e=>true)).length)throw new Error('base non vidée');
const st=(await DB.list('settings')).length;
console.log('✓ Remise à zéro : toutes les données supprimées'+(st?' (réglages conservés : '+st+')':''));
console.log('TEMPR: 6/6 OK');
})().catch(e=>{console.error('ÉCHEC TEMPR:',e.message);process.exit(1);});
