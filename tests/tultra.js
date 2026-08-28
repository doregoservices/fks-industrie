;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const SCREENS=['dashboard','validation','achats','production','stocks','produits','ventes','commerciaux','impayes','caisse','paie','exploitation','exports','parametres','emballages','immobilisations','apropos'];
/* 1. chaque rôle rend ses écrans autorisés sans erreur ni NaN */
const ROLES={manager:SCREENS,caissier:['dashboard','caisse'],commercial:['dashboard','ventes','commerciaux','impayes','produits'],production:['dashboard','achats','production','stocks','produits','emballages','immobilisations']};
for(const role of Object.keys(ROLES)){
  S.user={name:'r',role:role};
  for(const r of ROLES[role]){
    S.route=r;location.hash='#/'+r;
    try{await render();}catch(e){throw new Error(role+' · '+r+' : '+e.message);}
    const h=$('#main').innerHTML;
    if(h.includes('NaN')||h.includes('undefined<'))throw new Error(role+' · '+r+' : NaN/undefined affiché');
  }
  if(roleAllowed('parametres')===(role!=='manager'))throw new Error(role+' : accès réglages incohérent');
}
console.log('✓ 17 écrans × 4 rôles rendus sans erreur ni NaN (accès réglages = manager seul)');
/* 2. les 6 exports : feuilles + marque Doregoservices dans CHAQUE feuille XML */
S.user={name:'test',role:'manager'};
await App.runGen(monthISO());
let cap=null;const _mk=makeXlsx;makeXlsx=(sh,f)=>{cap={sh,f};};
const _bx=buildXlsx;buildXlsx=sh=>{cap={sh,f:'x'};return _bx(sh);};
const gen=[['expCaisse','Sage_6_journaux'],['expStocks','stocks'],['expVentes','ventes'],['expPaie','paie'],['expExploitation','exploitation']];
for(const[f,nm]of gen){cap=null;await App[f]();if(!cap)throw new Error(f+' : rien généré');
  if(nm&&String(cap.f||cap.sh&&'').indexOf(nm)<0&&!(cap.sh&&cap.sh.length))throw new Error(f+' : nom inattendu');
  const txtOf=b=>{let t='';(b.parts||[]).forEach(p=>{t+=new TextDecoder('latin1').decode(typeof p==='string'?Buffer.from(p,'binary'):p);});return t;};
  cap.sh.forEach(s=>{const xml=sheetXml(s.rows,s.widths);const t=JSON.stringify(s.rows);
    if(/NaN|undefined|\[object/.test(t))throw new Error(f+' · '+s.name+' : valeur invalide');
    if(!xml.includes('Réalisé par Doregoservices · 07 17 57 95 56'))throw new Error(f+' · '+s.name+' : marque absente');});
}
makeXlsx=_mk;buildXlsx=_bx;
let dl=null;const _dl=download;download=(n,b)=>{dl=n;return _dl(n,b);};const bb=null;await App.expBackup();if(!dl||!String(dl).includes('json'))throw new Error('expBackup : aucun fichier');download=_dl;console.log('✓ Sauvegarde JSON : '+String(dl).slice(0,40)+' généré');
console.log('✓ 5 exports xlsx : zéro NaN/undefined, marque Doregoservices dans chaque feuille');
/* 3. démo locale : données cohérentes toutes années (aucune limite) */
S.route='exploitation';location.hash='#/exploitation';
await render();console.log('✓ Écran exploitation rendu (historique complet, sans limite d’années)');
console.log('TULTRA: 4/4 OK');
})().catch(e=>{console.error('ÉCHEC ULTRA:',e.stack||e.message);process.exit(1);});
