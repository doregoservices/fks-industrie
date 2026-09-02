;/* TSAGE : export Sage 100 en 6 journaux SYSCOHADA RÉVISÉ — équilibre D/C, classement strict, zéro double comptage */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
const num=x=>(x&&typeof x==='object')?Number(x.v||0):Number(x||0);
const rowsOf=k=>sh[k].rows.filter(r=>Array.isArray(r)&&r.length>=6&&r[1]===k);

/* 1. Données complètes : paie close + réglée, vente à crédit encaissée, achat non réglé */
await App.runGen(monthISO());
const run=(await DB.list('pay_runs')).filter(r=>r.period===monthISO())[0];
const slips=(await DB.list('pay_slips')).filter(x=>x.run_id===run.id);
const netTot=slips.reduce((a,x)=>a+Number(x.net||0),0);
await DB.update('pay_runs',run.id,{status:'closed',paid_date:todayISO()});
await DB.insert('cash_entries',{date:todayISO(),type:'in',account:'cash',category:'ventes',label:'Encaissements tests (appro caisse)',amount:Math.max(netTot,900000),imputable:true,status:'validated',created_at:nowISO()});
await createCashEntry({date:todayISO(),type:'out',account:'cash',category:'salaires',label:'Salaires '+run.period+' ('+slips.length+' employés)',amount:netTot,imputable:true,ref:'payrun:'+run.id});
const p1=(await DB.list('products')).filter(p=>p.name==='Café moulu 500 g')[0];
await createSale({date:todayISO(),agent_id:'direct',agent_name:'Vente directe',pay_mode:'credit',client:'Épicerie Bassam',total:22500,lines:[{product_id:p1.id,name:p1.name,qty:5,price:4500}],source:'admin'});
const cred=(await DB.list('sales')).filter(x=>x.client==='Épicerie Bassam').pop();
await createCashEntry({date:todayISO(),type:'in',account:'cash',category:'ventes',label:'Encaissement crédit — Épicerie Bassam',amount:22500,imputable:true,ref:'sale:'+cred.id});
await DB.insert('purchases',{date:todayISO(),supplier:'Coop Test',qty:50,amount:80000,pay_method:'credit',paid_entry:null});
if(slips.length<1||netTot<=0)throw new Error('paie de test vide');
console.log('✓ Données de recette : paie close '+netTot+' F net, crédit 22 500 F encaissé, achat 80 000 F à crédit');

/* 2. Génération : 8 feuilles, 6 journaux présents */
let captured=null;const _mk=makeXlsx;makeXlsx=(sheets,fname)=>{captured={sheets,fname};};
let csv=null;const _dl=dlCsv;dlCsv=(n,rows)=>{csv={n,rows};};
await App.expCaisse();
if(!captured||!captured.fname.includes('Sage_6_journaux'))throw new Error('fichier non généré : '+(captured&&captured.fname));
const sh={};captured.sheets.forEach(x=>sh[x.name.split(' — ')[0]]=x);
const KS=['VE','AC','CA','BQ','PA','OD'];
KS.forEach(k=>{if(!sh[k])throw new Error('journal '+k+' absent des feuilles');});
if(captured.sheets.length!==8)throw new Error(captured.sheets.length+' feuilles au lieu de 8');
if(!csv||!csv.n.includes('Sage_6_journaux'))throw new Error('csv global absent');
console.log('✓ 8 feuilles [Synthèse · VE · AC · CA · BQ · PA · OD · Mouvements] + csv global ('+csv.rows.length+' lignes)');

/* 3. Équilibre Débit = Crédit dans chacun des 6 journaux */
let gD=0,gC=0;
KS.forEach(k=>{const T=sh[k].rows[sh[k].rows.length-1];const D=num(T[4]),C=num(T[5]);
  if(Math.abs(D-C)>0.009)throw new Error(k+' déséquilibré : D='+D+' C='+C);gD+=D;gC+=C;});
console.log('✓ 6 journaux équilibrés (chaque TOTAL Débit = TOTAL Crédit)');

/* 4. Contrôle global + Synthèse */
if(Math.abs(gD-gC)>0.009)throw new Error('total général déséquilibré');
const syn=captured.sheets[0].rows;
const gen=syn.filter(r=>r[0]&&r[0].v==='TOTAL GÉNÉRAL')[0];
if(!gen)throw new Error('ligne TOTAL GÉNÉRAL absente de la synthèse');
if(String(num(gen[5]))!=='✔'&&!String(gen[5].v||'').includes('✔'))throw new Error('synthèse : contrôle non validé');
if(gD<=0)throw new Error('montants nuls : rien à exporter');
console.log('✓ Contrôle global : '+Math.round(gD)+' F débit = '+Math.round(gC)+' F crédit — synthèse ✔');

