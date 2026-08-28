;/* TLOGO : logo société — upload, affichage, embarqué dans les exports Excel */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
/* 1. upload via logoSave (PNG 1x1) */
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
global.FileReader=class{readAsDataURL(){setTimeout(()=>{this.result=PNG;if(this.onload)this.onload({target:{result:PNG}});},0);}};
$('#stLogo').files=[{size:90}];
await App.logoSave();
if((SETS.company||{}).logo!==PNG)throw new Error('logo non enregistré via logoSave');
console.log('✓ Upload : logo enregistré dans les réglages société');
/* 2. visible en tête de l’app et à l’écran de connexion */
const nav=topHtml();
if(!nav.includes('src="'+PNG))throw new Error('logo absent de l’en-tête de l’app');
console.log('✓ Affichage : logo dans la barre supérieure de l’app');
/* 3. embarqué dans le xlsx (drawing + media + type déclaré) */
const txtOf=b=>{let t='';(b.parts||[]).forEach(p=>{t+=new TextDecoder('latin1').decode(typeof p==='string'?Buffer.from(p,'binary'):p);});return t;};
const buf=buildXlsx([{name:'Synthèse',rows:[['Titre'],['a',1]],widths:[20,10]}]);
const txt=txtOf(buf);
['xl/drawings/drawing1.xml','xl/media/image1.png','image/png','oneCellAnchor','rId1'].forEach(k=>{if(!txt.includes(k))throw new Error('xlsx : '+k+' absent');});
const p0=(buf.parts||[])[0];
if(!(p0&&p0[0]===0x50&&p0[1]===0x4b))throw new Error('signature zip absente');
console.log('✓ Exports Excel : logo embarqué (drawing ancré + image PNG + type déclaré), zip valide');
/* 4. sans logo : aucun résidu de drawing */
SETS.company.logo='';
const t2=txtOf(buildXlsx([{name:'T',rows:[['x']]}]));
if(t2.includes('drawing1')||t2.includes('image/png'))throw new Error('drawing résiduel sans logo');
console.log('✓ Sans logo : exports inchangés (aucun drawing résiduel)');
console.log('TLOGO: 4/4 OK');
})().catch(e=>{console.error('ÉCHEC TLOGO:',e.stack||e.message);process.exit(1);});
