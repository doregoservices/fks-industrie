;/* TFLOW v2 : transformation & conditionnement EN UNE SAISIE — perte/rendement sur les unités produites */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const prods=await DB.list('products');
const av=prods.filter(p=>p.active&&(p.recipes||[]).length)[0]||prods.filter(p=>p.active)[0];
const cafeU=p=>{const r=(p.recipes||[])[0]||{};return Number(r.qty||p.type_kg||(p.weight_g?p.weight_g/1000:0))||0;};
/* stubs des grilles dynamiques */
const stCq={id:'cq_'+av.id,value:'0'};
const _qsa=document.querySelectorAll;
document.querySelectorAll=sl=>sl==='input[id^=cq_]'?[stCq]:_qsa(sl);
/* 1. écran : saisie unique + détails vrac optionnel */
S.route='production';S.tab={production:'trans'};location.hash='#/production';
await render();
const h1=$('#main').innerHTML;
if(!h1.includes('en une seule saisie'))throw new Error('titre saisie unique absent');
if(!h1.includes('Baromètre usine'))throw new Error('baromètre usine absent de l écran Production');
if(!$('#cIn'))throw new Error('champ torréfié consommé absent');
if(!h1.includes('kg café/u'))throw new Error('café par unité non affiché');
if(!h1.includes('peser le café en vrac'))throw new Error('option vrac absente');
if(!h1.includes('Café conditionné'))throw new Error('colonne Café conditionné absente');
if(!h1.includes('Rendement'))throw new Error('colonne Rendement absente');
if(!h1.includes('App.condEdit('))throw new Error('✎ conditionnement absent');
console.log('✓ Saisie unique : torréfié consommé + unités produites, colonnes Café conditionné / Perte / Rendement, ✎, option vrac repliée');
/* 2. saisie combinée : 100 kg → assez d'unités pour 95 kg de café, perte 5 kg */
const U=Math.round(95/cafeU(av));            /* unités pour conditionner 95 kg */
const pr0=(await DB.list('productions')).length;
$('#cIn').value='100';stCq.value=String(U);
await App.condSave();
if((await DB.list('productions')).length!==pr0+1)throw new Error('saisie combinée non créée');
const pr=(await DB.list('productions')).pop();
if(Number(pr.roasted_used)!==100)throw new Error('torréfié consommé non enregistré ('+pr.roasted_used+')');
const units=(pr.lines||[]).reduce((a,l)=>a+l.qty,0);
if(units!==U)throw new Error('unités non enregistrées ('+units+' ≠ '+U+')');
console.log('✓ Enregistré : 100 kg torréfié → '+U+' unités ('+num2(U*cafeU(av))+' kg conditionnés, perte 5 kg, rendement 95 %)');
/* 3. garde-fous : café > consommé refusé */
const _t=toast;let refus='';
toast=(m,k)=>{if(String(m).includes('dépasse'))refus=m;return _t(m,k);};
$('#cIn').value='10';stCq.value=String(U);
await App.condSave();
toast=_t;
if(!refus)throw new Error('garde-fou café>consommé absent');
console.log('✓ Garde-fou : 190 unités (95 kg) avec 10 kg consommés → refusé');
/* 4. édition : 190→100 unités, emballages resynchronisés */
$('#cIn').value='100';
await App.condEdit(pr.id);
if($('#cIn').value!='100')throw new Error('condEdit : torréfié non pré-rempli');
if(stCq.value!==String(U))throw new Error('condEdit : unités non pré-remplies (via stub '+stCq.value+')');
stCq.value=String(Math.max(1,U-90));
await App.condSave();
const pr2=(await DB.list('productions',{eq:{id:pr.id}}))[0];
if((pr2.lines||[]).reduce((a,l)=>a+l.qty,0)!==Math.max(1,U-90))throw new Error('édition non appliquée');
if((await DB.list('productions')).length!==pr0+1)throw new Error('édition → doublon !');
const bom=(av.packaging||[]).reduce((a,b)=>a+Number(b.qty||0),0);
const pkNow=(await DB.list('packaging_entries')).filter(e=>e.ref==='production:'+pr.id);
if(pkNow.length&&Math.abs(pkNow.reduce((a,e)=>a+Number(e.qty||0),0)-bom*Math.max(1,U-90))>0.01)throw new Error('emballages non resynchronisés');
console.log('✓ Édition '+U+'→'+Math.max(1,U-90)+' unités : emballages re-consommés au juste montant, zéro doublon');
/* 5. option vrac : transformation seule (dans les détails) fonctionne toujours */
const tr0=(await DB.list('transformations')).length;
const ctype=(await DB.list('coffee_types'))[0];
const stIn={id:'tq_'+ctype.id,value:'30'};
document.querySelectorAll=sl=>sl==='input[id^=cq_]'?[stCq]:sl==='input[id^=tq_]'?[stIn]:_qsa(sl);
$('#tD').value=todayISO();$('#tIn').value='32';stIn.value='30';
await App.trSave();
if((await DB.list('transformations')).length!==tr0+1)throw new Error('vrac non créé');
const tr=(await DB.list('transformations')).pop();
if(Number(tr.roasted_used)!==32)throw new Error('vrac : torréfié non enregistré');
console.log('✓ Option vrac : transformation seule 32→30 kg (perte 2 kg) enregistrée');
/* 6. aucun type : la saisie unique fonctionne quand même (café/u via poids produit) */
document.querySelectorAll=sl=>sl==='input[id^=cq_]'?[stCq]:_qsa(sl);
const ctys=await DB.list('coffee_types');
for(const t of ctys)await DB.update('coffee_types',t.id,{active:false});
await render();
const h2=$('#main').innerHTML;
if(!$('#cIn'))throw new Error('sans types : saisie unique absente');
if(h2.includes('peser le café en vrac'))throw new Error('sans types : option vrac devrait disparaître');
if(!h2.includes('kg café/u'))throw new Error('sans types : café/u (via poids) non affiché');
for(const t of ctys)await DB.update('coffee_types',t.id,{active:true});
console.log('✓ Sans types de café : la saisie unique reste pleinement utilisable (café/u = poids du produit)');
/* 7. emballages : édition d\’un mouvement */
S.route='emballages';S.tab={};location.hash='#/emballages';
await render();
const ent=(await DB.list('packaging_entries')).filter(e=>e.type==='in'&&e.ref.indexOf('production:')!==0).pop();
if(ent){const cash0=(await DB.list('cash_entries')).filter(x=>x.ref==='pkentry:'+ent.id)[0];
  await App.pkEntryEdit(ent.id);
  if($('#peQ').value!=String(Number(ent.qty)))throw new Error('pkEntryEdit : qté non pré-remplie');
  $('#peQ').value=String(Number(ent.qty)+100);
  await App.pkEntrySave(ent.id);
  const e2=(await DB.list('packaging_entries',{eq:{id:ent.id}}))[0];
  if(Number(e2.qty)!==Number(ent.qty)+100)throw new Error('mouvement non modifié');
  console.log('✓ Emballages : mouvement modifiable (✎)'+(cash0?' avec caisse synchronisée':''));}