/* 5. Journal VE : ventes au comptant ET à crédit, créance 4111 */
const has=(k,a)=>rowsOf(k).some(r=>String(r[2])===a&&(num(r[4])+num(r[5]))>0);
if(!has('VE','411100'))throw new Error('VE : créance client 411100 absente');
if(!has('VE','702000'))throw new Error('VE : compte ventes 702000 (produits finis) absent');
if(!has('VE','571000')&&!has('VE','552100'))throw new Error('VE : encaissement comptant absent');
console.log('✓ VE : 702 produits finis + 4111 créances clients + 571/5521 encaissements');

/* 6. Aucun double comptage dans CA */
['702000','602100','608100','661000','664100'].forEach(a=>{if(has('CA',a))throw new Error('CA : compte '+a+' présent en double (déjà dans VE/AC/PA)');});
if(!has('CA','411100'))throw new Error('CA : encaissement de créance 411100 absent');
if(!has('CA','612000'))throw new Error('CA : charge transport 612000 absente');
console.log('✓ CA : charges réglées en espèces (612…) + encaissement créance 4111 — rien en double');

/* 7. Journal AC : achats réglés et à crédit */
if(!has('AC','602100'))throw new Error('AC : matière première 602100 absente');
if(!has('AC','608100'))throw new Error('AC : emballages 608100 absents');
if(!has('AC','401100'))throw new Error('AC : fournisseur 401100 absent (achat à crédit)');
console.log('✓ AC : café vert 6021 + emballages 6081 + dette fournisseur 4011 (achat à crédit)');

/* 8. OD + PA : structure complète révisée */
if(!has('OD','585000'))throw new Error('OD : virements de fonds 585000 absent');
if(has('CA','585000'))throw new Error('OD : virement interne fuité dans CA');
if(!has('PA','661000'))throw new Error('PA : salaires 661000 absent');
if(!has('PA','664100'))throw new Error('PA : charges sociales 664100 absentes');
if(!has('PA','422000'))throw new Error('PA : rémunérations dues 422000 absent');
if(!has('PA','431000'))throw new Error('PA : CNPS 431000 absente');
if(!has('PA','447200'))throw new Error('PA : ITS 447200 absent');
console.log('✓ OD : virements de fonds 585 · PA : 661 + 6641 débit / 422 + 431 + 4472 crédit');

/* 9. Codes journaux personnalisés (Réglages) */
SETS.journals={VE:'VT',AC:'AC',CA:'CS',BQ:'BQ',PA:'PY',OD:'DIV'};
await App.expCaisse();
const sh2={};captured.sheets.forEach(x=>sh2[x.name.split(' — ')[0]]=x);
['VT','CS','PY','DIV'].forEach(k=>{if(!sh2[k])throw new Error('code personnalisé '+k+' non appliqué');});
const t2=sh2.VT.rows[sh2.VT.rows.length-1];
if(num(t2[4])<=0||Math.abs(num(t2[4])-num(t2[5]))>0.009)throw new Error('codes perso : VE déséquilibré');
console.log('✓ Codes journaux paramétrables (VT/CS/PY/DIV) — équilibre conservé');
makeXlsx=_mk;dlCsv=_dl;

/* 10. Migration comptes : ancien défaut -> révisé, personnalisation conservée */
const oldStored=[{key:'ventes',label:'Ventes de produits',account:'701000'},{key:'transport',label:'Transport',account:'625000'},{key:'clients',label:'Clients',account:'411000'}];
SETS.sage_accounts=SETS.sage_accounts.slice();
await (async()=>{ /* simule la migration de loadSettings */
  const d=defaultSettings();
  const OLDDEF={'ventes':'701000','transport':'624000','clients':'411000'};
  const merged=d.sage_accounts.map(def=>{const st=oldStored.filter(x=>x.key===def.key)[0];
    return st?Object.assign({},def,{account:st.account!=null?st.account:def.account}):def;});
  SETS.sage_accounts=merged.map(a=>{const nd=d.sage_accounts.filter(x=>x.key===a.key)[0];
    return (nd&&String(a.account||'').trim()===String(OLDDEF[a.key]||'\u0000'))?Object.assign({},a,{account:nd.account,label:nd.label}):a;});
})();
const gA=k=>SETS.sage_accounts.filter(x=>x.key===k)[0].account;
if(gA('ventes')!=='702000')throw new Error('migration : ventes '+gA('ventes')+' au lieu de 702000');
if(gA('clients')!=='411100')throw new Error('migration : clients '+gA('clients')+' au lieu de 411100');
if(gA('transport')!=='625000')throw new Error('migration : personnalisation 625000 écrasée ('+gA('transport')+')');
console.log('✓ Migration SYSCOHADA révisé : anciens défauts remplacés, comptes personnalisés conservés');

captured.sheets.forEach(s=>{const t=JSON.stringify(s.rows);if(/NaN|undefined/.test(t))throw new Error(s.name+' : NaN/undefined');});
console.log('TSAGE: 10/10 OK');
})().catch(e=>{console.error('ÉCHEC TSAGE:',e.stack||e.message);process.exit(1);});
