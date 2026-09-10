;/* TSUPPORT : l'écran 🛟 Support rend les liens vers les guides, version unique */
;(async()=>{
await loadSettings();await seedDemo();S.user={name:'test',role:'manager'};
location.hash='#/apropos';S.route='apropos';S.tab={};await render();
const h=$('#main').innerHTML;
if(!h.includes('guide.html'))throw new Error('lien guide.html absent de l écran Support');
if(!h.includes('explique-exploitation.html'))throw new Error('lien explique-exploitation.html absent de l écran Support');
if(!h.includes('Guide d'))throw new Error('bouton Guide d utilisation complet absent');
if(!h.includes('exploitation expliquée'))throw new Error('bouton L exploitation expliquée absent');
if(!h.includes('35.37'))throw new Error('version 35.37 non affichée sur l écran Support');
if(h.split('CaféPro version').length!==2)throw new Error('la ligne version doit être unique (doublon revenu ?)');
console.log('✓ Support : liens vers guide.html (tous les onglets) et explique-exploitation.html présents');
console.log('✓ Support : version unique affichée (35.37), doublon corrigé');
console.log('TSUPPORT: TOUT PASSE');
})().catch(e=>{console.log('ECHEC TSUPPORT:',e.message);process.exit(1);});
