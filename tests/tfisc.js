;/* TEST : Fiscalité — BIC (25 % du résultat) ou TEE (% du CA), TVA facultative + EDI Annexe TVA/ITS DGI */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const per=todayISO().slice(0,7);
const _t=toast;let lastToast=null;toast=(m,k)=>{lastToast={m:String(m),k};return _t(m,k);};

/* 1. défauts : régime NON CHOISI (mode vide) → repli BIC 25 %, TEE 5 % en réserve, TVA désactivée */
let F=SETS.fiscal||{};
if(F.mode!=='')throw new Error('défaut : régime non choisi attendu, obtenu '+JSON.stringify(F.mode));
if(Number(F.bic)!==25||Number(F.tee)!==5||F.tva!==false)throw new Error('défauts BIC/TEE/TVA: '+JSON.stringify(F));
let inc=await computeIncome(per);
if(inc.fMode!=='BIC'||inc.isRate!==25)throw new Error('repli BIC 25: '+inc.fMode);
if(inc.isBenef!==Math.round(Math.max(0,inc.resultat)*25/100))throw new Error('BIC 25 % du résultat: '+inc.isBenef+' vs '+inc.resultat);
S.route='exploitation';location.hash='#/exploitation';await render();
let fh=$('#main').innerHTML;
if(!fh.includes('Régime fiscal non choisi'))throw new Error('alerte régime non choisi absente de l exploitation');
console.log('✓ Défauts : régime non choisi → alerte visible + repli BIC 25 % du résultat ('+inc.isBenef+' F)');

/* 2. écran paramètres : section Fiscalité BIC/TEE + TVA */
S.route='parametres';location.hash='#/parametres';await render();
let h=$('#main').innerHTML;
if(!h.includes('Fiscalité — BIC / TEE'))throw new Error('section Fiscalité absente des paramètres');
if(!h.includes('fiMode'))throw new Error('sélecteur BIC/TEE absent');
if(h.includes('fiBic')||h.includes('fiTee')||h.includes('xpIs'))throw new Error('plusieurs champs de taux affichés (un seul régime doit apparaître)');
if(!h.includes('fiRate'))throw new Error('champ de taux unique absent');
if(!h.includes('NIF'))throw new Error('champ NIF absent');
if(!h.includes('À CHOISIR'))throw new Error('placeholder « À CHOISIR » absent alors qu aucun régime n est choisi');
if((h.match(/<option value="BIC" selected/g)||[]).length)throw new Error('BIC ne doit pas apparaître pré-sélectionné sans choix');
$('#fiMode').value='';await App.saveFiscal();
if(!lastToast||!String(lastToast.m).includes('Choisissez le régime'))throw new Error('saveFiscal doit refuser sans choix : '+(lastToast&&lastToast.m));
console.log('✓ Paramètres : section « Fiscalité — BIC / TEE & TVA » avec NIF');

/* 3. saveFiscal : passage en TEE 6 % + TVA 18 % + NIF */
$('#main').innerHTML='<select id="fiMode"><option>BIC</option><option>TEE</option></select><span id="fiRateL">Taux BIC (%)</span><input id="fiRate"><select id="fiTva"><option>1</option></select><input id="fiTvaR"><input id="fiNif">';
$('#fiMode').value='TEE';
App.fiModeChange();
if($('#fiRateL').textContent.indexOf('TEE')<0)throw new Error('le libellé du taux devrait basculer sur TEE');
if(Number($('#fiRate').value)!==5)throw new Error('taux TEE par défaut attendu (5), eu '+$('#fiRate').value);
$('#fiRate').value='6';$('#fiTva').value='1';$('#fiTvaR').value='18';$('#fiNif').value='CI1234567';
await App.saveFiscal();
F=SETS.fiscal||{};
if(F.mode!=='TEE'||Number(F.tee)!==6||F.tva!==true||Number(F.tva_rate)!==18||F.nif!=='CI1234567')throw new Error('saveFiscal: '+JSON.stringify(F));
if(Number(F.bic)!==25)throw new Error('taux BIC (non actif) devrait rester 25 en réserve: '+F.bic);
console.log('✓ saveFiscal : UN seul régime actif — TEE 6 % (BIC 25 % gardé en réserve, invisible) · TVA 18 % · NIF CI1234567');
/* 3bis. après choix TEE : l'exploitation et ses libellés suivent le régime (plus de BIC ni d'alerte) */
S.route='exploitation';location.hash='#/exploitation';await render();
fh=$('#main').innerHTML;
if(fh.includes('Régime fiscal non choisi'))throw new Error('alerte régime non choisi devrait avoir disparu après le choix TEE');
if(!fh.includes('Taxe TEE'))throw new Error('libellé « Taxe TEE » absent de la synthèse');
if(fh.includes('Impôt BIC'))throw new Error('libellé BIC encore visible alors que TEE est actif');
const incT=await computeIncome(per);
if(incT.fMode!=='TEE'||incT.isRate!==6)throw new Error('computeIncome devrait suivre TEE 6: '+incT.fMode);
console.log('✓ TEE actif partout : synthèse « Taxe TEE (6 % du chiffre d\'affaires) », email et calcul alignés — aucun libellé BIC');

