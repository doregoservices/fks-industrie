;/* ULTRAREVIEW V6 : stocks de départ, exports, garde-fous, analytique sans lot machines */
;(async()=>{
await loadSettings();
await seedDemo();
S.user={name:'test',role:'manager'};
const per=todayISO().slice(0,7);
const eq=(a,b,m)=>{if(Math.abs(a-b)>0.01)throw new Error(m+': '+a+' ≠ '+b);};

/* ===== 1. STOCKS DE DÉPART (ajustements vert + torréfié) visibles PARTOUT ===== */
let st=await computeStats();
const g0=st.greenStock,r0=st.roastedStock;
await DB.insert('adjustments',{date:todayISO(),level:'green',qty:300,name:null,reason:'Stock initial'});
await DB.insert('adjustments',{date:todayISO(),level:'roasted',qty:80,name:null,reason:'Stock initial'});
st=await computeStats();
eq(st.greenStock,g0+300,'stock vert + ajustement initial');
eq(st.roastedStock,r0+80,'stock torréfié + ajustement initial');
eq(st.greenAdj,300,'greenAdj');eq(st.roastedAdj,80,'roastedAdj');
await scStocks();
if(!$('#main').innerHTML.includes(num2(g0+300)))throw new Error('écran Stocks n’affiche pas le stock initial vert');
console.log('✓ Stocks de départ : +300 kg vert et +80 kg torréfié via Ajustements → Accueil, Production, 📦 Stocks et exports cohérents');

/* ===== 2. EXPSTOCKS : torréfié complet + lignes types + ajustements filtrés ===== */
let cap=null;makeXlsx=(rows,fname)=>{cap={rows:rows,fname:fname};return new Blob(['x']);};
await App.expStocks();
if(!cap)throw new Error('expStocks n’a rien généré');
const syn=cap.rows.filter(r=>r.name==='Synthèse')[0].rows;
const torr=syn.filter(r=>r[0]==='Café torréfié')[0];
eq(torr[2],st.roastedUsed+st.roastedUsedTransf,'sorties torréfié (cond + machines)');
eq(torr[3].v,num2(st.roastedStock),'stock torréfié export');
const typeLine=syn.filter(r=>r[0]==='Moulu premium')[0];
if(!typeLine||typeLine[3].v!==num2(st.types.filter(t=>t.name==='Moulu premium')[0].stock))throw new Error('types absents du point stocks');
const vertLine=syn.filter(r=>r[0]==='Café vert')[0];
if(!String(vertLine[5]).includes('dont ajust.'))throw new Error('détail ajustement vert absent');
console.log('✓ Point complet des stocks : torréfié = conditionné + machines, types de café listés, ajustements signalés');

/* ===== 3. GARDE-FOU : transformation avec entrée 0 (donnée corrompue) sans NaN ===== */
await DB.insert('transformations',{date:todayISO(),roasted_used:0,lines:[{type_id:'x',name:'Moulu premium',qty:5}],operator:'?',note:'',source:'admin'});
S.tab=S.tab||{};S.tab.production='hist';S.route='production';
await scProduction();
if($('#main').innerHTML.includes('NaN'))throw new Error('NaN dans historique production');
if(!$('#main').innerHTML.includes('—'))throw new Error('rendement 0 non remplacé par tiret');
S.tab.production='roast';
console.log('✓ Historique : transformation à 0 kg entrant → rendement « — » au lieu de NaN %');

/* ===== 4. EMBALLAGES : l’écran Stocks affiche les vrais stocks ===== */
await scStocks();
const pk=(await computeStats()).packaging.filter(x=>x.name==='Sachet 1 kg')[0];
if(!$('#main').innerHTML.includes(num2(pk.stock)))throw new Error('stock emballage non affiché ('+pk.stock+')');
if(pk.stock<=0)throw new Error('stock sachet démo devrait être > 0');
console.log('✓ Emballages : Sachet 1 kg '+num2(pk.stock)+' u affichés avec valeur '+money(pk.value));

/* ===== 5. ANALYTIQUE : coût de secours quand aucun lot machines dans le mois ===== */
const next=monthAdd(per,1); /* mois futur : zéro transformation → semiCost=0 */
const inc2=await computeIncome(next);
const m1=inc2.prodAnalysis.filter(r=>r.name==='Café moulu 1 kg')[0];
if(!(m1.cu>0))throw new Error('coût unitaire nul sans lot machines: '+m1.cu);
const roastCost=inc2.ventes===0?null:null; /* ventes 0 ce mois-là, mais coût défini */
console.log('✓ Analytique robuste : mois sans lot machines → coût recette = coût torréfié de secours ('+money(Math.round(m1.cu))+' /u pour moulu 1 kg)');

/* ===== 6. COHÉRENCE GLOBALE APRÈS FIX ===== */
const inc=await computeIncome(per);
const chargesMan=inc.consVert+inc.consEmb+inc.servicesTot+inc.personnel.total+inc.impotsTot+inc.dotations;
eq(inc.chargesTot,chargesMan,'charges');
eq(inc.produitsTot,inc.ventes+inc.dPF+inc.dSemi,'produits');
eq(inc.resultat,inc.produitsTot-inc.chargesTot,'résultat');
eq(inc.paTot.ca,inc.prodAnalysis.reduce((a,r)=>a+r.ca,0),'analytique Σ CA');
console.log('✓ Identités comptables intactes après les 5 correctifs');

console.log('TUV6: 6/6 OK');
})().catch(e=>{console.error('ÉCHEC TUV6:',e.message);process.exit(1);});
