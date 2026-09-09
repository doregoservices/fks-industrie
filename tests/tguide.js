/* TGUIDE : assistant intégré (étapes dynamiques + prochaine étape) et tiers (comptes dédiés) */
(async()=>{
await loadSettings();S.user={name:'test',role:'manager'};
const $=sel=>document.querySelector(sel);

/* 1. écran Assistant sur base neuve */
S.route='guide';location.hash='#/guide';await render();
let gh=$('#main').innerHTML;
if(!gh.includes('🧭 Assistant'))throw new Error('écran assistant absent');
if(!gh.includes('Prochaine étape'))throw new Error('prochaine étape absente sur base neuve');
if(!gh.includes("Aujourd'hui"))throw new Error('carte Aujourd\'hui absente de l assistant');
if(!gh.includes('Ventes du jour'))throw new Error('KPI ventes du jour absent');
if(!gh.includes('Point 22h'))throw new Error('statut point 22h absent');
if(!gh.includes('Produits et recettes'))throw new Error('étape produits absente');
if(!gh.includes('Routine quotidienne'))throw new Error('aide routine absente');
console.log('✓ Assistant : écran rendu, étapes listées, prochaine étape affichée');

/* 2. les étapes avancent avec les données */
if(!gh.includes('Prochaine étape : ⚙️ Réglages de départ'))throw new Error('base neuve : prochaine étape attendue = réglages (régime non choisi) — '+gh.slice(gh.indexOf('Prochaine'),gh.indexOf('Prochaine')+70));
SETS.fiscal={mode:'TEE',tee:5,bic:25,tva:false};SETS.company=Object.assign({},SETS.company,{name:'FKS Test'});
await render();gh=$('#main').innerHTML;
if(!gh.includes('Prochaine étape : 🧺 Produits et recettes'))throw new Error('après réglages : prochaine étape attendue = produits');
const pg=await DB.insert('products',{name:'Guide 1kg',weight_g:1000,price:8000,unit:'sachet',alert_min:0,active:true,recipes:[{name:'Café',qty:1}],packaging:[]});
await render();gh=$('#main').innerHTML;
if(!gh.includes('Prochaine étape : 🛁 Achat de café vert'))throw new Error('après produit : prochaine étape attendue = achat');
await DB.insert('purchases',{date:todayISO(),supplier:'Coop Guide',qty:100,amount:150000,pay_method:'cash',status:'validated'});
await render();gh=$('#main').innerHTML;
if(!gh.includes('Prochaine étape : 🔥 Torréfaction'))throw new Error('après achat : prochaine étape attendue = torréfaction');
console.log('✓ Étapes dynamiques : produit ✓ puis achat ✓ → prochaine étape = torréfaction');

/* 3. indice sur le tableau de bord */
S.route='dashboard';location.hash='#/dashboard';await render();
const dh=$('#main').innerHTML;
if(!dh.includes('🧭 <b>Assistant</b>'))throw new Error('indice assistant absent du tableau de bord');
if(!dh.includes('Torréfaction'))throw new Error('l indice doit mentionner la prochaine étape (torréfaction)');
console.log('✓ Tableau de bord : indice assistant + prochaine étape (torréfaction)');

/* 4. tiers : compte dédié automatique à l export + carte Réglages */
S.route='parametres';location.hash='#/parametres';await render();
const ph=$('#main').innerHTML;
if(!ph.includes('📇 Tiers'))throw new Error('carte Tiers absente des Réglages');
if(!ph.includes('Client divers'))throw new Error('explication client divers absente');
await DB.insert('adjustments',{date:todayISO(),level:'product',product_id:pg.id,name:pg.name,qty:5,reason:'stock initial test'});
await createSale({date:todayISO(),agent_id:'direct',agent_name:'Vente directe',pay_mode:'credit',client:'Hôtel Guide',total:8000,lines:[{product_id:pg.id,name:pg.name,qty:1,price:8000}],source:'admin'});
let captured=null;const _mk=makeXlsx;makeXlsx=(sheets,fname)=>{captured={sheets,fname}};
await App.expCaisse();makeXlsx=_mk;
const VE=captured.sheets.filter(x=>x.name.indexOf('Ventes')>=0)[0];
if(!VE)throw new Error('feuille VE absente');
if(!VE.rows.some(r=>String(r[2])==='4111001'&&Number(r[4])>0))throw new Error('compte dédié 4111001 (Hôtel Guide) absent de VE');
const AC=captured.sheets.filter(x=>x.name.indexOf('Achats')>=0)[0];
if(!AC)throw new Error('feuille AC absente');
if(!AC.rows.some(r=>String(r[2])==='401101'&&Number(r[5])>0))throw new Error('compte dédié 401101 (Coop Guide) absent de AC');
if(!captured.sheets.some(x=>x.name==='Tiers'))throw new Error('feuille Tiers absente de l export');
const TS=captured.sheets.filter(x=>x.name==='Tiers')[0];
if(!TS.rows.some(r=>String(r[0])==='Hôtel Guide'))throw new Error('Hôtel Guide absent de la feuille Tiers');
console.log('✓ Tiers : Hôtel Guide → 4111001 (VE) · Coop Guide → 401101 (AC) · feuille Tiers présente · carte 📇 dans Réglages');
console.log('TGUIDE: 4/4 OK');
})().catch(e=>{console.error('ÉCHEC TGUIDE:',e.message);process.exit(1);});
