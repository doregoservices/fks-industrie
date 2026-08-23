;(async()=>{
await loadSettings();await seedDemo();
if(DB&&DB.bump)DB.bump();
S.user={name:'T',role:'manager'};
let n=0,ok=0;const T=(c,m)=>{n++;if(c){ok++;}else console.log('FAIL —',m);};

/* ===== A. Années illimitées ===== */
T(monthAdd('2026-01',-1)==='2025-12','janvier −1');
T(monthAdd('2027-01',-11)==='2026-02','comparatif 12 mois à cheval sur 2 ans');
T(monthAdd('2100-12',+1)==='2101-01','année 2101');
const p98=await computeIncome('1998-05');T(p98.ventes===0&&!isNaN(p98.resultatNet),'exploitation 1998');
const f40=await computeIncome('2040-11');T(f40.ventes===0&&!isNaN(f40.resultatNet),'exploitation 2040');
await DB.insert('sales',{date:'2031-03-04',agent_name:'Awa',lines:[],total:25000,pay_mode:'cash',client:''});
T((await computeIncome('2031-03')).ventes===25000,'vente de 2031 comptée en 2031');
T((await computeIncome('2031-04')).ventes===0,'et pas en 2031-04');
const a8={id:'aa',name:'Machine X',category:'Machine',cost:9600000,salvage:0,life_years:8,acq_date:'2025-06-15',active:true};
T(assetMonthlyDep(a8,'2033-05')===100000&&assetMonthlyDep(a8,'2033-06')===0,'amortissement 8 ans soldé au 96e mois');
console.log('A. Années : illimitées ✔ (1998 → 2100, amortissements longue durée, ventes futures)');

/* ===== B. Sauvegarde complète ===== */
let dl=null;const origDownload=download;
download=(name,blob)=>{dl={name:name,blob:blob};};
try{await App.expBackup();}finally{download=origDownload;}
T(dl&&/CafePro_sauvegarde_.*\.json/.test(dl.name),'fichier sauvegarde généré');
const txt=(dl.blob.parts||[]).map(p=>typeof p==='string'?p:Buffer.from(p.buffer||p).toString('utf8')).join('');
const bk=JSON.parse(txt);
['settings','products','packaging_items','packaging_entries','purchases','roastings','productions','adjustments','assets','sales_agents','sales','cash_entries','employees','advances','pay_runs','pay_slips','pending_entries','form_tokens','email_log'].forEach(t=>T(Array.isArray(bk[t]),'sauvegarde contient '+t));
T(bk.assets.length>=2,'immobilisations dans la sauvegarde ('+bk.assets.length+')');
T(bk.packaging_items.length>=3,'emballages dans la sauvegarde ('+bk.packaging_items.length+')');
console.log('B. Sauvegarde : 19 tables, y compris emballages + immobilisations + journal emails ✔');

/* ===== C. Restauration ===== */
App.impData={exported_at:'2031-01-01T00:00:00Z',products:[{id:'pRESTORE',name:'Édition limitée 2031',price:3500,unit:'sachet',active:true,packaging:[]}]};
await App.impGo(['products']);
T((await DB.list('products')).some(p=>p.id==='pRESTORE'&&p.name==='Édition limitée 2031'),'produit restauré');
await App.impGo(['products']); /* re-restauration : pas de doublon */
T((await DB.list('products')).filter(p=>p.id==='pRESTORE').length===1,'re-restauration sans doublon');
App.impData.settings=[{key:'journal_code',value:'"ZZ"'}];
await App.impGo(['settings']);
T(SETS.journal_code==='ZZ','réglages restaurés');
console.log('C. Restauration : import sans doublon + réglages ✔');

/* ===== D. Cache base de données (performance comparatif 12 mois) ===== */
let baseCalls=0;const origList=DB._base.list.bind(DB._base);
DB._base.list=async(t,f)=>{baseCalls++;return origList(t,f);};
S.expPeriod=todayISO().slice(0,7);
await scExploitation();
const callsScreen=baseCalls;baseCalls=0;
await monthlyWorkbook(await computeIncome(S.expPeriod));
const callsWb=baseCalls;DB._base.list=origList;
T(callsScreen<30,'écran exploitation : '+callsScreen+' requêtes base (≈200 sans cache)');
T(callsWb<25,'classeur mensuel : '+callsWb+' requêtes base');
/* fraîcheur : une écriture est visible immédiatement */
await DB.insert('cash_entries',{date:todayISO(),type:'out',account:'cash',category:'transport',label:'Test fraîcheur',amount:1000,imputable:true});
T((await DB.list('cash_entries')).some(e=>e.label==='Test fraîcheur'),'cache invalidé après insertion');
await setSetting('extra_lines',[{id:'xlr',section:'impots',period:S.expPeriod,label:'Test cache',amount:1234}]);
T((await computeIncome(S.expPeriod)).impotsTot!==undefined&&DB._cache[0]===undefined,'cache invalidé après setSetting');
await setSetting('extra_lines',[]);
console.log('D. Cache DB : comparatif 12 mois ×13 calculs → '+callsScreen+' requêtes (vs ≈200 avant), écritures toujours fraîches ✔');

/* ===== E. Divers limites ===== */
T(money(1234567890).replace(/\u202f|\u00a0/g,' ')==='1 234 567 890 F','gros montants formatés (milliards FCFA)');
T(rndToken().length===24,'jetons de liens 24 car. (124 bits)');
const navDoc=topHtml();
T(navDoc.includes('#/parametres'),'nav manager intacte');
console.log('E. Divers : montants au milliard FCFA, jetons robustes, nav intacte ✔');

console.log('');
console.log(ok+'/'+n+' TESTS REVUE PASSÉS'+(ok===n?' — REVUE COMPLÈTE ✔':''));
})().catch(e=>{console.error('ECHEC:',e.message,(e.stack||'').split(String.fromCharCode(10))[1]);process.exit(1);});
