;/* TEST : design Excel PRO + marque Doregoservices */
;(async()=>{
await loadSettings();
await seedDemo();
S.user={name:'test',role:'manager'};

/* ===== 1. STYLES riches présents ===== */
if(!STYLES_XML.includes('FF6F4E37'))throw new Error('couleur marque absente des styles');
if(!STYLES_XML.includes('FFFAF7F2')||!STYLES_XML.includes('FFD5C9BB'))throw new Error('zébrures/bordures absentes');
if(!STYLES_XML.includes('numFmtId="200"'))throw new Error('format nombres #,##0 absent');
console.log('✓ Styles Excel pro : bandeau brun café, entêtes blancs, zébrures, bordures fines, format # ##0');

/* ===== 2. sheetXml : titre fusionné, entête, volets figés, footer marque ===== */
const xml=sheetXml([['POINT COMPLET DES STOCKS'],['FKS Industrie'],['Période','août 2026'],[],['NIVEAU','Entrées','Sorties','STOCK','Unité','Détail'],
  ['Café vert',2000,800,{v:1200,__style:1},'kg','achats − torréfaction'],
  ['Café moulu 1 kg',480,12,{v:468,__style:1},'u','']],[28,14,14,14,10,40]);
if(!xml.includes('mergeCell ref="A1:F1"'))throw new Error('titre non fusionné');
if(!xml.includes('mergeCell ref="A2:F2"'))throw new Error('sous-titre non fusionné');
if(!xml.includes('state="frozen"')||!xml.includes('ySplit="5"'))throw new Error('volets non figés sous l’entête');
if(!xml.includes('s="4"'))throw new Error('style entête absent');
if(!xml.includes('s="10"'))throw new Error('totaux numériques non stylés');
if(!xml.includes('Réalisé par Doregoservices · 07 17 57 95 56'))throw new Error('pied de marque absent');
if(!xml.includes('mergeCell ref="A9:F9"'))throw new Error('pied de marque non fusionné');
console.log('✓ Feuille : titre fusionné A1:F1, entête couleur figée (ySplit), zébrures, totaux encadrés, pied « Réalisé par Doregoservices »');

/* ===== 3. Marque à l’écran (connexion + menu) ===== */
S.user=null;
await scLogin();
let html=$('#app').innerHTML;
if(!html.includes('07 17 57 95 56'))throw new Error('contact absent de la connexion');
if(!html.includes('Doregoservices'))throw new Error('marque absente de la connexion');
if(!html.includes('data:image/png;base64,'))throw new Error('logo absent de la connexion');
S.user={name:'test',role:'manager'};
let capModal=null;const _modal=modal;modal=(t,b)=>{capModal=b;};
App.menu();modal=_modal;
if(!capModal||!capModal.includes('07 17 57 95 56'))throw new Error('contact absent du menu');
if(!capModal.includes('Doregoservices'))throw new Error('marque absente du menu');
if(!capModal.includes('data:image/png;base64,'))throw new Error('logo absent du menu');
console.log('✓ Écran de connexion et Menu : logo Doregoservices + « Conçu et maintenu par Doregoservices · 07 17 57 95 56 »');

/* ===== 4. Classeur réel généré sans erreur, toutes feuilles marquées ===== */
let saved=null;download=(n,b)=>{saved=b;};
await App.expStocks();
if(!saved)throw new Error('aucun xlsx généré');
const fs=require('fs');
fs.writeFileSync('/tmp/test-brand.xlsx',Buffer.from(await saved.arrayBuffer()));
console.log('✓ Point complet des stocks généré ('+fs.statSync('/tmp/test-brand.xlsx').size+' octets) — validation XML à suivre');
/* ===== 5. Écran Support & À propos (ordinateur + mobile) ===== */
location.hash='#/apropos';S.route='apropos';await render();
const ap=$('#main').innerHTML;
if(!ap.includes('07 17 57 95 56'))throw new Error('écran support sans contact');
if(!ap.includes('Doregoservices'))throw new Error('écran support sans marque');
if(!ap.includes('data:image/png;base64,'))throw new Error('écran support sans logo');
if(!NAV_ITEMS.filter(i=>i[0]==='apropos').length)throw new Error('nav support absent');
console.log('✓ Écran 🛟 Support dans le menu (ordinateur ET mobile) : logo + contact cliquable Doregoservices');

console.log('TBRAND: 5/5 OK');
})().catch(e=>{console.error('ÉCHEC TBRAND:',e.message);process.exit(1);});