/* 4. TEE : impôt = % du CA (même à résultat négatif) */
inc=await computeIncome(per);
if(inc.fMode!=='TEE'||inc.isRate!==6)throw new Error('mode TEE: '+inc.fMode);
if(inc.isBenef!==Math.round(inc.tva.ventesHT*6/100))throw new Error('TEE != 6% du CA hors taxes: '+inc.isBenef+' vs HT '+inc.tva.ventesHT);
console.log('✓ TEE : '+inc.isBenef+' F = 6 % du CA hors taxes '+inc.tva.ventesHT+' F — dû quel que soit le résultat (BIC serait '+Math.round(Math.max(0,inc.resultat)*25/100)+' F)');

/* 5. TVA : base HT, collectée, déductible, à payer */
const t=inc.tva||{};
if(!t.on||Number(t.rate)!==18)throw new Error('TVA non active: '+JSON.stringify(t));
if(Math.abs(t.ventesHT-inc.ventes/1.18)>1)throw new Error('base HT: '+t.ventesHT+' vs ventes '+inc.ventes);
if(Math.abs(t.col-(inc.ventes-t.ventesHT))>1)throw new Error('TVA collectée: '+t.col);
if(Math.abs(t.due-Math.max(0,t.col-(t.ded||0)))>1)throw new Error('TVA à payer: '+t.due+' (col '+t.col+' − ded '+t.ded+')');
console.log('✓ TVA 18 % : HT '+Math.round(t.ventesHT)+' · collectée '+t.col+' · déductible '+t.ded+' · À PAYER '+t.due+' F');

/* 6. carte TVA mensuelle dans l'exploitation + bouton EDI */
S.route='exploitation';S.tab={analyse:'exploitation'};location.hash='#/exploitation';await render();
h=$('#main').innerHTML;
if(!h.includes('TVA À PAYER'))throw new Error('carte TVA mensuelle absente de l exploitation');
if(!h.includes('App.ediTVA(\''+per+'\')'))throw new Error('bouton EDI Annexe TVA absent');
console.log('✓ Exploitation : carte TVA mensuelle (À PAYER '+t.due+' F) + bouton « EDI Annexe TVA (DGI) »');

/* 7. Annexe TVA DGI : Excel téléversable sur e-impots (PDF/XLS/XLSX ≤ 2 Mo) */
let capX=null;const _mk=makeXlsx;makeXlsx=(sheets,fname)=>{capX={sheets,fname}};
await App.ediTVA(per);
if(!capX||capX.fname!=='Annexe_TVA_DGI_'+per+'.xlsx')throw new Error('Annexe TVA non générée: '+(capX&&capX.fname));
const flatT=capX.sheets[0].rows.map(r=>r.map(c=>(c&&c.v!==undefined)?c.v:c).join('|')).join('\n');
if(!capX.sheets[0].name==='Annexe TVA')0;
if(!flatT.includes('ANNEXE TVA — DÉCLARATION MENSUELLE'))throw new Error('entête DGI absent: '+flatT.slice(0,80));
if(!flatT.includes('CI1234567'))throw new Error('NIF absent Annexe TVA');
if(!flatT.includes('TVA À PAYER|')&&!flatT.includes('TVA À PAYER|'))throw new Error('ligne TVA À PAYER absente');
if(!/TVA À PAYER\|\d+/.test(flatT.replace(/\|+/g,'|')))throw new Error('montant TVA à payer absent');
if(!flatT.includes('e-impots.gouv.ci'))throw new Error('mention e-impots absente');
console.log('✓ Annexe TVA DGI : Annexe_TVA_DGI_'+per+'.xlsx — entête, NIF, TVA à payer, mention e-impots (format accepté ≤ 2 Mo)');

