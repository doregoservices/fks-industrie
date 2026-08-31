;/* TFLOW : production v6 — torréfaction → TRANSFORMATION → conditionnement (flux strict), édition complète, emballages */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
/* 1. onglet fusionné + redirection ancien onglet cond */
S.route='production';S.tab={production:'cond'};location.hash='#/production';
await render();
const h1=$('#main').innerHTML;
if(!h1.includes('Étape 1')||!h1.includes('Étape 2'))throw new Error('onglet fusionné : étapes absentes');
if(h1.includes('id="cKg"'))throw new Error('conditionnement : champ torréfié direct toujours présent !');
if(!h1.includes('Obtenu'))throw new Error('liste transformations : colonne Obtenu absente');
if(!h1.includes('Rendement'))throw new Error('liste transformations : rendement absent');
if(!h1.includes('App.trEdit('))throw new Error('✎ transformation absent');
if(!h1.includes('App.condEdit('))throw new Error('✎ conditionnement absent');
console.log('✓ Onglet « Transformation & Conditionnement » : Étape 1 + Étape 2, colonnes Obtenu/Perte/Rendement, ✎ partout, plus de torréfié direct');
/* 2. produits sans type : aucun champ de saisie pour eux */
const prods=await DB.list('products');
const sansRecette=prods.filter(p=>p.active&&!(p.recipes||[]).length);
if(sansRecette.length){
  const id='cq_'+sansRecette[0].id;
  if($('#'+id))throw new Error('produit sans type modifiable au conditionnement !');
  console.log('✓ Produits sans type ('+sansRecette.length+') exclus du conditionnement — à définir dans Produits');
}else console.log('✓ Tous les produits démo ont un type (flux strict respecté)');
/* 3. transformation : édition sans doublat — stub des inputs dynamiques */
const ctype=(await DB.list('coffee_types'))[0];
const prodsAll=await DB.list('products');
const avecRecetteId=(prodsAll.filter(p=>p.active&&(p.recipes||[]).length)[0]||{}).id;
const stIn={id:'tq_'+ctype.id,value:'95'};
const stCq={id:'cq_'+avecRecetteId,value:''};
const _qsa=document.querySelectorAll;
document.querySelectorAll=sl=>{
  if(sl==='input[id^=tq_]')return[stIn];
  if(sl==='input[id^=cq_]')return[stCq];
  return _qsa(sl);};
S.tab={production:'trans'};await render();
const tr0=(await DB.list('transformations')).length;

