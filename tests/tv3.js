;(async()=>{
await loadSettings();
await seedDemo();
S.user={name:'test'};
const per=todayISO().slice(0,7);

/* ===== 1. AMORTISSEMENTS ===== */
const assets=await DB.list('assets');
if(assets.length<2)throw new Error('immobilisations démo manquantes');
const tor=assets.filter(a=>a.name==='Torréfacteur industriel')[0];
const geo=assets.filter(a=>a.name==='Groupe électrogène')[0];
if(assetMonthlyDep(tor,per)!==41667)throw new Error('dotation torréfacteur: '+assetMonthlyDep(tor,per));
if(assetMonthlyDep(geo,per)!==25000)throw new Error('dotation électrogène: '+assetMonthlyDep(geo,per));
// pas encore acquis
if(assetMonthlyDep(tor,'2019-01')!==0)throw new Error('avant acquisition');
// fin d'amortissement : torréfacteur épuisé après 96 mois
const torEnd=monthAdd(String(tor.acq_date).slice(0,7),96);
if(assetMonthlyDep(tor,torEnd)!==Math.min(41667,4000000-assetCumulDep(tor,monthAdd(torEnd,-1))))throw new Error('dernière dotation');
if(assetMonthlyDep(tor,monthAdd(torEnd,1))!==0)throw new Error('dotation après fin');
if(assetCumulDep(tor,torEnd)!==4000000)throw new Error('cumul final: '+assetCumulDep(tor,torEnd));
const vnc=Number(tor.cost)-assetCumulDep(tor,per);
if(vnc<=0||vnc>=Number(tor.cost))throw new Error('VNC incohérente: '+vnc);
console.log('✓ Amortissements : torréfacteur 41 667/mois, électrogène 25 000/mois, cumul plafonné, VNC',money(vnc));

/* ===== 2. GRANDES MASSES + IMPÔTS ===== */
// patente payée ce mois (impôts et taxes)
await createCashEntry({date:todayISO(),type:'out',account:'cash',category:'impots_taxes',label:'Patente communale',amount:120000,imputable:true});
// loyer du mois
await createCashEntry({date:todayISO(),type:'out',account:'cash',category:'loyer',label:'Loyer entrepôt',amount:250000,imputable:true});
let inc=await computeIncome(per);
if(inc.impotsTot!==120000)throw new Error('impôts: '+inc.impotsTot);
if(!inc.services['loyer']||inc.services.loyer!==250000)throw new Error('loyer: '+JSON.stringify(inc.services));
if(inc.dotations!==66667)throw new Error('dotations: '+inc.dotations);
const chargesMan=inc.consVert+inc.consEmb+inc.servicesTot+inc.personnel.total+inc.impotsTot+inc.dotations;
if(inc.chargesTot!==chargesMan)throw new Error('total charges');
if(inc.resultat!==inc.produitsTot-inc.chargesTot)throw new Error('résultat');
if(inc.isBenef!==0)throw new Error('pas d\'impôt sur perte: '+inc.isBenef);
if(inc.caf!==inc.resultatNet+inc.dotations)throw new Error('CAF');
console.log('✓ Grandes masses : loyer en services externes, patente en impôts/taxes, dotations',inc.dotations,'| résultat',inc.resultat,'| CAF',inc.caf);

/* ===== 3. RÉSULTAT POSITIF → IMPÔT 25 % ===== */
const p1=(await DB.list('products')).filter(p=>p.name==='Café grain 1 kg')[0];
for(let i=0;i<15;i++)await createSale({date:todayISO(),agent_id:'direct',agent_name:'Vente directe',pay_mode:'cash',client:'',total:60000,lines:[{product_id:p1.id,name:p1.name,qty:6,price:10000}],source:'admin'});
inc=await computeIncome(per);
if(inc.resultat<=0)throw new Error('devrait être positif: '+inc.resultat);
if(inc.isBenef!==Math.round(inc.resultat*0.25))throw new Error('IS: '+inc.isBenef);
if(inc.resultatNet!==inc.resultat-inc.isBenef)throw new Error('net');
if(inc.ebe!==inc.resultat+inc.dotations)throw new Error('EBE');
console.log('✓ Impôt bénéfices : résultat',inc.resultat,'− IS 25 %',inc.isBenef,'= net',inc.resultatNet,'| EBE',inc.ebe,'| CAF',inc.caf);

/* ===== 4. TRÉSORERIE / CASH-FLOW ===== */
const cashM=(await DB.list('cash_entries')).filter(e=>e.date>=per+'-01'&&e.date<monthAdd(per,1)+'-01');
const manEn=cashM.filter(e=>e.type==='in'&&e.imputable!==false).reduce((a,e)=>a+Number(e.amount||0),0);
const manDe=cashM.filter(e=>e.type==='out'&&e.imputable!==false).reduce((a,e)=>a+Number(e.amount||0),0);
const manOd=cashM.filter(e=>e.imputable===false).reduce((a,e)=>a+(e.type==='in'?1:-1)*Number(e.amount||0),0);
if(inc.encaiss!==manEn||inc.decaiss!==manDe||inc.odNet!==manOd)throw new Error('trésorerie: '+inc.encaiss+'/'+manEn+' '+inc.decaiss+'/'+manDe+' '+inc.odNet+'/'+manOd);
if(inc.fluxTreso!==manEn-manDe+manOd)throw new Error('flux');
console.log('✓ Cash-flow trésorerie : encaissé',inc.encaiss,'− décaissé',inc.decaiss,'+ OD',inc.odNet,'= flux net',inc.fluxTreso);

/* ===== 5. CLASSEUR MENSUEL COMPLET ===== */
const blob=await monthlyWorkbook(inc);
const ab=await blob.arrayBuffer();
if(ab.byteLength<6000)throw new Error('classeur trop petit');
const html=await monthlyHtml(inc);
if(html.indexOf('CAF')<0||html.indexOf('amortissements')<0)throw new Error('email incomplet');
console.log('✓ Classeur mensuel ('+ab.byteLength+' octets, avec Immobilisations + Cash-flow) et email récap');

/* ===== 6. NAVIGATION 15 ÉCRANS ===== */
const routes3=['dashboard','validation','achats','production','produits','ventes','commerciaux','emballages','immobilisations','impayes','caisse','paie','exploitation','exports','parametres'];
const rm={dashboard:scDashboard,validation:scValidation,achats:scAchats,production:scProduction,produits:scProduits,ventes:scVentes,commerciaux:scCommerciaux,emballages:scEmballages,immobilisations:scAssets,impayes:scImpayes,caisse:scCaisse,paie:scPaie,exploitation:scExploitation,exports:scExports,parametres:scParametres};
for(const r of routes3){await rm[r]();}
console.log('✓ 15 écrans rendus sans erreur');

/* ===== 7. RÉGRESSIONS PAIE + STOCKS ===== */
const st=await computeStats();
if(st.greenStock<0)throw new Error('stock vert');
const s2=computeSlip({name:'X',base_salary:400000,transport:0,housing:0,salary_type:'monthly',tax_shares:2},{});
if(s2.net!==325300)throw new Error('paie v2 régression');
console.log('✓ Régressions OK (paie + stocks)');
console.log('');
console.log('=== TOUS LES TESTS v3 PASSENT ===');
})().catch(e=>{console.error('ECHEC:',e.message,(e.stack||'').split(String.fromCharCode(10))[1]);process.exit(1);});