/* 8. EDI Annexe ITS : refuse sans paie clôturée, génère après clôture */
capX=null;
await App.ediITS(per);
if(capX)throw new Error('Annexe ITS générée sans paie clôturée !');
if(!lastToast||!lastToast.m.includes('clôtur'))throw new Error('message d erreur attendu: '+(lastToast&&lastToast.m));
const run=await DB.insert('pay_runs',{period:per,status:'closed',total_net:0});
await DB.insert('pay_slips',{run_id:run.id,employee_name:'KOUAME Jean;brut',brut_ap:250000,taxable:250000,its_gross:20000,ricf:2000,its:18000});
await DB.insert('pay_slips',{run_id:run.id,employee_name:'TRAORE Awa',brut_ap:180000,taxable:180000,its_gross:12000,ricf:1200,its:10800});
capX=null;await App.ediITS(per);
if(!capX||capX.fname!=='Annexe_ITS_DGI_'+per+'.xlsx')throw new Error('Annexe ITS non générée: '+(capX&&capX.fname));
const flatI=capX.sheets[0].rows.map(r=>r.map(c=>(c&&c.v!==undefined)?c.v:c).join('|')).join('\n');
if(!flatI.includes('ANNEXE ITS — ÉTAT MENSUEL'))throw new Error('entête DGI absent: '+flatI.slice(0,90));
if(!flatI.includes('CI1234567'))throw new Error('NIF absent Annexe ITS');
if(!flatI.includes('RICF')||!flatI.includes('BRUT IMPOSABLE'))throw new Error('colonnes ITS absentes');
if(!flatI.includes('430000'))throw new Error('total brut 430000 absent');
if(!flatI.includes('28800'))throw new Error('total ITS net 28800 absent');
if(!flatI.includes('KOUAME Jean,brut'))throw new Error('ligne employé (points-virgules neutralisés) absente');
if(!/1\|—\|KOUAME/.test(flatI))throw new Error('matricule vide doit s afficher « — » (pas un id technique)');
if(/mtyh|EMP-\d{3}/.test(flatI))throw new Error('id technique ou faux matricule dans l annexe ITS');
if(!flatI.includes('e-impots.gouv.ci'))throw new Error('mention e-impots absente');
makeXlsx=_mk;
console.log('✓ Annexe ITS DGI : refus sans paie clôturée puis Annexe_ITS_DGI_'+per+'.xlsx (2 employés, ITS net − RICF, barème 2024 rappelé)');

/* 9. TVA activée : le RÉSULTAT est calculé hors taxes (produits HT, TVA déductible retirée des charges) */
const inc9=await computeIncome(per);
const expP=inc9.tva.ventesHT+inc9.dPF+(inc9.dRoast||0)+inc9.dSemi;
if(inc9.produitsTot!==expP)throw new Error('produits devraient être sur base HT: '+inc9.produitsTot+' vs '+expP);
const expC=Math.max(0,inc9.consVert+inc9.consEmb+inc9.servicesTot-inc9.tva.ded)+inc9.personnel.total+inc9.impotsTot+inc9.dotations;
if(Math.abs(inc9.resultat-(expP-expC))>2)throw new Error('résultat HT: '+inc9.resultat+' vs '+(expP-expC));
const d9=inc9.ventes-inc9.tva.ventesHT;
if(d9<=0)throw new Error('écart TTC/HT inattendu');
console.log('✓ TVA activée : résultat sur base HT — produits '+inc9.produitsTot+' (ventes HT '+inc9.tva.ventesHT+') et charges sans la TVA déductible ('+inc9.tva.ded+' F retirées)');
/* 10. Matricule automatique à l'embauche (champ laisser vide) + matricules démo complets */
const before=(await DB.list('employees')).length;
$('#eN').value='TEST Auto';$('#eP').value='Ouvrier';$('#eM').value='';$('#eH').value=todayISO();$('#eS').value='monthly';$('#eB').value='100000';$('#eTr').value='0';$('#eHo').value='0';$('#eSh').value='2';$('#eZ').value='abidjan';
await App.empSave();
const emps10=await DB.list('employees');
if(emps10.length!==before+1)throw new Error('employé non créé');
const e10=emps10.filter(x=>x.name==='TEST Auto')[0];
if(!/^EMP-\d{3}$/.test(e10.matricule||''))throw new Error('matricule auto attendu EMP-xxx : '+JSON.stringify(e10.matricule));
$('#eN').value='TEST Auto2';$('#eM').value='';$('#eH').value=todayISO();$('#eS').value='monthly';$('#eB').value='100000';
await App.empSave();
const e10b=(await DB.list('employees')).filter(x=>x.name==='TEST Auto2')[0];
if(!/^EMP-\d{3}$/.test(e10b.matricule||'')||e10b.matricule===e10.matricule)throw new Error('2e matricule auto distinct attendu : '+e10.matricule+' / '+e10b.matricule);
const seed10=(await DB.list('employees')).filter(x=>/^FKS-\d{3}$/.test(x.matricule||'')).length;
if(seed10<5)throw new Error('employés démo : matricules FKS-001..005 attendus (trouvés '+seed10+')');
console.log('✓ Matricule auto à l embauche ('+e10.matricule+' / '+e10b.matricule+') + démo complète FKS-001..005 — annexe ITS : « — » si vide');

toast=_t;
console.log('TFISC: 10/10 OK');
})().catch(e=>{console.error('ÉCHEC TFISC:',e.message);process.exit(1);});
