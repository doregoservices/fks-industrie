;/* TEST FEATURE : transformation (machines) — torréfaction → MACHINES → conditionnement */
;(async()=>{
await loadSettings();
await seedDemo();
S.user={name:'test'};
const per=todayISO().slice(0,7);
const eq=(a,b,m)=>{if(Math.abs(a-b)>0.01)throw new Error(m+': '+a+' ≠ '+b);};

/* ===== 1. SEED : types + transformations ===== */
const ctypes=await DB.list('coffee_types');
if(ctypes.length!==3)throw new Error('types démo: '+ctypes.length);
const prods=await DB.list('products');
if(prods.some(p=>!(p.recipes||[]).length))throw new Error('recettes produits manquantes');
if(prods.filter(p=>p.name==='Café moulu 1 kg')[0].recipes[0].qty!==1)throw new Error('recette 1 kg');
if(prods.filter(p=>p.name==='Café moulu 500 g')[0].recipes[0].qty!==0.5)throw new Error('recette 500 g');
const transf=await DB.list('transformations');
if(transf.length!==2)throw new Error('transformations démo: '+transf.length);
const tUsed=transf.reduce((a,t)=>a+Number(t.roasted_used),0);
const tOut=transf.reduce((a,t)=>(t.lines||[]).reduce((x,l)=>x+Number(l.qty),0)+a,0);
eq(tUsed,520,'torréfié consommé machines');
eq(tOut,514,'kg obtenus machines');
console.log('✓ Seed : 3 types, recettes produits (1 kg→1, 500 g→0.5), 2 transformations 280→276 et 240→238 kg');

/* ===== 2. STOCKS : vert / torréfié / types ===== */
let st=await computeStats();
eq(st.greenStock,2000-800,'stock vert');           /* seed : 2000 kg achetés, 800 torréfiés */
eq(st.roastedStock,667-520,'stock torréfié après machines'); /* 418+249−280−240 */
eq(Math.round(st.transfYield*10),988,'rendement machines %');
const byName=n=>st.types.filter(t=>t.name===n)[0];
eq(byName('Moulu premium').stock,60,'stock premium');
eq(byName('Moulu standard').stock,70,'stock standard');
eq(byName('Grains (non moulu)').stock,54,'stock grains');
console.log('✓ Stocks : torréfié 147 kg (520 déduits par machines) · premium 60 · standard 70 · grains 54 kg');

/* ===== 3. createProduction : déduction type_lines depuis recettes ===== */
const p1kg=prods.filter(p=>p.name==='Café moulu 1 kg')[0];
const p500=prods.filter(p=>p.name==='Café moulu 500 g')[0];
await createProduction({date:todayISO(),roasted_used:0,lines:[
  {product_id:p1kg.id,name:p1kg.name,qty:10,price:8000},
  {product_id:p500.id,name:p500.name,qty:4,price:4500}],operator:'Test',note:'',source:'admin'});
const lastProd=(await DB.list('productions')).sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||'')).slice(-1)[0];
if(!lastProd.type_lines||!lastProd.type_lines.length)throw new Error('type_lines non déduits');
const tl={};lastProd.type_lines.forEach(l=>tl[l.name]=l.qty);
eq(tl['Moulu premium'],10,'auto premium');
eq(tl['Moulu standard'],2,'auto standard (0.5×4)');
st=await computeStats();
eq(byName('Moulu premium').stock,50,'stock premium après cond.');
eq(byName('Moulu standard').stock,68,'stock standard après cond.');
console.log('✓ Conditionnement sans pesée : 10×1 kg + 4×500 g → 10 kg premium + 2 kg standard consommés automatiquement');

/* ===== 4. EXPLOITATION : coût semi-fini + variation ===== */
let inc=await computeIncome(per);
if(!(inc.semiCost>0))throw new Error('coût semi-fini: '+inc.semiCost);
const semiNat=inc.transfUsed>0?inc.semiCost*inc.transfMade:0;
eq(inc.produitsTot,inc.ventes+inc.dPF+inc.dSemi,'total produits avec semi-finis');
if(inc.dSemi===undefined||inc.typeRows.length!==3)throw new Error('typeRows manquants');
const sfTot=inc.typeRows.reduce((a,r)=>a+r.sf,0);
eq(sfTot,50+68+54,'SF types exploitation');
console.log('✓ Exploitation : coût semi-fini '+money(inc.semiCost)+'/kg (valorisé au CMP vert) · variation semi-finis '+money(inc.dSemi)+' dans les produits');

