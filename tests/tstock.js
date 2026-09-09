;/* TSTOCK : jamais de stock négatif (vente directe + édition + validation terrain) + point du boss détaillé par commerciale */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const D=todayISO();
/* produit suivi + production 50 unités */
let P=(await DB.list('products')).filter(p=>p.name==='GARDE STOCK')[0];
if(!P)P=await DB.insert('products',{name:'GARDE STOCK',weight_g:500,price:1000,alert_min:5,active:true});
await DB.insert('productions',{date:D,roasted_used:10,lines:[{product_id:P.id,name:'GARDE STOCK',qty:50}],operator:'test',note:'',source:'admin'});
const st1=(await computeStats()).products.filter(p=>p.id===P.id)[0];
if(Number(st1.stock)!==50)throw new Error('stock initial attendu 50, obtenu '+st1.stock);
/* 1. vente directe refusée au-delà du stock, dispo affiché, rien d'enregistré */
let refused='';
try{await createSale({date:D,agent_name:'GEST',pay_mode:'cash',total:60000,lines:[{product_id:P.id,name:'GARDE STOCK',qty:60,price:1000}]});}catch(e){refused=e.message;}
if(!/insuffisant/.test(refused))throw new Error('vente 60/50 devrait être refusée : '+refused);
if(!refused.includes('50'))throw new Error('le dispo (50) doit figurer dans le message : '+refused);
if((await DB.list('sales')).some(s=>Number(s.total)===60000))throw new Error('la vente refusée ne doit pas exister');
console.log('✓ Vente directe de 60 avec 50 en stock : REFUSÉE avec dispo affiché, rien enregistré');
/* 2. dans la limite : acceptée, stock cohérent (agent vide → ligne Vente directe) */
await createSale({date:D,agent_name:'',pay_mode:'cash',total:20000,lines:[{product_id:P.id,name:'GARDE STOCK',qty:20,price:1000}]});
const st2=(await computeStats()).products.filter(p=>p.id===P.id)[0];
if(Number(st2.stock)!==30)throw new Error('stock attendu 30 après vente de 20, obtenu '+st2.stock);
console.log('✓ Vente de 20 : acceptée, stock 50 → 30');
/* 3. validation terrain refusée au-delà du stock, saisie laissée en attente */
const pe=await DB.insert('pending_entries',{source_type:'sales',source_name:'BORIS',status:'pending',created_at:nowISO(),payload:{date:D,agent_name:'BORIS',lines:[{product_id:P.id,name:'GARDE STOCK',qty:40,price:1000}],total:40000}});
let refP='';
try{await applyPending(pe);}catch(e){refP=e.message;}
if(!/insuffisant/.test(refP))throw new Error('validation terrain 40/30 devrait être refusée : '+refP);
const pe2=(await DB.list('pending_entries',{eq:{id:pe.id}}))[0];
if(pe2.status!=='pending')throw new Error('la saisie terrain doit rester en attente après refus');
console.log('✓ Validation terrain de 40 avec 30 en stock : REFUSÉE, saisie laissée en attente');
/* 4. production complémentaire → la validation passe, stock cohérent */
await DB.insert('productions',{date:D,roasted_used:10,lines:[{product_id:P.id,name:'GARDE STOCK',qty:20}],operator:'test',note:'',source:'admin'});
await applyPending(pe);
await DB.update('pending_entries',pe.id,{status:'validated',reviewed_at:nowISO()});
const pe3=(await DB.list('pending_entries',{eq:{id:pe.id}}))[0];
if(pe3.status!=='validated')throw new Error('la saisie devrait être validée après production complémentaire');
const st3=(await computeStats()).products.filter(p=>p.id===P.id)[0];
if(Number(st3.stock)!==10)throw new Error('stock attendu 10 après validation, obtenu '+st3.stock);
console.log('✓ Après production complémentaire (+20) : validation acceptée, stock 30 → 50 → 10 cohérent');
/* 5. produit hors catalogue : non suivi, pas de blocage */
await createSale({date:D,agent_name:'GEST',pay_mode:'cash',total:5000,lines:[{name:'PRODUIT LIBRE',qty:5,price:1000}]});
console.log('✓ Ligne hors catalogue : vente acceptée (produit non suivi en stock)');
/* 6. point du boss : situation détaillée de chaque commerciale */
await DB.insert('sales_agents',{name:'ALICE',token:'tokA',active:true});
await DB.insert('sales_agents',{name:'FATOU',token:'tokF',active:true});
await DB.insert('sales_agents',{name:'SILENCE',token:'tokS',active:true});
await createSale({date:D,agent_name:'ALICE',pay_mode:'cash',total:5000,lines:[{name:'PRODUIT LIBRE',qty:5,price:1000}]});
await DB.insert('pending_entries',{source_type:'sales',source_name:'FATOU',status:'pending',created_at:nowISO(),payload:{date:D,agent_name:'FATOU',lines:[{name:'PRODUIT LIBRE',qty:2,price:1250}],total:2500}});
await DB.insert('pending_entries',{source_type:'sales',source_name:'FATOU',status:'rejected',created_at:nowISO(),payload:{date:D,agent_name:'FATOU',lines:[{name:'PRODUIT LIBRE',qty:1,price:1250}],total:1250}});
const rep=await buildDailyReport(D);
const h=rep.html;
['ALICE','FATOU','SILENCE','à valider','Aucun envoi reçu','Vente directe','rejetée'].forEach(x=>{if(!h.includes(x))throw new Error('point du boss sans « '+x+' »');});
if(!rep.blob)throw new Error('Excel du point manquant');
console.log('✓ Point du boss : chaque commerciale détaillée — ✅ validées · ⏳ à valider (avec produits) · rejetées · 🔴 aucun envoi reçu · vente directe');
console.log('TSTOCK: 6/6 OK');
})().catch(e=>{console.error('ÉCHEC TSTOCK:',e.message);process.exit(1);});
