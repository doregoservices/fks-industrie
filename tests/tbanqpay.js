;/* TBANQPAY : la BANQUE est un mode de paiement dans tout le système — vente, achat, paie, emballages, avances, opérations libres */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const per=monthISO();
/* 0 · soldes de départ */
const cash0=await accBalance('cash'),momo0=await accBalance('momo'),bank0=await accBalance('bank');
/* 1 · VENTE payée par banque → journal banque, caisse intacte */
const prod=(await DB.list('products'))[0];
const sale=await createSale({date:per+'-12',agent_name:'Test',pay_mode:'bank',client:'',total:30000,lines:[{product_id:prod.id,name:prod.name,qty:10,price:3000}],source:'admin'});
const se=(await DB.list('cash_entries')).filter(e=>e.ref==='sale:'+sale.id)[0];
if(!se||se.account!=='bank'||se.category!=='banque'||se.imputable!==false)throw new Error('entrée banque de vente incorrecte : '+JSON.stringify(se));
if(Math.abs(Number(se.amount)-30000)>0.01)throw new Error('montant banque attendu 30000');
if(await accBalance('cash')!==cash0||await accBalance('momo')!==momo0)throw new Error('la vente banque ne doit toucher NI espèces NI MoMo');
if(await accBalance('bank')!==bank0+30000)throw new Error('solde banque attendu +30000');
if(!payPill({pay_mode:'bank'}).includes('Banque'))throw new Error('badge Banque absent (payPill)');
/* 2 · formulaires : l option banque est proposée partout */
if(!String(App.venteForm).includes(String.fromCharCode(112,97,121,77,111,100,101,40,116,104,105,115,44,92,39,98,97,110,107,92,39,41)))throw new Error('bouton Banque absent du formulaire de vente');
if(!String(formSales).includes(String.fromCharCode(102,80,97,121,40,116,104,105,115,44,92,39,98,97,110,107,92,39,41)))throw new Error('bouton Banque absent du formulaire terrain');
if(!String(App.achatForm).includes('value="bank"'))throw new Error('option Banque absente du formulaire d achat');
if(!String(App.pkInForm).includes('Oui — 🏦 banque'))throw new Error('option Banque absente des emballages');
if(!String(App.advForm).includes('id="avA"'))throw new Error('moyen de paiement absent des avances');
if(!String(App.runClose).includes('value="bank"'))throw new Error('option Banque absente de la clôture de paie');
/* 3 · PAIE clôturée par banque */
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};S.payPeriod=per;await render();
await App.runGen(per);
const run=(await DB.list('pay_runs')).filter(r=>r.period===per)[0];
App.runClose(run.id);
$('#pcA').value='bank';$('#pcD').value=per+'-28';
await App.runCloseGo(run.id);
const run2=(await DB.list('pay_runs',{eq:{id:run.id}}))[0];
if(run2.account!=='bank'||run2.status!=='closed')throw new Error('paie non clôturée sur banque : '+JSON.stringify(run2));
const pe=(await DB.list('cash_entries')).filter(e=>e.ref==='payrun:'+run.id)[0];
if(!pe||pe.account!=='bank'||pe.category!=='banque')throw new Error('écriture paie banque incorrecte : '+JSON.stringify(pe));
if(await accBalance('cash')!==cash0)throw new Error('la paie banque ne doit pas toucher les espèces');
/* 4 · AVANCE versée par banque */
App.advForm();
const emps=(await DB.list('employees')).filter(e=>e.active!==false);
$('#avE').value=emps[0].id+'|'+emps[0].name;$('#avD').value=per+'-10';$('#avM').value='5000';$('#avN').value='test';$('#avA').value='bank';
await App.advSave();
const ae=(await DB.list('cash_entries')).filter(e=>String(e.ref||'').indexOf('advance:')===0&&e.account==='bank')[0];
if(!ae||ae.category!=='banque')throw new Error('écriture avance banque incorrecte : '+JSON.stringify(ae));
/* 5 · opération bancaire libre (versement) */
App.bankOpForm();
$('#bkD').value=per+'-05';$('#bkT').value='in';$('#bkL').value='Versement test';$('#bkM').value='100000';
await App.bankOpSave();
const bo=(await DB.list('cash_entries')).filter(e=>e.label==='Versement test')[0];
if(!bo||bo.account!=='bank'||bo.type!=='in'||bo.imputable!==false)throw new Error('opération bancaire libre incorrecte : '+JSON.stringify(bo));
/* 6 · l écran Banque rend le bouton d écriture */
const settle=async()=>{await new Promise(r=>setTimeout(r,20));};
location.hash='#/banque';S.route='banque';await render();await settle();await render();
if(!$('#main').innerHTML.includes('Écrire une opération'))throw new Error('bouton + Écrire une opération absent de l écran Banque');
console.log('✓ VENTE par banque : journal banque (à part), espèces et MoMo intactes, badge 🏦 Banque');
console.log('✓ ACHAT, EMBALLAGES, AVANCES, PAIE (clôture), IMPAYÉS (déjà en place) : l option 🏦 Banque partout');
console.log('✓ Paiements banque : non imputables (exploitation intacte), jamais bloqués par le solde caisse');
console.log('✓ Écran Banque : + Écrire une opération (versement/retrait) en plus de l Excel');
console.log('TBANQPAY: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TBANQPAY:',e.message);process.exit(1);});