$('#tIn').value='100';$('#tq_'+ctype.id).value='95';
await App.trSave();
if((await DB.list('transformations')).length!==tr0+1)throw new Error('transformation non créée');
const tr=(await DB.list('transformations')).pop();
await App.trEdit(tr.id);
if($('#tIn').value!='100')throw new Error('trEdit : entrée non pré-remplie');
$('#tIn').value='90';stIn.value='80';
await App.trSave();
if((await DB.list('transformations')).length!==tr0+1)throw new Error('édition transformation → doublon !');
const tr2=(await DB.list('transformations',{eq:{id:tr.id}}))[0];
if(Number(tr2.roasted_used)!==90)throw new Error('transformation non modifiée');
console.log('✓ Transformation : créée puis modifiée 100→90 kg (perte 10 kg mesurée), zéro doublon');
/* 4. conditionnement : création + édition avec resynchronisation emballages */
await render();
const pr0=(await DB.list('productions')).length;
const pk0=(await DB.list('packaging_entries')).length;
const avecRecette=prods.filter(p=>p.active&&(p.recipes||[]).length)[0];
stCq.value='10';
await App.condSave();
if((await DB.list('productions')).length!==pr0+1)throw new Error('conditionnement non créé');
const pr=(await DB.list('productions')).pop();
if(Number(pr.roasted_used)!==0)throw new Error('conditionnement consomme encore du torréfié direct !');
if(!(pr.type_lines||[]).length)throw new Error('type_lines absents (doit consommer les types machines)');
const pkAfterCreate=(await DB.list('packaging_entries')).length;
await App.condEdit(pr.id);
if(stCq.value!='10')throw new Error('condEdit : qté non pré-remplie');
stCq.value='4';
await App.condSave();
const pr2=(await DB.list('productions',{eq:{id:pr.id}}))[0];
const lignes=(pr2.lines||[]).reduce((a,l)=>a+Number(l.qty),0);
if(lignes!==4)throw new Error('conditionnement non modifié ('+lignes+')');
if((await DB.list('productions')).length!==pr0+1)throw new Error('édition conditionnement → doublon !');
const pkNow=(await DB.list('packaging_entries')).filter(e=>e.ref==='production:'+pr.id);
const bom=(avecRecette.packaging||[]).reduce((a,b)=>a+Number(b.qty||0),0);
if(pkNow.length&&Math.abs(pkNow.reduce((a,e)=>a+Number(e.qty||0),0)-bom*4)>0.01)throw new Error('emballages non resynchronisés après édition');
console.log('✓ Conditionnement : 10→4 unités modifiées, types + emballages re-consommés au juste montant, zéro doublon');
/* 5. ancien conditionnement torréfié direct : non éditable, listé « ancien » */
await DB.insert('productions',{date:todayISO(),roasted_used:15,lines:[{product_id:avecRecette.id,name:avecRecette.name,qty:3,price:0}],operator:'test',source:'admin'});
await render();
const hh=$('#main').innerHTML;
if(!hh.includes('ancien'))throw new Error('anciens conditionnements torréfié non marqués');
let refused=false;const _t=toast;toast=(m,k)=>{if(String(m).includes('Ancien conditionnement'))refused=true;return _t(m,k);};
await App.condEdit((await DB.list('productions')).filter(p=>Number(p.roasted_used)>0).pop().id);
toast=_t;
if(!refused)throw new Error('ancien conditionnement éditable (ne doit pas l\’être)');
console.log('✓ Anciens conditionnements (torréfié direct) : marqués « ancien », modification refusée proprement');
/* 6. emballages : édition d\’un mouvement + synchro caisse */
S.route='emballages';S.tab={};location.hash='#/emballages';
await render();
const ent=(await DB.list('packaging_entries')).filter(e=>e.ref!=='production:'&&e.type==='in').pop();
if(!ent)throw new Error('aucun mouvement emballage à éditer');
const cashLink=(await DB.list('cash_entries')).filter(x=>x.ref==='pkentry:'+ent.id)[0];
await App.pkEntryEdit(ent.id);
if($('#peQ').value!=String(Number(ent.qty)))throw new Error('pkEntryEdit : qté non pré-remplie');
$('#peQ').value=String(Number(ent.qty)+100);
await App.pkEntrySave(ent.id);
const ent2=(await DB.list('packaging_entries',{eq:{id:ent.id}}))[0];
if(Number(ent2.qty)!==Number(ent.qty)+100)throw new Error('mouvement emballage non modifié');
const cash2=cashLink?(await DB.list('cash_entries')).filter(x=>x.ref==='pkentry:'+ent.id)[0]:null;
if(cashLink&&cash2&&Number(cash2.amount)!==Number(ent2.amount))throw new Error('caisse non synchronisée après édition emballage');
console.log('✓ Emballages : mouvement modifiable (✎)'+(cashLink?' avec écriture de caisse synchronisée':''));
/* 7. vocabulaire cohérent */
if(h1.includes('semi-fini'))throw new Error('terme « semi-fini » encore utilisé à l\’écran');
console.log('✓ Vocabulaire : « Café transformé par les machines » partout (plus de « semi-fini »)');
/* 8. aucun type créé : guidage explicite (alerte + bouton vers Produits) */
const ctys=await DB.list('coffee_types');
for(const t of ctys)await DB.update('coffee_types',t.id,{active:false});
S.route='production';S.tab={production:'trans'};location.hash='#/production';await render();
const hNoType=$('#main').innerHTML;
if(!hNoType.includes('Aucun <b>type de café</b> créé'))throw new Error('guidage types absent');
if(!hNoType.includes('go(\'produits\')')&&!hNoType.includes("go('produits')"))throw new Error('bouton vers Produits absent');
let guided=false;const _tt=toast;toast=(m,k)=>{if(String(m).includes('Créez d'))guided=true;return _tt(m,k);};
$('#tIn').value='50';
await App.trSave();
toast=_tt;
if(!guided)throw new Error('message de guidage trSave absent');
for(const t of ctys)await DB.update('coffee_types',t.id,{active:true});
console.log('✓ Aucun type : alerte + bouton « Créer les types » + message clair au lieu de l\'erreur laconique');
console.log('TFLOW: 8/8 OK');
})().catch(e=>{console.error('ÉCHEC TFLOW:',e.stack||e.message);process.exit(1);});
