;(async()=>{
await loadSettings();
await seedDemo();
S.user={name:'Test',role:'manager'};
const per=todayISO().slice(0,7);
const $id=id=>global.document.getElementById(id.replace(/^#/,''));

/* ---------- 1. rôles ---------- */
if(!roleAllowed('paie')||!roleAllowed('parametres'))throw new Error('manager doit tout voir');
S.user={name:'Awa',role:'caissier'};
if(!roleAllowed('caisse')||roleAllowed('paie')||roleAllowed('parametres')||roleAllowed('exploitation')||roleAllowed('ventes'))throw new Error('droits caissier');
if(roleHome()!=='dashboard')throw new Error('roleHome');
S.user={name:'C',role:'commercial'};
if(!roleAllowed('ventes')||!roleAllowed('impayes')||roleAllowed('caisse')||roleAllowed('achats'))throw new Error('droits commercial');
S.user={name:'P',role:'production'};
if(!roleAllowed('production')||!roleAllowed('emballages')||!roleAllowed('immobilisations')||roleAllowed('paie'))throw new Error('droits production');
S.user={name:'Awa',role:'caissier'};
const navCaisse=topHtml();
if(navCaisse.includes('#/paie')||navCaisse.includes('#/parametres'))throw new Error('nav caissier doit masquer paie/réglages');
if(!navCaisse.includes('#/caisse'))throw new Error('nav caissier doit montrer caisse');
console.log('✓ Rôles : caissier/commercial/production restreints, manager voit tout, nav filtrée');

/* redirection vers l'écran autorisé */
S.user={name:'Awa',role:'caissier'};
location.hash='#/exploitation';
await render();
const mainHtml1=$id('main').innerHTML;
if(mainHtml1.includes('Comparatif 12 mois'))throw new Error('caissier ne doit pas voir exploitation');
S.user={name:'Test',role:'manager'};
console.log('✓ Redirection : caissier demandant exploitation → route '+S.route+' (dashboard)');
/* note : le test précédent vérifie que render() a redirigé (pas d\'écran exploitation) */

/* ---------- 2. personnel détaillé (paie clôturée) ---------- */
const base=(await computeIncome(per));
await DB.insert('pay_runs',{period:per,status:'closed',created_at:nowISO(),total_net:344040});
const run=(await DB.list('pay_runs',{eq:{period:per}}))[0];
await DB.insert('pay_slips',{run_id:run.id,run_period:per,employee_id:'e1',employee_name:'Kadhi',position:'Torréfacteur',
  brut_ap:420000,cnps:26460,cmu:500,its:49000,net:344040,bonus:20000,advances:0,
  cnps_employer:47040,fdfp:6720,cout_employeur:473760,paid:true});
const cashNow=(await DB.list('cash_entries')).filter(e=>e.date>=per+'-01'&&e.date<monthAdd(per,1)+'-01'&&e.type==='out'&&e.imputable!==false);
const salCash=cashNow.filter(e=>e.category==='salaires').reduce((a,e)=>a+Number(e.amount||0),0);
const persCash=cashNow.filter(e=>acctGroupOf(e.category)==='personnel').reduce((a,e)=>a+Number(e.amount||0),0);
const expExtra=Math.max(0,persCash-salCash);
const inc2=await computeIncome(per);
const d=inc2.personnel.det;
if(!d)throw new Error('det absent');
if(d.cnpsS!==26460||d.cmuS!==500||d.itsS!==49000||d.net!==344040)throw new Error('retenues détail '+JSON.stringify(d));
if(d.primes!==20000)throw new Error('primes '+d.primes);
if(inc2.personnel.brut!==420000||inc2.personnel.pat!==47040||inc2.personnel.fdfp!==6720)throw new Error('masses paie');
if(inc2.personnel.extra!==expExtra)throw new Error('extra ' +inc2.personnel.extra+' vs '+expExtra);
if(inc2.personnel.total!==473760+expExtra)throw new Error('total perso '+inc2.personnel.total);
console.log('✓ Personnel détaillé : CNPS sal. '+d.cnpsS+' · CMU '+d.cmuS+' · ITS sal. '+d.itsS+' · net '+d.net+' · primes '+d.primes+' · CNPS pat. '+inc2.personnel.pat+' · FDFP pat. '+inc2.personnel.fdfp);

/* écran + Excel contiennent les lignes */
location.hash='#/exploitation';S.user={name:'Test',role:'manager'};
await scExploitation();
const xp=$id('main').innerHTML;
['Salaires et traitements bruts','CNPS salarié (retenue)','CMU salarié','ITS salarié (retenue)','Salaires nets versés','CNPS patronal','FDFP patronal','dont primes et bonus'].forEach(t=>{if(!xp.includes(t))throw new Error('écran perso manque '+t);});
const rows=incomeRows(inc2).map(r=>r[0]).join(' | ');
['Retenue CNPS salarié','Retenue CMU salarié','Retenue ITS salarié','Salaires nets versés','primes et bonus','CNPS patronal','FDFP patronal'].forEach(t=>{if(!rows.includes(t))throw new Error('Excel perso manque '+t);});
console.log('✓ Personnel détaillé affiché (écran + feuille Excel)');

/* ---------- 3. impôts détaillés patente/TEE/ITS ---------- */
async function addOut(cat,label,amt,date){await DB.insert('cash_entries',{date:date||todayISO(),type:'out',account:'cash',category:cat,label:label,amount:amt,imputable:true,created_at:nowISO()});}
await addOut('impots_taxes','Patente annuelle',10000);
await addOut('impots_taxes','Taxe TEE Yopougon',20000);
await addOut('impots_taxes','ITS à payer',30000);
await addOut('impots_taxes','Droit fiscal divers',5000);
const inc3=await computeIncome(per);
const lbls=inc3.impotsRows.map(r=>r.label);
const f=l=>inc3.impotsRows.filter(r=>r.label.indexOf(l)===0).reduce((a,r)=>a+r.amount,0);
if(f('Patente')!==10000)throw new Error('patente '+f('Patente')); /* seule mon entrée test (seed sans patente) */
if(f('TEE')!==20000)throw new Error('TEE '+f('TEE'));
if(f('ITS (impôt')!==30000)throw new Error('ITS '+f('ITS (impôt'));
const sumRows=inc3.impotsRows.reduce((a,r)=>a+r.amount,0);
if(sumRows!==inc3.impotsTot)throw new Error('somme impots '+sumRows+' vs '+inc3.impotsTot);
console.log('✓ Impôts détaillés : Patente '+f('Patente')+' · TEE '+f('TEE')+' · ITS '+f('ITS (impôt')+' · total '+inc3.impotsTot);

/* ---------- 4. lignes créables ---------- */
await setSetting('extra_lines',[
  {id:'xl1',section:'impots',period:per,label:'ITS patronal',amount:50000},
  {id:'xl2',section:'personnel',period:per,label:'Prime exceptionnelle',amount:30000}]);
const inc4=await computeIncome(per);
if(inc4.impotsTot!==inc3.impotsTot+50000)throw new Error('custom impots '+inc4.impotsTot);
const cImp=inc4.impotsRows.find(r=>r.id==='xl1');
if(!cImp||cImp.custom!==true||cImp.amount!==50000)throw new Error('row custom impots');
if(inc4.personnel.total!==inc3.personnel.total+30000)throw new Error('custom perso '+inc4.personnel.total);
if(!inc4.personnel.custom.some(x=>x.id==='xl2'))throw new Error('row custom perso');
const rows4=incomeRows(inc4).map(r=>r[0]).join(' | ');
if(!rows4.includes('ITS patronal  (ligne créée)')||!rows4.includes('Prime exceptionnelle  (ligne créée)'))throw new Error('Excel custom');
await App.xlDel('xl1');
const inc5=await computeIncome(per);
if(inc5.impotsTot!==inc3.impotsTot)throw new Error('suppression ligne impots');
if(inc5.personnel.total!==inc3.personnel.total+30000)throw new Error('xl2 doit rester');
console.log('✓ Lignes créables : ITS patronal +50 000 (impôts), prime +30 000 (personnel), suppression OK, marquées « ligne créée » dans Excel');

/* ---------- 5. comparatif 12 mois ---------- */
location.hash='#/exploitation';
await scExploitation();
const xp2=$id('main').innerHTML;
if(!xp2.includes('Comparatif 12 mois'))throw new Error('bloc 12 mois absent');
if(!xp2.includes(monthLabel(monthAdd(per,-11))))throw new Error('12e mois absent');
if(!xp2.includes('←'))throw new Error('mois courant non marqué');
const blob=await monthlyWorkbook(inc4);
const xlsxStr=(blob.parts||[]).map(p=>typeof p==='string'?p:Buffer.from(p.buffer||p).toString('utf8')).join('');
if(!xlsxStr.includes('12 mois')||!xlsxStr.includes('COMPARATIF 12 MOIS'))throw new Error('feuille 12 mois absente');
if(!xlsxStr.includes('Retenue CNPS salarié')||!xlsxStr.includes('Patente (taxe professionnelle)'))throw new Error('détail absent du classeur');
const html=await monthlyHtml(inc4);
if(!html.includes('12 derniers mois'))throw new Error('email 12 mois');
console.log('✓ Comparatif 12 mois : écran (graphique + tableau, mois courant marqué), feuille Excel « 12 mois », tableau dans l\'email');

/* ---------- 6. comptes restreints : création + login PIN ---------- */
location.hash='#/parametres';
await scParametres();
if(!$id('main').innerHTML.includes('Comptes à accès restreint'))throw new Error('carte comptes absente');
const elN=$id('uName');elN.value='Binta Diarra';
const elR=$id('uRole');elR.value='production';
const elP=$id('uPin');elP.value='1357';
await App.userAdd();
if(!(SETS.users||[]).some(u=>u.name==='Binta Diarra'&&u.role==='production'&&u.pin==='1357'))throw new Error('userAdd');
location.hash='#/login';
await scLogin();
const elPin=$id('lgPin');elPin.value='1357';
await App.loginLocal();
if(!S.user||S.user.role!=='production'||S.user.name!=='Binta Diarra')throw new Error('loginLocal profil '+JSON.stringify(S.user));
elPin.value='1234';
await App.loginLocal();
if(S.user.role!=='manager')throw new Error('PIN gestionnaire');
await App.userDel(0);
console.log('✓ Comptes restreints : création (Binta → chef production), connexion par PIN dédié, PIN gestionnaire = manager');

/* ---------- 7. les 15 écrans restent OK + régressions ---------- */
const routes=['dashboard','validation','achats','production','produits','ventes','commerciaux','impayes','caisse','paie','exports','parametres','emballages','exploitation','immobilisations'];
for(const r of routes){location.hash='#/'+r;S.route=r;try{await render();}catch(e){throw new Error('écran '+r+' : '+e.message);}}
const st=await computeStats();
if(st.greenStock<0)throw new Error('stock vert');
console.log('✓ 15 écrans rendus sans erreur (manager) · régressions stocks OK');
console.log('');
console.log('=== TOUS LES TESTS v4 PASSENT ===');
})().catch(e=>{console.error('ECHEC:',e.message,(e.stack||'').split(String.fromCharCode(10))[1]);process.exit(1);});
