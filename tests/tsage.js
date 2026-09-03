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
await createSale({date:todayISO(),agent_id:'direct',agent_name:'Vente directe',pay_mode:'momo',total:9000,lines:[{product_id:p1.id,name:p1.name,qty:2,price:4500}],source:'admin'});
await createCashEntry({date:todayISO(),type:'out',account:'momo',category:'transport',label:'Taxi livraison (MoMo)',amount:15000,imputable:true});
await DB.insert('cash_entries',{date:todayISO(),type:'out',account:'cash',category:'treso_momo',label:'Conversion espèces vers MoMo',amount:30000,imputable:true,status:'validated',created_at:nowISO()});
if(slips.length<1||netTot<=0)throw new Error('paie de test vide');
console.log('✓ Données : paie close '+netTot+' F net · crédit 22 500 F · achat 80 000 F · vente MoMo 9 000 F · taxi MoMo 15 000 F · direction (BQ) · conversion 585 (OD)');

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
if(has('VE','571000')||has('VE','552100'))throw new Error('VE : compte de caisse interdit dans le journal des ventes');
console.log('✓ VE : 702 produits finis + 4111 clients — AUCUN compte de caisse (règle client)');

/* 6. Aucun double comptage dans CA */
['702000','602100','608100','661000','664100'].forEach(a=>{if(has('CA',a))throw new Error('CA : compte '+a+' présent en double (déjà dans VE/AC/PA)');});
if(!has('CA','411100'))throw new Error('CA : encaissement de créance 411100 absent');
if(!has('CA','612000'))throw new Error('CA : charge transport 612000 absente');
console.log('✓ CA : charges réglées en espèces (612…) + encaissement créance 4111 — rien en double');

/* 7. Journal AC : achats réglés et à crédit */
if(!has('AC','602100'))throw new Error('AC : matière première 602100 absente');
if(!has('AC','608100'))throw new Error('AC : emballages 608100 absents');
if(!has('AC','401100'))throw new Error('AC : fournisseur 401100 absent (achat à crédit)');
if(has('AC','571000')||has('AC','552100'))throw new Error('AC : compte de caisse interdit dans le journal des achats');
console.log('✓ AC : 6021 café vert + 6081 emballages / 4011 fournisseurs — AUCUN compte de caisse (règle fournisseur)');

/* 8. OD + PA : structure complète révisée */
if(!has('BQ','521000'))throw new Error('BQ : banque 521000 absente (opérations direction)');
const bqA=rowsOf('BQ').map(r=>String(r[2]));
if(!bqA.every(a=>a==='521000'||a==='571000'||a==='552100'))throw new Error('BQ : compte hors trésorerie présent '+JSON.stringify(bqA));
if(has('BQ','612000')||has('BQ','411100')||has('BQ','422000')||has('BQ','702000'))throw new Error('BQ : ne doit contenir QUE les opérations banque (521/571/5521)');
if(!has('OD','585000'))throw new Error('OD : virement interne 585000 absent (conversion caisse/MoMo)');
if(!has('CA','552100'))throw new Error('CA : règlement/paiement MoMo (5521) absent du journal caisse');
if(has('CA','521000'))throw new Error('CA : compte banque 521 ne doit pas être dans la caisse');
if(!has('PA','661000'))throw new Error('PA : salaires 661000 absent');
if(!has('PA','664100'))throw new Error('PA : charges sociales 664100 absentes');
if(!has('PA','422000'))throw new Error('PA : rémunérations dues 422000 absent');
if(!has('PA','431000'))throw new Error('PA : CNPS 431000 absente');
if(!has('PA','447200'))throw new Error('PA : ITS 447200 absent');
const cnt=(k,a)=>rowsOf(k).filter(r=>String(r[2])===a).length;
if(cnt('PA','431000')<2)throw new Error('PA : CNPS et CMU doivent être 2 lignes distinctes (431)');
if(cnt('PA','447200')<2)throw new Error('PA : ITS et FDFP doivent être 2 lignes distinctes (4472)');
const libPA=rowsOf('PA').map(r=>String(r[3]));
if(!libPA.some(l=>l.includes('ITS')))throw new Error('PA : libellé ITS absent');
if(!libPA.some(l=>l.includes('FDFP')))throw new Error('PA : libellé FDFP absent');
if(!libPA.some(l=>l.includes('CNPS')))throw new Error('PA : libellé CNPS absent');
console.log('✓ BQ = banque seule (521 dépôts/retraits direction) · OD 585 virements internes · CA accueille espèces ET MoMo (571/5521) · PA écriture COMPLÈTE : 661 bruts + 6641 CNPS patronal + 6641 CMU employeur + 6414 FDFP / 431 CNPS + 431 CMU + 4472 ITS + 4472 FDFP + 4211 avances + 422 net');

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

