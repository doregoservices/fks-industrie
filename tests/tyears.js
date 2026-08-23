;(async()=>{
await loadSettings();await seedDemo();
let n=0,ok=0;const T=(c,m)=>{n++;if(c)ok++;else console.log('FAIL —',m);};

/* 1. arithmétique des mois, sans limite */
T(monthAdd('2026-01',-1)==='2025-12','janvier −1 → décembre année précédente');
T(monthAdd('2026-08',+11)==='2027-07','+11 mois passe l\'année');
T(monthAdd('1999-01',-24)==='1997-01','années 1990');
T(monthAdd('2099-12',+1)==='2100-01','année 2100');
T(monthAdd('2026-08',-11)==='2025-09','comparatif 12 mois : 11 en arrière');

/* 2. exploitation sur des années lointaines : vide mais sans erreur */
const past=await computeIncome('1998-05');
T(past.ventes===0&&past.resultatNet===0&&past.chargesTot===0,'mois de 1998 : à 0, pas d\'erreur');
const future=await computeIncome('2044-02');
T(future.ventes===0&&!isNaN(future.resultatNet),'mois de 2044 : calculé sans erreur');

/* 3. données réelles sur d'autres années : une vente en 2027 compte dans 2027 */
await DB.insert('sales',{date:'2027-02-10',agent_name:'Awa',lines:[{name:'Sachet 1 kg',qty:10,price:3000,product_id:'p1'}],total:30000,pay_mode:'cash',client:''});
const f27=await computeIncome('2027-02');
T(f27.ventes===30000,'vente de 2027 comptée dans février 2027');
T((await computeIncome('2027-03')).ventes===0,'et pas en mars 2027');

/* 4. amortissement traversant les années (8 ans = 96 mois) */
const asset={id:'multi',name:'Ligne de conditionnement',category:'Machine',cost:9600000,salvage:0,life_years:8,acq_date:'2025-06-15',active:true};
T(assetMonthlyDep(asset,'2025-05')===0,'avant acquisition : 0');
T(assetMonthlyDep(asset,'2025-06')===100000,'1er mois (juin 2025) : 100 000');
T(assetMonthlyDep(asset,'2026-01')===100000,'année suivante : 100 000');
T(assetMonthlyDep(asset,'2029-07')===100000,'4 ans plus tard : 100 000');
T(assetMonthlyDep(asset,'2033-05')===100000,'96e mois (mai 2033) : dernier à 100 000');
T(assetMonthlyDep(asset,'2033-06')===0,'97e mois : 0 (soldé)');
T(assetCumulDep(asset,'2033-12')===9600000,'cumul final = coût total');

/* 5. écran exploitation sur un mois d'une autre année */
S.user={name:'T',role:'manager'};
S.expPeriod='2019-03';
await scExploitation();
const html=global.document.getElementById('main').innerHTML;
T(html.includes('mars 2019'),'écran exploitation rend « mars 2019 »');
T(html.includes('Comparatif 12 mois'),'12 mois présents même en 2019');
S.expPeriod=undefined;

console.log(ok+'/'+n+' tests année PASSÉS'+(ok===n?' — AUCUNE LIMITE D\'ANNÉES ✔':''));
})().catch(e=>{console.error('ECHEC:',e.message);process.exit(1);});
