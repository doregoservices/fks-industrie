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

/* 7 · fichier DGI OFFICIEL État 301 — logos, formules, macro (chirurgie ZIP) */
const fs7=require('fs');
const _f7=global.fetch;
global.fetch=async u=>new Response(fs7.readFileSync(String(u).indexOf('tva')>=0?'/home/user/usine-cafe/dgi-tva.xlsm':'/home/user/usine-cafe/dgi-ITS.xlsm'));
const caps7={};const _dl7=download;download=(n,b)=>{caps7[n]=b;};
await App.ediITSXl(per);
download=_dl7;global.fetch=_f7;
const nmITS=Object.keys(caps7).filter(k=>k==='DGI_Etat301_'+per+'.xlsm')[0];
if(!nmITS)throw new Error('fichier DGI_Etat301 non téléchargé: '+JSON.stringify(Object.keys(caps7)));
const u8ITS=new Uint8Array(await caps7[nmITS].arrayBuffer());
if(u8ITS[0]!==0x50||u8ITS[1]!==0x4b)throw new Error('le fichier généré n est pas un classeur Excel');
const binITS=Buffer.from(u8ITS);
for(const entry of ['xl/vbaProject.bin','xl/media/image1.png','xl/media/image2.png','xl/worksheets/sheet2.xml','xl/worksheets/sheet3.xml'])
  if(binITS.indexOf(Buffer.from(entry))<0)throw new Error(entry+' absent du fichier DGI généré (logos/macro perdus)');
