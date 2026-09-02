;/* TEST : primes par employé + livre verrouillé/multi-mois + caisse sans solde négatif */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const per=todayISO().slice(0,7);
const spy=()=>{const m=[];const _t=toast;toast=(x,k)=>{m.push(String(x));return _t(x,k);};return{m:m,un:()=>{toast=_t;}}};

/* 1. attribution des rubriques PAR EMPLOYÉ */
SETS.payroll.primes=[{id:'pa1',name:'Prime rendement',mode:'pct',value:5,taxable:false},{id:'pa2',name:'Prime risque',mode:'fixed',value:15000,taxable:true}];
const emps=(await DB.list('employees')).filter(e=>e.active!==false);
const e1=emps[0];const e2=emps[1]||emps[0];
await DB.update('employees',e1.id,{primes:['pa1'],transport:50000,zone:'abidjan'});
S.route='paie';S.tab={paie:'run'};S.payPeriod=per;location.hash='#/paie';
await render();
const h=$('#main').innerHTML;
if(!h.includes('Prime rendement'))throw new Error('colonne prime absente de la paie');
/* fiche employé : cases à cocher des rubriques */
let cap=null;const _m=modal;modal=(t,b)=>{cap=b;};
await App.empForm(e1.id);modal=_m;
if(!cap||!cap.includes('Rubriques attribuées'))throw new Error('échec: coches de rubriques absentes de la fiche employé');
if(!cap.includes('checked'))throw new Error('attribution existante non cochée');
/* e1 : zone Abidjan visible dans la liste employés */
S.tab={paie:'emp'};await render();
if(!$('#main').innerHTML.includes('Abidjan'))throw new Error('zone absente de la liste employés');
S.tab={paie:'run'};await render();
await App.runGen(per);
const run=(await DB.list('pay_runs')).filter(r=>r.period===per).slice(-1)[0];
const slips=await DB.list('pay_slips',{eq:{run_id:run.id}});
const s1=slips.filter(x=>x.employee_id===e1.id)[0];
const a1=(s1.primes||[]).filter(p=>p.id==='pa1')[0];
const b1=(s1.primes||[]).filter(p=>p.id==='pa2')[0];
if(!a1||!(a1.amount>0))throw new Error('prime attribuée absente');
if(!b1||b1.amount!==0)throw new Error('prime non attribuée devrait être 0 ('+(b1||{}).amount+')');
if(e2!==e1){const s2=slips.filter(x=>x.employee_id===e2.id)[0];const both=(s2.primes||[]).filter(p=>p.amount>0).length;
  if(s2&&e2.primes==null&&both<2)throw new Error('employé sans coches devrait hériter de toutes');}
console.log('✓ Rubriques attribuées par employé : e1 reçoit uniquement Prime rendement, lhéritage par défaut conservé');

/* 2. livre : IMPOSSIBLE avant génération (période sans bulletins) */
let dlName=null;const _dl=download;download=(n,b)=>{dlName=n;};
$('#main').innerHTML='<input id="lvEnd"><input id="lvN">';
$('#lvEnd').value='2024-12';$('#lvN').value='1';
const sp2=spy();
await App.livreGo();
sp2.un();
if(dlName)throw new Error('livre tiré sans bulletins générés !');
if(!sp2.m.join(' ').includes('Aucun bulletin'))throw new Error('message de blocage absent');
console.log('✓ Livre de paie : refusé tant que les bulletins du mois ne sont pas générés');

/* 3. livre : 1 mois puis 12 mois */
$('#lvEnd').value=per;$('#lvN').value='1';
await App.livreGo();
if(!dlName||dlName.indexOf(per)<0)throw new Error('livre 1 mois non produit');
const n1=dlName;dlName=null;
$('#lvN').value='12';
await App.livreGo();
if(!dlName||dlName.indexOf('_')<0)throw new Error('livre 12 mois (nom de plage) non produit');
download=_dl;
console.log('✓ Livre de paie : 1 mois ('+n1+') et 12 mois ('+dlName+') produits');

/* 4. CAISSE : aucun découvert possible */
const bal=await accBalance('cash');
const nb0=(await DB.list('cash_entries')).length;
$('#main').innerHTML='<input id="oD"><input id="oM"><input id="oA"><input id="oC"><input id="oL">';
$('#oD').value=todayISO();$('#oM').value=String(Math.round(bal+50000));$('#oA').value='cash';$('#oC').value='carburant';$('#oL').value='test';
App._cash='out';
const sp3=spy();
await App.cashSave();
sp3.un();
if((await DB.list('cash_entries')).length!==nb0)throw new Error('dépense au-delà du solde enregistrée !');
if(!sp3.m.join(' ').includes('Refusé'))throw new Error('message de refus caisse absent');
const after=await accBalance('cash');
if(after<-0.005)throw new Error('solde négatif !');
/* une dépense légitime passe */
$('#oM').value=String(Math.max(1,Math.round(bal/2)));
await App.cashSave();
if((await DB.list('cash_entries')).length!==nb0+1)throw new Error('dépense légitime bloquée');
const bal2=await accBalance('cash');
if(bal2<-0.005)throw new Error('solde négatif après dépense légitime');
/* achat café vert payé cash au-delà du solde : refusé */
const np0=(await DB.list('purchases')).length;
$('#main').innerHTML='<input id="aD"><input id="aQ"><input id="aP"><input id="aT"><input id="aS"><input id="aM"><input id="aN">';
$('#aD').value=todayISO();$('#aQ').value='100';$('#aP').value='1500';$('#aT').value=String(Math.round(bal2+900000));$('#aS').value='Test';$('#aM').value='cash';$('#aN').value='';
const sp4=spy();
await App.achatSave();
sp4.un();
if((await DB.list('purchases')).length!==np0)throw new Error('achat au-delà du solde enregistré !');
if(!sp4.m.join(' ').includes('refusé')&&!sp4.m.join(' ').includes('insuffisant'))throw new Error('message refus achat absent');
const bal3=await accBalance('cash');
if(bal3<-0.005)throw new Error('solde négatif après tentative achat');
console.log('✓ Caisse : dépense et achat refusés au-delà du solde ('+money(bal)+' F), aucun solde négatif, dépense légitime acceptée');
/* 5. achat d emballages : refusé sans état partiel */
const pk0=(await DB.list('packaging_entries')).length;
const balPk=await accBalance('cash');
$('#main').innerHTML='<input id="pkI"><input id="pkD"><input id="pkQ"><input id="pkC"><input id="pkR"><input id="pkPay">';
$('#pkI').value='x1|Sachet';$('#pkD').value=todayISO();$('#pkQ').value='100';$('#pkC').value='9999';$('#pkR').value='';$('#pkPay').value='cash';
const sp5=spy();
await App.pkInSave();
sp5.un();
if((await DB.list('packaging_entries')).length!==pk0)throw new Error('entrée emballage orpheline créée malgré solde insuffisant !');
if(!sp5.m.join(' ').includes('Refusé'))throw new Error('refus emballage absent');
console.log('✓ Achat emballages au-delà du solde : refusé, aucune entrée orpheline');
console.log('TCTRL: 7/7 OK');
})().catch(e=>{console.error('ÉCHEC TCTRL:',e.message);process.exit(1);});
