;/* TEST : exploitation MULTI-MOIS — le stock initial est au 1er du MOIS COURANT (pas du mois précédent) et le résultat ne peut pas dépasser les ventes par magie */
;(async()=>{
await loadSettings();S.user={name:'test',role:'manager'};
const eq=(a,b,m)=>{if(Math.abs(a-b)>1)throw new Error(m+': '+a+' ≠ '+b);};
const aug='2026-08',sep='2026-09';
/* produit simple : 1 kg café par sachet, pas d'emballage */
const p=await DB.insert('products',{name:'Café moulu 1 kg',weight_g:1000,price:8000,unit:'sachet',alert_min:0,active:true,recipes:[{name:'Café',qty:1}],packaging:[]});
/* AOÛT : mise en service — achat, torréfactions, conditionnement à l'ANCIENNE MODE (0 kg consommé) */
await DB.insert('purchases',{date:aug+'-05',supplier:'Coop',qty_kg:600,price_per_kg:1500,amount:900000,pay_method:'cash',status:'validated'});
await DB.insert('roastings',{date:aug+'-06',green_in:400,roasted_out:330,operator:'B',source:'admin'});
await DB.insert('roastings',{date:aug+'-20',green_in:100,roasted_out:82,operator:'B',source:'admin'});
await DB.insert('productions',{date:aug+'-07',roasted_used:0,lines:[{product_id:p.id,name:p.name,qty:300,price:0}],operator:'A',source:'admin'});
/* SEPTEMBRE : saisie propre — 100 kg torréfié → 100 sachets ; ventes 15 sachets × 8 000 = 120 000 */
await DB.insert('productions',{date:sep+'-10',roasted_used:100,lines:[{product_id:p.id,name:p.name,qty:100,price:0}],operator:'A',source:'admin'});
await DB.insert('sales',{date:sep+'-15',agent_id:'direct',agent_name:'Vente directe',pay_mode:'cash',total:120000,lines:[{product_id:p.id,name:p.name,qty:15,price:8000}],source:'admin',status:'validated',credit_status:'paid'});

/* 1. le stock initial de septembre = au 1er septembre (inclut tout août) */
const inc=await computeIncome(sep);
eq(inc.ventes,120000,'ventes septembre');
if(inc.resultat>=inc.ventes)throw new Error('RÉGRESSION : résultat '+inc.resultat+' ≥ ventes '+inc.ventes);
eq(inc.consVert,0,'café vert consommé septembre (stock vert inchangé : 100 kg)');
eq(inc.dRoast,-150000,'variation torréfié (412 kg → 312 kg × 1 500 F)');
eq(inc.dPF,127500,'variation PF (300 → 385 sachets × 1 500 F)');
eq(inc.resultat,97500,'résultat = MARGE sur ventes (15 × (8 000 − 1 500))');
console.log('✓ Septembre : ventes 120 000 · résultat 97 500 = marge sur ventes uniquement (l activité d août n est plus réinjectée)');

/* 2. août, pour comparaison : le vert consommé y est chargé */
const incA=await computeIncome(aug);
eq(incA.consVert,750000,'août : vert consommé (500 kg torréfiés × 1 500)');
eq(incA.dRoast,618000,'août : stock torréfié 412 kg × 1 500');
console.log('✓ Août : 750 000 de café vert chargés (torréfaction), 498 000 en stock torréfié — pas de double comptage entre les mois');

/* 3. bannière d alerte pour les conditionnements à 0 kg */
S.route='production';S.tab={production:'hist'};location.hash='#/production';
await render();
const h=$('#main').innerHTML;
if(!h.includes('conditionnement(s) sans kg de torréfié consommé'))throw new Error('bannière conditionnements 0 kg absente');
S.route='stocks';location.hash='#/stocks';
await render();
if(!$('#main').innerHTML.includes('sans kg de torréfié consommé'))throw new Error('alerte absente de l écran Stocks');
console.log('✓ Alerte visible (Historique + Stocks) : 1 conditionnement ancien mode à corriger via ✎');

/* 4. 🔧 correction automatique des conditionnements à 0 kg */
await DB.insert('productions',{date:sep+'-12',roasted_used:0,lines:[{product_id:p.id,name:p.name,qty:10,price:0}],operator:'A',source:'admin'});
let inc4=await computeIncome(sep);
eq(inc4.resultat,112500,'gonflement par lot fantôme (97 500 + 10 sachets × 1 500)');
const _cb=confirmBox;confirmBox=(t,m,b,fn)=>fn();
await App.fixZeroCond();
confirmBox=_cb;
const zeroLeft=(await DB.list('productions')).filter(x=>!Number(x.roasted_used)&&(x.lines||[]).some(l=>Number(l.qty)>0));
if(zeroLeft.length)throw new Error('lots 0 kg restants: '+zeroLeft.length);
inc4=await computeIncome(sep);
eq(inc4.resultat,97500,'après 🔧 : résultat = marge sur ventes, café compté une seule fois');
console.log('✓ 🔧 Correction auto : lot fantôme (+15 000) et ancien lot d août corrigés — résultat 97 500 = marge réelle, stocks cohérents');

/* 5. bannière permanente + diagnostic : le bouton 🔧 apparaît dès qu'un lot est à corriger */
await DB.insert('productions',{date:sep+'-20',roasted_used:0,lines:[{product_id:p.id,name:p.name,qty:10,price:0}],operator:'A',source:'admin'});
S.route='exploitation';location.hash='#/exploitation';await render();
let eh=$('#main').innerHTML;
if(!eh.includes('conditionnement(s) à 0 kg'))throw new Error('bannière lots 0 kg absente alors que résultat < ventes');
if(!eh.includes('Corriger maintenant'))throw new Error('bouton 🔧 absent alors qu un lot est à corriger');
if(eh.includes('Diagnostic — le résultat'))throw new Error('diagnostic prématuré (résultat ≤ ventes ici)');
console.log('✓ Bannière permanente : lot à 0 kg + bouton 🔧 visibles dans Exploitation même quand résultat < ventes');
await DB.insert('productions',{date:sep+'-22',roasted_used:0,lines:[{product_id:p.id,name:p.name,qty:20,price:0}],operator:'A',source:'admin'});
await DB.insert('productions',{date:sep+'-21',roasted_used:2,lines:[{product_id:p.id,name:p.name,qty:24,price:0}],operator:'A',source:'admin'});
await render();eh=$('#main').innerHTML;
if(!eh.includes('Diagnostic — le résultat'))throw new Error('diagnostic absent');
if(!eh.includes('gonflement du résultat estimé'))throw new Error('gonflement estimé absent');
if(!eh.includes('rendement impossible'))throw new Error('cause rendement impossible non listée');
if(!eh.includes('Corriger maintenant'))throw new Error('bouton 🔧 absent du diagnostic');
/* 1re tentative : stock torréfié insuffisant (2 kg) → lots gardés + « il manque » */
let cap5=null;const _mo5=modal;modal=(t,b)=>{cap5={t:t,b:b};return _mo5(t,b);};
const _cb5=confirmBox;confirmBox=(t,m,b,fn)=>fn();
await App.fixZeroCond();
if(!cap5||!String(cap5.t).includes('2 à revoir'))throw new Error('lots impossibles non listés : '+(cap5&&cap5.t));
if(!String(cap5.b).includes('il manque 10 kg')||!String(cap5.b).includes('il manque 20 kg'))throw new Error('messages « il manque X kg » absents : '+String(cap5.b).slice(0,200));
/* torréfaction enregistrée puis relance → tout passe */
await DB.insert('roastings',{date:sep+'-19',green_in:38,roasted_out:33,operator:'B',source:'admin'});
await App.fixZeroCond();
confirmBox=_cb5;modal=_mo5;
await render();eh=$('#main').innerHTML;
if(eh.includes('conditionnement(s) à 0 kg'))throw new Error('lots 0 kg devraient être corrigés après relance');
if(!eh.includes('rendement impossible'))throw new Error('le lot au rendement impossible doit rester signalé');
const bad=(await DB.list('productions')).filter(x=>Number(x.roasted_used)===2).slice(-1)[0];
await DB.update('productions',bad.id,{roasted_used:24});
await render();eh=$('#main').innerHTML;
if(eh.includes('Diagnostic — le résultat')||eh.includes('conditionnement(s) à 0 kg'))throw new Error('alertes devraient avoir disparu après corrections');
const inc5=await computeIncome(sep);
if(inc5.resultat>=inc5.ventes)throw new Error('résultat encore ≥ ventes : '+inc5.resultat);
console.log('✓ Diagnostic rouge : 2 causes listées ; garde « il manque 10/20 kg » ; torréfaction + relance 🔧 ; lot impossible corrigé via ✎ → alertes disparues, résultat '+inc5.resultat+' ≤ ventes '+inc5.ventes);
/* 6. diagnostic V2 : « aucun lot suspect » devient une enquête automatique (ajustements, à valider, paie, détail du calcul) */
await DB.insert('cash_entries',{date:sep+'-27',type:'out',category:'loyer',label:'Loyer septembre',amount:10000,account:'cash',imputable:true});
await DB.insert('adjustments',{date:sep+'-25',level:'product',product_id:p.id,name:p.name,qty:50,reason:'re-test'});
await DB.insert('pending_entries',{status:'pending',created_at:sep+'-26T10:00:00',kind:'sale',source_name:'lien test'});
await render();eh=$('#main').innerHTML;
if(!eh.includes('Diagnostic — le résultat'))throw new Error('diagnostic absent alors que ajustement +50 sachets gonfle le résultat');
if(!eh.includes('ajustement(s) de stock ce mois'))throw new Error('ajustements du mois non listés');
if(!eh.includes('saisie(s) encore à valider'))throw new Error('saisies à valider non signalées');
if(!eh.includes('Paie du mois non clôturée'))throw new Error('paie non clôturée non signalée');
if(!eh.includes('Détail du calcul'))throw new Error('décomposition du calcul absente');
if(eh.includes('Aucune charge directe ce mois'))throw new Error('charge loyer présente : le message aucune charge ne doit pas apparaître');
if(eh.includes('Aucun lot suspect'))throw new Error('le message générique « aucun lot suspect » doit être remplacé');
if(!eh.includes('version 35'))throw new Error('numéro de version absent du bandeau');
if(!eh.includes('Marquer comme stock de départ'))throw new Error('bouton 📦 stock de départ absent du diagnostic');
const inc6=await computeIncome(sep);
if(inc6.resultat<=inc6.ventes)throw new Error('le scénario doit produire résultat > ventes : '+inc6.resultat);
console.log('✓ Enquête auto : ajustement +50 → résultat '+inc6.resultat+' > ventes '+inc6.ventes+' ; bandeau liste ajustements, à valider, paie non clôturée, détail du calcul et version');
const stB=(await computeStats()).products.filter(x=>x.name===p.name)[0].stock;
const _cb6=confirmBox;confirmBox=(t,m,b,fn)=>fn();
await App.fixInitStock(sep);
confirmBox=_cb6;
await new Promise(r=>setTimeout(r,0));
await render();eh=$('#main').innerHTML;
if(eh.includes('Diagnostic — le résultat'))throw new Error('le diagnostic devrait disparaître après marquage stock de départ');
const inc7=await computeIncome(sep);
if(inc7.resultat!==80000)throw new Error('résultat attendu 80000 après stock de départ (loyer 10000 déduit), obtenu '+inc7.resultat);
const stA=(await computeStats()).products.filter(x=>x.name===p.name)[0].stock;
if(stA!==stB)throw new Error('le stock physique ne doit pas changer : '+stB+' → '+stA);
console.log('✓ Stock de départ : 📦 marque l ajustement +50 → résultat 80000 ≤ ventes 120000, stock inchangé ('+stA+' sachets)');
console.log('TMULTI: 7/7 OK');
})().catch(e=>{console.error('ÉCHEC TMULTI:',e.message);process.exit(1);});
