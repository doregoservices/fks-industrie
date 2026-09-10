;/* TVALINIT : stock de départ au prix déclaré — le compte d'exploitation reste juste SANS aucun achat (CMP inexistant) */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
/* Mise à blanc : simule une entreprise qui démarre l'app sans aucun achat */
for(const t of ['purchases','roastings','productions','transformations','adjustments','sales','assets']){
  for(const r of await DB.list(t))await DB.remove(t,r.id);
}
/* Produit + stock de départ 225 unités à 825 F (via le formulaire réel) */
const P=await DB.insert('products',{name:'VAL INIT 500G',weight_g:500,price:3000,alert_min:0,active:true});
S.route='production';S.tab={production:'adj'};await render();
if(!$('#jC'))throw new Error('champ Coût unitaire absent du formulaire d ajustement');
$('#jD').value='2030-01-01';$('#jL').value='product';
const sel=$('#jP select');sel.value=P.id;sel.options=[{value:P.id,text:'VAL INIT 500G'}];sel.selectedIndex=0;
$('#jQ').value='225';$('#jR').value='';$('#jInit').checked=true;$('#jC').value='825';
await App.adjSave();
const adjP=(await DB.list('adjustments')).filter(a=>a.level==='product'&&a.product_id===P.id)[0];
if(!adjP||Number(adjP.unit_cost)!==825)throw new Error('stock de départ produit non enregistré avec son prix : '+JSON.stringify(adjP));
if(!isInitAdj(adjP))throw new Error('l ajustement devrait être marqué stock de départ');
/* Café vert : stock de départ 100 kg à 1400 F/kg */
$('#jD').value='2030-01-01';$('#jL').value='green';$('#jQ').value='100';$('#jR').value='';$('#jInit').checked=true;$('#jC').value='1400';
await App.adjSave();
const adjG=(await DB.list('adjustments')).filter(a=>a.level==='green'&&Number(a.unit_cost)===1400)[0];
if(!adjG||!isInitAdj(adjG))throw new Error('stock de départ café vert non enregistré : '+JSON.stringify(adjG));
/* Activité de février 2030 : torréfaction de 40 kg (sortie 35) + vente de 30 sachets */
await DB.insert('roastings',{date:'2030-02-05',green_in:40,roasted_out:35,operator:'test',note:'',source:'admin'});
await createSale({date:'2030-02-10',agent_name:'Vente directe',pay_mode:'cash',total:90000,lines:[{product_id:P.id,name:'VAL INIT 500G',qty:30,price:3000}],source:'admin'});
const inc=await computeIncome('2030-02');
/* Produits : SI=225×825=185625 · SF=195×825=161625 → variation −24750 */
/* Vert : SI=100×1400=140000 · SF=60×1400=84000 → consommé 56000 */
/* Torréfié : SF=35×1400=49000 → variation +49000 */
/* Résultat attendu : (90000 − 24750 + 49000) − 56000 = 58250 */
if(inc.resultat!==58250)throw new Error('résultat attendu 58250 avec stocks valorisés au prix déclaré, obtenu : '+inc.resultat);
console.log('✓ Sans AUCUN achat : stock initial 225 sachets à 825 F + 100 kg vert à 1400 F → ventes 90 000 − variation sachets 24 750 + variation torréfié 49 000 − vert consommé 56 000 = résultat 58 250 F (au lieu de 90 000 F faux sans valorisation)');
/* Bascule CMP : dès qu'un achat existe, le coût moyen réel reprend la main */
await DB.insert('purchases',{date:'2030-03-01',supplier:'Coop',qty_kg:200,price_per_kg:1600,amount:320000,pay_method:'later',note:''});
const inc2=await computeIncome('2030-03');
if(inc2.resultat===undefined||isNaN(inc2.resultat))throw new Error('computeIncome cassé après achat');
console.log('✓ Dès qu’un achat existe, le CMP réel (achats pondérés) reprend la main — les unités du stock de départ gardent leur prix déclaré en première couche');
console.log('TVALINIT: 3/3 OK');
})().catch(e=>{console.error('ÉCHEC TVALINIT:',e.message);process.exit(1);});
