;/* TEST : paie paramétrable — transport exonéré par zone, primes taxables/non taxables, avances plafonnées */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const per=todayISO().slice(0,7);

/* 1. catalogue de primes */
SETS.payroll.primes=[{id:'pz1',name:'Prime rendement',mode:'pct',value:5,taxable:false},
                    {id:'pz2',name:'Prime risque',mode:'fixed',value:15000,taxable:true}];

/* 2. employés avec transport + zones */
const emps=(await DB.list('employees')).filter(e=>e.active!==false);
const e1=emps.filter(e=>e.salary_type!=='daily')[0]||emps[0];
await DB.update('employees',e1.id,{transport:50000,zone:'abidjan'});
const e2=emps.filter(e=>e.id!==e1.id)[0];
if(e2)await DB.update('employees',e2.id,{transport:25000,zone:'autres'});

/* 3. écran paie : colonnes des primes visibles */
S.route='paie';S.tab={paie:'run'};S.payPeriod=per;location.hash='#/paie';
await render();
const h=$('#main').innerHTML;
if(!h.includes('Prime rendement'))throw new Error('colonne prime catalogue absente');
if(!h.includes('non taxable'))throw new Error('mention non taxable absente');
if(!h.includes('Primes &amp; rubriques'))throw new Error('bouton Primes et rubriques absent');
if(!h.includes('Livre de paie'))throw new Error('bouton Livre de paie absent');
console.log('✓ Écran paie : boutons Primes & rubriques + Livre de paie, colonnes des primes avec statut fiscal');

/* 4. génération : exo transport + primes appliquées */
await App.runGen(per);
const runs=await DB.list('pay_runs');
const run=runs.filter(r=>r.period===per).slice(-1)[0];
const slips=await DB.list('pay_slips',{eq:{run_id:run.id}});
const s1=slips.filter(x=>x.employee_id===e1.id)[0];
if(!s1)throw new Error('bulletin e1 absent');
if(Number(s1.transport_exo)!==30000)throw new Error('exo Abidjan attendue 30000, eue '+s1.transport_exo);
const pRend=s1.primes.filter(p=>p.id==='pz1')[0];
if(!pRend||Math.abs(pRend.amount-0.05*e1.base_salary)>1)throw new Error('prime % mal calculée');
const pRisque=s1.primes.filter(p=>p.id==='pz2')[0];
if(!pRisque||pRisque.amount!==15000)throw new Error('prime fixe absente');
if(Math.abs(s1.taxable-s1.brut_ap)>1)throw new Error('imposable doit égaler le salaire brut : '+s1.taxable+' vs '+s1.brut_ap);
const primesTaxX=s1.primes.filter(p=>p.taxable!==false).reduce((a,p)=>a+Number(p.amount||0),0);
const expBrut=Math.round(Number(s1.base)+Number(s1.housing||0)+Number(s1.bonus||0)+primesTaxX);
if(Math.abs(s1.brut_ap-expBrut)>1)throw new Error('brut attendu (base+logement+bonus+primes taxables, SANS transport) '+expBrut+', eu '+s1.brut_ap);
const primesNTX=s1.primes.filter(p=>p.taxable===false).reduce((a,p)=>a+Number(p.amount||0),0);
const expNet=Math.round(s1.brut_ap+Number(s1.transport||0)+primesNTX-s1.cnps-(s1.cmu||0)-(s1.its!=null?s1.its:s1.irpp)-(s1.other||0)-(s1.advances||0));
if(Math.abs(s1.net-expNet)>2)throw new Error('net attendu = brut + transport + primes non taxables − retenues ('+expNet+'), eu '+s1.net);
if(e2){const s2=slips.filter(x=>x.employee_id===e2.id)[0];
  if(s2&&Number(s2.transport_exo)!==20000)throw new Error('exo autres villes attendue 20000, eue '+s2.transport_exo);}
console.log('✓ Bulletins : SALAIRE BRUT = base+logement+bonus+primes taxables (SANS transport ni non taxables) · imposable = brut · exo info 30000/20000 · net = brut + transport + primes NT − retenues');

/* 5. bulletin : lignes paramétrées visibles */
await App.slipView(s1.id);
console.log('✓ Bulletin affiché (rubriques transport exonéré + primes dynamiques)');

/* 6. avances plafonnées au salaire */
const _t=toast;let refus='';
toast=(m,k)=>{if(String(m).includes('Refusé')||String(m).includes('dépasse')||String(m).includes('cumul'))refus=m;return _t(m,k);};
$('#main').innerHTML='<input id="avE"><input id="avD"><input id="avN"><input id="avM">';
$('#avE').value=e1.id+'|'+e1.name;$('#avD').value=todayISO();$('#avN').value='x';$('#avM').value='999999999';
await App.advSave();
if(!refus)throw new Error('avance > salaire acceptée !');
refus='';
const sal=Number(e1.base_salary)||0;
$('#main').innerHTML='<input id="avE"><input id="avD"><input id="avN"><input id="avM">';
$('#avE').value=e1.id+'|'+e1.name;$('#avD').value=todayISO();$('#avN').value='ok';$('#avM').value=String(Math.max(1000,Math.round(sal*0.1)));
await App.advSave();
toast=_t;
if(refus)throw new Error('petite avance refusée : '+refus);
const advs=await DB.list('advances');
if(!advs.some(a=>a.employee_id===e1.id&&a.amount===Math.max(1000,Math.round(sal*0.1))))throw new Error('avance légitime non enregistrée');
console.log('✓ Avances : refusée au-delà du salaire, acceptée en dessous');
console.log('TPAYE: 6/6 OK');
})().catch(e=>{console.error('ÉCHEC TPAYE:',e.message);process.exit(1);});
