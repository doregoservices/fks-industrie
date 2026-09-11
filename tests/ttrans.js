;/* TEST : rendement UNIQUE — étape de pesée intermédiaire (types/machines) supprimée */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const eq=(a,b,m)=>{if(Math.abs(a-b)>0.01)throw new Error(m+': '+a+' ≠ '+b);};

/* 1. seed sans étape types */
if((await DB.list('coffee_types')).length)throw new Error('types résiduels en seed');
if((await DB.list('transformations')).length)throw new Error('transformations résiduelles en seed');
const prods=await DB.list('products');
const p1=prods.filter(p=>p.name==='Café moulu 1 kg')[0];
if(!p1||(p1.recipes||[])[0].qty!==1)throw new Error('kg/u absent des recettes');
if(prods.filter(p=>p.name==='Café moulu 500 g')[0].recipes[0].qty!==0.5)throw new Error('recette 500 g');
console.log('✓ Seed sans types : recettes produits en kg de café/u directement');

/* 2. stocks : vert + torréfié (rendement pesé UNIQUEMENT à la torréfaction) */
let st=await computeStats();
eq(st.greenStock,1200,'stock vert');
eq(st.roastedStock,320,'stock torréfié');
console.log('✓ Stocks : 1 200 kg vert · 320 kg torréfié — une seule pesée (torréfaction), café des sachets réellement consommé (205+142 kg)');

/* 3. saisie unique : le conditionnement consomme directement le torréfié */
$('#main').innerHTML='<input id="cD"><input id="cIn"><input id="cOp"><input id="cN">';
$('#cD').value=todayISO();$('#cIn').value='100';$('#cOp').value='Machine 1';$('#cN').value='';
const _qsa=document.querySelectorAll;const stCq={id:'cq_'+p1.id,value:'90'};
document.querySelectorAll=sl=>sl==='input[id^=cq_]'?[stCq]:_qsa(sl);
const _t9=toast;toast=(m,k)=>{if(String(m).includes('Refusé')||String(m).includes('dépasse'))throw new Error('refus inattendu: '+m);return _t9(m,k);};
await App.condSave();document.querySelectorAll=_qsa;toast=_t9;
const pr=(await DB.list('productions')).slice(-1)[0];
if(Number(pr.roasted_used)!==100)throw new Error('torréfié consommé non enregistré: '+pr.roasted_used);
st=await computeStats();
eq(st.roastedStock,220,'torréfié décrémenté par le conditionnement');
const pkOut=(await DB.list('packaging_entries')).filter(e=>e.ref==='production:'+pr.id&&e.type==='out');
if(!pkOut.length)throw new Error('emballages non consommés automatiquement');
console.log('✓ Saisie unique : 100 kg torréfié → 90 unités (1 kg/u) · stock torréfié 220 kg · emballages auto');

/* 4. écran production : rendement unique affiché, étape machines absente */
S.route='production';S.tab={production:'hist'};location.hash='#/production';
await render();
const h=$('#main').innerHTML;
if(!h.includes('Rendement torréfaction (unique)'))throw new Error('rendement unique absent');
if(h.includes('Rendement machines')||h.includes('Types obtenus'))throw new Error('restes de l étape machines');
console.log('✓ Historique : un seul rendement (torréfaction), zéro trace de l étape machines');

