;/* TSUPPORT : l'écran 🛟 Support rend les liens vers les guides, version unique */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
location.hash='#/apropos';S.route='apropos';S.tab={};await render();
const h=$('#main').innerHTML;
if(!h.includes('guide.html'))throw new Error('lien guide.html absent de l écran Support');
if(!h.includes('explique-exploitation.html'))throw new Error('lien explique-exploitation.html absent de l écran Support');
if(!h.includes('Guide d'))throw new Error('bouton Guide d utilisation complet absent');
if(!h.includes('exploitation expliquée'))throw new Error('bouton L exploitation expliquée absent');
const vm=h.match(/CaféPro version ([0-9.]+)/);
if(!vm)throw new Error('numéro de version non affiché sur l écran Support');
if(!h.includes('07 17 57 95 56')||!h.includes('tel:+2250717579556'))throw new Error('lien Appeler absent ou numéro tronqué');
if(h.split('CaféPro version').length!==2)throw new Error('la ligne version doit être unique (doublon revenu ?)');
console.log('✓ Support : liens vers guide.html (tous les onglets) et explique-exploitation.html présents');
console.log('✓ Support : version '+vm[1]+' unique, lien Appeler complet (+225 07 17 57 95 56)');
console.log('TSUPPORT: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TSUPPORT:',e.message);process.exit(1);});
