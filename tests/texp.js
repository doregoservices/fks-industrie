;/* ULTRAREVIEW : tous les exports Excel générés, marqués, sans NaN/undefined */
;(async()=>{
await loadSettings();
await seedDemo();
S.user={name:'test',role:'manager'};
const per=todayISO().slice(0,7);
/* données riches : ventes crédit + impayés + paie close + transf + ajust */
const prods=await DB.list('products');
const p1=prods.filter(p=>p.name==='Café moulu 500 g')[0];
await createSale({date:todayISO(),agent_id:'direct',agent_name:'Vente directe',pay_mode:'credit',client:'Épicerie Bassam',total:22500,lines:[{product_id:p1.id,name:p1.name,qty:5,price:4500}],source:'admin'});
await DB.insert('adjustments',{date:todayISO(),level:'green',qty:50,reason:'inventaire'});
await DB.insert('adjustments',{date:todayISO(),level:'type',type_id:(await DB.list('coffee_types'))[0].id,name:(await DB.list('coffee_types'))[0].name,qty:3,reason:'recompte'});

let captured=null;
const _mk=makeXlsx;makeXlsx=(sheets,fname)=>{captured={sheets,fname};};
const _bx=buildXlsx;buildXlsx=sheets=>{captured={sheets:sheets,fname:'direct'};return _bx(sheets);};
await App.runGen(monthISO());
const check=(label,minSheets)=>{
  if(!captured)throw new Error(label+' : rien généré');
  if(captured.sheets.length<minSheets)throw new Error(label+' : '+captured.sheets.length+' feuilles');
  captured.sheets.forEach(sh=>{
    const txt=JSON.stringify(sh.rows);
    if(/NaN|undefined|\[object/.test(txt))throw new Error(label+' · '+sh.name+' : valeur invalide → '+txt.slice(0,120));
    const xml=sheetXml(sh.rows,sh.widths);
    if(!xml.includes('Réalisé par Doregoservices · 07 17 57 95 56'))throw new Error(label+' · '+sh.name+' : pied de marque absent (XML)');
    if(/&amp;lt;|&#0;/.test(xml))throw new Error(label+' · '+sh.name+' : encodage suspect');
  });
  console.log('✓ '+label+' : '+captured.sheets.length+' feuilles propres ['+captured.sheets.map(x=>x.name).join(' · ')+']');
};

await App.expStocks();   check('Point complet des stocks',5);
await App.expCaisse();   check('Journal de caisse Sage',2);
await App.expVentes();   check('Ventes',1);
await App.expPaie();check('Journal de paie',1);
await App.expExploitation();check('Exploitation mensuelle',5);
makeXlsx=_mk;buildXlsx=_bx;

/* Écran par écran, manager : aucune erreur, aucun NaN affiché */
const screens=['dashboard','validation','achats','production','stocks','produits','ventes','commerciaux','impayes','caisse','paie','exploitation','exports','parametres','emballages','immobilisations'];
for(const r of screens){
  location.hash='#/'+r;S.route=r;S.tab={};
  try{await render();}catch(e){throw new Error('écran '+r+' : '+e.message);}
  const h=$('#main').innerHTML+($('#app')?$('#app').innerHTML:'');
  if(h.includes('NaN'))throw new Error('écran '+r+' : NaN affiché');
}
console.log('✓ 16 écrans rendus sans erreur ni NaN (manager)');

/* Anti-double-validation */
const pend=await DB.insert('pending_entries',{source_type:'caisse',source_name:'Test',status:'pending',created_at:nowISO(),payload:{date:todayISO(),type:'out',account:'cash',category:'divers',label:'test',amount:1000,imputable:true}});
const nCash=(await DB.list('cash_entries')).length;
await App.pendOK(pend.id);
const n1=(await DB.list('cash_entries')).length;
await App.pendOK(pend.id);
const n2=(await DB.list('cash_entries')).length;
if(n1!==nCash+1)throw new Error('validation n’a pas créé 1 écriture');
if(n2!==n1)throw new Error('double validation → écriture en double !');
console.log('✓ Validation : garde anti-double-clic (1 seule écriture comptée)');

console.log('TEXP: 5/5 OK');
})().catch(e=>{console.error('ÉCHEC TEXP:',e.stack||e.message);process.exit(1);});