/* ===== 5. FLUX TERRAIN : transformation via lien → pending → apply ===== */
const before=(await DB.list('transformations')).length;
const tprem=ctypes.filter(t=>t.name==='Moulu premium')[0];
const res=await formSend('transformation','Machine 1',{date:todayISO(),roasted_used:20,
  lines:[{type_id:tprem.id,name:'Moulu premium',qty:19}],operator:'Machine 1'});
if(!res.ok)throw new Error('formSend');
let pend=(await DB.list('pending_entries')).filter(p=>p.status==='pending').slice(-1)[0];
if(pend.source_type!=='transformation')throw new Error('pending type');
await applyPending(pend);
if((await DB.list('transformations')).length!==before+1)throw new Error('applyPending transformation');
st=await computeStats();
eq(st.roastedStock,127,'stock torréfié après transf terrain');
eq(byName('Moulu premium').stock,69,'premium après transf terrain');
console.log('✓ Lien terrain : onglet Machines → pending → validation → stock torréfié 127 kg, premium 69 kg');

/* ===== 6. EXPORTS : annexe stocks + feuille Mouv. stocks ===== */
const rows=incomeRows(inc);
const semiRow=rows.filter(r=>r[0]==='Café transformé — semi-finis (kg)')[0];
if(!semiRow||semiRow[1]!==0||semiRow[2]!==172)throw new Error('annexe semi-finis: '+JSON.stringify(semiRow));
/* SI mois = SF mois (tout est arrivé ce mois-ci, achats/transf de ce mois) */
const sheets=monthlySheets(inc);
const mv=sheets.filter(x=>x.name==='Mouv. stocks')[0];
const mvTxt=JSON.stringify(mv.rows);
if(!mvTxt.includes('CAFÉ TORRÉFIÉ'))throw new Error('mouv torréfié absent');
if(!mvTxt.includes('CAFÉ TRANSFORMÉ'))throw new Error('mouv types absent');
if(!mvTxt.includes('Moulu premium'))throw new Error('mouv types détail absent');
console.log('✓ Exports : annexe stocks (torréfié SI/SF + semi-finis par type) et feuille « Mouv. stocks » enrichie');

/* ===== 7. AJUSTEMENTS : niveau type ===== */
await DB.insert('adjustments',{date:todayISO(),level:'type',type_id:tprem.id,name:'Moulu premium',qty:5,reason:'recompte'});
st=await computeStats();
eq(byName('Moulu premium').stock,74,'ajustement type');
inc=await computeIncome(per);
eq(inc.typeRows.filter(r=>r.name==='Moulu premium')[0].sf,74,'SF après ajustement');
console.log('✓ Ajustements : niveau « Café transformé » +5 kg → stock 74 kg, répercuté dans l’exploitation');

/* ===== 8. GARDE-FOOUS ===== */
/* sortie machines > entrée : refusée côté UI (App.trSave) — ici on teste la cohérence computeStats si données brutes */
const prod2=await DB.list('productions');
const directRoastUsed=prod2.reduce((a,p)=>a+Number(p.roasted_used||0),0);
eq(directRoastUsed,0,'plus aucune prod directe torréfié (tout passe par les types)');
console.log('✓ Garde-fous : les conditionnements démo ne consomment plus de torréfié en direct');

/* ===== 9. SAUVEGARDE 21 TABLES ===== */
let savedBlob=null;download=(n,b)=>{savedBlob=b;};
await App.expBackup();
const backup=JSON.parse(savedBlob.parts.join(''));
const keys=Object.keys(backup).filter(k=>!['exported_at','mode','company'].includes(k));
if(!backup.coffee_types||!backup.transformations)throw new Error('tables backup absentes');
if(keys.length!==21)throw new Error('nb tables backup: '+keys.length);
if(backup.coffee_types.length!==3||backup.transformations.length!==3)throw new Error('contenu backup types/transf');
console.log('✓ Sauvegarde/restauration : 21 tables, coffee_types ('+backup.coffee_types.length+') et transformations ('+backup.transformations.length+') incluses');

console.log('TTRANS: 9/9 OK');
})().catch(e=>{console.error('ÉCHEC TTRANS:',e.message);process.exit(1);});
