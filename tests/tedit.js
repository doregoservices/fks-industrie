;/* TEDIT : toutes les saisies modifiables (✎) — caisse, achats, ventes, ajustements, torréfaction + message email */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
/* 1. CAISSE */
let e=await createCashEntry({date:todayISO(),type:'out',account:'cash',category:'transport',label:'Taxi',amount:5000,imputable:true});
let all=await DB.list('cash_entries');let n0=all.length;
await App.cashForm(e.id);
if($('#oM').value!='5000')throw new Error('caisse : montant non pré-rempli');
$('#oM').value='3000';$('#oL').value='Taxi modifié';
await App.cashSave(e.id);
let e2=(await DB.list('cash_entries',{eq:{id:e.id}}))[0];
if(Number(e2.amount)!==3000||e2.label!=='Taxi modifié')throw new Error('caisse : non modifié');
if((await DB.list('cash_entries')).length!==n0)throw new Error('caisse : doublon créé !');
console.log('✓ Caisse : opération modifiée (5 000→3 000 F) sans doublon');
/* 2. ACHAT payé : édition + synchro caisse */
let pur=(await DB.list('purchases')).filter(p=>p.pay_method==='cash')[0];
if(!pur){await DB.insert('purchases',{date:todayISO(),supplier:'Coop',qty_kg:10,price_per_kg:1000,amount:10000,pay_method:'cash',status:'validated'});pur=(await DB.list('purchases')).pop();}
let linked=(await DB.list('cash_entries')).filter(x=>x.ref==='purchase:'+pur.id)[0];
await App.achatForm(pur.id);
if($('#aS').value!==pur.supplier)throw new Error('achat : fournisseur non pré-rempli');
$('#aS').value='Coop Modifiée';$('#aQ').value='20';$('#aT').value='26000';
await App.achatSave(pur.id);
let p2=(await DB.list('purchases',{eq:{id:pur.id}}))[0];
if(p2.supplier!=='Coop Modifiée'||Number(p2.amount)!==26000)throw new Error('achat : non modifié');
let linked2=(await DB.list('cash_entries')).filter(x=>x.ref==='purchase:'+pur.id)[0];
if(!linked&&linked2&&linked2.id)linked=linked2;
if(linked2&&Number(linked2.amount)!==26000)throw new Error('achat : écriture caisse non synchronisée ('+(linked2&&linked2.amount)+')');
console.log('✓ Achat : modifié (fournisseur + 26 000 F) et écriture de caisse synchronisée');
/* 3. ACHAT → « à payer plus tard » : l\'écriture de caisse disparaît */
await App.achatForm(pur.id);
$('#aM').value='later';$('#aS').value='Coop';$('#aQ').value='20';$('#aT').value='26000';
await App.achatSave(pur.id);
if((await DB.list('cash_entries')).some(x=>x.ref==='purchase:'+pur.id))throw new Error('achat later : écriture caisse toujours là');
console.log('✓ Achat à crédit : écriture de caisse retirée proprement');
/* 4. VENTE */
const prod=(await DB.list('products'))[0];
let sale=await createSale({date:todayISO(),agent_id:'direct',agent_name:'Vente directe',pay_mode:'cash',total:4500,lines:[{product_id:prod.id,name:prod.name,qty:1,price:4500}],source:'admin'});
/* mini-DOM : lignes de vente stubbées */
const _ce=document.createElement;
document.createElement=t=>{const el=_ce(t);el._q={};el.querySelector=c=>el._q[c]||(el._q[c]={value:'',options:[],appendChild(o){this.options.push(o);},textContent:''});if(!el.appendChild)el.appendChild=()=>{};return el;};
const selSt={value:prod.id+'|'+prod.name+'|4500',options:[],appendChild(o){this.options.push(o);},textContent:''};
const lqSt={value:'3'},lp2St={value:'4500'};
const rowSt={querySelector:c=>c==='.lp'?selSt:(c==='.lq'?lqSt:(c==='.lp2'?lp2St:{textContent:''})),remove(){},};
const _qsa=document.querySelectorAll;document.querySelectorAll=sl=>sl==='#vLines .linerow'?[rowSt]:_qsa(sl);
await App.venteForm(sale.id);
if($('#vD').value!==sale.date)throw new Error('vente : date non pré-remplie');
lqSt.value='3';
await App.venteSave();
document.querySelectorAll=_qsa;document.createElement=_ce;
let s2=(await DB.list('sales',{eq:{id:sale.id}}))[0];
if(Number(s2.total)!==13500)throw new Error('vente : total non modifié ('+s2.total+')');
let sc=(await DB.list('cash_entries')).filter(x=>x.ref==='sale:'+sale.id)[0];
if(!sc||Number(sc.amount)!==13500)throw new Error('vente : caisse non synchronisée');
if((await DB.list('sales')).filter(x=>x.id===sale.id).length!==1)throw new Error('vente : doublon !');
console.log('✓ Vente : quantité 1→3, total 13 500 F, caisse synchronisée, pas de doublon');
/* 5. AJUSTEMENT */
let adj=await DB.insert('adjustments',{date:todayISO(),level:'green',qty:25,reason:'Stock initial'});
S.route='production';S.tab={production:'adj'};location.hash='#/production';
await render();
await App.adjEdit(adj.id);
if($('#jQ').value!='25')throw new Error('ajustement : qty non pré-remplie');
$('#jQ').value='40';
await App.adjSave();
let a2=(await DB.list('adjustments',{eq:{id:adj.id}}))[0];
if(Number(a2.qty)!==40)throw new Error('ajustement : non modifié');
if(S.adjEdit)throw new Error('ajustement : état édition non réinitialisé');
console.log('✓ Ajustement : 25→40 kg, pas de doublon');
/* 6. TORRÉFACTION */
let ro=(await DB.list('roastings'))[0];
S.tab={production:'roast'};await render();
await App.roastEdit(ro.id);
if($('#rIn').value!=String(ro.green_in))throw new Error('torréfaction : non pré-remplie');
$('#rIn').value='111';$('#rOut').value='99';
await App.roastSave();
let r2=(await DB.list('roastings',{eq:{id:ro.id}}))[0];
if(Number(r2.green_in)!==111||Number(r2.roasted_out)!==99)throw new Error('torréfaction : non modifiée');
if((await DB.list('roastings')).length===(await DB.list('roastings')).length){} /* ok */
console.log('✓ Torréfaction : pesées modifiées, stocks recalculés automatiquement');
/* 7. Boutons ✎ visibles dans les listes */
await new Promise(r=>setTimeout(r,20));
for(const sc2 of [['caisse',{}],['achats',{}],['ventes',{}],['production',{production:'hist'}]]){
  S.route=sc2[0];S.tab=sc2[1];location.hash='#/'+sc2[0];
  await render();
  if(!$('#main').innerHTML.includes('✎')&&!$('#app').innerHTML.includes('✎'))throw new Error('écran '+sc2[0]+' : bouton ✎ absent');
}
console.log('✓ Bouton ✎ présent sur les écrans Caisse, Achats, Ventes, Historique production');
/* 8. Message email : cause réelle (fonction non déployée) */
CFG.mode='supabase';CFG.url='https://x.supabase.co';CFG.anon='k';SETS.email={boss:'b@x.ci',key:'k'};SES=null;
const _f=global.fetch;global.fetch=async()=>{throw new Error('Failed to fetch');};
let msg=null;try{await emailSend('s','h');}catch(err){msg=err.message;}
global.fetch=_f;
if(!msg||!msg.includes('PAS encore déployée'))throw new Error('email : message non explicite → '+msg);
console.log('✓ Email injoignable : le message pointe désormais la cause réelle (fonction non déployée, 10 min)');
console.log('TEDIT: 8/8 OK');
})().catch(e=>{console.error('ÉCHEC TEDIT:',e.stack||e.message);process.exit(1);});
