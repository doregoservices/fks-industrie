;/* TEST : écran Stocks consolidé + comptabilité analytique par produit */
;(async()=>{
await loadSettings();
await seedDemo();
S.user={name:'test'};
const per=todayISO().slice(0,7);
const eq=(a,b,m)=>{if(Math.abs(a-b)>0.01)throw new Error(m+': '+a+' ≠ '+b);};

/* ===== 1. ANALYTIQUE : structure et cohérence ===== */
const inc=await computeIncome(per);
if(!inc.prodAnalysis||inc.prodAnalysis.length!==5)throw new Error('prodAnalysis: '+(inc.prodAnalysis||[]).length);
if(!inc.paTot)throw new Error('paTot manquant');
const sumCa=inc.prodAnalysis.reduce((a,r)=>a+r.ca,0);
eq(sumCa,inc.ventes,'Σ CA par produit = ventes totales');
eq(inc.paTot.ca,sumCa,'paTot.ca');
eq(inc.paTot.m,inc.prodAnalysis.reduce((a,r)=>a+r.marge,0),'paTot.marge');
inc.prodAnalysis.forEach(r=>{
  if(!(r.cu>0))throw new Error('coût unitaire non positif pour '+r.name+': '+r.cu);
  eq(r.marge,r.ca-r.cost,'marge '+r.name);
  if(r.qty>0&&r.ca<=0)throw new Error('CA incohérent '+r.name);
});
const grain=inc.prodAnalysis.filter(r=>r.name==='Café grain 1 kg')[0];
if(grain.qty<=0)throw new Error('grain non vendu en démo ?');
console.log('✓ Analytique : 5 produits · Σ CA = ventes ('+money(inc.paTot.ca)+') · coût unitaire > 0 partout · marge = CA − coût');
console.log('   ex. Café grain 1 kg : '+grain.qty+' u · CA '+money(grain.ca)+' · coût/u '+money(Math.round(grain.cu))+' · marge '+money(grain.marge)+' ('+(grain.ca>0?Math.round(100*grain.marge/grain.ca):0)+' %)');

/* ===== 2. COÛT UNITAIRE : recette + emballages ===== */
/* moulu 1 kg = 1 kg premium + 1 sachet 1 kg + 1 étiquette ; coût attendu = semiCost×1 + CMP sachet + CMP étiquette */
const semi=inc.semiCost;
const pkIts=await DB.list('packaging_items');
const pkE1=pkIts.filter(x=>x.name==='Sachet 1 kg')[0];
const pkE2=pkIts.filter(x=>x.name==='Étiquette autocollante')[0];
const ent=await DB.list('packaging_entries');
const cmpOf=id=>{let a=0,q=0;ent.filter(e=>e.item_id===id&&e.type==='in').forEach(e=>{a+=Number(e.amount||0);q+=Number(e.qty||0);});return q>0?a/q:0;};
const expected=semi*1+cmpOf(pkE1.id)+cmpOf(pkE2.id);
const moulu1kg=inc.prodAnalysis.filter(r=>r.name==='Café moulu 1 kg')[0];
eq(moulu1kg.cu,expected,'coût unitaire moulu 1 kg = semi-fini + emballages');
console.log('✓ Coût unitaire vérifié : Café moulu 1 kg = 1 kg de semi-fini ('+money(semi)+') + sachet ('+money(cmpOf(pkE1.id))+') + étiquette ('+money(cmpOf(pkE2.id))+') = '+money(Math.round(expected)));

/* ===== 3. ÉCRAN STOCKS ===== */
S.user={name:'test',role:'manager'};
await scStocks();
let html=$('#main').innerHTML;
if(!html.includes('Tous les stocks'))throw new Error('écran stocks');
['Café vert','Café torréfié','Produits finis','Emballages'].forEach(x=>{if(!html.includes(x))throw new Error('section manquante: '+x);});
if(!html.includes('Moulu premium'))throw new Error('types absents');
if(!html.includes('Valeur totale emballages'))throw new Error('valeur emballages absente');
if(html.includes('NaN'))throw new Error('NaN dans l’écran stocks');
const prods=await DB.list('products');
prods.forEach(p=>{if(!html.includes(esc(p.name)))throw new Error('produit absent: '+p.name);});
console.log('✓ Écran 📦 Stocks : vert + torréfié + types + 5 produits finis + emballages + valeurs — aucun NaN');

/* ===== 4. ÉCRAN STOCKS : chef production y a accès, commercial non ===== */
S.user={name:'prod',role:'production'};
if(!roleAllowed('stocks'))throw new Error('chef production devrait voir stocks');
S.user={name:'com',role:'commercial'};
if(roleAllowed('stocks'))throw new Error('commercial ne devrait pas voir stocks');
S.user={name:'test',role:'manager'};
if(!roleAllowed('stocks'))throw new Error('manager devrait voir stocks');
if(!NAV_ITEMS.filter(i=>i[0]==='stocks').length)throw new Error('NAV stocks absent');
location.hash='#/stocks';await render();
if(!$('#main').innerHTML.includes('Tous les stocks'))throw new Error('routage stocks cassé');
location.hash='#/dashboard';await render();
console.log('✓ Droits : manager ✓ · chef production ✓ · commercial ✗ (comme Production/Achats)');

/* ===== 5. ÉCRAN STOCKS : cohérence des unités produites/vendues ===== */
await scStocks();html=$('#main').innerHTML;
const prod5=prods.filter(p=>p.name==='Café grain 1 kg')[0];
const sales=await DB.list('sales');
const soldGrain=sales.reduce((a,x)=>a+((x.lines||[]).filter(l=>l.product_id===prod5.id||l.name===prod5.name).reduce((b,l)=>b+Number(l.qty||0),0)),0);
const madeGrain=(await DB.list('productions')).reduce((a,p)=>a+((p.lines||[]).filter(l=>l.product_id===prod5.id||l.name===prod5.name).reduce((b,l)=>b+Number(l.qty||0),0)),0);
if(!html.includes('>'+num(soldGrain)+'<'))throw new Error('vendu grain non affiché: '+soldGrain);
if(!html.includes('>'+num(madeGrain-soldGrain)+'<'))throw new Error('stock grain non affiché: '+(madeGrain-soldGrain));
console.log('✓ Compteurs : Café grain 1 kg → produits '+madeGrain+' · vendus '+soldGrain+' · stock '+(madeGrain-soldGrain));

/* ===== 6. EXPLOITATION : section analytique affichée ===== */
await scExploitation();
html=$('#main').innerHTML;
if(!html.includes('Analyse par produit'))throw new Error('section analytique absente');
if(!html.includes('Coût de revient complet'))throw new Error('section quote-part absente');
if(!html.includes('Part CA'))throw new Error('colonnes analytique incomplètes');
if(html.includes('NaN'))throw new Error('NaN en exploitation');
console.log('✓ Écran Exploitation : section « Analyse par produit — marge brute » avec totaux et %');

/* ===== 7. EXCEL MENSUEL : feuille Analyse produits ===== */
const sheets=monthlySheets(inc);
const ash=sheets.filter(x=>x.name==='Analyse produits')[0];
if(!ash)throw new Error('feuille Analyse produits absente');
const txt=JSON.stringify(ash.rows);
if(!txt.includes('Café grain 1 kg'))throw new Error('produits absents de la feuille');
if(!txt.includes('TOTAL'))throw new Error('total absent');
if(!txt.includes('% marge'))throw new Error('entêtes incomplets');
const totRow=ash.rows.filter(r=>r[0]&&r[0].v==='TOTAL')[0];
if(!totRow||totRow[2].v!==inc.paTot.ca)throw new Error('total CA feuille: '+JSON.stringify(totRow));
console.log('✓ Rapport mensuel Excel : feuille « Analyse produits » (qtés, CA, coûts, marges, parts) — incluse dans l’email au boss');

/* ===== 8. RÉGRESSION RAPIDE : identité comptable intacte ===== */
const chargesMan=inc.consVert+inc.consEmb+inc.servicesTot+inc.personnel.total+inc.impotsTot+inc.dotations;
eq(inc.chargesTot,chargesMan,'total charges');
eq(inc.produitsTot,inc.ventes+inc.dPF+inc.dSemi,'total produits');
eq(inc.resultat,inc.produitsTot-inc.chargesTot,'résultat');
console.log('✓ Rien de cassé : charges, produits (avec semi-finis) et résultat identiques à avant');

/* ===== 9. COÛT DE REVIENT COMPLET : quote-part des charges indirectes ===== */
const inc3=await computeIncome(per);
const prodAll=await DB.list('productions');
const unitsM=prodAll.filter(p=>p.date>=per+'-01'&&p.date<monthAdd(per,1)+'-01').reduce((a,p)=>a+((p.lines||[]).reduce((b,l)=>b+Number(l.qty||0),0)),0);
const indM=(inc3.personnel.total||0)+(inc3.servicesTot||0)+(inc3.impotsTot||0)+(inc3.dotations||0);
eq(inc3.unitsProduced,unitsM,'unités produites');
eq(inc3.indirectTot,indM,'charges indirectes');
eq(inc3.qpUnit,unitsM>0?indM/unitsM:0,'quote-part/u');
inc3.prodAnalysis.forEach(r=>{eq(r.cuFull,r.cu+inc3.qpUnit,'cuFull '+r.name);eq(r.margeNette,r.ca-Math.round(r.qty*r.cuFull),'margeNette '+r.name);});
eq(inc3.paTot.mN,inc3.prodAnalysis.reduce((a,r)=>a+r.margeNette,0),'Σ marge nette');
const ash2=sheets.filter(x=>x.name==='Analyse produits')[0];
const txt2=JSON.stringify(ash2.rows);
if(!txt2.includes('Quote-part/u')||!txt2.includes('Marge nette'))throw new Error('feuille Excel sans colonnes quote-part');
console.log('✓ Coût de revient complet : quote-part '+money(Math.round(inc3.qpUnit))+' /u ('+money(indM)+' de charges indirectes ÷ '+num(unitsM)+' u produites) · marges nettes par produit et dans l\'Excel');

console.log('TANALYT: 9/9 OK');
})().catch(e=>{console.error('ÉCHEC TANALYT:',e.message);process.exit(1);});
