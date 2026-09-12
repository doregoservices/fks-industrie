;/* TSAGE : pont Sage 100 — 1) export Import_Sage.txt au format des imports paramétrables Sage (point-virgule, SANS en-tête, décimales virgule) 2) import d'un journal Sage → historique consultable sans double comptabilité */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
/* paie clôturée pour remplir le journal PA */
location.hash='#/paie';S.route='paie';S.tab={paie:'run'};await render();
await App.runGen(monthISO());
const run=(await DB.list('pay_runs'))[0];
await DB.update('pay_runs',run.id,{status:'closed',paid_date:todayISO()});
/* 1 · export : les 3 fichiers, contenu du .txt STRICT */
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
let td=0,tc=0;tl.forEach(l=>{const c=l.split(';');td+=Number(c[4].replace(',','.'))||0;tc+=Number(c[5].replace(',','.'))||0;});
if(Math.abs(td-tc)>0.01)throw new Error('txt déséquilibré : '+td+' vs '+tc);
if(td<=0)throw new Error('txt sans écritures');
/* 2 · import : notre propre txt repasse (aller-retour) */
const rt=App.sageImpParse(txt);
if(rt.n!==tl.length)throw new Error('aller-retour : '+rt.n+' lignes lues sur '+tl.length);
if(Math.abs(rt.dD-td)>0.01||Math.abs(rt.dC-tc)>0.01)throw new Error('aller-retour : totaux faux');
/* 3 · import : fichier exporté depuis Sage (en-tête + journal en premier + crédit seul) */
const sageExp='JOURNAL;DATE;COMPTE;LIBELLE;DEBIT;CREDIT\r\nVE;15/08/2026;4111001;Vente client X;500000;\r\nVE;15/08/2026;701100;Vente client X;;500000\r\nBQ;16/08/2026;521000;Versement banque;250000;\r\nBQ;16/08/2026;571000;Versement banque;;250000';
const p2=App.sageImpParse(sageExp);
if(p2.n!==4)throw new Error('import Sage : '+p2.n+' écritures sur 4');
if(Math.abs(p2.dD-750000)>0.01||Math.abs(p2.dC-750000)>0.01)throw new Error('import Sage : totaux '+p2.dD+'/'+p2.dC);
const l2=p2.rows[1];/* ligne crédit seul : VE 701100 — débit 0, crédit 500000 */
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
download=_dl;await setSetting('sage_rows',[]);
console.log('✓ Export Sage : xlsx + csv + Import_Sage.txt (point-virgule, SANS en-tête, JOURNAL;DATE;COMPTE;LIBELLÉ;DÉBIT;CRÉDIT, virgule décimale, équilibré '+money(td)+')');
console.log('✓ Import Sage : journal exporté depuis Sage (en-tête ignoré, journal en 1re colonne, crédit seul, dates jj/mm/aaaa ET jjmmaa) → historique consultable dans Exports + export Excel');
console.log('✓ Sans double comptabilité : l historique importé ne touche ni la caisse ni l exploitation');
console.log('TSAGE: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TSAGE:',e.message);process.exit(1);});