const xmlITS=await ediZipRead(u8ITS,'xl/worksheets/sheet2.xml');
if(xmlITS.indexOf('1900000X')<0)throw new Error('NCC absent (G8)');
if(!new RegExp('<c r="G10"[^>]*><v>'+yy+'</v>').test(xmlITS))throw new Error('exercice absent (G10)');
if(xmlITS.indexOf('Septembre')<0)throw new Error('mois absent (G12)');
if(xmlITS.indexOf('BAKARY TRAORE')<0)throw new Error('salarié Bakary absent');
if(xmlITS.indexOf('188021640501')<0)throw new Error('n° CNPS Bakary absent (colonne C)');
if(xmlITS.indexOf('IF(U17=0,0,AJ17)')<0)throw new Error('formule officielle ITS (W17) perdue');
if(xmlITS.indexOf('AK17')<0)throw new Error('formule officielle RICF (AK17) perdue');
if(xmlITS.indexOf('TRANSPORT')<0)throw new Error('désignation indemnité (AB) absente');
if(xmlITS.indexOf('SUM(P17:P15016)')<0)throw new Error('totaux officiels ligne 16 perdus');
const mSet=new Set([].concat([...xmlITS.matchAll(/<f t="shared"[^>]*si="(\d+)"[^>]*ref=/g)].map(m=>m[1]),[...xmlITS.matchAll(/<f t="shared" ref="[^"]+"[^>]*si="(\d+)"/g)].map(m=>m[1])));
const orph=[...new Set([...xmlITS.matchAll(/<f t="shared" si="(\d+)"\/>/g)].map(m=>m[1]))].filter(si=>!mSet.has(si));
if(orph.length)throw new Error('formules partagées orphelines (fichier corrompu pour Excel): '+orph.join(','));
console.log('✓ Fichier DGI État 301 officiel généré par l app : vrai classeur DGI (2 logos, macro vbaProject.bin, barème ITS/RICF, totaux ligne 16, TradXML) pré-rempli ('+nEmp+' salariés) — formules partagées intactes');

/* 8 · fichier DGI OFFICIEL Annexe TVA */
const _f8=global.fetch;
global.fetch=async u=>new Response(fs7.readFileSync('/home/user/usine-cafe/dgi-tva.xlsm'));
const caps8={};download=(n,b)=>{caps8[n]=b;};
await App.ediTVAXl(per);
download=_dl7;global.fetch=_f8;
const nmT=Object.keys(caps8).filter(k=>k==='DGI_TVA_'+per+'.xlsm')[0];
if(!nmT)throw new Error('fichier DGI_TVA non téléchargé: '+JSON.stringify(Object.keys(caps8)));
const u8T=new Uint8Array(await caps8[nmT].arrayBuffer());
const binT=Buffer.from(u8T);
if(binT[0]!==0x50||binT[1]!==0x4b)throw new Error('TVA: pas un classeur Excel');
if(binT.indexOf(Buffer.from('xl/vbaProject.bin'))<0)throw new Error('macro absente du fichier TVA');
if(binT.indexOf(Buffer.from('xl/media/image1.png'))<0)throw new Error('logos absents du fichier TVA');
const xmlT=await ediZipRead(u8T,'xl/worksheets/sheet2.xml');
if(xmlT.indexOf('1900000X')<0||xmlT.indexOf('Septembre')<0)throw new Error('tête TVA (NCC/mois) incorrecte');
if(xmlT.indexOf('Achats_locaux')<0)throw new Error('type d opération officiel absent');
if(xmlT.indexOf('COOPERATIVE DE MAN')<0)throw new Error('fournisseur (majuscules sans accents) absent');
if(xmlT.indexOf('REDEVABLE TOTAL')<0)throw new Error('redevable officiel absent');
if(xmlT.indexOf('J20')<0)throw new Error('formule officielle date (D20=+J20) perdue');
if(xmlT.indexOf('M20*O20')<0)throw new Error('formule officielle TVA (P20=M20*O20) perdue');
const mTSet=new Set([].concat([...xmlT.matchAll(/<f t="shared"[^>]*si="(\d+)"[^>]*ref=/g)].map(m=>m[1]),[...xmlT.matchAll(/<f t="shared" ref="[^"]+"[^>]*si="(\d+)"/g)].map(m=>m[1])));
const orphT=[...new Set([...xmlT.matchAll(/<f t="shared" si="(\d+)"\/>/g)].map(m=>m[1]))].filter(si=>!mTSet.has(si));
if(orphT.length)throw new Error('TVA: formules partagées orphelines: '+orphT.join(','));
console.log('✓ Fichier DGI Annexe TVA officiel généré par l app : vrai classeur DGI (logos, macro, formules date/TVA) — tête '+yy+'/Septembre, fournisseurs pré-remplis');

/* 9 · boutons */
if(h.indexOf('Fichier DGI — État 301 (officiel')<0||h.indexOf('Fichier DGI — Annexe TVA (officiel')<0)throw new Error('boutons Fichier DGI officiel absents de l écran Exports');

/* 10 · fiche employé : nouveaux champs DGI (CNPS, sexe, nationalité, loc/exp, situation, enfants, code emploi) */
$('#eN').value='TEST DGI';$('#eP').value='Comptable';$('#eM').value='';$('#eH').value=todayISO();$('#eS').value='monthly';$('#eB').value='200000';$('#eTr').value='0';$('#eHo').value='0';$('#eSh').value='3';$('#eZ').value='abidjan';
$('#eCnps').value='199912345678';$('#eSexe').value='F';$('#eNat').value='AA';$('#eLoc').value='E';$('#eSit').value='M';$('#eEnf').value='2';$('#eCE').value='CM';
await App.empSave();
const eDgi=(await DB.list('employees')).filter(x=>x.name==='TEST DGI')[0];
if(!eDgi)throw new Error('employé non créé');
if(eDgi.cnps!=='199912345678'||eDgi.sexe!=='F'||eDgi.nationalite!=='AA'||eDgi.loc_exp!=='E'||eDgi.situation!=='M'||Number(eDgi.enfants)!==2||eDgi.code_emploi!=='CM')throw new Error('champs DGI non sauvegardés: '+JSON.stringify({cnps:eDgi.cnps,sexe:eDgi.sexe,nat:eDgi.nationalite,loc:eDgi.loc_exp,sit:eDgi.situation,enf:eDgi.enfants,ce:eDgi.code_emploi}));
console.log('✓ Fiche employé : N° CNPS, sexe, nationalité, local/expatrié, situation, enfants, code emploi enregistrés');

download=_dl;toast=_t;
console.log('✓ Écran Exports : boutons « 📊 Fichier DGI (officiel) » aux côtés des XML directs');
console.log('TEDI: TOUT PASSE — conformité stricte au générateur officiel DGI + FICHIER DGI OFFICIEL (logos, formules, macro) généré par l app');
})().catch(e=>{console.log('ECHEC TEDI:',e.message);process.exit(1);});
