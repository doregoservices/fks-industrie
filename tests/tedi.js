;/* TEDI : fichiers EDI XML e-Impôts (syntaxe officielle DGI) — État 301 (ITS) + Annexe TVA + champs employé/fournisseur/NCC */
;(async()=>{
let lastToast=null;const _t=toast;toast=(m,t)=>{lastToast={m,t};return _t(m,t);};
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const per=monthISO();
const [yy,mm]=per.split('-');

/* 1 · sans NCC → refus clair, aucun fichier */
const caps={};const _dl=download;download=(n,b)=>{caps[n]=b;};
await App.ediITSXml(per);
if(caps['Edi_Etat301_ITS_'+per+'.xml'])throw new Error('XML généré sans NCC !');
if(!lastToast||!lastToast.m.includes('NCC'))throw new Error('message NCC attendu: '+(lastToast&&lastToast.m));
await App.ediTVAXml(per);
if(caps['Edi_Annexe_TVA_'+per+'.xml'])throw new Error('XML TVA généré sans NCC !');
console.log('✓ Sans NCC : les deux XML sont refusés avec le message « Renseignez votre NCC… »');

/* 2 · NCC renseigné + paie clôturée → État 301 XML */
await setSetting('fiscal',Object.assign({},SETS.fiscal,{ncc:'1213017L'}));
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};await render();
await App.runGen(per);
const run=(await DB.list('pay_runs',{eq:{period:per}})).filter(r=>r.status==='closed')[0]||(await DB.list('pay_runs'))[0];
await DB.update('pay_runs',run.id,{status:'closed',paid_date:todayISO()});
await App.ediITSXml(per);
const kI='Edi_Etat301_ITS_'+per+'.xml';
if(!caps[kI])throw new Error('État 301 non généré');
const xI=caps[kI].parts.join('');
const ITS_CODES=['numero_cnps','identite','emploi_qualite','code_emploi','regime_general','sexe','nationalite','loc_exp','situation_famille','nbre_enfants_charge_nat_cas','nbre_parts_igr','nbre_jours_app_paiements','mnt_sala_remune_acs','mnt_avtgs_nat_reglm','mnt_avtgs_nat_reele','sal_ttl_brut','rev_non_imposable','rev_brut_imposable','ricf','its_sal_brut','its_sal_net','mnt_indemnites','designation_indemnites'];
if(!xI.startsWith('<?xml version="1.0" encoding="UTF-8"?><EDI><informations><type>etat_301_mensuel</type><ncc>1213017L</ncc><codeTaxe>ITS</codeTaxe><mois>'+Number(mm)+'</mois><exercice>'+yy+'</exercice></informations>'))throw new Error('en-tête XML non conforme: '+xI.slice(0,180));
if(!xI.endsWith('</donnees></tableau></tableaux></EDI>'))throw new Error('pied XML non conforme');
const lig=/<ligne>(?:(?!<ligne>).)*?Bakary Traoré.*?<\/ligne>/.exec(xI);
if(!lig)throw new Error('Bakary absent de l État 301');
const codes=(lig[0].match(/<code>([^<]+)<\/code>/g)||[]).map(c=>c.slice(6,-7));
if(codes.join(',')!==ITS_CODES.join(','))throw new Error('ordre des champs non conforme: '+codes.join(','));
if(lig[0].indexOf('<code>numero_cnps</code><valeur>188021640501</valeur>')<0)throw new Error('N° CNPS de l employé absent');
if(lig[0].indexOf('<code>mnt_sala_remune_acs</code><valeur>150000</valeur>')<0)throw new Error('salaire (brut_ap) incorrect dans le XML');
if(lig[0].indexOf('TRANSPORT')<0)throw new Error('désignation indemnité TRANSPORT absente');
const nLig=(xI.match(/<ligne>/g)||[]).length;
const slips=(await DB.list('pay_slips',{eq:{run_id:run.id}}));
if(nLig!==slips.length)throw new Error('nombre de lignes: '+nLig+' vs '+slips.length+' bulletins');
if(EDI_NFR(20535.36)!=='20535,36')throw new Error('montants à virgule attendus (format DGI)');
console.log('✓ État 301 XML : en-tête/ncc/mois/exercice officiels · '+nLig+' lignes · 23 champs dans l ORDRE officiel · CNPS, salaires, RICF, ITS brut/net, TRANSPORT alimentés par la paie');

/* 3 · Annexe TVA XML */
await App.ediTVAXml(per);
const kT='Edi_Annexe_TVA_'+per+'.xml';
if(!caps[kT])throw new Error('Annexe TVA non générée');
const xT=caps[kT].parts.join('');
const TVA_CODES=['type_operation_odr','specification','date_facture','raison_sociale_fournisseur','ncc_fournisseur','pays_fournisseur','ref_facture','nature_bien_odr','date_reglement','montant_ht','montant_val_douane','montant_tva','type_redevable','prorata_deduction','montant_taxe_deductible'];
if(!xT.startsWith('<?xml version="1.0" encoding="UTF-8"?><EDI><informations><type>TVA</type><ncc>1213017L</ncc><codeTaxe>TVA</codeTaxe>'))throw new Error('en-tête TVA non conforme');
const ligT=/<ligne>.*?<\/ligne>/.exec(xT);
if(!ligT)throw new Error('annexe TVA vide');
const codesT=(ligT[0].match(/<code>([^<]+)<\/code>/g)||[]).map(c=>c.slice(6,-7));
if(codesT.join(',')!==TVA_CODES.join(','))throw new Error('ordre champs TVA non conforme: '+codesT.join(','));
if(ligT[0].indexOf('<code>type_operation_odr</code><valeur>Achats_locaux</valeur>')<0)throw new Error('type opération attendu: Achats_locaux');
if(ligT[0].indexOf('REDEVABLE TOTAL')<0||ligT[0].indexOf('<code>prorata_deduction</code><valeur>1</valeur>')<0)throw new Error('redevable/prorata absents');
if(!/<code>date_facture<\/code><valeur>\d{2}\/\d{2}\/\d{4}<\/valeur>/.test(ligT[0]))throw new Error('date facture attendue JJ/MM/AAAA');
console.log('✓ Annexe TVA XML : 15 champs dans l ORDRE officiel · Achats_locaux · REDEVABLE TOTAL · prorata 1 · dates JJ/MM/AAAA');

/* 4 · achat avec NCC fournisseur → propagé dans le XML */
$('#aD').value=todayISO();$('#aS').value='SIVOM SARL';$('#aNc').value='0175265N';$('#aQ').value='100';$('#aP').value='500';$('#aT').value='50000';$('#aM').value='cash';$('#aN').value='Test EDI';
const nAvant=(await DB.list('purchases')).length;
await App.achatSave();
const achats=(await DB.list('purchases'));
if(achats.length!==nAvant+1)throw new Error('achat non enregistré');
const aNouveau=achats.filter(a=>a.supplier==='SIVOM SARL')[0];
if(!aNouveau||aNouveau.ncc_suppl!=='0175265N')throw new Error('NCC fournisseur non sauvegardé: '+(aNouveau&&aNouveau.ncc_suppl));
await App.ediTVAXml(per);
const xT2=caps[kT].parts.join('');
const ligS=/<ligne>(?:(?!<ligne>).)*?SIVOM SARL.*?<\/ligne>/.exec(xT2);
if(!ligS)throw new Error('achat SIVOM absent du XML TVA');
if(ligS[0].indexOf('<code>ncc_fournisseur</code><valeur>0175265N</valeur>')<0)throw new Error('NCC fournisseur absent du XML');
console.log('✓ Achat : champ NCC fournisseur enregistré et transmis dans l annexe TVA XML');

/* 5 · fiche employé : nouveaux champs DGI */
$('#eN').value='TEST DGI';$('#eP').value='Comptable';$('#eM').value='';$('#eH').value=todayISO();$('#eS').value='monthly';$('#eB').value='200000';$('#eTr').value='0';$('#eHo').value='0';$('#eSh').value='3';$('#eZ').value='abidjan';
$('#eCnps').value='199912345678';$('#eSexe').value='F';$('#eNat').value='AA';$('#eLoc').value='E';$('#eSit').value='M';$('#eEnf').value='2';$('#eCE').value='CM';
await App.empSave();
const eDgi=(await DB.list('employees')).filter(x=>x.name==='TEST DGI')[0];
if(!eDgi)throw new Error('employé non créé');
if(eDgi.cnps!=='199912345678'||eDgi.sexe!=='F'||eDgi.nationalite!=='AA'||eDgi.loc_exp!=='E'||eDgi.situation!=='M'||Number(eDgi.enfants)!==2||eDgi.code_emploi!=='CM')throw new Error('champs DGI non sauvegardés: '+JSON.stringify({cnps:eDgi.cnps,sexe:eDgi.sexe,nat:eDgi.nationalite,loc:eDgi.loc_exp,sit:eDgi.situation,enf:eDgi.enfants,ce:eDgi.code_emploi}));
console.log('✓ Fiche employé : N° CNPS, sexe, nationalité, local/expatrié, situation, enfants, code emploi enregistrés');

/* 6 · boutons visibles dans l écran Exports (attendre le render() non attendu de empSave) */
await new Promise(r=>setTimeout(r,10));
location.hash='#/exports';S.route='exports';await render();
const h=$('#main').innerHTML;
if(h.indexOf('XML e-Impôts — État 301 (EDI)')<0||h.indexOf('XML e-Impôts — Annexe TVA (EDI)')<0)throw new Error('boutons XML e-Impôts absents de l écran Exports');
if(h.indexOf('Annexe ITS DGI (Excel)')<0)throw new Error('bouton Excel d origine disparu');
console.log('✓ Écran Exports : les 2 boutons « 📋 XML e-Impôts (EDI) » à côté des annexes Excel et le pont Sage');

download=_dl;toast=_t;
console.log('TEDI: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TEDI:',e.message);process.exit(1);});