/* 5. stocks JAMAIS négatifs : toutes les consommations sont bloquées au-delà du disponible */
let refuse='';
const _t5=toast;toast=(m,k)=>{if(String(m).includes('Refusé'))refuse=String(m);return _t5(m,k);};
/* 5a. conditionnement > stock torréfié (220 kg restants) */
$('#main').innerHTML='<input id="cD"><input id="cIn"><input id="cOp"><input id="cN">';
$('#cD').value=todayISO();$('#cIn').value='600';$('#cOp').value='';$('#cN').value='';
const stCq2={id:'cq_'+p1.id,value:'500'};
document.querySelectorAll=sl=>sl==='input[id^=cq_]'?[stCq2]:_qsa(sl);
const nbP0=(await DB.list('productions')).length;
refuse='';await App.condSave();
document.querySelectorAll=_qsa;
if(!refuse.includes('torréfié'))throw new Error('conditionnement > stock : pas de refus ('+refuse+')');
if((await DB.list('productions')).length!==nbP0)throw new Error('production enregistrée malgré stock insuffisant !');
/* 5b. torréfaction > stock vert (1 200 kg) */
$('#main').innerHTML='<input id="rD"><input id="rIn"><input id="rOut"><input id="rOp"><input id="rN">';
$('#rD').value=todayISO();$('#rIn').value='9999';$('#rOut').value='9900';$('#rOp').value='';$('#rN').value='';
const nbR0=(await DB.list('roastings')).length;
refuse='';await App.roastSave();
if(!refuse.includes('vert'))throw new Error('torréfaction > stock vert : pas de refus ('+refuse+')');
if((await DB.list('roastings')).length!==nbR0)throw new Error('torréfaction enregistrée malgré stock insuffisant !');
/* 5c. ajustement qui rendrait le stock négatif */
$('#main').innerHTML='<input id="jD"><input id="jL"><input id="jQ"><input id="jR">';
$('#jD').value=todayISO();$('#jL').value='green';$('#jQ').value='-9999';$('#jR').value='test';
const nbA0=(await DB.list('adjustments')).length;
refuse='';await App.adjSave();
if(!refuse.includes('négatif'))throw new Error('ajustement négatif : pas de refus ('+refuse+')');
if((await DB.list('adjustments')).length!==nbA0)throw new Error('ajustement enregistré malgré stock négatif !');
/* 5d. saisie atelier (à valider) refusée si stock insuffisant, laissée en attente */
const pe=await DB.insert('pending_entries',{source_type:'production',source_name:'Atelier',payload:{date:todayISO(),roasted_used:9999,lines:[{product_id:p1.id,name:p1.name,qty:10,price:0}]},status:'pending'});
refuse='';await App.pendOK(pe.id);
const peAfter=(await DB.list('pending_entries',{eq:{id:pe.id}}))[0];
if(!refuse.includes('torréfié'))throw new Error('validation saisie atelier : pas de refus ('+refuse+')');
if(peAfter.status!=='pending')throw new Error('la saisie atelier aurait dû rester en attente (statut: '+peAfter.status+')');
/* 5e. tout reste modifiable : le ✎ d'une saisie existante passe (ancienne conso recréditée avant vérification) */
$('#main').innerHTML='<input id="cD"><input id="cIn"><input id="cOp"><input id="cN">';
$('#cD').value=todayISO();$('#cIn').value='50';$('#cOp').value='';$('#cN').value='';
const stCq3={id:'cq_'+p1.id,value:'45'};
document.querySelectorAll=sl=>sl==='input[id^=cq_]'?[stCq3]:_qsa(sl);
S.condEdit=pr.id;
refuse='';let okEdit=false;
toast=(m,k)=>{if(String(m).includes('Refusé'))refuse=String(m);if(String(m).includes('Modification enregistrée'))okEdit=true;return _t5(m,k);};
await App.condSave();
toast=_t5;document.querySelectorAll=_qsa;
if(refuse||!okEdit)throw new Error('modification ✎ refusée à tort : '+refuse);
const prMod=(await DB.list('productions',{eq:{id:pr.id}}))[0];
if(Number(prMod.roasted_used)!==50)throw new Error('modification non enregistrée: '+prMod.roasted_used);
toast=_t5;
st=await computeStats();
if(st.greenStock<0||st.roastedStock<0)throw new Error('stock négatif détecté : vert '+st.greenStock+' / torréfié '+st.roastedStock);
console.log('✓ Jamais négatif : conditionnement, torréfaction, ajustement et saisie atelier refusés au-delà du disponible — MAIS tout reste modifiable (✎ 100→50 kg accepté, ancienne conso recréditée) — vert '+st.greenStock+' kg · torréfié '+st.roastedStock+' kg');
console.log('TTRANS: 5/5 OK');
})().catch(e=>{console.error('ÉCHEC TTRANS:',e.message);process.exit(1);});