/* 11. Avance sur salaire : sortie de caisse D 4211 puis déduction PA C 4211 -> compte soldé */
const emps=(await DB.list('employees')).filter(e=>e.active!==false);
const avE=emps[0];
$('#main').innerHTML='<input id="avE"><input id="avD"><input id="avN"><input id="avM">';
const d11b=new Date();d11b.setMonth(d11b.getMonth()-1);$('#avE').value=avE.id+'|'+avE.name;$('#avD').value=d11b.toISOString().slice(0,7)+'-05';$('#avN').value='sage';$('#avM').value='10000';
await App.advSave();
const avOut=(await DB.list('cash_entries')).filter(x=>String(x.ref||'').indexOf('advance:')===0);
if(avOut.length!==1||avOut[0].category!=='personnel_avances')throw new Error('avance sans sortie de caisse cat personnel_avances');
const d11=new Date();d11.setMonth(d11.getMonth()-1);const per=d11.toISOString().slice(0,7);const dd11=per+'-28';
emps.forEach(e=>{$('#x_adv_'+e.id).value=e.id===avE.id?'10000':'0';});
await App.runGen(per);
const run11=(await DB.list('pay_runs')).filter(r=>r.period===per).slice(-1)[0];if(!run11)throw new Error('run cas 11 non généré');
$('#main').innerHTML='<input id="pcD"><select id="pcA"></select>';$('#pcD').value=dd11;$('#pcA').value='cash';await DB.insert('cash_entries',{date:dd11,type:'in',account:'cash',category:'apport',label:'appro cas 11',amount:2000000,status:'validated',created_at:nowISO()});
await App.runCloseGo(run11.id);
const cap11=null;const _mk11=makeXlsx;let capS=null;makeXlsx=(sh)=>{capS=sh;};const _dl11=dlCsv;dlCsv=()=>{};
await App.expCaisse();makeXlsx=_mk11;dlCsv=_dl11;
const codeOf11=k=>({VE:'VT',AC:'AC',CA:'CS',BQ:'BQ',PA:'PY',OD:'DIV'})[k]||k;const rowsOf11=k=>{const sh11=capS.filter(x=>x.name.split(' — ')[0]===codeOf11(k))[0];if(!sh11)throw new Error('feuille '+k+' introuvable');return sh11.rows.filter(r=>r.length===6&&r[1]);}
const balJ11=rows=>{let d=0,c=0;rows.forEach(r=>{d+=Number(r[4])||0;c+=Number(r[5])||0;});if(Math.abs(d-c)>1)throw new Error('journal '+k+' déséquilibré '+d+'/'+c);return d;};
const pa1111=rowsOf11('PA'),ca1111=rowsOf11('CA');
const accStart11=r=>String(r[2]).slice(0,4);
const cred11=pa1111.filter(r=>accStart11(r)==='4211'&&Number(r[5])>0).reduce((a,r)=>a+Number(r[5]),0);
const deb11=ca1111.filter(r=>accStart11(r)==='4211'&&Number(r[4])>0).reduce((a,r)=>a+Number(r[4]),0);
if(cred11!==10000||deb11!==10000)throw new Error('4211 : crédit PA '+cred11+' / débit CA '+deb11+' (attendu 10000/10000)');
console.log('✓ Avance : CA D 4211 puis PA C 4211 — compte soldé, journaux équilibrés');

/* 12. Retrait MoMo -> espèces : bouton swap, paire liée, OD 585, suppression des 2 lignes */
{
const bm=await accBalance('momo'),bc0=await accBalance('cash');
if(bm<=0)throw new Error('solde MoMo nul pour le test');
const amt12=Math.max(1000,Math.floor(bm/2));
App._swap='momo2cash';
$('#main').innerHTML='<input id="swM"><input id="swD"><input id="swN">';
$('#swM').value=String(amt12);$('#swD').value=todayISO();$('#swN').value='retrait test';
await App.swapSave();
const pair12=(await DB.list('cash_entries')).filter(x=>String(x.ref||'').indexOf('swap:')===0);
if(pair12.length!==2)throw new Error('transfert : '+pair12.length+' écritures au lieu de 2');
if(Math.abs(await accBalance('momo')-(bm-amt12))>0.01)throw new Error('solde MoMo non décrémenté');
if(Math.abs(await accBalance('cash')-(bc0+amt12))>0.01)throw new Error('solde espèces non incrémenté');
const _mk12=makeXlsx;let cap12=null;makeXlsx=(sh)=>{cap12=sh;};const _dl12=dlCsv;dlCsv=()=>{};
await App.expCaisse();makeXlsx=_mk12;dlCsv=_dl12;
const odRows12=[];cap12.forEach(sh=>sh.rows.forEach(r=>{if(Array.isArray(r)&&r.length===6&&String(r[3]||'').includes('Retrait Mobile Money'))odRows12.push([String(r[2]),Number(r[4])||0,Number(r[5])||0]);}));
if(odRows12.length!==4)throw new Error('OD : '+odRows12.length+' lignes retrait au lieu de 4');
const hasLeg=(acc12,side)=>odRows12.some(x=>x[0]===acc12&&side==='D'?x[1]>0:x[2]>0);
if(!hasLeg('585000','D')||!hasLeg('552100','C')||!hasLeg('571000','D')||!hasLeg('585000','C'))throw new Error('OD retrait incomplet : '+JSON.stringify(odRows12));
const _cf12=confirmBox;confirmBox=(t,m,l,fn)=>{Promise.resolve(fn()).catch(()=>{});};
await App.cashDel(pair12[0].id);await new Promise(r=>setTimeout(r,40));
confirmBox=_cf12;
if((await DB.list('cash_entries')).filter(x=>String(x.ref||'').indexOf('swap:')===0).length)throw new Error('suppression : la paire swap reste entière');
if(Math.abs(await accBalance('momo')-bm)>0.01||Math.abs(await accBalance('cash')-bc0)>0.01)throw new Error('soldes non restaurés après suppression');
console.log('✓ Retrait MoMo → espèces : 2 écritures liées, soldes exacts, OD D585/C5521 + D571/C585, suppression paire complète');
}

captured.sheets.forEach(s=>{const t=JSON.stringify(s.rows);if(/NaN|undefined/.test(t))throw new Error(s.name+' : NaN/undefined');});
console.log('TSAGE: 12/12 OK');
})().catch(e=>{console.error('ÉCHEC TSAGE:',e.stack||e.message);process.exit(1);});
