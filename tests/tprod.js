;/* TPROD : écran Produits accessible depuis le menu + création / modification / désactivation / vente */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
/* 1. navigation */
if(!NAV_ITEMS.some(i=>i[0]==='produits'))throw new Error('écran Produits absent du menu');
const nav=topHtml();
if(!nav.includes('#/produits'))throw new Error('lien Produits absent de la barre de navigation');
console.log('✓ Menu : « Produits » visible dans la barre de navigation');
/* 2. écran rendu */
S.route='produits';location.hash='#/produits';
await render();
if(!$('#main').innerHTML.includes('Produits finis'))throw new Error('écran Produits non rendu');
if(!$('#main').innerHTML.includes('Types de café'))throw new Error('section Types absente');
console.log('✓ Écran rendu : produits finis + types de café');
/* 3. ajout d’un produit */
App.prodForm();
$('#pName').value='Café cannelle 250 g';$('#pW').value='250';$('#pP').value='3000';$('#pA').value='15';
await App.prodSave();
let np=(await DB.list('products')).filter(p=>p.name==='Café cannelle 250 g')[0];
if(!np)throw new Error('produit non créé');
if(Number(np.price)!==3000||Number(np.weight_g)!==250)throw new Error('prix/poids non enregistrés');
console.log('✓ Création : « Café cannelle 250 g » ajouté (3 000 F, 250 g)');
/* 4. modification */
App.prodForm(np.id);
$('#pName').value='Café cannelle 250 g XL';$('#pW').value='250';$('#pP').value='3500';$('#pA').value='10';
await App.prodSave(np.id);
np=(await DB.list('products',{eq:{id:np.id}}))[0];
if(np.name!=='Café cannelle 250 g XL'||Number(np.price)!==3500)throw new Error('modification non enregistrée');
console.log('✓ Modification : prix passé à 3 500 F');
/* 5. désactivation / réactivation */
await App.prodToggle(np.id);
if((await DB.list('products',{eq:{id:np.id}}))[0].active!==false)throw new Error('désactivation échouée');
await App.prodToggle(np.id);
if((await DB.list('products',{eq:{id:np.id}}))[0].active!==true)throw new Error('réactivation échouée');
console.log('✓ Désactivation / réactivation');
/* 6. le nouveau produit est vendable */
await createSale({date:todayISO(),agent_id:'direct',agent_name:'Vente directe',pay_mode:'cash',total:3500,lines:[{product_id:np.id,name:np.name,qty:1,price:3500}],source:'admin'});
const sl=(await DB.list('sales')).filter(s=>(s.lines||[]).some(l=>l.product_id===np.id));
if(!sl.length)throw new Error('vente du nouveau produit impossible');
console.log('✓ Vente du nouveau produit : OK (ligne de vente créée)');
/* 7. rôle production y a accès */
S.user={name:'prod',role:'production'};
if(!roleAllowed('produits'))throw new Error('rôle production privé de l’écran Produits');
console.log('✓ Rôles : production (et manager) accèdent à l’écran Produits');
console.log('TPROD: 7/7 OK');
})().catch(e=>{console.error('ÉCHEC TPROD:',e.stack||e.message);process.exit(1);});