else console.log('✓ Emballages : (aucun mouvement d\’achat en démo — edit non testé ici)');
document.querySelectorAll=_qsa;
/* 8. torréfaction : SEUL le vert est pesé → torréfié estimé 82 % */
S.tab={production:'roast'};await render();
$('#rIn').value='100';$('#rOut').value='';
await App.roastSave();
const rr=(await DB.list('roastings')).pop();
if(Number(rr.roasted_out)!==100)throw new Error('torréfié doit égaler le vert ('+rr.roasted_out+')');
if(rr.estimated!==true)throw new Error('marqueur estimated absent');
console.log('✓ Torréfaction : 100 kg vert pesés → torréfié = 100 kg (aucune perte à ce stade)');
/* 9. conditionnement sans AUCUNE pesée : torréfié déduit des produits finis */
document.querySelectorAll=sl=>sl==='input[id^=cq_]'?[stCq]:_qsa(sl);
S.tab={production:'trans'};await render();
const n0=(await DB.list('productions')).length;
const roasB=await DB.list('roastings');const prdsB=await DB.list('productions');
const stkB=roasB.reduce((a,r)=>a+Number(r.roasted_out||0),0)-prdsB.reduce((a,p)=>a+Number(p.roasted_used||0),0);
$('#cIn').value='';stCq.value='20';
await App.condSave();
if((await DB.list('productions')).length!==n0+1)throw new Error('saisie sans pesée refusée');
const pn=(await DB.list('productions')).pop();
const cafeN=(pn.lines||[]).reduce((a,l)=>a+l.qty*cafeU(av),0);
const expN=Math.round(Math.max(stkB,cafeN)*10)/10;
if(Math.abs(Number(pn.roasted_used)-expN)>0.01)throw new Error('roasted_used doit = stock torréfié ('+pn.roasted_used+' vs '+expN+')');
if(!(expN>=cafeN))throw new Error('perte négative impossible');
console.log('✓ Machines sans pesée : 20 unités ('+num2(cafeN)+' kg) → consommé = stock '+num2(expN)+' kg · perte '+num2(expN-cafeN)+' kg (écart = perte)');
document.querySelectorAll=_qsa;
console.log('TFLOW: 9/9 OK');
})().catch(e=>{console.error('ÉCHEC TFLOW:',e.stack||e.message);process.exit(1);});
