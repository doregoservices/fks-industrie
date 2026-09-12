;/* TSAGE : pont Sage 100 — 1) export Import_Sage.txt au format des imports paramétrables Sage 2) import d'un journal Sage → historique consultable 3) v35.53 : MODÈLE PARAMÉTRABLE (comme l'assistant Sage) */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
/* paie clôturée pour remplir le journal PA */
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};await render();
await App.runGen(monthISO());
const run=(await DB.list('pay_runs'))[0];
await DB.update('pay_runs',run.id,{status:'closed',paid_date:todayISO()});
/* 1 · export : les 3 fichiers, contenu du .txt STRICT (modèle Sage par défaut) */
const caps={};const _dl=download;download=(n,b)=>{caps[n]=b;};
await App.expCaisse();
const keys=Object.keys(caps);
if(!keys.some(k=>/^Sage_6_journaux_.*\.csv$/.test(k)))throw new Error('csv Sage absent');
if(!keys.some(k=>/^Import_Sage_.*\.txt$/.test(k)))throw new Error('fichier Import_Sage .txt absent');
const tk=keys.find(k=>/^Import_Sage_.*\.txt$/.test(k));
const txt=caps[tk].parts.join('').replace(/^\ufeff/,'');
const tl=txt.split('\r\n').filter(l=>l);
if(!tl.length)throw new Error('txt vide');
if(!/^[A-Z0-9]{1,5};\d{2}\/\d{2}\/\d{4};.+;/.test(tl[0]))throw new Error('format txt invalide (attendu JOURNAL;DATE;COMPTE;LIBELLÉ;DÉBIT;CRÉDIT, sans en-tête) : '+tl[0]);
if(tl.some(l=>l.split(';').length!==6))throw new Error('toutes les lignes doivent avoir 6 champs');
const amts=tl.map(l=>l.split(';')).flatMap(r=>[r[4],r[5]]).filter(x=>x);
if(amts.some(a=>/\./.test(a)))throw new Error('les montants du txt doivent utiliser la virgule décimale (format Sage)');
if(!amts.some(a=>/,\d{2}$/.test(a)))throw new Error('montants attendus à 2 décimales (défaut Sage)');
let td=0,tc=0;tl.forEach(l=>{const c=l.split(';');td+=Number(c[4].replace(',','.'))||0;tc+=Number(c[5].replace(',','.'))||0;});
if(Math.abs(td-tc)>0.01)throw new Error('txt déséquilibré : '+td+' vs '+tc);
if(td<=0)throw new Error('txt sans écritures');
/* 2 · import : notre propre txt repasse (aller-retour, détection auto) */
const rt=App.sageImpParse(txt);
if(rt.n!==tl.length)throw new Error('aller-retour : '+rt.n+' lignes lues sur '+tl.length);
if(Math.abs(rt.dD-td)>0.01||Math.abs(rt.dC-tc)>0.01)throw new Error('aller-retour : totaux faux');
/* 3 · import : fichier exporté depuis Sage (en-tête + journal en premier + crédit seul) */
const sageExp='JOURNAL;DATE;COMPTE;LIBELLE;DEBIT;CREDIT\r\nVE;15/08/2026;4111001;Vente client X;500000;\r\nVE;15/08/2026;701100;Vente client X;;500000\r\nBQ;16/08/2026;521000;Versement banque;250000;\r\nBQ;16/08/2026;571000;Versement banque;;250000';
const p2=App.sageImpParse(sageExp);
if(p2.n!==4)throw new Error('import Sage : '+p2.n+' écritures sur 4');
if(Math.abs(p2.dD-750000)>0.01||Math.abs(p2.dC-750000)>0.01)throw new Error('import Sage : totaux '+p2.dD+'/'+p2.dC);
const l2=p2.rows[1];
if(l2.j!=='VE'||l2.c!=='701100'||l2.de!==0||l2.cr!==500000)throw new Error('ligne crédit seul mal lue : '+JSON.stringify(l2));
/* 4 · enregistrement + affichage dans l'écran Exports */
await setSetting('sage_rows',p2.rows);
location.hash='#/exports';S.route='exports';await render();
const he=$('#main').innerHTML;
if(he.indexOf('Historique Sage importé')<0||he.indexOf('4 écritures')<0)throw new Error('historique importé non visible dans Exports');
if(he.indexOf('Importer un journal Sage')<0)throw new Error('bouton d import Sage absent de l écran Exports');
/* 5 · export de l historique */
delete caps.Historique;await App.sageImpXl();
if(!Object.keys(caps).some(k=>/Historique_Sage_importe\.xlsx/.test(k)))throw new Error('export de l historique échoué');
/* 6 · dates jjmmaa (export Sage ancien format) */
const p3=App.sageImpParse('VE;150826;701100;Vente;100000;');
if(p3.rows[0].d!=='15/08/26')throw new Error('date jjmmaa mal normalisée : '+p3.rows[0].d);
/* 7 · v35.53 MODÈLE PARAMÉTRABLE (comme l'assistant d'import Sage 100) */
/* 7a · formatters */
if(sfmtNum(1234567.891,{dec:',',mil:' ',d2:2})!=='1 234 567,89')throw new Error('sfmtNum milliers/décimales : '+sfmtNum(1234567.891,{dec:',',mil:' ',d2:2}));
if(sfmtNum(500000,{dec:'.',mil:'',d2:2})!=='500000.00')throw new Error('sfmtNum point décimal');
if(sfmtNum(500000,{dec:',',mil:'',d2:0})!=='500000')throw new Error('sfmtNum 0 décimale');
if(sfmtNum(0,{dec:',',mil:'',d2:2})!=='')throw new Error('sfmtNum zéro doit rester vide (convention Sage)');
if(sfmtDate('12/09/2026',{dfmt:'iso'})!=='2026-09-12'||sfmtDate('12/09/2026',{dfmt:'dmy6'})!=='120926'||sfmtDate('12/09/2026',{dfmt:'mdy'})!=='09/12/2026'||sfmtDate('12/09/2026',{dfmt:'dmy'})!=='12/09/2026')throw new Error('sfmtDate : formats de date incorrects');
if(sfmtEsc('a;b"c',{sep:';',txtq:'"'})!=='"a;b""c"')throw new Error('sfmtEsc échappement guillemets');
if(sfmtEsc('a;b"c',{sep:';',txtq:''})!=='a b"c')throw new Error('sfmtEsc sans identificateur de texte');
/* 7b · export avec modèle personnalisé : tabulation, ISO, point décimal, en-tête, ordre inversé */
const FM={name:'Essai Tab/ISO',sep:'\t',txtq:'"',dec:'.',mil:'',d2:2,dfmt:'iso',hdr:true,cols:['d','j','c','de','cr','l']};
await setSetting('sage_fmt',FM);
await App.expCaisse();
const tk2=Object.keys(caps).find(k=>/^Import_Sage_.*\.txt$/.test(k));
if(!tk2)throw new Error('export avec modèle : txt absent');
const x2=caps[tk2].parts.join('').replace(/^\ufeff/,'').split('\r\n').filter(l=>l);
if(x2[0]!=='Date de pièce\tCode journal\tCompte général\tDébit\tCrédit\tLibellé')throw new Error('en-tête non conforme au modèle : '+x2[0]);
if(!/^\d{4}-\d{2}-\d{2}\t[A-Z0-9]{1,5}\t/.test(x2[1]))throw new Error('ordre des colonnes / date ISO non respectés : '+x2[1]);
if(!/\t\d+\.\d{2}(\t|$)/.test(x2[1]))throw new Error('décimale point attendue : '+x2[1]);
const p4=App.sageImpParse(x2.join('\r\n'),FM);
if(p4.n!==x2.length-1||Math.abs(p4.dD-td)>0.01||Math.abs(p4.dC-tc)>0.01)throw new Error('aller-retour modèle : '+p4.n+'/'+(x2.length-1)+' · '+p4.dD+' vs '+td);
/* 7c · import Sage à 7 colonnes (colonne ignorée) via modèle — l'ordre du modèle prime sur le fichier */
const FM2={name:'7 col',sep:';',txtq:'"',dec:',',mil:'',d2:2,dfmt:'dmy',hdr:true,cols:['d','j','c','l','de','cr','-']};
const p5=App.sageImpParse('DATE;JOURNAL;COMPTE;LIBELLÉ;DEBIT;CREDIT;PIECE\r\n12/09/2026;VE;4111001;Vente X;500000,00;;V001\r\n12/09/2026;VE;701100;Vente X;;500000,00;V001',FM2);
if(p5.n!==2||p5.dD!==500000||p5.dC!==500000)throw new Error('modèle 7 colonnes : '+JSON.stringify({n:p5.n,dD:p5.dD,dC:p5.dC}));
if(p5.rows[1].c!=='701100'||p5.rows[1].de!==0||p5.rows[1].cr!==500000)throw new Error('modèle 7 col : ligne crédit lue incorrectement');
/* 7d · modèle incomplet → refus clair */
let bad=0;try{App.sageImpParse('12/09/2026;VE;4111001;500000;',{name:'bad',sep:';',dec:',',dfmt:'dmy',cols:['d','j','c','de']});}catch(e){bad=1;}
if(!bad)throw new Error('un modèle sans Crédit doit être refusé');
/* 7e · UI : bouton ⚙, sélecteur de format à l import, modal de paramétrage */
location.hash='#/exports';S.route='exports';await render();
const hx=$('#main').innerHTML;
if(hx.indexOf('Format Sage (import/export)')<0)throw new Error('bouton ⚙ absent de l écran Exports');
if(hx.indexOf('format paramétrable')<0)throw new Error('mention format paramétrable absente');
const MB=[];const _modal=modal;modal=(t,b,f)=>{MB.push({t:t,b:b});return _modal(t,b,f);};
try{
  App.sageImp();
  if(!MB.length||MB[0].b.indexOf('sgFmt')<0||MB[0].b.indexOf('Essai Tab/ISO')<0)throw new Error('sélecteur de format absent du modal d import');
  if(MB[0].b.indexOf('Détection automatique')<0)throw new Error('option détection automatique absente');
  closeModal();MB.length=0;
  App.sageFmt();
  if(!MB.length||MB[0].t.indexOf('Modèle')<0)throw new Error('modal de paramétrage sans titre');
  const mb=MB[0].b;
  if(mb.indexOf('sgfName')<0||mb.indexOf('Correspondance des colonnes')<0||mb.indexOf('sgfCols')<0||mb.indexOf('sgfPrev')<0||mb.indexOf('Délimiteur de champ')<0||mb.indexOf('Identificateur de texte')<0||mb.indexOf('Séparateur de milliers')<0)throw new Error('modal de paramétrage incomplet (champs assistant Sage)');
  if(mb.indexOf('Code journal')<0||mb.indexOf('Date de pièce')<0||mb.indexOf('Compte général')<0)throw new Error('noms de champs Sage absents de la correspondance');
  /* échange de colonnes (anti-doublon par swap) */
  App.sageFmtCol(0,'d');
  if(SFT.cols[0]!=='d'||SFT.cols[1]!=='j')throw new Error('échange de colonnes incorrect : '+SFT.cols.join(','));
  /* aperçu vivant : le changement de déliminateur change le fichier */
  $('#sgfName').value='Modèle test';$('#sgfSep').value='|';$('#sgfQ').value='"';$('#sgfDec').value=',';$('#sgfMil').value='';$('#sgfDf').value='dmy';$('#sgfD2').value='2';$('#sgfHdr').checked=false;
  App.sageFmtPrev();
  if($('#sgfPrev').innerHTML.indexOf('12/09/2026|VE|4111001|500000,00||Vente client KONE')<0)throw new Error('aperçu non conforme (modèle inversé + délimiteur | + 2 décimales) : '+$('#sgfPrev').innerHTML.slice(0,90));
  /* sauvegarde refusée si colonne obligatoire manquante */
  SFT.cols=['d','j','c','de','l','-'];
  await App.sageFmtSave();
  if(SETS.sage_fmt.name!=='Essai Tab/ISO')throw new Error('un modèle incomplet ne doit pas être sauvegardé');
  /* sauvegarde valide */
  SFT.cols=['d','j','c','de','cr','l'];
  await App.sageFmtSave();
  if(!SETS.sage_fmt||SETS.sage_fmt.name!=='Modèle test'||SETS.sage_fmt.sep!=='|'||SETS.sage_fmt.cols.join(',')!=='d,j,c,de,cr,l')throw new Error('sauvegarde du modèle échouée : '+JSON.stringify(SETS.sage_fmt));
  /* réinitialisation → défauts Sage */
  App.sageFmt();App.sageFmtReset();
  $('#sgfName').value='';$('#sgfSep').value=';';$('#sgfQ').value='"';$('#sgfDec').value=',';$('#sgfMil').value='';$('#sgfDf').value='dmy';$('#sgfD2').value='2';$('#sgfHdr').checked=false;
  await App.sageFmtSave();
  if(SETS.sage_fmt.cols.join(',')!=='j,d,c,l,de,cr')throw new Error('réinitialisation : ordre par défaut non restauré');
  closeModal();
}finally{modal=_modal;}
/* 7f · retour au modèle par défaut → l export redevient Sage standard */
await setSetting('sage_fmt',null);
if(getSageFmt().name!=='Sage 100 (par défaut)')throw new Error('modèle par défaut non restauré après remise à zéro');
await App.expCaisse();
const tk3=Object.keys(caps).filter(k=>/^Import_Sage_.*\.txt$/.test(k)).pop();
const x3=caps[tk3].parts.join('').replace(/^\ufeff/,'');
if(!/^[A-Z0-9]{1,5};\d{2}\/\d{2}\/\d{4};.+;/.test(x3.split('\r\n')[0]))throw new Error('export hors modèle : format Sage standard non retrouvé');
download=_dl;await setSetting('sage_rows',[]);
console.log('✓ Export Sage : xlsx + csv + Import_Sage.txt au MODÈLE PARAMÉTRABLE (défaut Sage : point-virgule, sans en-tête, JOURNAL;DATE;COMPTE;LIBELLÉ;DÉBIT;CRÉDIT, JJ/MM/AAAA, virgule, 2 déc., équilibré '+money(td)+')');
console.log('✓ Modèle paramétrable (assistant Sage) : délimiteur champ/texte, décimale, milliers, dates JJMMAA/ISO/MDY, en-tête, ordre + colonnes ignorées — export ET import, aperçu vivant, anti-doublons par échange, sauvegarde/refus contrôlés');
console.log('✓ Import Sage : journal exporté (détection auto OU modèle) → historique consultable dans Exports, sans double comptabilité');
console.log('TSAGE: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TSAGE:',e.message);process.exit(1);});
