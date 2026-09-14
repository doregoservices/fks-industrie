;/* TEDI : fichiers EDI XML e-Impôts — CONFORMITÉ STRICTE au générateur officiel DGI (macro MiseEnFormeEDI) :
   CRLF un élément par ligne, accents supprimés, MAJUSCULES État 301, remplacements & ( ) % € °, nom NCC-EDI-type-date.xml */
;(async()=>{
let lastToast=null;const _t=toast;toast=(m,t)=>{lastToast={m,t};return _t(m,t);};
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const per=monthISO();
const [yy,mm]=per.split('-');
const caps={};const _dl=download;download=(n,b)=>{caps[n]=b;};
const findCap=re=>Object.keys(caps).filter(k=>re.test(k));

/* 1 · sans NCC → refus */
await App.ediITSXml(per);
if(findCap(/Etat301|EDI-etat_301/).length)throw new Error('XML généré sans NCC !');
if(!lastToast||!lastToast.m.includes('NCC'))throw new Error('message NCC attendu');
console.log('✓ Sans NCC : refus clair, aucun fichier');

/* 2 · paie clôturée → État 301 conforme */
await setSetting('fiscal',Object.assign({},SETS.fiscal,{ncc:'1900000X'}));
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};await render();
await App.runGen(per);
const run=(await DB.list('pay_runs'))[0];
await DB.update('pay_runs',run.id,{status:'closed',paid_date:todayISO()});
await App.ediITSXml(per);
const kI=findCap(/^1900000X-EDI-etat_301_mensuel-\d{8}-\d{4}\.xml$/);
if(!kI.length)throw new Error('nom de fichier DGI attendu NCC-EDI-etat_301_mensuel-aaaammjj-hhmm.xml : '+Object.keys(caps).join(', '));
const xI=caps[kI[0]].parts.join('');
/* structure : un élément par ligne, CRLF, fin de fichier CRLF */
if(!xI.endsWith('\r\n'))throw new Error('le fichier doit finir par CRLF (writeline DGI)');
const lignesF=xI.slice(0,-2).split('\r\n');
if(lignesF.some(l=>!l))throw new Error('pas de ligne vide attendue (tri DGI)');
if(!lignesF[0].startsWith('<?xml version="1.0" encoding="UTF-8"?><EDI><informations><type>etat_301_mensuel</type><ncc>1900000X</ncc><codeTaxe>ITS</codeTaxe><mois>'+Number(mm)+'</mois><exercice>'+yy+'</exercice></informations>'))throw new Error('en-tête non conforme : '+lignesF[0].slice(0,180));
if(lignesF[lignesF.length-1]!=='</donnees></tableau></tableaux></EDI>')throw new Error('pied non conforme');
const nEmp=(await DB.list('pay_slips',{eq:{run_id:run.id}})).length;
if(lignesF.length!==nEmp+2)throw new Error('attendu '+(nEmp+2)+' lignes de fichier (en-tête+'+nEmp+' salariés+pied), obtenu '+lignesF.length);
/* ligne Bakary : MAJUSCULES + SANS ACCENT (UPPER + remplacements macro DGI) */
const ligB=lignesF.filter(l=>l.indexOf('BAKARY TRAORE')>=0)[0];
if(!ligB)throw new Error('identite attendue « BAKARY TRAORE » (majuscules, accent supprimé)');
if(ligB.indexOf('TORREFACTEUR')<0)throw new Error('emploi_qualite attendu « TORREFACTEUR » (majuscules sans accent)');
if(ligB.indexOf('<code>numero_cnps</code><valeur>188021640501</valeur>')<0)throw new Error('CNPS absent');
if(ligB.indexOf('<code>mnt_sala_remune_acs</code><valeur>150000</valeur>')<0)throw new Error('salaire incorrect');
/* aucun caractère accentué ni interdit dans TOUT le fichier */
if(/[éèêëàâäãôöîïûùüçÉÈÊËÀÂÄÃÔÖÎÏÛÙÜÇ€°œ²¤£$%§]/.test(xI))throw new Error('caractère interdit présent (la macro DGI les supprime tous)');
if(xI.indexOf('&')>=0||xI.indexOf('(')>=0||xI.indexOf(')')>=0)throw new Error('& ou parenthèse présents (DGI : &→ET, ( )→espaces)');
/* 23 champs dans l ordre officiel */
const ITS_CODES=['numero_cnps','identite','emploi_qualite','code_emploi','regime_general','sexe','nationalite','loc_exp','situation_famille','nbre_enfants_charge_nat_cas','nbre_parts_igr','nbre_jours_app_paiements','mnt_sala_remune_acs','mnt_avtgs_nat_reglm','mnt_avtgs_nat_reele','sal_ttl_brut','rev_non_imposable','rev_brut_imposable','ricf','its_sal_brut','its_sal_net','mnt_indemnites','designation_indemnites'];
const codes=(ligB.match(/<code>([^<]+)<\/code>/g)||[]).map(c=>c.slice(6,-7));
if(codes.join(',')!==ITS_CODES.join(','))throw new Error('ordre des champs non conforme');
console.log('✓ État 301 : fichier NCC-EDI-etat_301_mensuel-*.xml · un élément par ligne (CRLF) · en-tête/pied officiels · '+nEmp+' salariés · 23 champs dans l ordre · MAJUSCULES et zéro accent (BAKARY TRAORE / TORREFACTEUR)');

/* 3 · salarié sans CNPS → ignoré + avertissement (comme le générateur DGI) */
const emps=await DB.list('employees');
const bak=emps.filter(e=>e.name==='Bakary Traoré')[0];
await DB.update('employees',bak.id,Object.assign({},bak,{cnps:''}));
await App.ediITSXml(per);
const xI2=caps[kI[0]].parts.join('');
const n2=xI2.slice(0,-2).split('\r\n').length;
if(n2!==lignesF.length-1)throw new Error('le salarié sans CNPS doit être ignoré (attendu '+(lignesF.length-1)+' lignes, obtenu '+n2+')');
if(!lastToast||!lastToast.m.includes('ignoré'))throw new Error('avertissement ⚠ sans n° CNPS attendu : '+(lastToast&&lastToast.m));
await DB.update('employees',bak.id,Object.assign({},bak,{cnps:'188021640501'}));
console.log('✓ Salarié sans n° CNPS : ligne ignorée + avertissement « ⚠ ignoré(s) sans n° CNPS » (comportement du générateur DGI)');

/* 4 · Annexe TVA conforme */
await App.ediTVAXml(per);
const kT=findCap(/^1900000X-EDI-TVA-\d{8}-\d{4}\.xml$/);
if(!kT.length)throw new Error('nom de fichier DGI attendu NCC-EDI-TVA-aaaammjj-hhmm.xml : '+Object.keys(caps).join(', '));
const xT=caps[kT[0]].parts.join('');
const lignesT=xT.slice(0,-2).split('\r\n');
if(!lignesT[0].startsWith('<?xml version="1.0" encoding="UTF-8"?><EDI><informations><type>TVA</type><ncc>1900000X</ncc><codeTaxe>TVA</codeTaxe>'))throw new Error('en-tête TVA non conforme');
const TVA_CODES=['type_operation_odr','specification','date_facture','raison_sociale_fournisseur','ncc_fournisseur','pays_fournisseur','ref_facture','nature_bien_odr','date_reglement','montant_ht','montant_val_douane','montant_tva','type_redevable','prorata_deduction','montant_taxe_deductible'];
const lig1=lignesT[1];
const codesT=(lig1.match(/<code>([^<]+)<\/code>/g)||[]).map(c=>c.slice(6,-7));
if(codesT.join(',')!==TVA_CODES.join(','))throw new Error('ordre champs TVA non conforme');
if(lig1.indexOf('<valeur>Cooperative de Man</valeur>')<0)throw new Error('raison sociale : accents supprimés attendus (« Cooperative de Man »)');
if(lig1.indexOf('Achats_locaux')<0||lig1.indexOf('REDEVABLE TOTAL')<0||lig1.indexOf('<code>prorata_deduction</code><valeur>1</valeur>')<0)throw new Error('referentiels TVA absents');
if(!/<code>date_facture<\/code><valeur>\d{2}\/\d{2}\/\d{4}<\/valeur>/.test(lig1))throw new Error('date JJ/MM/AAAA attendue');
console.log('✓ Annexe TVA : fichier NCC-EDI-TVA-*.xml · 15 champs dans l ordre · accents supprimés (Cooperative de Man) · référentiels DGI');

/* 5 · remplacements spéciaux macro : & ( ) % € */
$('#aD').value=todayISO();$('#aS').value='Café & Co (Abidjan)';$('#aNc').value='0175265N';$('#aQ').value='100';$('#aP').value='500';$('#aT').value='50000';$('#aM').value='cash';$('#aN').value='Lot n°1 — 50% du stock';
await App.achatSave();
await App.ediTVAXml(per);
const xT3=caps[kT[0]].parts.join('');
const ligS=xT3.slice(0,-2).split('\r\n').filter(l=>l.indexOf('Cafe ET Co')>=0)[0];
if(!ligS)throw new Error('« Café & Co (Abidjan) » doit devenir « Cafe ET Co  Abidjan »');
if(ligS.indexOf('Cafe ET Co  Abidjan')<0)throw new Error('transformation attendue : Cafe ET Co  Abidjan — obtenu : '+ligS.slice(0,200));
if(ligS.indexOf('Lot nO1')<0||ligS.indexOf('50pourcentage')<0)throw new Error('° → O et % → pourcentage attendus');
if(ligS.indexOf('ncc_fournisseur</code><valeur>0175265N</valeur>')<0)throw new Error('NCC fournisseur attendu');
console.log('✓ Remplacements macro DGI : « Café & Co (Abidjan) » → « Cafe ET Co  Abidjan » · n° → nO · 50% → 50pourcentage · & → ET');

/* 6 · boutons */
await new Promise(r=>setTimeout(r,10));
location.hash='#/exports';S.route='exports';await render();
const h=$('#main').innerHTML;
if(h.indexOf('XML e-Impôts — État 301 (EDI)')<0||h.indexOf('XML e-Impôts — Annexe TVA (EDI)')<0)throw new Error('boutons XML e-Impôts absents');
console.log('✓ Écran Exports : boutons 📋 XML e-Impôts présents');

/* 7 · feuille SAISIE DGI — réplique conforme à coller dans le classeur officiel (État 301) */
const _mk2=makeXlsx;let capD=null;makeXlsx=(sheets,fname)=>{capD={sheets,fname};};
await App.ediITSDgiSheet(per);
if(!capD||capD.fname!=='DGI_Saisie_Etat301_'+per+'.xlsx')throw new Error('nom fichier SAISIE DGI: '+(capD&&capD.fname));
const SI=capD.sheets[0];
if(SI.name!=='SAISIE')throw new Error('la feuille doit s appeler SAISIE comme le fichier DGI');
if(!capD.sheets[1]||capD.sheets[1].name.indexOf('MODE D')<0)throw new Error('feuille MODE D EMPLOI absente');
const c=(r,i)=>(SI.rows[r-1]||[])[i];
if(c(4,6)!=='ITS'||c(8,7)!=='1900000X'||String(c(10,7))!==yy||c(12,7)!=='Septembre')throw new Error('tête DGI (code impôt/NCC/exercice/mois) incorrecte');
if(c(14,1)!=='#'||c(14,2)!=='N° CNPS'||c(14,3)!=='Nom et prénoms'||c(14,22)!=='ITS Salariés')throw new Error('en-têtes ligne 14 non conformes au DGI');
if(c(15,11)!=='Etat civil'||c(15,22)!=='Brut'||c(15,23)!=='Net'||c(15,25)!=='Désignation')throw new Error('sous-en-têtes ligne 15 non conformes au DGI');
const l16=SI.rows[15];
if(l16[1]!==1||l16[2]!=='188021640501'||l16[3]!=='BAKARY TRAORE'||l16[4]!=='Salarié'||l16[5]!=='TORREFACTEUR'||l16[6]!=='EQ')throw new Error('ligne 16 (Bakary) incorrecte : '+JSON.stringify(l16.slice(0,8)));
if(l16[14]!==30||l16[15]!==150000||l16[20]!==150000||l16[21]!==11000||l16[22]!==12000||l16[23]!==1000||l16[24]!==10000||l16[25]!=='TRANSPORT')throw new Error('montants ligne 16 incorrects : '+JSON.stringify(l16.slice(14)));
if(SI.rows.length!==20)throw new Error('attendu 5 salariés (lignes 16-20), obtenu '+(SI.rows.length-15));
console.log('✓ Saisie DGI État 301 : feuille SAISIE réplique conforme (tête NCC/exercice/mois, en-têtes lignes 14-15, données dès ligne 16, montants P/V/W/X/Y/Z) + MODE D\'EMPLOI de collage');

/* 8 · feuille DETAIL_TVA_S DGI (à coller) */
capD=null;
await App.ediTVADgiSheet(per);
if(!capD||capD.fname!=='DGI_Detail_TVA_'+per+'.xlsx')throw new Error('nom fichier TVA DGI: '+(capD&&capD.fname));
const ST=capD.sheets[0];
if(ST.name!=='DETAIL_TVA_S')throw new Error('la feuille doit s appeler DETAIL_TVA_S comme le fichier DGI');
const t=(r,i)=>(ST.rows[r-1]||[])[i];
if(t(6,4)!=='TVA'||t(10,4)!=='1900000X'||String(t(12,4))!==yy||t(14,4)!=='Septembre')throw new Error('tête DGI TVA incorrecte');
if(String(t(17,1)).indexOf('TYPE D')<0||t(18,4)!=='RAISON SOCIALE'||t(18,10)!=='MONTANT HT')throw new Error('en-têtes TVA lignes 17-18 non conformes au DGI');
const achatsPer=(await DB.list('purchases')).filter(a=>(a.date||'').slice(0,7)===per&&a.amount).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
if(ST.rows.length!==19+achatsPer.length)throw new Error('lignes TVA: attendu '+achatsPer.length+' opérations dès la ligne 20, obtenu '+(ST.rows.length-19));
const l20=ST.rows[19];
if(l20[1]!=='Achats_locaux'||l20[2]!=='Achats de marchandises et matières prémières locales')throw new Error('type/spécification officiels attendus');
if(l20[3]!==EDI_XLDATE(achatsPer[0].date))throw new Error('date facture attendue en série Excel ('+EDI_XLDATE(achatsPer[0].date)+'), obtenu '+l20[3]);
if(l20[4]!==achatsPer[0].supplier)throw new Error('fournisseur attendu: '+achatsPer[0].supplier);
if(l20[13]!=='REDEVABLE TOTAL'||l20[14]!==1)throw new Error('redevable/prorata officiels attendus');
const ligCC=ST.rows.filter(r=>r&&r[4]==='Café & Co (Abidjan)')[0];
if(!ligCC||ligCC[5]!=='0175265N')throw new Error('achat Café & Co avec NCC fournisseur attendu dans la feuille — lignes: '+JSON.stringify(ST.rows.slice(19).map(r=>r&&r.slice(0,6))));
if(ligCC[2]!=='Achats de marchandises et matières prémières locales'||ligCC[3]!==EDI_XLDATE(todayISO()))throw new Error('spécification/date de l achat incorrectes');
console.log('✓ Saisie DGI Annexe TVA : feuille DETAIL_TVA_S réplique conforme (tête, en-têtes 17-18, données dès ligne 20, dates en série Excel, référentiels)');

/* 9 · boutons */
if(h.indexOf('Saisie DGI — État 301 (à coller)')<0||h.indexOf('Saisie DGI — Annexe TVA (à coller)')<0)throw new Error('boutons Saisie DGI absents de l écran Exports');
makeXlsx=_mk2;

/* 10 · fiche employé : nouveaux champs DGI (CNPS, sexe, nationalité, loc/exp, situation, enfants, code emploi) */
$('#eN').value='TEST DGI';$('#eP').value='Comptable';$('#eM').value='';$('#eH').value=todayISO();$('#eS').value='monthly';$('#eB').value='200000';$('#eTr').value='0';$('#eHo').value='0';$('#eSh').value='3';$('#eZ').value='abidjan';
$('#eCnps').value='199912345678';$('#eSexe').value='F';$('#eNat').value='AA';$('#eLoc').value='E';$('#eSit').value='M';$('#eEnf').value='2';$('#eCE').value='CM';
await App.empSave();
const eDgi=(await DB.list('employees')).filter(x=>x.name==='TEST DGI')[0];
if(!eDgi)throw new Error('employé non créé');
if(eDgi.cnps!=='199912345678'||eDgi.sexe!=='F'||eDgi.nationalite!=='AA'||eDgi.loc_exp!=='E'||eDgi.situation!=='M'||Number(eDgi.enfants)!==2||eDgi.code_emploi!=='CM')throw new Error('champs DGI non sauvegardés: '+JSON.stringify({cnps:eDgi.cnps,sexe:eDgi.sexe,nat:eDgi.nationalite,loc:eDgi.loc_exp,sit:eDgi.situation,enf:eDgi.enfants,ce:eDgi.code_emploi}));
console.log('✓ Fiche employé : N° CNPS, sexe, nationalité, local/expatrié, situation, enfants, code emploi enregistrés');

download=_dl;toast=_t;
console.log('✓ Écran Exports : boutons « 📄 Saisie DGI (à coller) » aux côtés des XML directs');
console.log('TEDI: TOUT PASSE — conformité stricte au générateur officiel DGI + feuilles à coller');
})().catch(e=>{console.log('ECHEC TEDI:',e.message);process.exit(1);});
