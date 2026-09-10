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
if(!h.includes('Grand livre de paie'))throw new Error('bouton Grand livre de paie absent');
console.log('✓ Écran paie : boutons Primes & rubriques + Grand livre de paie, colonnes des primes avec statut fiscal');

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

/* 5. bulletin : lignes paramétrées visibles + ORDRE des rubriques (cahier des charges boss) */
S.route='bulletin';location.hash='#/bulletin';
await App.slipView(s1.id);
await render();
if(!$('#main').innerHTML.includes('Prime de transport'))throw new Error('transport absent du bulletin');
await DB.update('pay_slips',s1.id,{absence_days:2,abs_ded:Math.round(Number(s1.base)/15)});
await render();
const bh=$('#main').innerHTML;const io=k=>bh.indexOf(k);
if(io('Retenue sur absences')<0)throw new Error('retenue absences absente du bulletin');
if(io('Retenue sur absences')>io('SALAIRE BRUT — imposable'))throw new Error('retenue absences mal placée (doit précéder le brut)');
if(io('Salaire de base')>io('Retenue sur absences'))throw new Error('retenue absences doit suivre le salaire de base');
if(io('ITS net retenu')>io('CNPS retraite'))throw new Error('ITS devrait précéder la CNPS');
if(!(io('TOTAL RETENUES')<io('Rubriques non imposables')&&io('Rubriques non imposables')<io('NET À PAYER')))throw new Error('non imposables : après les retenues, avant le NET');
if(bh.includes('TOTAL GAINS À PAYER')||bh.toLowerCase().includes('gains à percevoir'))throw new Error('ligne « gain à percevoir » encore présente');
if(!bh.includes('NET À PAYER'))throw new Error('NET À PAYER absent');
if(!bh.includes('BULLETIN DE PAIE'))throw new Error('titre absent');
console.log('✓ Bulletin pro : base → retenue absences → BRUT → ITS/CNPS/CMU/avances → non imposables → NET À PAYER (sans ligne « gain à percevoir »)');

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

/* 7. matricule saisi via le formulaire employé + transport au prorata des absences */
await App.empForm(e1.id);
$('#eN').value=e1.name;$('#eP').value=e1.position||'';$('#eT').value=e1.phone||'';$('#eM').value='FKS-077';$('#eH').value=e1.hire_date||'';$('#eS').value=e1.salary_type||'monthly';$('#eB').value=String(e1.base_salary);$('#eTr').value=String(e1.transport);$('#eHo').value=String(e1.housing||0);$('#eSh').value=String(e1.tax_shares||2);$('#eZ').value=e1.zone||'abidjan';
const _t7=toast;let refuse7='';toast=(m,k)=>{if(String(m).includes('déjà utilisé'))refuse7=m;return _t7(m,k);};
await App.empSave(e1.id);
const e1b=(await DB.list('employees',{eq:{id:e1.id}}))[0];
if(e1b.matricule!=='FKS-077')throw new Error('matricule du formulaire non enregistré: '+e1b.matricule);
/* doublon : FKS-002 appartient à Mariam Diallo (seed) */
$('#eM').value='FKS-002';
await App.empSave(e1.id);
toast=_t7;
if(!refuse7)throw new Error('matricule en doublon accepté !');
const cs=computeSlip(e1b,{absence_days:2,ot_hours:0,bonus:0,other:0,advances:0,primes:[]},SETS.payroll);
const trExp=Math.round(Number(e1b.transport)*28/30);
if(cs.transport!==trExp)throw new Error('transport prorata attendu '+trExp+', eu '+cs.transport);
if(cs.transport_full!==Number(e1b.transport))throw new Error('transport_full: '+cs.transport_full);
const exoExp=Math.min(trExp,Number(s1.transport_exo));
if(cs.transport_exo!==exoExp)throw new Error('exo devrait suivre le prorata (plafonnée au seuil): '+cs.transport_exo+' vs '+exoExp);
if(cs.abs_ded!==Math.round(Number(e1b.base_salary)/15))throw new Error('retenue absences: '+cs.abs_ded);
const expN7=Math.round(cs.brut_ap+cs.transport-cs.cnps-cs.cmu-cs.its);
if(Math.abs(cs.net-expN7)>2)throw new Error('net avec prorata: '+cs.net+' vs '+expN7);
S.route='bulletin';location.hash='#/bulletin';S._slipId=s1.id;
await render();
const bh7=$('#main').innerHTML;
if(!bh7.includes('FKS-001'))throw new Error('matricule absent du bulletin');
if(!bh7.includes('prorata 2 j'))throw new Error('mention prorata absente du bulletin');
/* sans absences : transport intégral */
const cs0=computeSlip(e1b,{absence_days:0,primes:[]},SETS.payroll);
if(cs0.transport!==Number(e1b.transport))throw new Error('sans absence le transport doit rester intégral: '+cs0.transport);
console.log('✓ Matricule : saisi via formulaire (FKS-077 ✓), doublon refusé, bulletin = matricule du mois (FKS-001) + transport prorata : '+e1b.transport+' → '+trExp+' F pour 2 j d absence (intégral sans absence)');
/* 8. ITS employeur 1,2 % du salaire brut dans les charges patronales */
const cs8=computeSlip(e1b,{absence_days:0,ot_hours:0,bonus:0,other:0,advances:0,primes:[]},SETS.payroll);
const expIts=Math.round(cs8.brut_ap*1.2/100);
if(cs8.its_er!==expIts)throw new Error('ITS employeur : '+cs8.its_er+' ≠ 1,2 % de '+cs8.brut_ap);
const expCout=Math.round(cs8.brut_ap+cs8.transport+cs8.cnps_employer+cs8.fdfp+cs8.its_er);
if(cs8.cout_employeur!==expCout)throw new Error('coût employeur sans ITS : '+cs8.cout_employeur+' vs '+expCout);
if(!bh7.includes('ITS employeur'))throw new Error('ligne « ITS employeur » absente du bulletin');
if(!bh7.includes('COÛT TOTAL EMPLOYEUR'))throw new Error('coût total employeur absent');
const inc8=await computeIncome(per);
if(Math.abs((inc8.personnel.itsEr||0)-((await DB.list('pay_slips')).filter(x=>x.run_period===per).reduce((a,x)=>a+Number(x.its_er||0),0))>1))throw new Error('ITS employeur exploitation: '+(inc8.personnel.itsEr||0));
console.log('✓ ITS employeur : '+expIts+' F = 1,2 % du brut — bulletin, coût total employeur ('+expCout+' F) et exploitation à jour');
console.log('TPAYE: 8/8 OK');
})().catch(e=>{console.error('ÉCHEC TPAYE:',e.message);process.exit(1);});
